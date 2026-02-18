/**
 * Payment Reminders Admin Routes (US-022)
 *
 * CRUD endpoints for payment reminder management.
 * Data persisted in RainbowAI/data/payment-reminders.json.
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { readFileSync, writeFileSync, existsSync, renameSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { ok, badRequest, notFound } from './http-utils.js';

const DATA_FILE = join(process.cwd(), 'data', 'payment-reminders.json');

export interface PaymentReminder {
  id: string;
  phone: string;
  dueDate: string;       // ISO date (YYYY-MM-DD)
  autoSend: boolean;
  template: string;       // message template
  status: 'active' | 'dismissed' | 'sent' | 'snoozed';
  createdAt: string;
  sentAt?: string;
  snoozedUntil?: string;  // ISO date
}

interface PaymentRemindersData {
  reminders: PaymentReminder[];
}

function loadData(): PaymentRemindersData {
  try {
    if (!existsSync(DATA_FILE)) return { reminders: [] };
    const raw = readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.reminders)) return parsed as PaymentRemindersData;
    return { reminders: [] };
  } catch {
    return { reminders: [] };
  }
}

function saveData(data: PaymentRemindersData): void {
  const dir = dirname(DATA_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmpPath = DATA_FILE + '.tmp';
  writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  renameSync(tmpPath, DATA_FILE);
}

function generateId(): string {
  return 'pr-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
}

// Default chase templates (en/ms/zh)
const DEFAULT_TEMPLATES: Record<string, string> = {
  en: 'Hi [Name], this is a friendly reminder about your pending payment. Please let us know if you have any questions.',
  ms: 'Hai [Name], ini adalah peringatan mesra tentang bayaran anda yang belum selesai. Sila hubungi kami jika ada sebarang pertanyaan.',
  zh: '您好 [Name]，这是关于您待付款项的温馨提醒。如有任何疑问，请随时联系我们。',
};

const router = Router();

// GET /payment-reminders — list all (optionally filter by status or phone)
router.get('/payment-reminders', (req: Request, res: Response) => {
  const { status, phone } = req.query as { status?: string; phone?: string };
  let reminders = loadData().reminders;
  if (status) reminders = reminders.filter(r => r.status === status);
  if (phone) reminders = reminders.filter(r => r.phone === phone);
  res.json({ reminders });
});

// GET /payment-reminders/overdue — list overdue reminders (active + dueDate <= today)
router.get('/payment-reminders/overdue', (req: Request, res: Response) => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const reminders = loadData().reminders.filter(r => {
    if (r.status !== 'active') return false;
    if (r.status === 'active' && r.dueDate <= today) return true;
    return false;
  });
  res.json({ reminders, count: reminders.length });
});

// GET /payment-reminders/templates — return default chase templates
router.get('/payment-reminders/templates', (_req: Request, res: Response) => {
  res.json({ templates: DEFAULT_TEMPLATES });
});

// GET /payment-reminders/:id — get single reminder
router.get('/payment-reminders/:id', (req: Request, res: Response) => {
  const reminder = loadData().reminders.find(r => r.id === req.params.id);
  if (!reminder) {
    notFound(res, `Payment reminder "${req.params.id}"`);
    return;
  }
  res.json(reminder);
});

// POST /payment-reminders — create new reminder
router.post('/payment-reminders', (req: Request, res: Response) => {
  const { phone, dueDate, autoSend, template, language } = req.body;

  if (!phone || typeof phone !== 'string') {
    badRequest(res, 'phone (string) required');
    return;
  }
  if (!dueDate || typeof dueDate !== 'string') {
    badRequest(res, 'dueDate (YYYY-MM-DD string) required');
    return;
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    badRequest(res, 'dueDate must be YYYY-MM-DD format');
    return;
  }

  const data = loadData();

  // Check for existing active reminder for this phone
  const existing = data.reminders.find(r => r.phone === phone && r.status === 'active');
  if (existing) {
    badRequest(res, 'An active reminder already exists for this phone. Dismiss it first.');
    return;
  }

  const lang = (typeof language === 'string' && DEFAULT_TEMPLATES[language]) ? language : 'en';
  const reminderTemplate = (typeof template === 'string' && template.trim())
    ? template.trim()
    : DEFAULT_TEMPLATES[lang];

  const reminder: PaymentReminder = {
    id: generateId(),
    phone: phone.trim(),
    dueDate,
    autoSend: autoSend === true,
    template: reminderTemplate,
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  data.reminders.push(reminder);
  saveData(data);
  console.log(`[PaymentReminder] Created reminder ${reminder.id} for ${phone} due ${dueDate}`);
  ok(res, { reminder });
});

// PUT /payment-reminders/:id — update a reminder
router.put('/payment-reminders/:id', (req: Request, res: Response) => {
  const data = loadData();
  const reminder = data.reminders.find(r => r.id === req.params.id);
  if (!reminder || reminder.status === 'sent') {
    notFound(res, `Payment reminder "${req.params.id}" (must be active/snoozed to edit)`);
    return;
  }

  const { dueDate, autoSend, template } = req.body;
  if (dueDate !== undefined) reminder.dueDate = dueDate;
  if (autoSend !== undefined) reminder.autoSend = autoSend;
  if (template !== undefined) reminder.template = template;

  saveData(data);
  ok(res, { reminder });
});

// POST /payment-reminders/:id/dismiss — dismiss a reminder
router.post('/payment-reminders/:id/dismiss', (req: Request, res: Response) => {
  const data = loadData();
  const reminder = data.reminders.find(r => r.id === req.params.id);
  if (!reminder || reminder.status !== 'active') {
    notFound(res, `Active payment reminder "${req.params.id}"`);
    return;
  }

  reminder.status = 'dismissed';
  saveData(data);
  console.log(`[PaymentReminder] Dismissed reminder ${req.params.id}`);
  ok(res, { dismissed: req.params.id });
});

// POST /payment-reminders/:id/snooze — snooze for N days
router.post('/payment-reminders/:id/snooze', (req: Request, res: Response) => {
  const data = loadData();
  const reminder = data.reminders.find(r => r.id === req.params.id);
  if (!reminder || reminder.status !== 'active') {
    notFound(res, `Active payment reminder "${req.params.id}"`);
    return;
  }

  const days = parseInt(req.body.days, 10) || 3;
  const snoozeDate = new Date();
  snoozeDate.setDate(snoozeDate.getDate() + days);
  reminder.snoozedUntil = snoozeDate.toISOString().split('T')[0];
  reminder.status = 'snoozed';
  saveData(data);
  console.log(`[PaymentReminder] Snoozed reminder ${req.params.id} until ${reminder.snoozedUntil}`);
  ok(res, { snoozed: req.params.id, until: reminder.snoozedUntil });
});

// DELETE /payment-reminders/:id — delete a reminder
router.delete('/payment-reminders/:id', (req: Request, res: Response) => {
  const data = loadData();
  const idx = data.reminders.findIndex(r => r.id === req.params.id);
  if (idx === -1) {
    notFound(res, `Payment reminder "${req.params.id}"`);
    return;
  }
  data.reminders.splice(idx, 1);
  saveData(data);
  ok(res, { deleted: req.params.id });
});

// Export functions for scheduler integration
export function getOverdueReminders(): PaymentReminder[] {
  const today = new Date().toISOString().split('T')[0];
  return loadData().reminders.filter(r => {
    if (r.status === 'snoozed') {
      // Un-snooze if snoozedUntil has passed
      if (r.snoozedUntil && r.snoozedUntil <= today) {
        r.status = 'active';
        // Save will happen in the caller
      } else {
        return false;
      }
    }
    return r.status === 'active' && r.dueDate <= today;
  });
}

export function markReminderSent(id: string): void {
  const data = loadData();
  const reminder = data.reminders.find(r => r.id === id);
  if (reminder) {
    reminder.status = 'sent';
    reminder.sentAt = new Date().toISOString();
    saveData(data);
  }
}

export function unsnoozeReminders(): void {
  const data = loadData();
  const today = new Date().toISOString().split('T')[0];
  let changed = false;
  for (const r of data.reminders) {
    if (r.status === 'snoozed' && r.snoozedUntil && r.snoozedUntil <= today) {
      r.status = 'active';
      delete r.snoozedUntil;
      changed = true;
    }
  }
  if (changed) saveData(data);
}

export default router;
