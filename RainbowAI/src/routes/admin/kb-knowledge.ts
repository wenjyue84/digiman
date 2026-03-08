import { Router } from 'express';
import type { Request, Response } from 'express';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import multer from 'multer';
import { configStore } from '../../assistant/config-store.js';
import { ok, badRequest, notFound, conflict, serverError } from './http-utils.js';

// Use process.cwd() (= RainbowAI/) so path works in both tsx dev and esbuild bundle
// (in the bundle, import.meta.url resolves to dist/index.js, making __dirname = dist/)
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });
const uploadReplyImage = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const router = Router();

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
  const newEntry: any = { intent, response: { en: response.en, ms: response.ms || '', zh: response.zh || '' } };
  if (req.body.imageUrl) newEntry.imageUrl = req.body.imageUrl;
  data.static.push(newEntry);
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
  // Support optional imageUrl for quick reply image attachments
  if (req.body.imageUrl !== undefined) {
    (entry as any).imageUrl = req.body.imageUrl || undefined;
  }
  configStore.setKnowledge(data);
  ok(res, { type: 'static', intent, entry });
});

// ─── Quick Reply Image Upload ───────────────────────────────────────
router.post('/knowledge/upload-image', uploadReplyImage.single('image'), (req: Request, res: Response) => {
  if (!req.file) {
    badRequest(res, 'image file required');
    return;
  }
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(req.file.mimetype)) {
    badRequest(res, 'Only jpg, png, webp, gif allowed');
    return;
  }
  const ext = req.file.mimetype.split('/')[1] === 'jpeg' ? 'jpg' : req.file.mimetype.split('/')[1];
  const filename = 'reply-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6) + '.' + ext;
  const filePath = path.join(UPLOADS_DIR, filename);
  writeFileSync(filePath, req.file.buffer);
  // Return a web-accessible URL, not the filesystem path
  ok(res, { imageUrl: `/api/rainbow/uploads/${filename}`, filename });
});

// Serve uploaded images
router.get('/uploads/:filename', (req: Request, res: Response) => {
  const safeName = req.params.filename.replace(/[^a-z0-9._-]/gi, '');
  const filePath = path.join(UPLOADS_DIR, safeName);
  if (!existsSync(filePath)) {
    notFound(res, 'File');
    return;
  }
  res.sendFile(filePath);
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

export default router;
