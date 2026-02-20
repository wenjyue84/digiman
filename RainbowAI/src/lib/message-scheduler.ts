/**
 * Message Scheduler Service (US-019)
 *
 * Manages scheduled messages with a 30s polling interval.
 * Data stored in RainbowAI/data/scheduled-messages.json using atomic writes.
 * Timezone: Asia/Kuala_Lumpur (UTC+8).
 */

import { readFileSync, writeFileSync, existsSync, renameSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const DATA_FILE = join(process.cwd(), 'data', 'scheduled-messages.json');

export interface ScheduledMessage {
  id: string;
  phone: string;
  content: string;
  scheduledAt: string;       // ISO datetime
  status: 'pending' | 'sent' | 'cancelled';
  createdBy: string;
  createdAt: string;
  sentAt?: string;
  repeatFrequency?: 'none' | 'daily' | 'weekly' | 'monthly';
  repeatEndDate?: string;    // ISO date
}

interface ScheduledMessagesData {
  messages: ScheduledMessage[];
}

const CHECK_INTERVAL_MS = 30_000;  // 30 seconds
const CLEANUP_AGE_MS = 30 * 24 * 60 * 60 * 1000;  // 30 days

let checkTimer: ReturnType<typeof setInterval> | null = null;

// ─── Data Persistence ──────────────────────────────────────────────

function loadData(): ScheduledMessagesData {
  try {
    if (!existsSync(DATA_FILE)) return { messages: [] };
    const raw = readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.messages)) return parsed as ScheduledMessagesData;
    return { messages: [] };
  } catch {
    return { messages: [] };
  }
}

