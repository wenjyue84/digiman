import { Router } from 'express';
import { promises as fs } from 'fs';
import path from 'path';

const router = Router();

// Allow cross-origin from MCP server dashboard (port 3002)
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3002');
  res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');

  // PERMANENT FIX: Prevent caching of KB files
  res.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');
  res.header('Surrogate-Control', 'no-store');

  if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
  next();
});

// Base path for KB files (canonical location inside RainbowAI)
const KB_BASE_PATH = path.join(process.cwd(), 'RainbowAI', '.rainbow-kb');
const MEMORY_PATH = path.join(KB_BASE_PATH, 'memory');

// ─── Timezone helpers (MYT) ──────────────────────────────────────────
function getTodayMYT(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Kuala_Lumpur' });
}
function getMYTTime(): string {
  return new Date().toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit', hour12: false
  });
}

// List all KB files
router.get('/files', async (req, res) => {
  try {
    const files = await fs.readdir(KB_BASE_PATH);
    const mdFiles = files.filter(f => f.endsWith('.md'));

    const fileList = await Promise.all(
      mdFiles.map(async (filename) => {
        const filePath = path.join(KB_BASE_PATH, filename);
        const stats = await fs.stat(filePath);
        return {
          filename,
          path: filename,
          size: stats.size,
          modified: stats.mtime
        };
      })
    );

    res.json({ files: fileList });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Read a specific KB file
router.get('/files/:filename', async (req, res) => {
  try {
    const { filename } = req.params;

    // Security: prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const filePath = path.join(KB_BASE_PATH, filename);
    const content = await fs.readFile(filePath, 'utf-8');

    res.json({
      filename,
      content,
      path: filename
    });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'File not found' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Update a specific KB file
router.put('/files/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const { content } = req.body;

    if (!content && content !== '') {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Security: prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const filePath = path.join(KB_BASE_PATH, filename);

    // Ensure file exists before updating
    await fs.access(filePath);

    // Backup original file
    const backupPath = path.join(KB_BASE_PATH, `.${filename}.backup`);
    const originalContent = await fs.readFile(filePath, 'utf-8');
    await fs.writeFile(backupPath, originalContent, 'utf-8');

    // Write new content
    await fs.writeFile(filePath, content, 'utf-8');

    res.json({
      success: true,
      filename,
      message: 'File updated successfully',
      backup: `.${filename}.backup`
    });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'File not found' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// ─── Memory System (Mirror of MCP server endpoints) ──────────────────

// GET /memory/durable — Read durable memory
router.get('/memory/durable', async (req, res) => {
  try {
    const filePath = path.join(KB_BASE_PATH, 'memory.md');
    const content = await fs.readFile(filePath, 'utf-8');
    const stats = await fs.stat(filePath);
    res.json({ content, size: stats.size });
  } catch (error: any) {
    if (error.code === 'ENOENT') res.json({ content: '', size: 0 });
    else res.status(500).json({ error: error.message });
  }
});

// PUT /memory/durable — Update durable memory
router.put('/memory/durable', async (req, res) => {
  const { content } = req.body;
  if (content === undefined) return res.status(400).json({ error: 'content required' });
  try {
    const filePath = path.join(KB_BASE_PATH, 'memory.md');
    try {
      const original = await fs.readFile(filePath, 'utf-8');
      await fs.writeFile(path.join(KB_BASE_PATH, '.memory.md.backup'), original, 'utf-8');
    } catch {}
    await fs.writeFile(filePath, content, 'utf-8');
    res.json({ ok: true, size: content.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /memory — List all daily log files
router.get('/memory', async (req, res) => {
  try {
    await fs.mkdir(MEMORY_PATH, { recursive: true });
    const files = await fs.readdir(MEMORY_PATH);
    const days = files
      .filter(f => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
      .map(f => f.replace('.md', ''))
      .sort()
      .reverse();

    const today = getTodayMYT();
    let todayEntries = 0;
    try {
      const content = await fs.readFile(path.join(MEMORY_PATH, `${today}.md`), 'utf-8');
      todayEntries = (content.match(/^- \d{2}:\d{2}/gm) || []).length;
    } catch {}

    let durableSize = 0;
    try {
      const stats = await fs.stat(path.join(KB_BASE_PATH, 'memory.md'));
      durableSize = stats.size;
    } catch {}

    res.json({ days, totalDays: days.length, today, todayEntries, durableMemorySize: durableSize });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /memory/:date — Read specific day's log
router.get('/memory/:date', async (req, res) => {
  const { date } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'Invalid date format' });
  try {
    const filePath = path.join(MEMORY_PATH, `${date}.md`);
    const content = await fs.readFile(filePath, 'utf-8');
    const stats = await fs.stat(filePath);
    res.json({ date, content, size: stats.size, modified: stats.mtime });
  } catch (error: any) {
    if (error.code === 'ENOENT') res.status(404).json({ error: `No log for ${date}` });
    else res.status(500).json({ error: error.message });
  }
});

// PUT /memory/:date — Update day's log
router.put('/memory/:date', async (req, res) => {
  const { date } = req.params;
  const { content } = req.body;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'Invalid date format' });
  if (content === undefined) return res.status(400).json({ error: 'content required' });
  try {
    await fs.mkdir(MEMORY_PATH, { recursive: true });
    const filePath = path.join(MEMORY_PATH, `${date}.md`);
    try {
      const original = await fs.readFile(filePath, 'utf-8');
      await fs.writeFile(path.join(MEMORY_PATH, `.${date}.md.backup`), original, 'utf-8');
    } catch {}
    await fs.writeFile(filePath, content, 'utf-8');
    res.json({ ok: true, date, size: content.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /memory/:date/append — Append timestamped entry
router.post('/memory/:date/append', async (req, res) => {
  const { date } = req.params;
  const { section, entry } = req.body;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'Invalid date format' });
  if (!section || !entry) return res.status(400).json({ error: 'section and entry required' });

  // Canonical source: RainbowAI/src/assistant/default-configs.ts — keep in sync
  const TEMPLATE = `# ${date} -- Daily Memory\n\n## Staff Notes\n\n## Issues Reported\n\n## Operational Changes\n\n## Patterns Observed\n\n## AI Notes\n`;

  try {
    await fs.mkdir(MEMORY_PATH, { recursive: true });
    const filePath = path.join(MEMORY_PATH, `${date}.md`);
    let content: string;
    try { content = await fs.readFile(filePath, 'utf-8'); } catch { content = TEMPLATE; }

    const timestamp = getMYTTime();
    const newLine = `- ${timestamp} -- ${entry}`;
    const sectionHeader = `## ${section}`;
    const idx = content.indexOf(sectionHeader);
    if (idx === -1) {
      content = content.trimEnd() + `\n\n${sectionHeader}\n${newLine}\n`;
    } else {
      const headerEnd = content.indexOf('\n', idx);
      if (headerEnd === -1) { content += `\n${newLine}`; }
      else { content = content.slice(0, headerEnd + 1) + newLine + '\n' + content.slice(headerEnd + 1); }
    }

    await fs.writeFile(filePath, content, 'utf-8');
    res.json({ ok: true, date, section, timestamp, entry });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
