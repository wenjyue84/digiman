import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { promises as fsPromises, accessSync } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { configStore } from '../assistant/config-store.js';
import type { KnowledgeData, IntentEntry, RoutingData, RoutingAction, WorkflowsData, WorkflowDefinition, AIProvider } from '../assistant/config-store.js';
import { getWhatsAppStatus, logoutWhatsApp, whatsappManager } from '../lib/baileys-client.js';
import QRCode from 'qrcode';
import { isAIAvailable, classifyAndRespond, testProvider, translateText } from '../assistant/ai-client.js';
import { getKnowledgeMarkdown, setKnowledgeMarkdown, buildSystemPrompt, guessTopicFiles, getTodayDate, getMYTTimestamp, listMemoryDays, getDurableMemory, getMemoryDir } from '../assistant/knowledge-base.js';
import { chat } from '../assistant/ai-client.js';
import axios from 'axios';

// Resolve .rainbow-kb directory (handles CWD being mcp-server/ or project root)
function resolveKBDir(): string {
  const fromCwd = path.resolve(process.cwd(), '.rainbow-kb');
  try { accessSync(fromCwd); return fromCwd; } catch {}
  return path.resolve(process.cwd(), '..', '.rainbow-kb');
}
const KB_FILES_DIR = resolveKBDir();

const router = Router();

// ─── Auth Middleware ─────────────────────────────────────────────────
function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || '';
  const isLocal = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  if (isLocal) {
    next();
    return;
  }
  const adminKey = process.env.RAINBOW_ADMIN_KEY;
  if (!adminKey) {
    // No key configured — allow all (dev mode)
    next();
    return;
  }
  const provided = req.headers['x-admin-key'];
  if (provided === adminKey) {
    next();
    return;
  }
  res.status(401).json({ error: 'Unauthorized' });
}

router.use(adminAuth);

// PERMANENT FIX: Prevent browser caching of all admin API responses
router.use((_req: Request, res: Response, next: NextFunction) => {
  res.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');
  next();
});

// ─── Markdown Knowledge Base (LLM-first) ───────────────────────────

router.get('/knowledge-base', (_req: Request, res: Response) => {
  res.json({ content: getKnowledgeMarkdown() });
});

router.put('/knowledge-base', (req: Request, res: Response) => {
  const { content } = req.body;
  if (typeof content !== 'string') {
    res.status(400).json({ error: 'content (string) required' });
    return;
  }
  setKnowledgeMarkdown(content);
  res.json({ ok: true, length: content.length });
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
    res.status(500).json({ error: e.message });
  }
});

router.get('/kb-files/:filename', async (req: Request, res: Response) => {
  const { filename } = req.params;
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    res.status(400).json({ error: 'Invalid filename' });
    return;
  }
  try {
    const content = await fsPromises.readFile(path.join(KB_FILES_DIR, filename), 'utf-8');
    res.json({ filename, content });
  } catch (e: any) {
    if (e.code === 'ENOENT') res.status(404).json({ error: 'File not found' });
    else res.status(500).json({ error: e.message });
  }
});

router.put('/kb-files/:filename', async (req: Request, res: Response) => {
  const { filename } = req.params;
  const { content } = req.body;
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    res.status(400).json({ error: 'Invalid filename' });
    return;
  }
  if (content === undefined) {
    res.status(400).json({ error: 'content required' });
    return;
  }
  try {
    const filePath = path.join(KB_FILES_DIR, filename);
    await fsPromises.access(filePath);
    const original = await fsPromises.readFile(filePath, 'utf-8');
    await fsPromises.writeFile(path.join(KB_FILES_DIR, `.${filename}.backup`), original, 'utf-8');
    await fsPromises.writeFile(filePath, content, 'utf-8');
    res.json({ ok: true, filename, backup: `.${filename}.backup` });
  } catch (e: any) {
    if (e.code === 'ENOENT') res.status(404).json({ error: 'File not found' });
    else res.status(500).json({ error: e.message });
  }
});

// ─── Memory System (Daily Logs + Durable Memory) ────────────────────

