import { Router } from 'express';
import type { Request, Response } from 'express';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { configStore } from '../../assistant/config-store.js';
import { getKnowledgeMarkdown, setKnowledgeMarkdown, buildSystemPrompt, guessTopicFiles } from '../../assistant/knowledge-base.js';
import { isAIAvailable, classifyAndRespond, chat } from '../../assistant/ai-client.js';
import { KB_FILES_DIR } from './utils.js';
import { ok, badRequest, notFound, conflict, serverError, validateFilename } from './http-utils.js';

const router = Router();

// ─── Markdown Knowledge Base (LLM-first) ───────────────────────────

router.get('/knowledge-base', (_req: Request, res: Response) => {
  res.json({ content: getKnowledgeMarkdown() });
});

router.put('/knowledge-base', (req: Request, res: Response) => {
  const { content } = req.body;
  if (typeof content !== 'string') {
    badRequest(res, 'content (string) required');
    return;
  }
  setKnowledgeMarkdown(content);
  ok(res, { length: content.length });
});

// ─── KB Files (Progressive Disclosure Multi-File System) ─────────

router.get('/kb-files', async (_req: Request, res: Response) => {
  try {
    const files = await fsPromises.readdir(KB_FILES_DIR);
    const mdFiles = files.filter(f => f.endsWith('.md') && !f.startsWith('.'));
    const fileList = await Promise.all(
      mdFiles.map(async (filename) => {
        const stats = await fsPromises.stat(path.join(KB_FILES_DIR, filename));
        return { filename, size: stats.size, modified: stats.mtime };
      })
    );
    res.json({ files: fileList });
  } catch (e: any) {
    serverError(res, e);
  }
});

router.get('/kb-files/:filename', async (req: Request, res: Response) => {
  const { filename } = req.params;
  const fnErr = validateFilename(filename);
  if (fnErr) {
    badRequest(res, fnErr);
    return;
  }
  try {
    const content = await fsPromises.readFile(path.join(KB_FILES_DIR, filename), 'utf-8');
    res.json({ filename, content });
  } catch (e: any) {
    if (e.code === 'ENOENT') notFound(res, 'File');
    else serverError(res, e);
  }
});

router.put('/kb-files/:filename', async (req: Request, res: Response) => {
  const { filename } = req.params;
  const { content } = req.body;
  const fnErr = validateFilename(filename);
  if (fnErr) {
    badRequest(res, fnErr);
    return;
  }
  if (content === undefined) {
    badRequest(res, 'content required');
    return;
  }
  try {
    const filePath = path.join(KB_FILES_DIR, filename);
    await fsPromises.access(filePath);
    const original = await fsPromises.readFile(filePath, 'utf-8');
    await fsPromises.writeFile(path.join(KB_FILES_DIR, `.${filename}.backup`), original, 'utf-8');
    await fsPromises.writeFile(filePath, content, 'utf-8');
    ok(res, { filename, backup: `.${filename}.backup` });
  } catch (e: any) {
    if (e.code === 'ENOENT') notFound(res, 'File');
    else serverError(res, e);
  }
});

// ─── Knowledge Base (Legacy FAQ) ────────────────────────────────────

router.get('/knowledge', (_req: Request, res: Response) => {
  res.json(configStore.getKnowledge());
});

router.post('/knowledge', (req: Request, res: Response) => {
  const { intent, response, dynamic } = req.body;
  const data = configStore.getKnowledge();

  if (dynamic) {
    if (!intent || typeof intent !== 'string') {
      badRequest(res, 'intent (string) required');
      return;
    }
    data.dynamic[intent.toLowerCase()] = typeof response === 'string' ? response : JSON.stringify(response);
    configStore.setKnowledge(data);
    ok(res, { type: 'dynamic', intent });
    return;
  }

  if (!intent || !response?.en) {
    badRequest(res, 'intent and response.en required');
    return;
  }
  const exists = data.static.find(e => e.intent === intent);
  if (exists) {
    conflict(res, `Intent "${intent}" already exists. Use PUT to update.`);
    return;
  }
  data.static.push({ intent, response: { en: response.en, ms: response.ms || '', zh: response.zh || '' } });
  configStore.setKnowledge(data);
  ok(res, { type: 'static', intent });
});

router.put('/knowledge/:intent', (req: Request, res: Response) => {
  const { intent } = req.params;
  const { response } = req.body;
  const data = configStore.getKnowledge();

  if (req.query.dynamic === 'true') {
    if (!response) {
      badRequest(res, 'response required');
      return;
    }
    data.dynamic[intent.toLowerCase()] = typeof response === 'string' ? response : JSON.stringify(response);
    configStore.setKnowledge(data);
    ok(res, { type: 'dynamic', intent });
    return;
  }

  const entry = data.static.find(e => e.intent === intent);
  if (!entry) {
    notFound(res, `Intent "${intent}"`);
    return;
  }
  if (response?.en !== undefined) entry.response.en = response.en;
  if (response?.ms !== undefined) entry.response.ms = response.ms;
  if (response?.zh !== undefined) entry.response.zh = response.zh;
  configStore.setKnowledge(data);
  ok(res, { type: 'static', intent, entry });
});

