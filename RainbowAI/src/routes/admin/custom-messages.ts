/**
 * Admin API routes for custom message templates (US-015).
 *
 * Templates stored in RainbowAI/data/custom-messages.json.
 * Also serves merged list of built-in static replies + custom templates
 * for the / command palette in Live Chat.
 *
 * Atomic write pattern: write to .tmp then rename (same as config-store.ts).
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import { readFileSync, writeFileSync, existsSync, renameSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const CUSTOM_FILE = join(process.cwd(), 'data', 'custom-messages.json');
const KNOWLEDGE_FILE = join(process.cwd(), 'src', 'assistant', 'data', 'knowledge.json');

const router = Router();

interface CustomTemplate {
  id: string;
  name: string;
  content: string;
  category?: string;
}

interface CustomMessagesData {
  templates: CustomTemplate[];
}

interface PaletteEntry {
  id: string;
  name: string;
  content: string;
  category: string;
  source: 'builtin' | 'custom';
}

function loadCustomMessages(): CustomMessagesData {
  try {
    if (!existsSync(CUSTOM_FILE)) return { templates: [] };
    const raw = readFileSync(CUSTOM_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.templates)) return parsed as CustomMessagesData;
    return { templates: [] };
  } catch {
    return { templates: [] };
  }
}

function saveCustomMessages(data: CustomMessagesData): void {
  const dir = dirname(CUSTOM_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmpPath = CUSTOM_FILE + '.tmp';
  writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  renameSync(tmpPath, CUSTOM_FILE);
}

function loadBuiltinTemplates(): PaletteEntry[] {
  try {
    if (!existsSync(KNOWLEDGE_FILE)) return [];
    const raw = readFileSync(KNOWLEDGE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.static)) return [];
    return parsed.static.map((entry: any) => {
      const content = typeof entry.response === 'object'
        ? (entry.response.en || Object.values(entry.response)[0] || '')
        : String(entry.response || '');
      return {
        id: 'builtin-' + entry.intent,
        name: entry.intent.replace(/_/g, ' '),
        content: content,
        category: 'Static Reply',
        source: 'builtin' as const
      };
    });
  } catch {
    return [];
  }
}

// GET /custom-messages — list all (builtin + custom) for palette
router.get('/custom-messages', (_req: Request, res: Response) => {
  const builtins = loadBuiltinTemplates();
  const custom = loadCustomMessages();
  const customEntries: PaletteEntry[] = custom.templates.map(t => ({
    id: t.id,
    name: t.name,
    content: t.content,
    category: t.category || 'Custom',
    source: 'custom' as const
  }));
  res.json({ templates: [...builtins, ...customEntries] });
});

// GET /custom-messages/custom — list only custom templates
router.get('/custom-messages/custom', (_req: Request, res: Response) => {
  const data = loadCustomMessages();
  res.json(data);
});

// POST /custom-messages — add a new custom template
router.post('/custom-messages', (req: Request, res: Response) => {
  const { name, content, category } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  if (!content || typeof content !== 'string' || !content.trim()) {
    res.status(400).json({ error: 'content is required' });
    return;
  }

  const data = loadCustomMessages();
  const id = 'custom-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  const template: CustomTemplate = {
    id,
    name: name.trim(),
    content: content.trim(),
    category: (category && typeof category === 'string') ? category.trim() : undefined
  };
  data.templates.push(template);
  saveCustomMessages(data);
  res.json({ template, total: data.templates.length });
});

// PUT /custom-messages/:id — update a custom template
router.put('/custom-messages/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, content, category } = req.body;
  const data = loadCustomMessages();
  const idx = data.templates.findIndex(t => t.id === id);
  if (idx === -1) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }
  if (name && typeof name === 'string') data.templates[idx].name = name.trim();
  if (content && typeof content === 'string') data.templates[idx].content = content.trim();
  if (category !== undefined) data.templates[idx].category = (typeof category === 'string') ? category.trim() : undefined;
  saveCustomMessages(data);
  res.json({ template: data.templates[idx] });
});

// DELETE /custom-messages/:id — delete a custom template
router.delete('/custom-messages/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const data = loadCustomMessages();
  const idx = data.templates.findIndex(t => t.id === id);
  if (idx === -1) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }
  const removed = data.templates.splice(idx, 1)[0];
  saveCustomMessages(data);
  res.json({ removed, total: data.templates.length });
});

export default router;