// GET /memory/durable — Read durable memory (memory.md)
router.get('/memory/durable', async (_req: Request, res: Response) => {
  try {
    const content = getDurableMemory();
    const kbDir = resolveKBDir();
    const filePath = path.join(kbDir, 'memory.md');
    let size = 0;
    try {
      const stats = await fsPromises.stat(filePath);
      size = stats.size;
    } catch {}
    res.json({ content, size });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /memory/durable — Update durable memory
router.put('/memory/durable', async (req: Request, res: Response) => {
  const { content } = req.body;
  if (content === undefined) {
    res.status(400).json({ error: 'content required' });
    return;
  }
  try {
    const kbDir = resolveKBDir();
    const filePath = path.join(kbDir, 'memory.md');
    // Backup original
    try {
      const original = await fsPromises.readFile(filePath, 'utf-8');
      await fsPromises.writeFile(path.join(kbDir, '.memory.md.backup'), original, 'utf-8');
    } catch {}
    await fsPromises.writeFile(filePath, content, 'utf-8');
    res.json({ ok: true, size: content.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /memory/flush — Manual memory flush (placeholder for AI Notes)
router.post('/memory/flush', async (_req: Request, res: Response) => {
  // For now, this is a placeholder that could be used to trigger AI-generated notes
  const today = getTodayDate();
  const timestamp = getMYTTimestamp();
  res.json({ ok: true, message: `Flush triggered at ${timestamp} on ${today}` });
});

// GET /memory — List all daily log files + stats
router.get('/memory', async (_req: Request, res: Response) => {
  try {
    const days = listMemoryDays();
    const memDir = getMemoryDir();
    const today = getTodayDate();

    // Count today's entries
    let todayEntries = 0;
    try {
      const todayFile = path.join(memDir, `${today}.md`);
      const content = await fsPromises.readFile(todayFile, 'utf-8');
      // Count lines that start with "- " (list items)
      todayEntries = (content.match(/^- \d{2}:\d{2}/gm) || []).length;
    } catch {}

    // Get durable memory size
    const durableContent = getDurableMemory();

    res.json({
      days,
      totalDays: days.length,
      today,
      todayEntries,
      durableMemorySize: durableContent.length
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /memory/:date — Read specific day's log
router.get('/memory/:date', async (req: Request, res: Response) => {
  const { date } = req.params;
  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    return;
  }
  try {
    const memDir = getMemoryDir();
    const filePath = path.join(memDir, `${date}.md`);
    const content = await fsPromises.readFile(filePath, 'utf-8');
    const stats = await fsPromises.stat(filePath);
    res.json({ date, content, size: stats.size, modified: stats.mtime });
  } catch (e: any) {
    if (e.code === 'ENOENT') {
      res.status(404).json({ error: `No log for ${date}` });
    } else {
      res.status(500).json({ error: e.message });
    }
  }
});

// PUT /memory/:date — Update (overwrite) day's log with backup
router.put('/memory/:date', async (req: Request, res: Response) => {
  const { date } = req.params;
  const { content } = req.body;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    return;
  }
  if (content === undefined) {
    res.status(400).json({ error: 'content required' });
    return;
  }
  try {
    const memDir = getMemoryDir();
    // Ensure memory directory exists
    await fsPromises.mkdir(memDir, { recursive: true });
    const filePath = path.join(memDir, `${date}.md`);
    // Backup if exists
    try {
      const original = await fsPromises.readFile(filePath, 'utf-8');
      await fsPromises.writeFile(path.join(memDir, `.${date}.md.backup`), original, 'utf-8');
    } catch {}
    await fsPromises.writeFile(filePath, content, 'utf-8');
    res.json({ ok: true, date, size: content.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /memory/:date/append — Append timestamped entry to a section
router.post('/memory/:date/append', async (req: Request, res: Response) => {
  const { date } = req.params;
  const { section, entry } = req.body;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    return;
  }
  if (!section || !entry) {
    res.status(400).json({ error: 'section and entry required' });
    return;
  }

  const DAILY_TEMPLATE = `# ${date} -- Daily Memory

## Staff Notes

## Issues Reported

## Operational Changes

## Patterns Observed

## AI Notes
`;

  try {
    const memDir = getMemoryDir();
    await fsPromises.mkdir(memDir, { recursive: true });
    const filePath = path.join(memDir, `${date}.md`);

    let content: string;
    try {
      content = await fsPromises.readFile(filePath, 'utf-8');
    } catch {
      // Auto-create daily template if file doesn't exist
      content = DAILY_TEMPLATE;
    }

    const timestamp = getMYTTimestamp();
    const newLine = `- ${timestamp} -- ${entry}`;

    // Find the section header and insert the entry after it
    const sectionHeader = `## ${section}`;
    const sectionIdx = content.indexOf(sectionHeader);
    if (sectionIdx === -1) {
      // Section not found — append it at the end
      content = content.trimEnd() + `\n\n${sectionHeader}\n${newLine}\n`;
    } else {
      // Find the end of the section header line
      const headerEnd = content.indexOf('\n', sectionIdx);
      if (headerEnd === -1) {
        content += `\n${newLine}`;
      } else {
        // Insert after header line (and any blank line)
        const afterHeader = headerEnd + 1;
        content = content.slice(0, afterHeader) + newLine + '\n' + content.slice(afterHeader);
      }
    }

    await fsPromises.writeFile(filePath, content, 'utf-8');
    res.json({ ok: true, date, section, timestamp, entry });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/intents/test', async (req: Request, res: Response) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: 'message (string) required' });
    return;
  }
  try {
    // Use hybrid classification system (regex → fuzzy → semantic → LLM)
    const { classifyMessage } = await import('../assistant/intents.js');
    const intentResult = await classifyMessage(message, []);

    // Get routing configuration
    const routingConfig = configStore.getRouting();
    const route = routingConfig[intentResult.category];
    const routedAction: string = route?.action || 'llm_reply';

    // Generate response based on routed action
    let response = '';
    if (routedAction === 'static_reply') {
      const { getStaticReply } = await import('../assistant/knowledge.js');
      response = getStaticReply(intentResult.category, 'en') || '(no static reply configured)';
    } else if (isAIAvailable()) {
      const systemPrompt = buildSystemPrompt(configStore.getSettings().system_prompt);
      const aiResult = await classifyAndRespond(systemPrompt, [], message);
      response = aiResult.response;
    }

    res.json({
      intent: intentResult.category,
      source: intentResult.source, // regex | fuzzy | semantic | llm
      action: routedAction,
      confidence: intentResult.confidence,
      response,
      matchedKeyword: intentResult.matchedKeyword,
      matchedExample: intentResult.matchedExample,
      detectedLanguage: intentResult.detectedLanguage
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Preview Chat (Simulate Guest Conversation) ────────────────────
router.post('/preview/chat', async (req: Request, res: Response) => {
  const { message, history } = req.body;
  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: 'message (string) required' });
    return;
  }

  try {
    const startTime = Date.now(); // Track total response time

    // Convert history format to match conversation format
    const conversationHistory = Array.isArray(history) ? history.map((msg: any) => ({
      role: (msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: msg.content,
      timestamp: msg.timestamp || new Date().toISOString()
    })) : [];

    // Use hybrid classification system first to get detection method
    const { classifyMessage } = await import('../assistant/intents.js');
    const intentResult = await classifyMessage(message, conversationHistory);

    // Get routed action
    const routingConfig = configStore.getRouting();
    const route = routingConfig[intentResult.category];
    const routedAction: string = route?.action || 'llm_reply';

    // Sub-intent detection (problem/complaint/info)
    const { detectMessageType } = await import('../assistant/problem-detector.js');
    const messageType = detectMessageType(message);

    // Generate response based on routed action
    let finalMessage = '';
    let llmModel = 'none';
    let topicFiles: string[] = [];
    let problemOverride = false;

    if (routedAction === 'static_reply') {
      const knowledge = configStore.getKnowledge();
      const staticEntry = knowledge.static.find(e => e.intent === intentResult.category);
      const staticText = staticEntry?.response?.en || '(no static reply configured)';

      if (messageType === 'info') {
        finalMessage = staticText;
      } else {
        // Problem/complaint → use LLM response instead of static
        problemOverride = true;
        if (isAIAvailable()) {
          topicFiles = guessTopicFiles(message);
          const systemPrompt = buildSystemPrompt(configStore.getSettings().system_prompt, topicFiles);
          const result = await classifyAndRespond(systemPrompt, conversationHistory, message);
          finalMessage = result.response || staticText;
          llmModel = result.model || 'unknown';
        } else {
          finalMessage = staticText; // Fallback if AI unavailable
        }
      }
    } else if (isAIAvailable()) {
      topicFiles = guessTopicFiles(message);
      const systemPrompt = buildSystemPrompt(configStore.getSettings().system_prompt, topicFiles);
      const result = await classifyAndRespond(systemPrompt, conversationHistory, message);
      finalMessage = result.response;
      llmModel = result.model || 'unknown';
    } else {
      finalMessage = 'AI not available';
    }

    const responseTime = Date.now() - startTime; // Total time including classification

    res.json({
      message: finalMessage,
      intent: intentResult.category,
      source: intentResult.source, // Detection method: regex | fuzzy | semantic | llm
      action: routedAction,
      routedAction: routedAction,
      confidence: intentResult.confidence,
      model: llmModel,
      responseTime: responseTime,
      matchedKeyword: intentResult.matchedKeyword,
      matchedExample: intentResult.matchedExample,
      detectedLanguage: intentResult.detectedLanguage,
      kbFiles: topicFiles.length > 0 ? ['AGENTS.md', 'soul.md', 'memory.md', ...topicFiles] : [],
      messageType: messageType,
      problemOverride: problemOverride
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Routing ────────────────────────────────────────────────────────

router.get('/routing', (_req: Request, res: Response) => {
  res.json(configStore.getRouting());
});

router.put('/routing', (req: Request, res: Response) => {
  const data = req.body;
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    res.status(400).json({ error: 'routing object required' });
    return;
  }
  const validActions: RoutingAction[] = ['static_reply', 'llm_reply', 'workflow'];
  for (const [intent, cfg] of Object.entries(data)) {
    if (!cfg || typeof (cfg as any).action !== 'string' || !validActions.includes((cfg as any).action)) {
      res.status(400).json({ error: `Invalid action for intent "${intent}". Must be one of: ${validActions.join(', ')}` });
      return;
    }
  }
  configStore.setRouting(data as RoutingData);
  res.json({ ok: true, routing: data });
});

router.patch('/routing/:intent', (req: Request, res: Response) => {
  const { intent } = req.params;
  const { action, workflow_id } = req.body;
  const validActions: RoutingAction[] = ['static_reply', 'llm_reply', 'workflow'];
  if (!action || !validActions.includes(action)) {
    res.status(400).json({ error: `action must be one of: ${validActions.join(', ')}` });
    return;
  }
  const data = { ...configStore.getRouting() };
  const entry: { action: RoutingAction; workflow_id?: string } = { action };
  if (action === 'workflow' && workflow_id) {
    entry.workflow_id = workflow_id;
  }
  data[intent] = entry;
  configStore.setRouting(data);
  res.json({ ok: true, intent, action, workflow_id: entry.workflow_id });
});

// ─── Knowledge Base (Legacy FAQ) ────────────────────────────────────

router.get('/knowledge', (_req: Request, res: Response) => {
  res.json(configStore.getKnowledge());
});

router.post('/knowledge', (req: Request, res: Response) => {
  const { intent, response, dynamic } = req.body;
  const data = configStore.getKnowledge();

  if (dynamic) {
    // Add dynamic knowledge entry
    if (!intent || typeof intent !== 'string') {
      res.status(400).json({ error: 'intent (string) required' });
      return;
    }
    data.dynamic[intent.toLowerCase()] = typeof response === 'string' ? response : JSON.stringify(response);
    configStore.setKnowledge(data);
    res.json({ ok: true, type: 'dynamic', intent });
    return;
  }

  // Add static FAQ entry
  if (!intent || !response?.en) {
    res.status(400).json({ error: 'intent and response.en required' });
    return;
  }
  const exists = data.static.find(e => e.intent === intent);
  if (exists) {
    res.status(409).json({ error: `Intent "${intent}" already exists. Use PUT to update.` });
    return;
  }
  data.static.push({ intent, response: { en: response.en, ms: response.ms || '', zh: response.zh || '' } });
  configStore.setKnowledge(data);
  res.json({ ok: true, type: 'static', intent });
});

router.put('/knowledge/:intent', (req: Request, res: Response) => {
  const { intent } = req.params;
  const { response } = req.body;
  const data = configStore.getKnowledge();

  // Check dynamic first
  if (req.query.dynamic === 'true') {
    if (!response) {
      res.status(400).json({ error: 'response required' });
      return;
    }
    data.dynamic[intent.toLowerCase()] = typeof response === 'string' ? response : JSON.stringify(response);
    configStore.setKnowledge(data);
    res.json({ ok: true, type: 'dynamic', intent });
    return;
  }

  // Update static
  const entry = data.static.find(e => e.intent === intent);
  if (!entry) {
    res.status(404).json({ error: `Intent "${intent}" not found` });
    return;
  }
  if (response?.en !== undefined) entry.response.en = response.en;
  if (response?.ms !== undefined) entry.response.ms = response.ms;
  if (response?.zh !== undefined) entry.response.zh = response.zh;
  configStore.setKnowledge(data);
  res.json({ ok: true, type: 'static', intent, entry });
});

router.delete('/knowledge/:intent', (req: Request, res: Response) => {
  const { intent } = req.params;
  const data = configStore.getKnowledge();

  if (req.query.dynamic === 'true') {
    const key = intent.toLowerCase();
    if (!(key in data.dynamic)) {
      res.status(404).json({ error: `Dynamic intent "${intent}" not found` });
      return;
    }
    delete data.dynamic[key];
    configStore.setKnowledge(data);
    res.json({ ok: true, type: 'dynamic', deleted: intent });
    return;
  }

  const idx = data.static.findIndex(e => e.intent === intent);
  if (idx === -1) {
    res.status(404).json({ error: `Static intent "${intent}" not found` });
    return;
  }
  data.static.splice(idx, 1);
  configStore.setKnowledge(data);
  res.json({ ok: true, type: 'static', deleted: intent });
});

// ─── Generate Static Reply via AI ────────────────────────────────────

router.post('/knowledge/generate', async (req: Request, res: Response) => {
  const { intent } = req.body;
  if (!intent || typeof intent !== 'string') {
    res.status(400).json({ error: 'intent (string) required' });
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
    // Strip markdown fences if present
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);
    const response = {
      en: typeof parsed.en === 'string' ? parsed.en : '',
      ms: typeof parsed.ms === 'string' ? parsed.ms : '',
      zh: typeof parsed.zh === 'string' ? parsed.zh : '',
    };
    res.json({ ok: true, intent, response });
  } catch (err: any) {
    res.status(500).json({ error: `AI generation failed: ${err.message}` });
  }
});

// ─── Intents (Skills) ───────────────────────────────────────────────

router.get('/intents', (_req: Request, res: Response) => {
  res.json(configStore.getIntents());
});

router.post('/intents', (req: Request, res: Response) => {
  const { category, patterns, flags, enabled } = req.body;
  if (!category || !Array.isArray(patterns)) {
    res.status(400).json({ error: 'category and patterns[] required' });
    return;
  }
  const data = configStore.getIntents();
  const exists = data.categories.find(c => c.category === category);
  if (exists) {
    res.status(409).json({ error: `Category "${category}" already exists. Use PUT to update.` });
    return;
  }
  const entry: IntentEntry = {
    category,
    patterns,
    flags: flags || 'i',
    enabled: enabled !== false
  };
  data.categories.push(entry);
  configStore.setIntents(data);
  res.json({ ok: true, category, entry });
});

router.put('/intents/:category', (req: Request, res: Response) => {
  const { category } = req.params;
  const data = configStore.getIntents();
  const entry = data.categories.find(c => c.category === category);
  if (!entry) {
    res.status(404).json({ error: `Category "${category}" not found` });
    return;
  }
  if (req.body.patterns !== undefined) entry.patterns = req.body.patterns;
  if (req.body.flags !== undefined) entry.flags = req.body.flags;
  if (req.body.enabled !== undefined) entry.enabled = req.body.enabled;
  configStore.setIntents(data);
  res.json({ ok: true, category, entry });
});

router.delete('/intents/:category', (req: Request, res: Response) => {
  const { category } = req.params;
  const data = configStore.getIntents();
  const idx = data.categories.findIndex(c => c.category === category);
  if (idx === -1) {
    res.status(404).json({ error: `Category "${category}" not found` });
    return;
  }
  data.categories.splice(idx, 1);
  configStore.setIntents(data);
  res.json({ ok: true, deleted: category });
});

// ─── Templates ──────────────────────────────────────────────────────

router.get('/templates', (_req: Request, res: Response) => {
  res.json(configStore.getTemplates());
});

router.post('/templates', (req: Request, res: Response) => {
  const { key, en, ms, zh } = req.body;
  if (!key || !en) {
    res.status(400).json({ error: 'key and en required' });
    return;
  }
  const data = configStore.getTemplates();
  if (data[key]) {
    res.status(409).json({ error: `Template "${key}" already exists. Use PUT to update.` });
    return;
  }
  data[key] = { en, ms: ms || '', zh: zh || '' };
  configStore.setTemplates(data);
  res.json({ ok: true, key });
});

router.put('/templates/:key', (req: Request, res: Response) => {
  const { key } = req.params;
  const data = configStore.getTemplates();
  if (!data[key]) {
    res.status(404).json({ error: `Template "${key}" not found` });
    return;
  }
  if (req.body.en !== undefined) data[key].en = req.body.en;
  if (req.body.ms !== undefined) data[key].ms = req.body.ms;
  if (req.body.zh !== undefined) data[key].zh = req.body.zh;
  configStore.setTemplates(data);
  res.json({ ok: true, key, template: data[key] });
});

router.delete('/templates/:key', (req: Request, res: Response) => {
  const { key } = req.params;
  const data = configStore.getTemplates();
  if (!data[key]) {
    res.status(404).json({ error: `Template "${key}" not found` });
    return;
  }
  delete data[key];
  configStore.setTemplates(data);
  res.json({ ok: true, deleted: key });
});

// ─── Settings ───────────────────────────────────────────────────────

router.get('/settings', (_req: Request, res: Response) => {
  res.json(configStore.getSettings());
});

router.patch('/settings', (req: Request, res: Response) => {
  const current = configStore.getSettings();
  const merged = deepMerge(current, req.body);
  configStore.setSettings(merged);
  res.json({ ok: true, settings: merged });
});

// ─── AI Providers Management ─────────────────────────────────────────

router.put('/settings/providers', (req: Request, res: Response) => {
  const providers = req.body;
  if (!Array.isArray(providers)) {
    res.status(400).json({ error: 'providers array required' });
    return;
  }
  const settings = configStore.getSettings();
  settings.ai.providers = providers;
  configStore.setSettings(settings);
  res.json({ ok: true, providers: settings.ai.providers });
});

router.post('/settings/providers', (req: Request, res: Response) => {
  const { id, name, description, type, api_key_env, api_key, base_url, model, enabled } = req.body;
  if (!id || !name || !type || !base_url || !model) {
    res.status(400).json({ error: 'id, name, type, base_url, and model required' });
    return;
  }
  const validTypes = ['openai-compatible', 'groq', 'ollama'];
  if (!validTypes.includes(type)) {
    res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` });
    return;
  }
  const settings = configStore.getSettings();
  if (!settings.ai.providers) settings.ai.providers = [];
  if (settings.ai.providers.find(p => p.id === id)) {
    res.status(409).json({ error: `Provider "${id}" already exists` });
    return;
  }
  const maxPriority = settings.ai.providers.reduce((max, p) => Math.max(max, p.priority), -1);
  const newProvider: AIProvider = {
    id: id.trim().toLowerCase().replace(/\s+/g, '-'),
    name: name.trim(),
    type,
    api_key_env: api_key_env || '',
    base_url: base_url.trim(),
    model: model.trim(),
    enabled: enabled !== false,
    priority: maxPriority + 1
  };
  if (api_key) newProvider.api_key = api_key;
  if (description) newProvider.description = description;
  settings.ai.providers.push(newProvider);
  configStore.setSettings(settings);
  res.json({ ok: true, provider: newProvider });
});

router.delete('/settings/providers/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const settings = configStore.getSettings();
  if (!settings.ai.providers) {
    res.status(404).json({ error: `Provider "${id}" not found` });
    return;
  }
  const idx = settings.ai.providers.findIndex(p => p.id === id);
  if (idx === -1) {
    res.status(404).json({ error: `Provider "${id}" not found` });
    return;
  }
  settings.ai.providers.splice(idx, 1);
  configStore.setSettings(settings);
  res.json({ ok: true, deleted: id });
});

// ─── Workflow ───────────────────────────────────────────────────────

router.get('/workflow', (_req: Request, res: Response) => {
  res.json(configStore.getWorkflow());
});

router.patch('/workflow', (req: Request, res: Response) => {
  const current = configStore.getWorkflow();
  const merged = deepMerge(current, req.body);
  configStore.setWorkflow(merged);
  res.json({ ok: true, workflow: merged });
});

// ─── Workflow Testing (Send Real Message) ────────────────────────────

router.post('/test-workflow/send-summary', async (req: Request, res: Response) => {
  const { workflowId, collectedData, phone } = req.body;
  if (!workflowId || !phone) {
    res.status(400).json({ error: 'workflowId and phone required' });
    return;
  }

  try {
    const workflows = configStore.getWorkflows();
    const workflow = workflows.workflows.find(w => w.id === workflowId);
    if (!workflow) {
      res.status(404).json({ error: `Workflow "${workflowId}" not found` });
      return;
    }

    // Build summary
    const lines: string[] = [];
    lines.push(`📋 *Workflow Test Summary: ${workflow.name}*`);
    lines.push('');
    lines.push(`🧪 *Test Mode*`);
    lines.push(`📱 *Admin Phone:* ${phone}`);
    lines.push('');
    lines.push('*Collected Test Responses:*');

    Object.entries(collectedData).forEach(([stepId, response], idx) => {
      const step = workflow.steps.find(s => s.id === stepId);
      if (step) {
        lines.push(`${idx + 1}. ${step.message.en}`);
        lines.push(`   ↳ _${response}_`);
      }
    });

    lines.push('');
    lines.push('---');
    lines.push('🧪 _Test executed via Workflow Tester_');
    lines.push('🤖 _Generated by Rainbow AI Assistant_');

    const summary = lines.join('\n');

    // Send via WhatsApp - use the helper that auto-detects connected instance
    const { sendWhatsAppMessage } = await import('../lib/baileys-client.js');
    await sendWhatsAppMessage(phone, summary);
    console.log(`[Admin] Workflow test summary sent to ${phone}`);

    res.json({ ok: true, message: 'Summary sent successfully', summary });
  } catch (err: any) {
    console.error('[Admin] Failed to send workflow test summary:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Workflows (Step Definitions) ────────────────────────────────

router.get('/workflows', (_req: Request, res: Response) => {
  res.json(configStore.getWorkflows());
});

router.get('/workflows/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const data = configStore.getWorkflows();
  const wf = data.workflows.find(w => w.id === id);
  if (!wf) {
    res.status(404).json({ error: `Workflow "${id}" not found` });
    return;
  }
  res.json(wf);
});

router.post('/workflows', (req: Request, res: Response) => {
  const { id, name, steps } = req.body;
  if (!id || typeof id !== 'string' || !name || typeof name !== 'string') {
    res.status(400).json({ error: 'id and name required' });
    return;
  }
  const data = configStore.getWorkflows();
  if (data.workflows.find(w => w.id === id)) {
    res.status(409).json({ error: `Workflow "${id}" already exists` });
    return;
  }
  const newWf: WorkflowDefinition = {
    id: id.trim().toLowerCase().replace(/\s+/g, '_'),
    name: name.trim(),
    steps: Array.isArray(steps) ? steps : []
  };
  data.workflows.push(newWf);
  configStore.setWorkflows(data);
  res.json({ ok: true, workflow: newWf });
});

router.put('/workflows/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const data = configStore.getWorkflows();
  const idx = data.workflows.findIndex(w => w.id === id);
  if (idx === -1) {
    res.status(404).json({ error: `Workflow "${id}" not found` });
    return;
  }
  if (req.body.name !== undefined) data.workflows[idx].name = req.body.name;
  if (req.body.steps !== undefined) data.workflows[idx].steps = req.body.steps;
  configStore.setWorkflows(data);
  res.json({ ok: true, workflow: data.workflows[idx] });
});

router.delete('/workflows/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  // Check if any routing references this workflow
  const routing = configStore.getRouting();
  const refs = Object.entries(routing).filter(([, cfg]) => cfg.action === 'workflow' && cfg.workflow_id === id);
  if (refs.length > 0) {
    const intentNames = refs.map(([intent]) => intent).join(', ');
    res.status(409).json({ error: `Cannot delete: workflow "${id}" is referenced by intents: ${intentNames}` });
    return;
  }
  const data = configStore.getWorkflows();
  const idx = data.workflows.findIndex(w => w.id === id);
  if (idx === -1) {
    res.status(404).json({ error: `Workflow "${id}" not found` });
    return;
  }
  data.workflows.splice(idx, 1);
  configStore.setWorkflows(data);
  res.json({ ok: true, deleted: id });
});

// ─── System ─────────────────────────────────────────────────────────

// Helper function to check server health
async function checkServerHealth(url: string, timeout: number = 2000): Promise<{ online: boolean; responseTime?: number; error?: string }> {
  const startTime = Date.now();
  try {
    await axios.get(url, { timeout, validateStatus: () => true });
    return { online: true, responseTime: Date.now() - startTime };
  } catch (error: any) {
    return { online: false, error: error.code || error.message };
  }
}

router.post('/reload', (_req: Request, res: Response) => {
  configStore.forceReload();
  res.json({ ok: true, message: 'All config reloaded from disk' });
});

router.get('/status', async (_req: Request, res: Response) => {
  const wa = getWhatsAppStatus();
  const instances = whatsappManager.getAllStatuses();

  // Check server health
  const [backendHealth, frontendHealth] = await Promise.all([
    checkServerHealth('http://localhost:5000/api/health'),
    checkServerHealth('http://localhost:3000')
  ]);

  // Build AI provider status from dynamic config
  const settings = configStore.getSettings();
  const configuredProviders = settings.ai.providers || [];
  const aiProviders = configuredProviders.map(p => {
    const hasKey = p.type === 'ollama' || !!(p.api_key || (p.api_key_env && process.env[p.api_key_env]));
    return {
      id: p.id,
      name: p.name,
      type: p.type,
      priority: p.priority,
      enabled: p.enabled,
      available: hasKey,
      status: hasKey ? 'configured' : 'not_configured',
      details: hasKey
        ? (p.api_key_env ? `${p.api_key_env} set` : p.type === 'ollama' ? p.base_url : 'API key stored')
        : (p.api_key_env ? `${p.api_key_env} not set` : 'No API key')
    };
  });

  res.json({
    servers: {
      mcp: {
        name: 'MCP Server',
        port: 3001,
        online: true, // Self-check - we're responding
        responseTime: 0
      },
      backend: {
        name: 'Backend API',
        port: 5000,
        online: backendHealth.online,
        responseTime: backendHealth.responseTime,
        url: 'http://localhost:5000',
        error: backendHealth.error
      },
      frontend: {
        name: 'Frontend (Vite)',
        port: 3000,
        online: frontendHealth.online,
        responseTime: frontendHealth.responseTime,
        url: 'http://localhost:3000',
        error: frontendHealth.error
      }
    },
    whatsapp: {
      state: wa.state,
      user: wa.user
    },
    whatsappInstances: instances.map(i => ({
      id: i.id,
      label: i.label,
      state: i.state,
      user: i.user,
      unlinkedFromWhatsApp: i.unlinkedFromWhatsApp,
      lastUnlinkedAt: i.lastUnlinkedAt,
      lastConnectedAt: i.lastConnectedAt
    })),
    ai: {
      available: isAIAvailable(),
      providers: aiProviders
    },
    config_files: ['knowledge', 'intents', 'templates', 'settings', 'workflow', 'workflows', 'routing']
  });
});

// ─── Test AI Provider (dynamic) ──────────────────────────────────────
router.post('/test-ai/:provider', async (req: Request, res: Response) => {
  const providerId = req.params.provider;
  try {
    const result = await testProvider(providerId);
    res.json(result);
  } catch (e: any) {
    res.json({ ok: false, error: e.message });
  }
});

router.post('/whatsapp/logout', async (_req: Request, res: Response) => {
  try {
    await logoutWhatsApp();
    res.json({ ok: true, message: 'WhatsApp session logged out' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── WhatsApp Instance Management ───────────────────────────────────

router.get('/whatsapp/instances', (_req: Request, res: Response) => {
  res.json(whatsappManager.getAllStatuses());
});

router.post('/whatsapp/instances', async (req: Request, res: Response) => {
  const { id, label } = req.body;
  if (!id || typeof id !== 'string') {
    res.status(400).json({ error: 'id (phone number or slug) is required' });
    return;
  }
  if (!label || typeof label !== 'string') {
    res.status(400).json({ error: 'label is required' });
    return;
  }
  const trimId = id.trim();
  const trimLabel = label.trim();
  if (trimId.length < 2 || trimId.length > 20) {
    res.status(400).json({ error: 'Instance ID must be 2-20 characters' });
    return;
  }
  try {
    const status = await whatsappManager.addInstance(trimId, trimLabel);
    res.json({ ok: true, instance: status });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/whatsapp/instances/:id', async (req: Request, res: Response) => {
  try {
    await whatsappManager.removeInstance(req.params.id);
    res.json({ ok: true, message: `Instance "${req.params.id}" removed` });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/whatsapp/instances/:id/logout', async (req: Request, res: Response) => {
  try {
    await whatsappManager.logoutInstance(req.params.id);
    res.json({ ok: true, message: `Instance "${req.params.id}" logged out` });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/whatsapp/instances/:id/qr', async (req: Request, res: Response) => {
  try {
    const status = whatsappManager.getInstanceStatus(req.params.id);
    if (!status) {
      res.status(404).json({ error: `Instance "${req.params.id}" not found` });
      return;
    }
    let qrDataUrl: string | null = null;
    if (status.qr) {
      qrDataUrl = await QRCode.toDataURL(status.qr);
    }
    res.json({
      id: status.id,
      state: status.state,
      qr: status.qr,
      qrDataUrl
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Intent Manager Proxy (forwards to backend API) ─────────────────

router.get('/intent-manager/keywords', async (_req: Request, res: Response) => {
  try {
    const response = await axios.get('http://localhost:5000/api/intent-manager/keywords');
    res.json(response.data);
  } catch (e: any) {
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

router.get('/intent-manager/examples', async (_req: Request, res: Response) => {
  try {
    const response = await axios.get('http://localhost:5000/api/intent-manager/examples');
    res.json(response.data);
  } catch (e: any) {
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

router.put('/intent-manager/keywords/:intent', async (req: Request, res: Response) => {
  try {
    const response = await axios.put(`http://localhost:5000/api/intent-manager/keywords/${req.params.intent}`, req.body);
    res.json(response.data);
  } catch (e: any) {
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

router.put('/intent-manager/examples/:intent', async (req: Request, res: Response) => {
  try {
    const response = await axios.put(`http://localhost:5000/api/intent-manager/examples/${req.params.intent}`, req.body);
    res.json(response.data);
  } catch (e: any) {
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

router.post('/intent-manager/test', async (req: Request, res: Response) => {
  try {
    const response = await axios.post('http://localhost:5000/api/intent-manager/test', req.body);
    res.json(response.data);
  } catch (e: any) {
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

router.get('/intent-manager/stats', async (_req: Request, res: Response) => {
  try {
    const response = await axios.get('http://localhost:5000/api/intent-manager/stats');
    res.json(response.data);
  } catch (e: any) {
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

router.get('/intent-manager/export', async (req: Request, res: Response) => {
  try {
    const format = req.query.format || 'json';
    const response = await axios.get(`http://localhost:5000/api/intent-manager/export?format=${format}`, {
      responseType: format === 'csv' ? 'text' : 'json'
    });
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=intents-export.csv');
      res.send(response.data);
    } else {
      res.json(response.data);
    }
  } catch (e: any) {
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

// ─── T1: Regex Patterns ─────────────────────────────────────────────

router.get('/intent-manager/regex', async (_req: Request, res: Response) => {
  try {
    const response = await axios.get('http://localhost:5000/api/intent-manager/regex');
    res.json(response.data);
  } catch (e: any) {
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

router.put('/intent-manager/regex', async (req: Request, res: Response) => {
  try {
    const response = await axios.put('http://localhost:5000/api/intent-manager/regex', req.body);
    res.json(response.data);
  } catch (e: any) {
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

// ─── T4: LLM Settings ───────────────────────────────────────────────

router.get('/intent-manager/llm-settings/available-providers', async (_req: Request, res: Response) => {
  try {
    const response = await axios.get('http://localhost:5000/api/intent-manager/llm-settings/available-providers');
    res.json(response.data);
  } catch (e: any) {
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

router.get('/intent-manager/llm-settings', async (_req: Request, res: Response) => {
  try {
    const response = await axios.get('http://localhost:5000/api/intent-manager/llm-settings');
    res.json(response.data);
  } catch (e: any) {
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

router.put('/intent-manager/llm-settings', async (req: Request, res: Response) => {
  try {
    const response = await axios.put('http://localhost:5000/api/intent-manager/llm-settings', req.body);
    res.json(response.data);
  } catch (e: any) {
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

router.post('/intent-manager/llm-test', async (req: Request, res: Response) => {
  try {
    const response = await axios.post('http://localhost:5000/api/intent-manager/llm-test', req.body);
    res.json(response.data);
  } catch (e: any) {
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

// ─── Deep merge utility ─────────────────────────────────────────────

function deepMerge<T extends Record<string, any>>(target: T, source: Record<string, any>): T {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const tVal = (result as any)[key];
    const sVal = source[key];
    if (
      sVal !== null &&
      typeof sVal === 'object' &&
      !Array.isArray(sVal) &&
      tVal !== null &&
      typeof tVal === 'object' &&
      !Array.isArray(tVal)
    ) {
      (result as any)[key] = deepMerge(tVal, sVal);
    } else {
      (result as any)[key] = sVal;
    }
  }
  return result;
}

// ─── Conversation History (Real Chat) ─────────────────────────────────
import { listConversations, getConversation, deleteConversation } from '../assistant/conversation-logger.js';

router.get('/conversations', async (_req: Request, res: Response) => {
  try {
    const conversations = await listConversations();
    res.json(conversations);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/conversations/:phone', async (req: Request, res: Response) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    const log = await getConversation(phone);
    if (!log) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    res.json(log);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/conversations/:phone', async (req: Request, res: Response) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    const deleted = await deleteConversation(phone);
    res.json({ ok: deleted });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Send manual message to guest
router.post('/conversations/:phone/send', async (req: Request, res: Response) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    const { message, instanceId } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'message (string) required' });
      return;
    }

    // Get existing conversation to retrieve pushName
    const log = await getConversation(phone);
    const pushName = log?.pushName || 'Guest';

    // Check if requested instance is connected, fallback to any connected instance
    let targetInstanceId = instanceId;
    if (instanceId) {
      const status = whatsappManager.getInstanceStatus(instanceId);
      if (!status || status.state !== 'open') {
        console.warn(`[Admin] Instance "${instanceId}" not connected, finding fallback...`);
        // Find any connected instance
        const instances = whatsappManager.getAllStatuses();
        const connectedInstance = instances.find(i => i.state === 'open');
        if (connectedInstance) {
          targetInstanceId = connectedInstance.id;
          console.log(`[Admin] Using fallback instance: ${targetInstanceId}`);
        } else {
          res.status(503).json({ error: 'No WhatsApp instances connected. Please check WhatsApp connection.' });
          return;
        }
      }
    }

    // Send the message via WhatsApp
    const { sendWhatsAppMessage } = await import('../lib/baileys-client.js');
    await sendWhatsAppMessage(phone, message, targetInstanceId);

    // Log the manual message in the conversation history
    const { logMessage } = await import('../assistant/conversation-logger.js');
    await logMessage(phone, pushName, 'assistant', message, { manual: true, instanceId: targetInstanceId });

    console.log(`[Admin] Manual message sent to ${phone} via ${targetInstanceId || 'default'}: ${message.substring(0, 50)}...`);
    res.json({ ok: true, message: 'Message sent successfully', usedInstance: targetInstanceId });
  } catch (err: any) {
    console.error('[Admin] Failed to send manual message:', err);
    res.status(500).json({ error: err.message });
  }
});

// Translate text to target language
router.post('/translate', async (req: Request, res: Response) => {
  try {
    const { text, targetLang } = req.body;

    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'text (string) required' });
      return;
    }

    if (!targetLang || typeof targetLang !== 'string') {
      res.status(400).json({ error: 'targetLang (string) required' });
      return;
    }

    // Language mapping for better translation
    const langMap: Record<string, string> = {
      'en': 'English',
      'ms': 'Malay',
      'zh': 'Chinese',
      'id': 'Indonesian',
      'th': 'Thai',
      'vi': 'Vietnamese'
    };

    const sourceLang = 'auto'; // Auto-detect source language
    const targetLangName = langMap[targetLang] || targetLang;

    const translated = await translateText(text, sourceLang, targetLangName);

    if (!translated) {
      res.status(500).json({ error: 'Translation failed' });
      return;
    }

    console.log(`[Admin] Translated text to ${targetLangName}: ${text.substring(0, 50)}... -> ${translated.substring(0, 50)}...`);
    res.json({ translated, targetLang });
  } catch (err: any) {
    console.error('[Admin] Translation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Test Runner ─────────────────────────────────────────────────────
router.post('/tests/run', adminAuth, async (_req: Request, res: Response) => {
  const projectArg = (_req.body?.project as string) || 'unit';
  const allowed = ['unit', 'integration', 'semantic'];
  if (!allowed.includes(projectArg)) {
    res.status(400).json({ error: `Invalid project: ${projectArg}. Allowed: ${allowed.join(', ')}` });
    return;
  }

  const mcpRoot = path.resolve(process.cwd());
  const npxPath = process.platform === 'win32' ? 'npx.cmd' : 'npx';

  try {
    const result = await new Promise<{ stdout: string; stderr: string; code: number }>((resolve) => {
      let stdout = '';
      let stderr = '';
      const child = spawn(npxPath, ['vitest', 'run', '--project', projectArg, '--reporter=json'], {
        cwd: mcpRoot,
        env: { ...process.env, FORCE_COLOR: '0' },
        shell: true,
        timeout: 120_000,
      });
      child.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
      child.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
      child.on('close', (code) => resolve({ stdout, stderr, code: code ?? 1 }));
      child.on('error', (err) => resolve({ stdout, stderr: err.message, code: 1 }));
    });

    // Vitest JSON reporter outputs JSON to stdout
    let parsed: any = null;
    try {
      // Find the JSON object in stdout (vitest may print other text before it)
      const jsonStart = result.stdout.indexOf('{');
      if (jsonStart >= 0) {
        parsed = JSON.parse(result.stdout.slice(jsonStart));
      }
    } catch { /* non-JSON output, return raw */ }

    if (parsed) {
      const testFiles = (parsed.testResults || []).map((f: any) => ({
        file: path.basename(f.name || ''),
        status: f.status,
        tests: (f.assertionResults || []).map((t: any) => ({
          name: t.fullName || t.title,
          status: t.status,
          duration: t.duration,
          failureMessages: t.failureMessages,
        })),
        duration: f.endTime - f.startTime,
      }));

      res.json({
        success: parsed.success ?? (result.code === 0),
        numTotalTests: parsed.numTotalTests ?? 0,
        numPassedTests: parsed.numPassedTests ?? 0,
        numFailedTests: parsed.numFailedTests ?? 0,
        numTotalTestSuites: parsed.numTotalTestSuites ?? 0,
        numPassedTestSuites: parsed.numPassedTestSuites ?? 0,
        numFailedTestSuites: parsed.numFailedTestSuites ?? 0,
        startTime: parsed.startTime,
        duration: Date.now() - (parsed.startTime || Date.now()),
        testFiles,
        project: projectArg,
      });
    } else {
      res.json({
        success: result.code === 0,
        raw: result.stdout.slice(0, 5000),
        stderr: result.stderr.slice(0, 2000),
        project: projectArg,
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Test Coverage Runner ────────────────────────────────────────────
router.post('/tests/coverage', adminAuth, async (_req: Request, res: Response) => {
  const mcpRoot = path.resolve(process.cwd());
  const npxPath = process.platform === 'win32' ? 'npx.cmd' : 'npx';

  try {
    const result = await new Promise<{ stdout: string; stderr: string; code: number }>((resolve) => {
      let stdout = '';
      let stderr = '';
      const child = spawn(npxPath, ['vitest', 'run', '--project', 'unit', '--coverage', '--reporter=json'], {
        cwd: mcpRoot,
        env: { ...process.env, FORCE_COLOR: '0' },
        shell: true,
        timeout: 120_000,
      });
      child.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
      child.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
      child.on('close', (code) => resolve({ stdout, stderr, code: code ?? 1 }));
      child.on('error', (err) => resolve({ stdout, stderr: err.message, code: 1 }));
    });

    // Parse coverage from stderr (vitest outputs coverage summary to stderr)
    const coverageLines = result.stderr.split('\n').filter(l => l.includes('|') && !l.includes('---'));
    const coverage: { file: string; stmts: string; branch: string; funcs: string; lines: string }[] = [];
    for (const line of coverageLines) {
      const parts = line.split('|').map(p => p.trim()).filter(Boolean);
      if (parts.length >= 5 && parts[0] !== 'File') {
        coverage.push({ file: parts[0], stmts: parts[1], branch: parts[2], funcs: parts[3], lines: parts[4] });
      }
    }

    res.json({
      success: result.code === 0,
      coverage,
      raw: result.stderr.slice(0, 5000),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
