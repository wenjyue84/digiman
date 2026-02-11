/**
 * Persistent Conversation Logger
 * Stores real chat messages to disk for admin review.
 * Files: .rainbow-kb/conversations/{phone}.json
 */

import { promises as fs } from 'fs';
import path from 'path';

export interface LoggedMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;       // Unix ms
  intent?: string;
  confidence?: number;
  action?: string;
  manual?: boolean;        // True if manually sent by admin
}

export interface ConversationLog {
  phone: string;
  pushName: string;
  instanceId?: string;     // Which WhatsApp instance handled this conversation
  messages: LoggedMessage[];
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
  createdAt: number;
}

let conversationsDir = '';

function resolveConversationsDir(): string {
  if (conversationsDir) return conversationsDir;
  // Try CWD first, then parent (handles mcp-server/ CWD)
  const fromCwd = path.resolve(process.cwd(), '.rainbow-kb', 'conversations');
  const fromParent = path.resolve(process.cwd(), '..', '.rainbow-kb', 'conversations');
  try {
    const { accessSync } = require('fs');
    accessSync(path.resolve(process.cwd(), '.rainbow-kb'));
    conversationsDir = fromCwd;
  } catch {
    conversationsDir = fromParent;
  }
  return conversationsDir;
}

async function ensureDir(): Promise<string> {
  const dir = resolveConversationsDir();
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

function sanitizePhone(phone: string): string {
  return phone.replace(/[^a-zA-Z0-9@._-]/g, '_');
}

async function readLog(phone: string): Promise<ConversationLog | null> {
  const dir = await ensureDir();
  const filePath = path.join(dir, `${sanitizePhone(phone)}.json`);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

async function writeLog(log: ConversationLog): Promise<void> {
  const dir = await ensureDir();
  const filePath = path.join(dir, `${sanitizePhone(log.phone)}.json`);
  await fs.writeFile(filePath, JSON.stringify(log, null, 2), 'utf-8');
}

/** Log a single message to a conversation */
export async function logMessage(
  phone: string,
  pushName: string,
  role: 'user' | 'assistant',
  content: string,
  meta?: { intent?: string; confidence?: number; action?: string; instanceId?: string; manual?: boolean }
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
      ...(meta?.manual && { manual: meta.manual })
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

/** List all conversations with summaries */
export async function listConversations(): Promise<ConversationSummary[]> {
  const dir = await ensureDir();
  const files = await fs.readdir(dir);
  const summaries: ConversationSummary[] = [];

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    try {
      const data = await fs.readFile(path.join(dir, file), 'utf-8');
      const log: ConversationLog = JSON.parse(data);
      const lastMsg = log.messages[log.messages.length - 1];
      if (!lastMsg) continue;
      summaries.push({
        phone: log.phone,
        pushName: log.pushName,
        instanceId: log.instanceId,
        lastMessage: lastMsg.content.slice(0, 100),
        lastMessageRole: lastMsg.role,
        lastMessageAt: lastMsg.timestamp,
        messageCount: log.messages.length,
        createdAt: log.createdAt
      });
    } catch {
      // Skip corrupt files
    }
  }

  // Sort by most recent first
  summaries.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
  return summaries;
}

/** Get full conversation log for a phone number */
export async function getConversation(phone: string): Promise<ConversationLog | null> {
  return readLog(phone);
}

/** Delete a conversation log */
export async function deleteConversation(phone: string): Promise<boolean> {
  const dir = await ensureDir();
  const filePath = path.join(dir, `${sanitizePhone(phone)}.json`);
  try {
    await fs.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}
