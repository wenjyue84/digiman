/**
 * Persistent Conversation Logger
 * Stores real chat messages to disk for admin review.
 * Files: .rainbow-kb/conversations/{phone}.json
 */

import { promises as fs, accessSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface LoggedMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;       // Unix ms
  intent?: string;
  confidence?: number;
  action?: string;
  manual?: boolean;        // True if manually sent by admin
  // Developer mode metadata
  source?: string;         // Detection method: regex | fuzzy | semantic | llm
  model?: string;          // AI model used
  responseTime?: number;   // Response time in ms
  kbFiles?: string[];      // Knowledge base files used
  messageType?: string;    // info | problem | complaint
  routedAction?: string;   // static_reply | llm_reply | workflow | etc
  workflowId?: string;     // When routedAction is workflow
  stepId?: string;         // When routedAction is workflow
}

export interface ContactDetails {
  name?: string;
  email?: string;
  country?: string;
  language?: string;
  checkIn?: string;
  checkOut?: string;
  unit?: string;
  notes?: string;
  contactStatus?: string;
  paymentStatus?: string;
  tags?: string[];
}

export interface ConversationLog {
  phone: string;
  pushName: string;
  instanceId?: string;     // Which WhatsApp instance handled this conversation
  messages: LoggedMessage[];
  contactDetails?: ContactDetails;
  pinned?: boolean;
  favourite?: boolean;
  /** Timestamp of last message when admin last opened this chat (for unread badge). */
  lastReadAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface ConversationSummary {
  phone: string;
  pushName: string;
  instanceId?: string;
  lastMessage: string;
  lastMessageRole: 'user' | 'assistant';
  lastMessageAt: number;
  messageCount: number;
  /** Number of user messages after lastReadAt (WhatsApp-style unread badge). */
  unreadCount: number;
  pinned?: boolean;
  favourite?: boolean;
  createdAt: number;
}

let conversationsDir = '';

function resolveConversationsDir(): string {
  if (conversationsDir) return conversationsDir;
  // Same as knowledge-base: resolve relative to this module so it works regardless of CWD
  const fromModule = path.resolve(__dirname, '..', '..', '.rainbow-kb', 'conversations');
  const fromCwd = path.resolve(process.cwd(), '.rainbow-kb', 'conversations');
  try {
    accessSync(path.dirname(fromModule));
    conversationsDir = fromModule;
  } catch {
    try {
      accessSync(path.resolve(process.cwd(), '.rainbow-kb'));
      conversationsDir = fromCwd;
    } catch {
      conversationsDir = fromModule; // let ensureDir create it
    }
  }
  return conversationsDir;
}

async function ensureDir(): Promise<string> {
  const dir = resolveConversationsDir();
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/** Canonical key for file lookup: digits only, so same contact always maps to same file (e.g. 60123456789@s.whatsapp.net and 12345@lid → 60123456789). */
function canonicalPhoneKey(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits || phone.replace(/[^a-zA-Z0-9@._-]/g, '_');
}

/** Legacy filename format (before canonical key) for migration. */
function legacyPhoneFilename(phone: string): string {
  return phone.replace(/[^a-zA-Z0-9@._-]/g, '_');
}

function sanitizePhone(phone: string): string {
  return canonicalPhoneKey(phone);
}

async function readLog(phone: string): Promise<ConversationLog | null> {
  const dir = await ensureDir();
  const canonical = canonicalPhoneKey(phone);
  const legacy = legacyPhoneFilename(phone);
  for (const name of [canonical, legacy]) {
    if (!name) continue;
    const filePath = path.join(dir, `${name}.json`);
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      continue;
    }
  }
  return null;
}

async function writeLog(log: ConversationLog): Promise<void> {
  const dir = await ensureDir();
  const filePath = path.join(dir, `${canonicalPhoneKey(log.phone)}.json`);
  await fs.writeFile(filePath, JSON.stringify(log, null, 2), 'utf-8');
}

/** Log a single message to a conversation */
export async function logMessage(
  phone: string,
  pushName: string,
  role: 'user' | 'assistant',
  content: string,
  meta?: {
    intent?: string;
    confidence?: number;
    action?: string;
    instanceId?: string;
    manual?: boolean;
    source?: string;
    model?: string;
    responseTime?: number;
    kbFiles?: string[];
    messageType?: string;
    routedAction?: string;
    workflowId?: string;
    stepId?: string;
  }
): Promise<void> {
  try {
    const now = Date.now();
    let log = await readLog(phone);
    if (!log) {
      log = {
        phone,
        pushName,
        messages: [],
        createdAt: now,
        updatedAt: now
      };
    }
    // Update pushName if changed
    if (pushName && pushName !== log.pushName) {
      log.pushName = pushName;
    }
    // Track which instance this conversation belongs to
    if (meta?.instanceId && !log.instanceId) {
      log.instanceId = meta.instanceId;
    }
    log.messages.push({
      role,
      content,
      timestamp: now,
      ...(meta?.intent && { intent: meta.intent }),
      ...(meta?.confidence !== undefined && { confidence: meta.confidence }),
      ...(meta?.action && { action: meta.action }),
      ...(meta?.manual && { manual: meta.manual }),
      ...(meta?.source && { source: meta.source }),
      ...(meta?.model && { model: meta.model }),
      ...(meta?.responseTime !== undefined && { responseTime: meta.responseTime }),
      ...(meta?.kbFiles && { kbFiles: meta.kbFiles }),
      ...(meta?.messageType && { messageType: meta.messageType }),
      ...(meta?.routedAction && { routedAction: meta.routedAction }),
      ...(meta?.workflowId && { workflowId: meta.workflowId }),
      ...(meta?.stepId && { stepId: meta.stepId })
    });
    log.updatedAt = now;

    // Cap at 500 messages per conversation to prevent huge files
    if (log.messages.length > 500) {
      log.messages = log.messages.slice(-500);
    }

    await writeLog(log);
  } catch (err: any) {
    console.error(`[ConvoLogger] Failed to log message for ${phone}:`, err.message);
  }
}

/** Log a user non-text message and the assistant reply in one write (so both always appear in live chat). */
export async function logNonTextExchange(
  phone: string,
  pushName: string,
  userPlaceholder: string,
  assistantReply: string,
  instanceId?: string
): Promise<void> {
  try {
    const now = Date.now();
    let log = await readLog(phone);
    if (!log) {
      log = {
        phone,
        pushName,
        messages: [],
        createdAt: now,
        updatedAt: now
      };
    }
    if (pushName && pushName !== log.pushName) log.pushName = pushName;
    if (instanceId && !log.instanceId) log.instanceId = instanceId;
    log.messages.push(
      { role: 'user', content: userPlaceholder, timestamp: now },
      { role: 'assistant', content: assistantReply, timestamp: now + 1, ...(instanceId && { responseTime: 0 }) }
    );
    log.updatedAt = now + 1;
    if (log.messages.length > 500) log.messages = log.messages.slice(-500);
    await writeLog(log);
  } catch (err: any) {
    console.error(`[ConvoLogger] Failed to log non-text exchange for ${phone}:`, err.message);
  }
}

/** List all conversations with summaries. Dedupes by canonical phone (keeps latest). */
export async function listConversations(): Promise<ConversationSummary[]> {
  const dir = await ensureDir();
  const files = await fs.readdir(dir);
  const byCanonical = new Map<string, ConversationSummary>();

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    try {
      const data = await fs.readFile(path.join(dir, file), 'utf-8');
      const log: ConversationLog = JSON.parse(data);
      const lastMsg = log.messages[log.messages.length - 1];
      if (!lastMsg) continue;
      const lastReadAt = log.lastReadAt ?? 0;
      const unreadCount = log.messages.filter(
        (m) => m.role === 'user' && m.timestamp > lastReadAt
      ).length;
      const summary: ConversationSummary = {
        phone: log.phone,
        pushName: log.pushName,
        instanceId: log.instanceId,
        lastMessage: lastMsg.content.slice(0, 100),
        lastMessageRole: lastMsg.role,
        lastMessageAt: lastMsg.timestamp,
        messageCount: log.messages.length,
        unreadCount,
        pinned: log.pinned || false,
        favourite: log.favourite || false,
        createdAt: log.createdAt
      };
      const key = canonicalPhoneKey(log.phone);
      const existing = byCanonical.get(key);
      if (!existing || summary.lastMessageAt > existing.lastMessageAt) {
        byCanonical.set(key, summary);
      }
    } catch {
      // Skip corrupt files
    }
  }

