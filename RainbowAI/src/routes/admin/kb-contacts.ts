import { Router } from 'express';
import type { Request, Response } from 'express';
import { promises as fsPromises, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { listConversations, getConversation } from '../../assistant/conversation-logger.js';
import { KB_FILES_DIR } from './utils.js';
import { ok, badRequest, notFound, serverError } from './http-utils.js';

const CONTACTS_DIR = path.join(KB_FILES_DIR, 'contacts');

const router = Router();

// ─── Contact Context Files (US-104) ─────────────────────────────────

function ensureContactsDir(): void {
  if (!existsSync(CONTACTS_DIR)) {
    mkdirSync(CONTACTS_DIR, { recursive: true });
  }
}

/** List all contact context files */
router.get('/contact-contexts', async (_req: Request, res: Response) => {
  try {
    ensureContactsDir();
    const files = await fsPromises.readdir(CONTACTS_DIR);
    const contextFiles = files.filter(f => f.endsWith('-context.md'));
    const fileList = await Promise.all(
      contextFiles.map(async (filename) => {
        const stats = await fsPromises.stat(path.join(CONTACTS_DIR, filename));
        const phone = filename.replace('-context.md', '');
        return { filename, phone, size: stats.size, modified: stats.mtime };
      })
    );
    res.json({ files: fileList });
  } catch (e: any) {
    serverError(res, e);
  }
});

/** Get a specific contact context file */
router.get('/contact-contexts/:phone', async (req: Request, res: Response) => {
  try {
    const phone = req.params.phone.replace(/\D/g, '');
    if (!phone) { badRequest(res, 'phone required'); return; }
    const filename = `${phone}-context.md`;
    const filePath = path.join(CONTACTS_DIR, filename);
    const content = await fsPromises.readFile(filePath, 'utf-8');
    res.json({ phone, filename, content });
  } catch (e: any) {
    if (e.code === 'ENOENT') notFound(res, 'Contact context');
    else serverError(res, e);
  }
});

/** Save/update a contact context file */
router.put('/contact-contexts/:phone', async (req: Request, res: Response) => {
  try {
    const phone = req.params.phone.replace(/\D/g, '');
    if (!phone) { badRequest(res, 'phone required'); return; }
    const { content } = req.body;
    if (typeof content !== 'string') { badRequest(res, 'content (string) required'); return; }
    ensureContactsDir();
    const filename = `${phone}-context.md`;
    await fsPromises.writeFile(path.join(CONTACTS_DIR, filename), content, 'utf-8');
    ok(res, { phone, filename });
  } catch (e: any) {
    serverError(res, e);
  }
});

/** Simple language detection for context files */
function detectSimpleLanguage(text: string): string {
  if (/[\u4e00-\u9fff]/.test(text)) return 'zh';
  if (/\b(saya|boleh|nak|mahu|ada|ini|itu|di|dan|untuk|tidak|dengan)\b/i.test(text)) return 'ms';
  return 'en';
}

/** Generate context files for all contacts with conversation history */
router.post('/contact-contexts/generate', async (_req: Request, res: Response) => {
  try {
    ensureContactsDir();
    const conversations = await listConversations();
    let generated = 0;
    let skipped = 0;
    let errors = 0;

    for (const summary of conversations) {
      const phone = summary.phone.replace(/\D/g, '');
      if (!phone) { skipped++; continue; }

      try {
        const convo = await getConversation(summary.phone);
        if (!convo || convo.messages.length === 0) { skipped++; continue; }

        // Build context from conversation data
        const messages = convo.messages;
        const userMsgs = messages.filter(m => m.role === 'user');
        const lastMsg = messages[messages.length - 1];

        // Detect language from user messages
        const langCounts: Record<string, number> = {};
        for (const msg of userMsgs) {
          const lang = detectSimpleLanguage(msg.content);
          langCounts[lang] = (langCounts[lang] || 0) + 1;
        }
        const primaryLang = Object.entries(langCounts)
          .sort((a, b) => b[1] - a[1])[0]?.[0] || 'en';

        // Extract key intents from messages
        const intentSet = new Set<string>();
        for (const msg of messages) {
          if (msg.intent && msg.intent !== 'unknown') {
            intentSet.add(msg.intent);
          }
        }

        // Build summary of recent topics
        const recentUserMsgs = userMsgs.slice(-10).map(m => m.content).join('; ');
        const topicSummary = recentUserMsgs.length > 300
          ? recentUserMsgs.slice(0, 300) + '...'
          : recentUserMsgs;

        // Contact details from DB
        const details = convo.contactDetails || {};

        const contextContent = [
          `# Contact: ${convo.pushName || phone}`,
          '',
          `- **Phone:** ${phone}`,
          `- **Name:** ${convo.pushName || 'Unknown'}`,
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
          '',
          details.notes ? `## Notes\n\n${details.notes}\n` : '',
          details.tags && details.tags.length > 0 ? `## Tags\n\n${details.tags.join(', ')}\n` : '',
        ].filter(Boolean).join('\n');

        const filename = `${phone}-context.md`;
        await fsPromises.writeFile(path.join(CONTACTS_DIR, filename), contextContent, 'utf-8');
        generated++;
      } catch (err: any) {
        console.error(`[ContactContext] Failed for ${phone}:`, err.message);
        errors++;
      }
    }

    ok(res, { generated, skipped, errors, total: conversations.length });
  } catch (e: any) {
    serverError(res, e);
  }
});

export default router;