router.delete('/knowledge/:intent', (req: Request, res: Response) => {
  const { intent } = req.params;
  const data = configStore.getKnowledge();

  if (req.query.dynamic === 'true') {
    const key = intent.toLowerCase();
    if (!(key in data.dynamic)) {
      notFound(res, `Dynamic intent "${intent}"`);
      return;
    }
    delete data.dynamic[key];
    configStore.setKnowledge(data);
    ok(res, { type: 'dynamic', deleted: intent });
    return;
  }

  const idx = data.static.findIndex(e => e.intent === intent);
  if (idx === -1) {
    notFound(res, `Static intent "${intent}"`);
    return;
  }
  data.static.splice(idx, 1);
  configStore.setKnowledge(data);
  ok(res, { type: 'static', deleted: intent });
});

// Valid guest journey phases (for generate-draft category suggestion)
const GUEST_PHASES = ['GENERAL_SUPPORT', 'PRE_ARRIVAL', 'ARRIVAL_CHECKIN', 'DURING_STAY', 'CHECKOUT_DEPARTURE', 'POST_CHECKOUT'];

// ─── Generate Static Reply via AI (for a given intent) ─────────────────

router.post('/knowledge/generate', async (req: Request, res: Response) => {
  const { intent } = req.body;
  if (!intent || typeof intent !== 'string') {
    badRequest(res, 'intent (string) required');
    return;
  }
  if (!isAIAvailable()) {
    res.status(503).json({ error: 'AI not available — configure NVIDIA or Groq API key' });
    return;
  }

  const kb = getKnowledgeMarkdown();
  const prompt = `You are a helpful assistant for Pelangi Capsule Hostel. Generate a short, friendly static reply for the WhatsApp bot intent "${intent}".

Use ONLY information from the knowledge base below. If the knowledge base doesn't have specific info for this intent, write a generic but helpful hostel response.

Rules:
- Keep each response under 300 characters
- Be warm, concise, and professional
- Do NOT sign off as Rainbow or use emojis excessively
- The reply should feel natural for a WhatsApp message

<knowledge_base>
${kb}
</knowledge_base>

Return ONLY valid JSON (no markdown fences):
{"en": "English reply", "ms": "Malay reply", "zh": "Chinese reply"}`;

  try {
    const raw = await chat(prompt, [], `Generate static reply for intent: ${intent}`);
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = parseJsonFromLLM<{ en?: string; ms?: string; zh?: string }>(cleaned);
    const response = {
      en: typeof parsed.en === 'string' ? parsed.en : '',
      ms: typeof parsed.ms === 'string' ? parsed.ms : '',
      zh: typeof parsed.zh === 'string' ? parsed.zh : '',
    };
    ok(res, { intent, response });
  } catch (err: any) {
    serverError(res, `AI generation failed: ${err.message}`);
  }
});

// ─── Translate one language to the other two (same model as LLM reply) ───

const LANG_ORDER: Array<'en' | 'ms' | 'zh'> = ['en', 'ms', 'zh'];
const LANG_NAMES = { en: 'English', ms: 'Malay', zh: 'Chinese' };

