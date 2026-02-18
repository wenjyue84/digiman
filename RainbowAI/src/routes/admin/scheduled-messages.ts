/**
 * Scheduled Messages Admin Routes (US-019)
 *
 * CRUD endpoints for scheduled message management.
 * Data persisted in RainbowAI/data/scheduled-messages.json.
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  listScheduledMessages,
  getScheduledMessage,
  addScheduledMessage,
  updateScheduledMessage,
  cancelScheduledMessage,
} from '../../lib/message-scheduler.js';
import { ok, badRequest, notFound } from './http-utils.js';

const router = Router();

// GET /scheduled-messages — list all (optionally filter by status)
router.get('/scheduled-messages', (req: Request, res: Response) => {
  const status = req.query.status as string | undefined;
  const messages = listScheduledMessages(status);
  res.json({ messages });
});

// GET /scheduled-messages/:id — get single message
router.get('/scheduled-messages/:id', (req: Request, res: Response) => {
  const msg = getScheduledMessage(req.params.id);
  if (!msg) {
    notFound(res, `Scheduled message "${req.params.id}"`);
    return;
  }
  res.json(msg);
});

// POST /scheduled-messages — create new scheduled message
router.post('/scheduled-messages', (req: Request, res: Response) => {
  const { phone, content, scheduledAt, createdBy, repeatFrequency, repeatEndDate } = req.body;

  if (!phone || typeof phone !== 'string') {
    badRequest(res, 'phone (string) required');
    return;
  }
  if (!content || typeof content !== 'string') {
    badRequest(res, 'content (string) required');
    return;
  }
  if (!scheduledAt || typeof scheduledAt !== 'string') {
    badRequest(res, 'scheduledAt (ISO datetime string) required');
    return;
  }

  // Validate datetime
  const scheduledDate = new Date(scheduledAt);
  if (isNaN(scheduledDate.getTime())) {
    badRequest(res, 'scheduledAt must be a valid ISO datetime');
    return;
  }

  const msg = addScheduledMessage({
    phone: phone.trim(),
    content: content.trim(),
    scheduledAt,
    createdBy: (typeof createdBy === 'string' && createdBy.trim()) ? createdBy.trim() : 'Staff',
    repeatFrequency,
    repeatEndDate,
  });

  ok(res, { message: msg });
});

// PUT /scheduled-messages/:id — update a pending scheduled message
router.put('/scheduled-messages/:id', (req: Request, res: Response) => {
  const { content, scheduledAt, repeatFrequency, repeatEndDate } = req.body;

  const updates: any = {};
  if (content !== undefined) updates.content = content;
  if (scheduledAt !== undefined) {
    const d = new Date(scheduledAt);
    if (isNaN(d.getTime())) {
      badRequest(res, 'scheduledAt must be a valid ISO datetime');
      return;
    }
    updates.scheduledAt = scheduledAt;
  }
  if (repeatFrequency !== undefined) updates.repeatFrequency = repeatFrequency;
  if (repeatEndDate !== undefined) updates.repeatEndDate = repeatEndDate;

  const updated = updateScheduledMessage(req.params.id, updates);
  if (!updated) {
    notFound(res, `Scheduled message "${req.params.id}" (must be pending to edit)`);
    return;
  }

  ok(res, { message: updated });
});

// DELETE /scheduled-messages/:id — cancel a pending scheduled message
router.delete('/scheduled-messages/:id', (req: Request, res: Response) => {
  const cancelled = cancelScheduledMessage(req.params.id);
  if (!cancelled) {
    notFound(res, `Scheduled message "${req.params.id}" (must be pending to cancel)`);
    return;
  }
  ok(res, { cancelled: req.params.id });
});

export default router;