  const summaries = Array.from(byCanonical.values());
  summaries.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
  return summaries;
}

/** Get full conversation log for a phone number */
export async function getConversation(phone: string): Promise<ConversationLog | null> {
  return readLog(phone);
}

/** Mark conversation as read (set lastReadAt to latest message timestamp). Call when admin opens the chat. */
export async function markConversationAsRead(phone: string): Promise<void> {
  const log = await readLog(phone);
  if (!log || !log.messages.length) return;
  const lastMsg = log.messages[log.messages.length - 1];
  log.lastReadAt = lastMsg.timestamp;
  log.updatedAt = Date.now();
  await writeLog(log);
}

/** Delete a conversation log */
export async function deleteConversation(phone: string): Promise<boolean> {
  const dir = await ensureDir();
  let deleted = false;
  for (const name of [canonicalPhoneKey(phone), legacyPhoneFilename(phone)]) {
    if (!name) continue;
    try {
      await fs.unlink(path.join(dir, `${name}.json`));
      deleted = true;
    } catch {
      // continue
    }
  }
  return deleted;
}

/** Toggle pin state for a conversation */
export async function togglePin(phone: string): Promise<boolean> {
  const log = await readLog(phone);
  if (!log) return false;
  log.pinned = !log.pinned;
  log.updatedAt = Date.now();
  await writeLog(log);
  return log.pinned;
}