/** Repair LLM JSON: escape control chars and unescaped " inside string values so JSON.parse succeeds. */
function repairJsonFromLLM(s: string): string {
  let out = '';
  let i = 0;
  let inString = false;
  while (i < s.length) {
    const c = s[i];
    if (!inString) {
      out += c;
      if (c === '"') inString = true;
      i++;
      continue;
    }
    if (c === '\\') {
      out += c;
      if (i + 1 < s.length) {
        out += s[i + 1];
        i += 2;
      } else {
        i++;
      }
      continue;
    }
    if (c === '"') {
      let j = i + 1;
      while (j < s.length && /[\s]/.test(s[j])) j++;
      const next = j < s.length ? s[j] : '';
      if (next === ',' || next === '}' || next === '"' || next === ':') {
        out += c;
        inString = false;
        i++;
        continue;
      }
      out += '\\"';
      i++;
      continue;
    }
    if (c === '\n') {
      out += '\\n';
      i++;
      continue;
    }
    if (c === '\r') {
      out += '\\r';
      i++;
      continue;
    }
    if (c === '\t') {
      out += '\\t';
      i++;
      continue;
    }
    const code = c.charCodeAt(0);
    if (code < 32 && c !== '\n' && c !== '\r' && c !== '\t') {
      out += ' ';
      i++;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

function parseJsonFromLLM<T = unknown>(cleaned: string): T {
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return JSON.parse(repairJsonFromLLM(cleaned)) as T;
  }
}

router.post('/knowledge/translate', async (req: Request, res: Response) => {
  const { en, ms, zh } = req.body || {};
  const current = {
    en: typeof en === 'string' ? en.trim() : '',
    ms: typeof ms === 'string' ? ms.trim() : '',
    zh: typeof zh === 'string' ? zh.trim() : '',
  };
  const sourceLang = LANG_ORDER.find(l => current[l].length > 0);
  if (!sourceLang) {
    badRequest(res, 'At least one of en, ms, or zh must be non-empty');
    return;
  }
  const sourceText = current[sourceLang];
  if (!isAIAvailable()) {
    res.status(503).json({ error: 'AI not available — configure an AI provider for LLM reply' });
    return;
  }

  const targetLangs = LANG_ORDER.filter(l => l !== sourceLang);
  const prompt = `You are a translator for a hostel WhatsApp bot. The following message is in ${LANG_NAMES[sourceLang]}.

Translate it to ${targetLangs.map(l => LANG_NAMES[l]).join(' and ')}. Keep the same tone (warm, concise). Suitable for guest messages. No emoji unless the original has them.

Return ONLY valid JSON (no markdown, no code fence) with exactly three keys: "en", "ms", "zh". Use the EXACT original text for the "${sourceLang}" key. For the other two keys, provide your translation. Inside JSON string values, escape double quotes as \\" and newlines as \\n.

Original (${LANG_NAMES[sourceLang]}):
${sourceText}

JSON:`;

  try {
    const raw = await chat(prompt, [], 'Translate quick reply to EN/MS/ZH');
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = parseJsonFromLLM<{ en?: string; ms?: string; zh?: string }>(cleaned);
    // Keep existing non-empty; fill missing from LLM
    const result = {
      en: current.en || (typeof parsed.en === 'string' ? parsed.en.trim() : ''),
      ms: current.ms || (typeof parsed.ms === 'string' ? parsed.ms.trim() : ''),
      zh: current.zh || (typeof parsed.zh === 'string' ? parsed.zh.trim() : ''),
    };
    ok(res, { en: result.en, ms: result.ms, zh: result.zh });
  } catch (err: any) {
    serverError(res, `Translation failed: ${err.message}`);
  }
});

// ─── Generate draft reply + suggested intent & category (for approval) ──

router.post('/knowledge/generate-draft', async (req: Request, res: Response) => {
  try {
    const topic = typeof req.body?.topic === 'string' ? req.body.topic.trim() : '';
    if (!isAIAvailable()) {
      res.status(503).json({ error: 'AI not available — configure NVIDIA or Groq API key' });
      return;
    }

    const kb = getKnowledgeMarkdown();
    const topicHint = topic
      ? `The user wants a reply for: "${topic}". `
      : 'The user wants a new static reply. Choose a useful topic that fits the knowledge base (e.g. breakfast, parking, luggage storage). ';

    const prompt = `You are a helpful assistant for Pelangi Capsule Hostel (capsule hostel in Johor Bahru). Your task is to propose ONE intent reply for their WhatsApp bot, based ONLY on the knowledge base below.

${topicHint}

Rules:
1. Identify the most specific "intent" key for this request. Use snake_case (e.g. breakfast_info, luggage_storage, extra_amenity_request). You MAY use an existing intent key if it fits the topic efficiently.
2. Suggest a "phase" — the guest journey category this reply belongs to. Use exactly one of: GENERAL_SUPPORT, PRE_ARRIVAL, ARRIVAL_CHECKIN, DURING_STAY, CHECKOUT_DEPARTURE, POST_CHECKOUT.
3. Generate "response" with three keys: "en" (English), "ms" (Malay), "zh" (Chinese). Use ONLY information from the knowledge base. Keep each under 300 characters. Be warm and concise; suitable for WhatsApp. Do not sign as Rainbow or overuse emojis.

<knowledge_base>
${kb}
</knowledge_base>

Return ONLY valid JSON (no markdown fences, no code block):
{"intent":"snake_case_key","phase":"ONE_OF_THE_PHASES_ABOVE","response":{"en":"English text","ms":"Malay text","zh":"Chinese text"}}`;

    const raw = await chat(prompt, [], 'Generate draft intent reply with category');
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = parseJsonFromLLM<{ intent?: string; phase?: string; response?: { en?: string; ms?: string; zh?: string }; en?: string }>(cleaned);

    const intent = (typeof parsed.intent === 'string' ? parsed.intent.replace(/\s+/g, '_').replace(/[^a-z0-9_]/gi, '').toLowerCase() : '') || 'custom_reply';
    let phase = typeof parsed.phase === 'string' ? parsed.phase.toUpperCase() : 'GENERAL_SUPPORT';
    if (!GUEST_PHASES.includes(phase)) phase = 'GENERAL_SUPPORT';

    const response = {
      en: typeof parsed.response?.en === 'string' ? parsed.response.en : '',
      ms: typeof parsed.response?.ms === 'string' ? parsed.response.ms : '',
      zh: typeof parsed.response?.zh === 'string' ? parsed.response.zh : '',
    };
    if (!response.en) response.en = (parsed as any).en || '';

    ok(res, { intent, phase, response });
  } catch (err: any) {
    if (res.headersSent) return;
    serverError(res, err?.message ? `AI generation failed: ${err.message}` : 'AI generation failed');
  }
});

export default router;
