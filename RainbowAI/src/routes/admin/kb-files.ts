import { Router } from 'express';
import type { Request, Response } from 'express';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { getKnowledgeMarkdown, setKnowledgeMarkdown } from '../../assistant/knowledge-base.js';
import { KB_FILES_DIR } from './utils.js';
import { ok, badRequest, notFound, serverError, validateFilename } from './http-utils.js';

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

export default router;
