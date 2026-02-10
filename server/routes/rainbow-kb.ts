import { Router } from 'express';
import { promises as fs } from 'fs';
import path from 'path';

const router = Router();

// Allow cross-origin from MCP server dashboard (port 3002)
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3002');
  res.header('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
  next();
});

// Base path for KB files
const KB_BASE_PATH = path.join(process.cwd(), '.rainbow-kb');

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

export default router;
