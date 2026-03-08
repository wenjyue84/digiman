import { Router } from 'express';
import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { getContactDetails, updateContactDetails, getAllContactTags, getAllContactUnits, getAllContactDates } from '../../assistant/conversation-logger.js';
import { getConversation } from '../../assistant/conversation-logger.js';
import { ok, badRequest, serverError } from './http-utils.js';

const router = Router();

// ─── Contact Tags Map (US-009) ──────────────────────────────────────────

router.get('/conversations/tags-map', async (_req: Request, res: Response) => {
  try {
    const tagsMap = await getAllContactTags();
    res.json(tagsMap);
  } catch (err: any) {
    serverError(res, err);
  }
});

// ─── Contact Units Map (US-012) ──────────────────────────────────────────

router.get('/conversations/units-map', async (_req: Request, res: Response) => {
  try {
    const unitsMap = await getAllContactUnits();
    res.json(unitsMap);
  } catch (err: any) {
    serverError(res, err);
  }
});

// ─── Contact Dates Map (US-014) ──────────────────────────────────────────

router.get('/conversations/dates-map', async (_req: Request, res: Response) => {
  try {
    const datesMap = await getAllContactDates();
    res.json(datesMap);
  } catch (err: any) {
    serverError(res, err);
  }
});

// ─── Contact Details ─────────────────────────────────────────────────

router.get('/conversations/:phone/contact', async (req: Request, res: Response) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    const details = await getContactDetails(phone);
    res.json(details);
  } catch (err: any) {
    serverError(res, err);
  }
});

router.patch('/conversations/:phone/contact', async (req: Request, res: Response) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    const allowed = ['name', 'email', 'country', 'language', 'languageLocked', 'checkIn', 'checkOut', 'unit', 'notes', 'contactStatus', 'paymentStatus', 'tags'];
    const partial: Record<string, any> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        partial[key] = req.body[key];
      }
    }
    const updated = await updateContactDetails(phone, partial);
    res.json(updated);
  } catch (err: any) {
    serverError(res, err);
  }
});

// ─── US-091: Guest context file endpoints ────────────────────────────

router.get('/conversations/:phone/context', async (req: Request, res: Response) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    const cleanPhone = phone.replace(/@s\.whatsapp\.net$/i, '').replace(/[^0-9+]/g, '');
    const contextDir = path.join(process.cwd(), '.rainbow-kb', 'guests');
    const contextFile = path.join(contextDir, `${cleanPhone}-context.md`);

    if (fs.existsSync(contextFile)) {
      const content = fs.readFileSync(contextFile, 'utf-8');
      res.json({ exists: true, content, filename: `${cleanPhone}-context.md` });
    } else {
      // Get push name for template
      const log = await getConversation(phone);
      const name = log?.pushName || 'Guest';
      const template = `# Guest Context: ${name}\n\n## Background\n\n## Preferences\n\n## Special Arrangements\n`;
      res.json({ exists: false, content: template, filename: `${cleanPhone}-context.md` });
    }
  } catch (err: any) {
    serverError(res, err);
  }
});

router.put('/conversations/:phone/context', async (req: Request, res: Response) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    const { content } = req.body;
    if (typeof content !== 'string') {
      badRequest(res, 'content (string) required');
      return;
    }

    const cleanPhone = phone.replace(/@s\.whatsapp\.net$/i, '').replace(/[^0-9+]/g, '');
    const contextDir = path.join(process.cwd(), '.rainbow-kb', 'guests');

    // Ensure directory exists
    if (!fs.existsSync(contextDir)) {
      fs.mkdirSync(contextDir, { recursive: true });
    }

    const contextFile = path.join(contextDir, `${cleanPhone}-context.md`);
    const tmpFile = contextFile + '.tmp';
    fs.writeFileSync(tmpFile, content, 'utf-8');
    fs.renameSync(tmpFile, contextFile);

    console.log(`[Admin] Saved guest context for ${phone}: ${contextFile}`);
    ok(res, { saved: true, filename: `${cleanPhone}-context.md` });
  } catch (err: any) {
    serverError(res, err);
  }
});

export default router;
