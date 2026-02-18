/**
 * Persistent Conversation Logger — PostgreSQL Backend
 *
 * Stores real chat messages to Postgres for admin review.
 * Tables: rainbow_conversations + rainbow_messages
 *
 * Maintains the same public API as the old JSON-file version
 * so all callers (pipeline, routes, etc.) work unchanged.
 */

import { eq, desc, gt, sql, and } from 'drizzle-orm';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { db, dbReady } from '../lib/db.js';
import { withFallback } from '../lib/with-fallback.js';
// Import from .ts directly to bypass stale build artifacts
import { rainbowConversations, rainbowMessages } from '../../../shared/schema-tables.ts';

const CONTACTS_DIR = join(process.cwd(), '.rainbow-kb', 'contacts');

// ─── Types (unchanged — callers still import these) ─────────────────

export interface LoggedMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;       // Unix ms
  intent?: string;
  confidence?: number;
  action?: string;
  manual?: boolean;
  source?: string;
  model?: string;
  responseTime?: number;
  kbFiles?: string[];
  messageType?: string;
  routedAction?: string;
  workflowId?: string;
  stepId?: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  staffName?: string;        // US-011: Staff display name for manual message attribution
}

export interface ContactDetails {
  name?: string;
  email?: string;
  country?: string;
  language?: string;
  languageLocked?: boolean;
  checkIn?: string;
  checkOut?: string;
  unit?: string;
  notes?: string;
  contactStatus?: string;
  paymentStatus?: string;
  tags?: string[];
}

