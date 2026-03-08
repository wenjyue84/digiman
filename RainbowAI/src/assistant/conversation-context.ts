/**
 * Contact context file generation for the Conversation Logger subsystem.
 *
 * Extracted from conversation-logger.ts — auto-updates .rainbow-kb/contacts/
 * context files after assistant replies (debounced).
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ensureDb } from './conversation-db.js';

const CONTACTS_DIR = join(process.cwd(), '.rainbow-kb', 'contacts');

// ─── Debounced context update timers ──────────────────────────────

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

  // Lazy import to avoid circular dependency
  const { getConversation } = await import('./conversation-logger.js');

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