/** Toggle favourite state for a conversation */
export async function toggleFavourite(phone: string): Promise<boolean> {
  const log = await readLog(phone);
  if (!log) return false;
  log.favourite = !log.favourite;
  log.updatedAt = Date.now();
  await writeLog(log);
  return log.favourite;
}

/** Get contact details for a phone number */
export async function getContactDetails(phone: string): Promise<ContactDetails> {
  const log = await readLog(phone);
  return log?.contactDetails || {};
}

/** Merge partial contact details update for a phone number */
export async function updateContactDetails(phone: string, partial: Partial<ContactDetails>): Promise<ContactDetails> {
  let log = await readLog(phone);
  if (!log) {
    log = {
      phone,
      pushName: '',
      messages: [],
      contactDetails: {},
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }
  log.contactDetails = { ...(log.contactDetails || {}), ...partial };
  log.updatedAt = Date.now();
  await writeLog(log);
  return log.contactDetails;
}

/** Aggregate response time from all conversation logs (for dashboard avg). */
export async function getResponseTimeStats(): Promise<{ count: number; sumMs: number; avgMs: number | null }> {
  const dir = await ensureDir();
  const files = await fs.readdir(dir);
  let count = 0;
  let sumMs = 0;

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    try {
      const data = await fs.readFile(path.join(dir, file), 'utf-8');
      const log: ConversationLog = JSON.parse(data);
      for (const msg of log.messages) {
        if (msg.role === 'assistant' && typeof msg.responseTime === 'number' && msg.responseTime > 0) {
          count++;
          sumMs += msg.responseTime;
        }
      }
    } catch {
      // Skip corrupt files
    }
  }

  return {
    count,
    sumMs,
    avgMs: count > 0 ? Math.round(sumMs / count) : null,
  };
}