export interface ConversationLog {
  phone: string;
  pushName: string;
  instanceId?: string;
  messages: LoggedMessage[];
  contactDetails?: ContactDetails;
  pinned?: boolean;
  favourite?: boolean;
  lastReadAt?: number;
  responseMode?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ConversationSummary {
  phone: string;
  pushName: string;
  instanceId?: string;
  lastMessage: string;
  lastMessageRole: 'user' | 'assistant';
  lastMessageAt: number;
  messageCount: number;
  unreadCount: number;
  pinned?: boolean;
  favourite?: boolean;
  createdAt: number;
}

// ─── DB availability guard ──────────────────────────────────────────

let dbAvailable = false;

async function ensureDb(): Promise<boolean> {
  if (dbAvailable) return true;
  try {
    const ready = await dbReady;
    dbAvailable = !!ready;
  } catch {
    dbAvailable = false;
  }
  return dbAvailable;
}

// ─── Canonical phone key (same as before) ───────────────────────────

function canonicalPhoneKey(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits || phone.replace(/[^a-zA-Z0-9@._-]/g, '_');
}

// ─── DB row → LoggedMessage ─────────────────────────────────────────

function rowToMessage(row: typeof rainbowMessages.$inferSelect): LoggedMessage {
  const msg: LoggedMessage = {
    role: row.role as 'user' | 'assistant',
    content: row.content,
    timestamp: row.timestamp.getTime(),
  };
  if (row.intent) msg.intent = row.intent;
  if (row.confidence != null) msg.confidence = row.confidence;
  if (row.action) msg.action = row.action;
  if (row.manual) msg.manual = row.manual;
  if (row.source) msg.source = row.source;
  if (row.model) msg.model = row.model;
  if (row.responseTime != null) msg.responseTime = row.responseTime;
  if (row.kbFilesJson) {
    try { msg.kbFiles = JSON.parse(row.kbFilesJson); } catch { /* ignore */ }
  }
  if (row.messageType) msg.messageType = row.messageType;
  if (row.routedAction) msg.routedAction = row.routedAction;
  if (row.workflowId) msg.workflowId = row.workflowId;
  if (row.stepId) msg.stepId = row.stepId;
  if (row.usageJson) {
    try { msg.usage = JSON.parse(row.usageJson); } catch { /* ignore */ }
  }
  return msg;
}

// ─── Upsert conversation row ───────────────────────────────────────

async function upsertConversation(
  phone: string,
  pushName: string,
  instanceId?: string,
  txOrDb: typeof db = db
): Promise<void> {
  const key = canonicalPhoneKey(phone);
  const now = new Date();

  await txOrDb
    .insert(rainbowConversations)
    .values({
      phone: key,
      pushName,
      instanceId: instanceId ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: rainbowConversations.phone,
      set: {
        pushName,
        ...(instanceId ? { instanceId } : {}),
        updatedAt: now,
      },
    });
}

// ─── Public API (same signatures as before) ─────────────────────────

/** Log a single message to a conversation */
export async function logMessage(
  phone: string,
  pushName: string,
  role: 'user' | 'assistant',
  content: string,
  meta?: {
    intent?: string;
    confidence?: number;
    action?: string;
    instanceId?: string;
    manual?: boolean;
    source?: string;
    model?: string;
    responseTime?: number;
    kbFiles?: string[];
    messageType?: string;
    routedAction?: string;
    workflowId?: string;
    stepId?: string;
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    // Allow extra keys from copilot approval flow
    [key: string]: unknown;
  }
): Promise<void> {
  if (!(await ensureDb())) return;

  try {
    const key = canonicalPhoneKey(phone);
    const now = new Date();

    // DB-level dedup: skip if identical message was logged in the last 10 seconds.
    // This prevents duplicates from multiple servers (local + Lightsail) writing
    // to the same Neon DB, or from Baileys double-fire events.
    const windowStart = new Date(now.getTime() - 10_000);
    const dupeCheck = await db.execute(sql`
      SELECT 1 FROM rainbow_messages
      WHERE phone = ${key}
        AND role = ${role}
        AND content = ${content}
        AND timestamp > ${windowStart}
      LIMIT 1
    `);
    if ((dupeCheck as any).rows?.length > 0) {
      console.log(`[ConvoLogger] Dedup: skipping duplicate ${role} message for ${key}`);
      return;
    }

    // Wrap upsert + insert + cap-delete in a single transaction (US-168)
    await db.transaction(async (tx) => {
      // Upsert conversation
      await upsertConversation(key, pushName, meta?.instanceId, tx);

      // Insert message
      await tx.insert(rainbowMessages).values({
        phone: key,
        role,
        content,
        timestamp: now,
        intent: meta?.intent ?? null,
        confidence: meta?.confidence ?? null,
        action: meta?.action ?? null,
        manual: meta?.manual ?? null,
        source: meta?.source ?? null,
        model: meta?.model ?? null,
        responseTime: meta?.responseTime ?? null,
        kbFilesJson: meta?.kbFiles ? JSON.stringify(meta.kbFiles) : null,
        messageType: meta?.messageType ?? null,
        routedAction: meta?.routedAction ?? null,
        workflowId: meta?.workflowId ?? null,
        stepId: meta?.stepId ?? null,
        usageJson: (meta?.usage || meta?.staffName)
          ? JSON.stringify({ ...(meta?.usage || {}), ...(meta?.staffName ? { staffName: meta.staffName } : {}) })
          : null,
      });

      // Cap at 500 messages per conversation
      const countResult = await tx
        .select({ count: sql<number>`count(*)` })
        .from(rainbowMessages)
        .where(eq(rainbowMessages.phone, key));

      const totalCount = Number(countResult[0]?.count ?? 0);
      if (totalCount > 500) {
        // Delete oldest messages beyond 500
        const excess = totalCount - 500;
        await tx.execute(sql`
          DELETE FROM rainbow_messages
          WHERE id IN (
            SELECT id FROM rainbow_messages
            WHERE phone = ${key}
            ORDER BY timestamp ASC
            LIMIT ${excess}
          )
        `);
      }
    });

    invalidateListCache();

    // Auto-update contact context file after assistant replies (debounced)
    if (role === 'assistant') {
      scheduleContextUpdate(key, pushName);
    }
  } catch (err: any) {
    console.error(`[ConvoLogger] Failed to log message for ${phone}:`, err.message);
  }
}

/** Log a user non-text message and the assistant reply in one write. */
export async function logNonTextExchange(
  phone: string,
  pushName: string,
  userPlaceholder: string,
  assistantReply: string,
  instanceId?: string
): Promise<void> {
  if (!(await ensureDb())) return;

  try {
    const key = canonicalPhoneKey(phone);
    const now = new Date();
    const nowPlus1 = new Date(now.getTime() + 1);

    // DB-level dedup: skip if this non-text exchange was already logged recently
    const windowStart = new Date(now.getTime() - 10_000);
    const dupeCheck = await db.execute(sql`
      SELECT 1 FROM rainbow_messages
      WHERE phone = ${key}
        AND role = 'user'
        AND content = ${userPlaceholder}
        AND timestamp > ${windowStart}
      LIMIT 1
    `);
    if ((dupeCheck as any).rows?.length > 0) {
      console.log(`[ConvoLogger] Dedup: skipping duplicate non-text exchange for ${key}`);
      return;
    }

    // Wrap upsert + insert in a single transaction (US-168)
    await db.transaction(async (tx) => {
      await upsertConversation(key, pushName, instanceId, tx);

      // Insert both messages
      await tx.insert(rainbowMessages).values([
        { phone: key, role: 'user', content: userPlaceholder, timestamp: now },
        { phone: key, role: 'assistant', content: assistantReply, timestamp: nowPlus1, responseTime: 0 },
      ]);
    });
  } catch (err: any) {
    console.error(`[ConvoLogger] Failed to log non-text exchange for ${phone}:`, err.message);
  }
}

// ─── List cache (same TTL approach) ─────────────────────────────────

let _listCache: { data: ConversationSummary[]; ts: number } | null = null;
const LIST_CACHE_TTL = 10_000;

function invalidateListCache(): void {
  _listCache = null;
}

/** List all conversations with summaries. */
export async function listConversations(): Promise<ConversationSummary[]> {
  if (_listCache && Date.now() - _listCache.ts < LIST_CACHE_TTL) {
    return _listCache.data;
  }

  if (!(await ensureDb())) return [];

  return withFallback(
    async () => {
      // Single query with LATERAL JOINs — eliminates N+1 problem
      // NOTE: db.execute(sql``) returns raw PG column names (snake_case), NOT Drizzle camelCase
      const result = await db.execute(sql`
        SELECT
          c.phone,
          c.push_name,
          c.instance_id,
          c.pinned,
          c.favourite,
          c.created_at,
          c.last_read_at,
          lm.content   AS last_msg_content,
          lm.role       AS last_msg_role,
          lm.timestamp  AS last_msg_at,
          COALESCE(mc.total, 0)::int  AS message_count,
          COALESCE(uc.unread, 0)::int AS unread_count
        FROM rainbow_conversations c
        LEFT JOIN LATERAL (
          SELECT content, role, timestamp
          FROM rainbow_messages
          WHERE phone = c.phone
          ORDER BY timestamp DESC
          LIMIT 1
        ) lm ON true
        LEFT JOIN LATERAL (
          SELECT count(*)::int AS total
          FROM rainbow_messages
          WHERE phone = c.phone
        ) mc ON true
        LEFT JOIN LATERAL (
          SELECT count(*)::int AS unread
          FROM rainbow_messages
          WHERE phone = c.phone
            AND role = 'user'
            AND (
              c.last_read_at IS NULL
              OR timestamp > c.last_read_at
            )
        ) uc ON true
        WHERE lm.content IS NOT NULL
        ORDER BY lm.timestamp DESC
      `);
      const rows: any[] = result.rows;

      const summaries: ConversationSummary[] = rows.map((r: any) => ({
        phone: r.phone,
        pushName: r.push_name,
        instanceId: r.instance_id ?? undefined,
        lastMessage: (r.last_msg_content || '').slice(0, 100),
        lastMessageRole: r.last_msg_role as 'user' | 'assistant',
        lastMessageAt: r.last_msg_at instanceof Date
          ? r.last_msg_at.getTime()
          : new Date(r.last_msg_at).getTime(),
        messageCount: Number(r.message_count ?? 0),
        unreadCount: Number(r.unread_count ?? 0),
        pinned: r.pinned,
        favourite: r.favourite,
        createdAt: r.created_at instanceof Date
          ? r.created_at.getTime()
          : new Date(r.created_at).getTime(),
      }));
      _listCache = { data: summaries, ts: Date.now() };
      return summaries;
    },
    async () => [],
    '[ConvoLogger] listConversations'
  );
}

/** Get full conversation log for a phone number */
export async function getConversation(phone: string): Promise<ConversationLog | null> {
  if (!(await ensureDb())) return null;

  return withFallback(
    async () => {
      const key = canonicalPhoneKey(phone);

      const convoRows = await db
        .select()
        .from(rainbowConversations)
        .where(eq(rainbowConversations.phone, key))
        .limit(1);

      if (convoRows.length === 0) return null;
      const convo = convoRows[0];

      // Get all messages ordered by timestamp
      const msgRows = await db
        .select()
        .from(rainbowMessages)
        .where(eq(rainbowMessages.phone, key))
        .orderBy(rainbowMessages.timestamp);

      const messages = msgRows.map(rowToMessage);

      let contactDetails: ContactDetails | undefined;
      if (convo.contactDetailsJson) {
        try { contactDetails = JSON.parse(convo.contactDetailsJson); } catch { /* ignore */ }
      }

      return {
        phone: convo.phone,
        pushName: convo.pushName,
        instanceId: convo.instanceId ?? undefined,
        messages,
        contactDetails,
        pinned: convo.pinned,
        favourite: convo.favourite,
        lastReadAt: convo.lastReadAt?.getTime(),
        responseMode: convo.responseMode ?? undefined,
        createdAt: convo.createdAt.getTime(),
        updatedAt: convo.updatedAt.getTime(),
      };
    },
    async () => null,
    `[ConvoLogger] getConversation(${phone})`
  );
}

/** Mark conversation as read */
export async function markConversationAsRead(phone: string): Promise<void> {
  if (!(await ensureDb())) return;

  await withFallback(
    async () => {
      const key = canonicalPhoneKey(phone);
      await db
        .update(rainbowConversations)
        .set({ lastReadAt: new Date(), updatedAt: new Date() })
        .where(eq(rainbowConversations.phone, key));
      invalidateListCache();
    },
    async () => {},
    `[ConvoLogger] markConversationAsRead(${phone})`
  );
}

/** Delete a conversation log */
export async function deleteConversation(phone: string): Promise<boolean> {
  if (!(await ensureDb())) return false;

  return withFallback(
    async () => {
      const key = canonicalPhoneKey(phone);

      // Delete messages + conversation in a single transaction (US-168)
      await db.transaction(async (tx) => {
        await tx.delete(rainbowMessages).where(eq(rainbowMessages.phone, key));
        await tx.delete(rainbowConversations).where(eq(rainbowConversations.phone, key));
      });

      invalidateListCache();
      return true;
    },
    async () => false,
    `[ConvoLogger] deleteConversation(${phone})`
  );
}

export async function clearConversationMessages(phone: string): Promise<boolean> {
  if (!(await ensureDb())) return false;

  return withFallback(
    async () => {
      const key = canonicalPhoneKey(phone);
      await db.delete(rainbowMessages).where(eq(rainbowMessages.phone, key));
      invalidateListCache();
      return true;
    },
    async () => false,
    `[ConvoLogger] clearConversationMessages(${phone})`
  );
}

/** Toggle pin state for a conversation */
export async function togglePin(phone: string): Promise<boolean> {
  if (!(await ensureDb())) return false;

  return withFallback(
    async () => {
      const key = canonicalPhoneKey(phone);
      const rows = await db
        .select({ pinned: rainbowConversations.pinned })
        .from(rainbowConversations)
        .where(eq(rainbowConversations.phone, key))
        .limit(1);

      if (rows.length === 0) return false;
      const newPinned = !rows[0].pinned;

      await db
        .update(rainbowConversations)
        .set({ pinned: newPinned, updatedAt: new Date() })
        .where(eq(rainbowConversations.phone, key));

      invalidateListCache();
      return newPinned;
    },
    async () => false,
    `[ConvoLogger] togglePin(${phone})`
  );
}

/** Toggle favourite state for a conversation */
export async function toggleFavourite(phone: string): Promise<boolean> {
  if (!(await ensureDb())) return false;

  return withFallback(
    async () => {
      const key = canonicalPhoneKey(phone);
      const rows = await db
        .select({ favourite: rainbowConversations.favourite })
        .from(rainbowConversations)
        .where(eq(rainbowConversations.phone, key))
        .limit(1);

      if (rows.length === 0) return false;
      const newFav = !rows[0].favourite;

      await db
        .update(rainbowConversations)
        .set({ favourite: newFav, updatedAt: new Date() })
        .where(eq(rainbowConversations.phone, key));

      invalidateListCache();
      return newFav;
    },
    async () => false,
    `[ConvoLogger] toggleFavourite(${phone})`
  );
}

/** Get contact details for a phone number */
export async function getContactDetails(phone: string): Promise<ContactDetails> {
  if (!(await ensureDb())) return {};

  return withFallback(
    async () => {
      const key = canonicalPhoneKey(phone);
      const rows = await db
        .select({ json: rainbowConversations.contactDetailsJson })
        .from(rainbowConversations)
        .where(eq(rainbowConversations.phone, key))
        .limit(1);

      if (rows.length === 0 || !rows[0].json) return {};
      return JSON.parse(rows[0].json);
    },
    async () => ({}),
    `[ConvoLogger] getContactDetails(${phone})`
  );
}

/** Merge partial contact details update for a phone number */
export async function updateContactDetails(phone: string, partial: Partial<ContactDetails>): Promise<ContactDetails> {
  if (!(await ensureDb())) return {};

  return withFallback(
    async () => {
      const key = canonicalPhoneKey(phone);

      // Ensure conversation exists
      await db
        .insert(rainbowConversations)
        .values({ phone: key, pushName: '', createdAt: new Date(), updatedAt: new Date() })
        .onConflictDoNothing();

      // Get existing details
      const rows = await db
        .select({ json: rainbowConversations.contactDetailsJson })
        .from(rainbowConversations)
        .where(eq(rainbowConversations.phone, key))
        .limit(1);

      let existing: ContactDetails = {};
      if (rows.length > 0 && rows[0].json) {
        try { existing = JSON.parse(rows[0].json); } catch { /* ignore */ }
      }

      const merged = { ...existing, ...partial };

      await db
        .update(rainbowConversations)
        .set({ contactDetailsJson: JSON.stringify(merged), updatedAt: new Date() })
        .where(eq(rainbowConversations.phone, key));

      return merged;
    },
    async () => ({}),
    `[ConvoLogger] updateContactDetails(${phone})`
  );
}

/** Get phone→tags[] map for all contacts that have tags (US-009). */
export async function getAllContactTags(): Promise<Record<string, string[]>> {
  if (!(await ensureDb())) return {};

  return withFallback(
    async () => {
      const rows = await db
        .select({
          phone: rainbowConversations.phone,
          json: rainbowConversations.contactDetailsJson,
        })
        .from(rainbowConversations)
        .where(sql`${rainbowConversations.contactDetailsJson} IS NOT NULL`);

      const result: Record<string, string[]> = {};
      for (const r of rows) {
        if (!r.json) continue;
        try {
          const details = JSON.parse(r.json);
          if (Array.isArray(details.tags) && details.tags.length > 0) {
            result[r.phone] = details.tags;
          }
        } catch { /* ignore malformed JSON */ }
      }
      return result;
    },
    async () => ({}),
    '[ConvoLogger] getAllContactTags'
  );
}

/** Get phone→unit map for all contacts that have a unit assigned (US-012). */
export async function getAllContactUnits(): Promise<Record<string, string>> {
  if (!(await ensureDb())) return {};

  return withFallback(
    async () => {
      const rows = await db
        .select({
          phone: rainbowConversations.phone,
          json: rainbowConversations.contactDetailsJson,
        })
        .from(rainbowConversations)
        .where(sql`${rainbowConversations.contactDetailsJson} IS NOT NULL`);

      const result: Record<string, string> = {};
      for (const r of rows) {
        if (!r.json) continue;
        try {
          const details = JSON.parse(r.json);
          if (details.unit && typeof details.unit === 'string' && details.unit.trim()) {
            result[r.phone] = details.unit.trim();
          }
        } catch { /* ignore malformed JSON */ }
      }
      return result;
    },
    async () => ({}),
    '[ConvoLogger] getAllContactUnits'
  );
}

/** Get phone→{checkIn, checkOut} map for all contacts that have dates set (US-014). */
export async function getAllContactDates(): Promise<Record<string, { checkIn: string; checkOut: string }>> {
  if (!(await ensureDb())) return {};

  return withFallback(
    async () => {
      const rows = await db
        .select({
          phone: rainbowConversations.phone,
          json: rainbowConversations.contactDetailsJson,
        })
        .from(rainbowConversations)
        .where(sql`${rainbowConversations.contactDetailsJson} IS NOT NULL`);

      const result: Record<string, { checkIn: string; checkOut: string }> = {};
      for (const r of rows) {
        if (!r.json) continue;
        try {
          const details = JSON.parse(r.json);
          if (details.checkIn && details.checkOut) {
            result[r.phone] = { checkIn: details.checkIn, checkOut: details.checkOut };
          }
        } catch { /* ignore malformed JSON */ }
      }
      return result;
    },
    async () => ({}),
    '[ConvoLogger] getAllContactDates'
  );
}

/** Update the response mode for a conversation (persists to DB). */
export async function updateConversationMode(phone: string, mode: string): Promise<void> {
  if (!(await ensureDb())) return;

  await withFallback(
    async () => {
      const key = canonicalPhoneKey(phone);
      await db
        .update(rainbowConversations)
        .set({ responseMode: mode, updatedAt: new Date() })
        .where(eq(rainbowConversations.phone, key));
    },
    async () => {},
    `[ConvoLogger] updateConversationMode(${phone})`
  );
}

/** Aggregate response time from all messages (for dashboard avg). */
export async function getResponseTimeStats(): Promise<{ count: number; sumMs: number; avgMs: number | null }> {
  if (!(await ensureDb())) return { count: 0, sumMs: 0, avgMs: null };

  return withFallback(
    async () => {
      const result = await db
        .select({
          count: sql<number>`count(*)`,
          sumMs: sql<number>`coalesce(sum(response_time_ms), 0)`,
        })
        .from(rainbowMessages)
        .where(
          and(
            eq(rainbowMessages.role, 'assistant'),
            gt(rainbowMessages.responseTime, 0)
          )
        );

      const count = Number(result[0]?.count ?? 0);
      const sumMs = Number(result[0]?.sumMs ?? 0);

      return {
        count,
        sumMs,
        avgMs: count > 0 ? Math.round(sumMs / count) : null,
      };
    },
    async () => ({ count: 0, sumMs: 0, avgMs: null }),
    '[ConvoLogger] getResponseTimeStats'
  );
}

// ─── Auto-update Contact Context Files (US-104) ─────────────────────

const _contextUpdateTimers = new Map<string, ReturnType<typeof setTimeout>>();
const CONTEXT_UPDATE_DEBOUNCE_MS = 30_000; // 30 seconds debounce

/** Schedule a debounced context file update after assistant reply */
export function scheduleContextUpdate(phone: string, pushName: string): void {
  const key = phone.replace(/\D/g, '');
  if (!key) return;

  // Clear existing timer
  const existing = _contextUpdateTimers.get(key);
  if (existing) clearTimeout(existing);

  // Schedule new update
  _contextUpdateTimers.set(key, setTimeout(async () => {
    _contextUpdateTimers.delete(key);
    try {
      await updateContactContextFile(key, pushName);
    } catch (err: any) {
      console.error(`[ContactContext] Auto-update failed for ${key}:`, err.message);
    }
  }, CONTEXT_UPDATE_DEBOUNCE_MS));
}

/** Write/update a contact context file from the latest conversation data */
async function updateContactContextFile(phone: string, pushName: string): Promise<void> {
  if (!(await ensureDb())) return;

  try {
    if (!existsSync(CONTACTS_DIR)) {
      mkdirSync(CONTACTS_DIR, { recursive: true });
    }

    const convo = await getConversation(phone);
    if (!convo || convo.messages.length === 0) return;

    const messages = convo.messages;
    const userMsgs = messages.filter(m => m.role === 'user');
    const lastMsg = messages[messages.length - 1];

    // Detect primary language
    const langCounts: Record<string, number> = {};
    for (const msg of userMsgs.slice(-20)) {
      const lang = detectLangSimple(msg.content);
      langCounts[lang] = (langCounts[lang] || 0) + 1;
    }
    const primaryLang = Object.entries(langCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'en';

    // Extract intents
    const intentSet = new Set<string>();
    for (const msg of messages) {
      if (msg.intent && msg.intent !== 'unknown') {
        intentSet.add(msg.intent);
      }
    }

    const recentUserMsgs = userMsgs.slice(-10).map(m => m.content).join('; ');
    const topicSummary = recentUserMsgs.length > 300
      ? recentUserMsgs.slice(0, 300) + '...'
      : recentUserMsgs;

    const details = convo.contactDetails || {};

    const lines = [
      `# Contact: ${pushName || convo.pushName || phone}`,
      '',
      `- **Phone:** ${phone}`,
      `- **Name:** ${pushName || convo.pushName || 'Unknown'}`,
      details.language ? `- **Language:** ${details.language}` : `- **Language:** ${primaryLang}`,
      details.country ? `- **Country:** ${details.country}` : '',
      `- **Total Messages:** ${messages.length}`,
      `- **Last Interaction:** ${new Date(lastMsg.timestamp).toISOString().split('T')[0]}`,
      `- **First Contact:** ${new Date(convo.createdAt).toISOString().split('T')[0]}`,
      '',
      '## Key Topics',
      '',
      intentSet.size > 0
        ? Array.from(intentSet).map(i => `- ${i}`).join('\n')
        : '- No classified intents yet',
      '',
      '## Recent Conversation Summary',
      '',
      topicSummary || 'No messages yet.',
    ];

    if (details.notes) {
      lines.push('', '## Notes', '', details.notes);
    }
    if (details.tags && details.tags.length > 0) {
      lines.push('', '## Tags', '', details.tags.join(', '));
    }

    const contextContent = lines.filter(l => l !== undefined).join('\n') + '\n';
    const filename = `${phone}-context.md`;
    writeFileSync(join(CONTACTS_DIR, filename), contextContent, 'utf-8');
  } catch (err: any) {
    console.error(`[ContactContext] updateContactContextFile failed for ${phone}:`, err.message);
  }
}

function detectLangSimple(text: string): string {
  if (/[\u4e00-\u9fff]/.test(text)) return 'zh';
  if (/\b(saya|boleh|nak|mahu|ada|ini|itu|di|dan|untuk|tidak|dengan)\b/i.test(text)) return 'ms';
  return 'en';
}

// ─── One-time Dedup Cleanup (Baileys double-fire) ────────────────────

/**
 * Remove duplicate messages caused by Baileys firing messages.upsert twice.
 * Duplicates are identified as rows with the same phone + role + content
 * where timestamps are within 10 seconds of each other. Keeps the earlier row.
 * (10s window accounts for varying AI response times when pipeline runs twice)
 *
 * Safe to call on startup — runs once, idempotent.
 */
export async function deduplicateMessages(): Promise<number> {
  if (!(await ensureDb())) return 0;

  try {
    // Find and delete duplicate messages:
    // Same phone, role, content, timestamps within 10 seconds
    const result = await db.execute(sql`
      DELETE FROM rainbow_messages
      WHERE id IN (
        SELECT b.id
        FROM rainbow_messages a
        JOIN rainbow_messages b
          ON a.phone = b.phone
          AND a.role = b.role
          AND a.content = b.content
          AND a.id < b.id
          AND ABS(EXTRACT(EPOCH FROM (a.timestamp - b.timestamp))) < 10
      )
    `);

    const deleted = (result as any).rowCount ?? 0;
    if (deleted > 0) {
      console.log(`[ConvoLogger] Dedup cleanup: removed ${deleted} duplicate message(s)`);
      invalidateListCache();
    }
    return deleted;
  } catch (err: any) {
    console.error('[ConvoLogger] Dedup cleanup failed:', err.message);
    return 0;
  }
}