function saveData(data: ScheduledMessagesData): void {
  const dir = dirname(DATA_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmpPath = DATA_FILE + '.tmp';
  writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  renameSync(tmpPath, DATA_FILE);
}

function generateId(): string {
  return 'sched-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
}

// ─── CRUD Operations ───────────────────────────────────────────────

export function listScheduledMessages(statusFilter?: string): ScheduledMessage[] {
  const data = loadData();
  if (statusFilter) {
    return data.messages.filter(m => m.status === statusFilter);
  }
  return data.messages;
}

export function getScheduledMessage(id: string): ScheduledMessage | undefined {
  const data = loadData();
  return data.messages.find(m => m.id === id);
}

export function addScheduledMessage(msg: Omit<ScheduledMessage, 'id' | 'createdAt' | 'status'>): ScheduledMessage {
  const data = loadData();
  const newMsg: ScheduledMessage = {
    id: generateId(),
    phone: msg.phone,
    content: msg.content,
    scheduledAt: msg.scheduledAt,
    status: 'pending',
    createdBy: msg.createdBy,
    createdAt: new Date().toISOString(),
    repeatFrequency: msg.repeatFrequency || 'none',
    repeatEndDate: msg.repeatEndDate,
  };
  data.messages.push(newMsg);
  saveData(data);
  console.log(`[Scheduler] Created scheduled message ${newMsg.id} for ${msg.phone} at ${msg.scheduledAt}`);
  return newMsg;
}

export function updateScheduledMessage(id: string, updates: Partial<Pick<ScheduledMessage, 'content' | 'scheduledAt' | 'repeatFrequency' | 'repeatEndDate'>>): ScheduledMessage | null {
  const data = loadData();
  const msg = data.messages.find(m => m.id === id);
  if (!msg || msg.status !== 'pending') return null;

  if (updates.content !== undefined) msg.content = updates.content;
  if (updates.scheduledAt !== undefined) msg.scheduledAt = updates.scheduledAt;
  if (updates.repeatFrequency !== undefined) msg.repeatFrequency = updates.repeatFrequency;
  if (updates.repeatEndDate !== undefined) msg.repeatEndDate = updates.repeatEndDate;

  saveData(data);
  console.log(`[Scheduler] Updated scheduled message ${id}`);
  return msg;
}

export function cancelScheduledMessage(id: string): boolean {
  const data = loadData();
  const msg = data.messages.find(m => m.id === id);
  if (!msg || msg.status !== 'pending') return false;

  msg.status = 'cancelled';
  saveData(data);
  console.log(`[Scheduler] Cancelled scheduled message ${id}`);
  return true;
}

// ─── Scheduler Engine ──────────────────────────────────────────────

async function checkAndSend(): Promise<void> {
  const data = loadData();
  const now = new Date();
  let changed = false;

  for (const msg of data.messages) {
    if (msg.status !== 'pending') continue;

    const scheduledTime = new Date(msg.scheduledAt);
    if (scheduledTime > now) continue;

    // Time to send
    try {
      const { sendWhatsAppMessage } = await import('./baileys-client.js');
      await sendWhatsAppMessage(msg.phone, msg.content);

      // Log the message
      const { logMessage, getConversation } = await import('../assistant/conversation-logger.js');
      const log = await getConversation(msg.phone);
      const pushName = log?.pushName || 'Guest';
      await logMessage(msg.phone, pushName, 'assistant', msg.content, {
        manual: true,
        staffName: msg.createdBy || 'Scheduler',
      });

      msg.status = 'sent';
      msg.sentAt = now.toISOString();
      changed = true;
      console.log(`[Scheduler] Sent scheduled message ${msg.id} to ${msg.phone}`);

      // Handle repeating messages (US-021 foundation)
      if (msg.repeatFrequency && msg.repeatFrequency !== 'none') {
        const nextDate = calculateNextOccurrence(scheduledTime, msg.repeatFrequency);
        if (nextDate && (!msg.repeatEndDate || nextDate <= new Date(msg.repeatEndDate))) {
          const repeat: ScheduledMessage = {
            id: generateId(),
            phone: msg.phone,
            content: msg.content,
            scheduledAt: nextDate.toISOString(),
            status: 'pending',
            createdBy: msg.createdBy,
            createdAt: now.toISOString(),
            repeatFrequency: msg.repeatFrequency,
            repeatEndDate: msg.repeatEndDate,
          };
          data.messages.push(repeat);
          console.log(`[Scheduler] Created repeat message ${repeat.id} for ${msg.phone} at ${repeat.scheduledAt}`);
        }
      }
    } catch (err: any) {
      console.error(`[Scheduler] Failed to send message ${msg.id}:`, err.message);
    }
  }

  // Auto-cleanup: remove sent/cancelled messages older than 30 days
  const cutoff = now.getTime() - CLEANUP_AGE_MS;
  const before = data.messages.length;
  data.messages = data.messages.filter(m => {
    if (m.status === 'pending') return true;
    const ts = m.sentAt ? new Date(m.sentAt).getTime() : new Date(m.createdAt).getTime();
    return ts > cutoff;
  });
  if (data.messages.length < before) {
    changed = true;
    console.log(`[Scheduler] Cleaned up ${before - data.messages.length} old messages`);
  }

  if (changed) saveData(data);

  // ── Payment Reminders (US-022) ──
  // Check for overdue reminders with auto-send enabled
  try {
    const { getOverdueReminders, markReminderSent, unsnoozeReminders } = await import('../routes/admin/payment-reminders.js');

    // Un-snooze expired snoozes
    unsnoozeReminders();

    const overdue = getOverdueReminders();
    for (const reminder of overdue) {
      if (!reminder.autoSend) continue;

      try {
        const { sendWhatsAppMessage } = await import('./baileys-client.js');
        const { getConversation, logMessage } = await import('../assistant/conversation-logger.js');

        // Replace [Name] placeholder with contact's pushName
        const log = await getConversation(reminder.phone);
        const pushName = log?.pushName || 'Guest';
        const messageText = reminder.template.replace(/\[Name\]/g, pushName);

        await sendWhatsAppMessage(reminder.phone, messageText);
        await logMessage(reminder.phone, pushName, 'assistant', messageText, {
          manual: true,
          staffName: 'Payment Reminder',
        });

        markReminderSent(reminder.id);
        console.log(`[Scheduler] Sent payment reminder ${reminder.id} to ${reminder.phone}`);
      } catch (err: any) {
        console.error(`[Scheduler] Failed to send payment reminder ${reminder.id}:`, err.message);
      }
    }
  } catch (err: any) {
    // Payment reminders module may not be loaded yet — non-critical
    if (err.code !== 'ERR_MODULE_NOT_FOUND') {
      console.error('[Scheduler] Payment reminders check failed:', err.message);
    }
  }
}

function calculateNextOccurrence(current: Date, frequency: string): Date | null {
  const next = new Date(current);
  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      return next;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      return next;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      // Handle month-end edge cases (e.g., Jan 31 → Feb 28)
      if (next.getDate() !== current.getDate()) {
        next.setDate(0); // Last day of previous month
      }
      return next;
    default:
      return null;
  }
}

// ─── Init / Shutdown ───────────────────────────────────────────────

export function initScheduler(): void {
  if (checkTimer) {
    clearInterval(checkTimer);
  }

  // Run initial check
  checkAndSend().catch(err => {
    console.error('[Scheduler] Initial check failed:', err.message);
  });

  // Start interval
  checkTimer = setInterval(() => {
    checkAndSend().catch(err => {
      console.error('[Scheduler] Check failed:', err.message);
    });
  }, CHECK_INTERVAL_MS);

  const data = loadData();
  const pending = data.messages.filter(m => m.status === 'pending').length;
  console.log(`[Scheduler] Initialized — ${pending} pending message(s), checking every ${CHECK_INTERVAL_MS / 1000}s`);
}

export function stopScheduler(): void {
  if (checkTimer) {
    clearInterval(checkTimer);
    checkTimer = null;
    console.log('[Scheduler] Stopped');
  }
}
