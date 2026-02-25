/**
 * Scheduled Rules Engine
 *
 * Evaluates rules from `rainbow_scheduled_rules` against contact field values.
 * When a date-based trigger field matches the offset window, sends WhatsApp messages
 * in the contact's preferred language. Logs to `rainbow_scheduled_logs` for cooldown.
 *
 * Called by message-scheduler.ts every 30s alongside existing per-message scheduler.
 */

import { pool } from './db.js';

// ─── Types ──────────────────────────────────────────────────────────

interface ScheduledRule {
  id: string;
  name: string;
  trigger_field: string;
  offset_hours: number;
  messages: Record<string, string>;  // { en: "...", ms: "...", zh: "..." }
  cooldown_hours: number;
  match_value: string | null;  // non-null → value-match trigger, null → date-offset trigger
}

interface MatchedContact {
  phone: string;
  language: string;
  name: string;
  fieldValue: string;
}

// ─── Engine ─────────────────────────────────────────────────────────

export async function evaluateScheduledRules(): Promise<void> {
  if (!process.env.DATABASE_URL) return;

  try {
    // 1. Fetch active rules
    const rulesResult = await pool.query(
      `SELECT id, name, trigger_field, offset_hours, messages, cooldown_hours, match_value
       FROM rainbow_scheduled_rules
       WHERE is_active = true`
    );
    const rules: ScheduledRule[] = rulesResult.rows;

    if (rules.length === 0) return;

    const now = new Date();

    for (const rule of rules) {
      try {
        await evaluateRule(rule, now);
      } catch (err: any) {
        console.error(`[ScheduledRules] Rule "${rule.name}" (${rule.id}) failed:`, err.message);
      }
    }
  } catch (err: any) {
    // Table may not exist yet — silent
    if (err.code === '42P01') return;
    console.error('[ScheduledRules] Engine error:', err.message);
  }
}

async function evaluateRule(rule: ScheduledRule, now: Date): Promise<void> {
  // 2. Find contacts with matching trigger field values
  const contactsResult = await pool.query(
    `SELECT cfv.phone, cfv.value,
            rc.contact_details_json,
            rc.push_name
     FROM rainbow_custom_field_values cfv
     LEFT JOIN rainbow_conversations rc ON rc.phone = cfv.phone
     WHERE cfv.field_key = $1
       AND cfv.value IS NOT NULL
       AND cfv.value != ''`,
    [rule.trigger_field]
  );

  if (contactsResult.rows.length === 0) return;

  const matched: MatchedContact[] = [];

  if (rule.match_value) {
    // ── Match-value trigger: send when field value equals match_value ──
    for (const row of contactsResult.rows) {
      if (row.value !== rule.match_value) continue;

      let contactJson: any = {};
      try {
        if (row.contact_details_json) contactJson = JSON.parse(row.contact_details_json);
      } catch { /* ignore */ }

      matched.push({
        phone: row.phone,
        language: contactJson.language || 'en',
        name: contactJson.name || row.push_name || 'Guest',
        fieldValue: row.value,
      });
    }
  } else {
    // ── Date-offset trigger: send within 30-min window of date + offset ──
    const WINDOW_MS = 30 * 60 * 1000;

    for (const row of contactsResult.rows) {
      const fieldDate = parseFieldDate(row.value);
      if (!fieldDate) continue;

      const targetTime = new Date(fieldDate.getTime() + rule.offset_hours * 60 * 60 * 1000);
      const diff = now.getTime() - targetTime.getTime();

      if (diff >= 0 && diff < WINDOW_MS) {
        let contactJson: any = {};
        try {
          if (row.contact_details_json) contactJson = JSON.parse(row.contact_details_json);
        } catch { /* ignore */ }

        matched.push({
          phone: row.phone,
          language: contactJson.language || 'en',
          name: contactJson.name || row.push_name || 'Guest',
          fieldValue: row.value,
        });
      }
    }
  }

  if (matched.length === 0) return;

  // 4. Filter out contacts already sent within cooldown period
  const cooldownCutoff = new Date(now.getTime() - rule.cooldown_hours * 60 * 60 * 1000);
  const phonesToCheck = matched.map(m => m.phone);

  const logsResult = await pool.query(
    `SELECT DISTINCT phone FROM rainbow_scheduled_logs
     WHERE rule_id = $1
       AND phone = ANY($2)
       AND sent_at > $3`,
    [rule.id, phonesToCheck, cooldownCutoff.toISOString()]
  );

  const alreadySent = new Set(logsResult.rows.map((r: any) => r.phone));
  const toSend = matched.filter(m => !alreadySent.has(m.phone));

  if (toSend.length === 0) return;

  console.log(`[ScheduledRules] Rule "${rule.name}": ${toSend.length} contact(s) to send`);

  // 5. Send messages
  for (const contact of toSend) {
    try {
      const message = resolveMessage(rule.messages, contact);
      if (!message) continue;

      const { sendWhatsAppMessage } = await import('./baileys-client.js');
      await sendWhatsAppMessage(contact.phone, message);

      // Log the sent message to conversation
      const { logMessage, getConversation } = await import('../assistant/conversation-logger.js');
      const log = await getConversation(contact.phone);
      const pushName = log?.pushName || contact.name || 'Guest';
      await logMessage(contact.phone, pushName, 'assistant', message, {
        manual: true,
        staffName: `Scheduled: ${rule.name}`,
      });

      // Record in logs to prevent re-sending
      await pool.query(
        `INSERT INTO rainbow_scheduled_logs (id, rule_id, phone, sent_at)
         VALUES (gen_random_uuid()::text, $1, $2, NOW())`,
        [rule.id, contact.phone]
      );

      console.log(`[ScheduledRules] Sent "${rule.name}" to ${contact.phone} (${contact.language})`);
    } catch (err: any) {
      console.error(`[ScheduledRules] Failed to send to ${contact.phone}:`, err.message);
    }
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

function parseFieldDate(value: string): Date | null {
  // Support YYYY-MM-DD (date fields) and ISO datetime
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;

  // If it's just a date (YYYY-MM-DD), set to midnight MYT (UTC+8)
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    // Parse as local date at midnight
    const [y, m, day] = value.split('-').map(Number);
    return new Date(y, m - 1, day, 0, 0, 0);
  }
  return d;
}

function resolveMessage(messages: Record<string, string>, contact: MatchedContact): string | null {
  // Pick message by contact's language, fallback to 'en'
  const lang = contact.language || 'en';
  let template = messages[lang] || messages['en'] || Object.values(messages)[0];
  if (!template) return null;

  // Replace placeholders
  template = template.replace(/\{name\}/gi, contact.name || 'Guest');
  template = template.replace(/\{phone\}/gi, contact.phone);
  template = template.replace(/\{date\}/gi, contact.fieldValue || '');

  return template;
}
