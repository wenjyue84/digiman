/**
 * memory-writer.ts — Auto-diary for Rainbow AI Assistant
 *
 * Inspired by OpenClaw's "Write It Down - No Mental Notes!" principle.
 * After each conversation exchange, detects noteworthy events and writes
 * them to today's daily memory file (.rainbow-kb/memory/YYYY-MM-DD.md).
 *
 * Design:
 * - Heuristic-based (no LLM call — fast and free)
 * - Writes to the correct section of the daily template
 * - Deduplicates within a short window to avoid spam
 * - Triggers KB cache reload so the bot immediately has access to new memories
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getMemoryDir, getTodayDate, getMYTTimestamp, reloadKBFile } from './knowledge-base.js';
import { getDailyMemoryTemplate } from './default-configs.js';

export interface ConversationEvent {
  phone: string;
  pushName: string;
  intent: string;
  action: string;           // routed action: static_reply, llm_reply, workflow, etc.
  messageType: string;       // from problem-detector: 'info' | 'problem' | 'complaint'
  confidence: number;
  guestText: string;
  escalated: boolean;
  bookingStarted: boolean;
  workflowStarted: boolean;
  configError?: string;     // runtime config error (e.g., 'missing_route:pricing')
}

// ─── Deduplication ──────────────────────────────────────────────────
// Prevent logging the same phone+section combo within 5 minutes
const recentEntries = new Map<string, number>();
const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function isDuplicate(key: string): boolean {
  const lastTime = recentEntries.get(key);
  if (lastTime && Date.now() - lastTime < DEDUP_WINDOW_MS) return true;
  recentEntries.set(key, Date.now());
  return false;
}

// Clean up old entries periodically
setInterval(() => {
  const cutoff = Date.now() - DEDUP_WINDOW_MS;
  for (const [key, time] of recentEntries) {
    if (time < cutoff) recentEntries.delete(key);
  }
}, 10 * 60 * 1000); // Every 10 minutes

// ─── Noteworthy Detection ───────────────────────────────────────────

function isNoteworthy(event: ConversationEvent): { section: string; entry: string } | null {
  const guest = event.pushName || 'Guest';
  const phoneShort = event.phone.split('@')[0];
  const textPreview = event.guestText.slice(0, 100).replace(/\n/g, ' ');

  // Complaints → Issues Reported (highest priority)
  if (event.messageType === 'complaint' || event.escalated) {
    return {
      section: 'Issues Reported',
      entry: `**${guest}** (${phoneShort}): "${textPreview}" [${event.intent}, escalated]`
    };
  }

  // Problems → Issues Reported
  if (event.messageType === 'problem') {
    return {
      section: 'Issues Reported',
      entry: `**${guest}** (${phoneShort}): "${textPreview}" [${event.intent}]`
    };
  }

  // Bookings → Staff Notes
  if (event.bookingStarted || event.action === 'start_booking') {
    return {
      section: 'Staff Notes',
      entry: `Booking inquiry from **${guest}** (${phoneShort})`
    };
  }

  // Workflows started → Staff Notes
  if (event.workflowStarted || event.action === 'workflow') {
    return {
      section: 'Staff Notes',
      entry: `Workflow started for **${guest}** (${phoneShort}) [${event.intent}]`
    };
  }

  // Payment forwarding → Staff Notes
  if (event.action === 'forward_payment') {
    return {
      section: 'Staff Notes',
      entry: `Payment receipt from **${guest}** (${phoneShort}) forwarded to staff`
    };
  }

  // Low confidence → Patterns Observed (Rainbow struggled to answer)
  if (event.confidence < 0.4) {
    return {
      section: 'Patterns Observed',
      entry: `Low confidence (${event.confidence.toFixed(2)}) reply to **${guest}**: "${textPreview}"`
    };
  }

  return null; // Not noteworthy enough to log
}

// ─── Diary Writer ───────────────────────────────────────────────────

export function maybeWriteDiary(event: ConversationEvent): void {
  const note = isNoteworthy(event);
  if (!note) return;

  // Dedup: same phone + section within 5 min window
  const dedupKey = `${event.phone}:${note.section}`;
  if (isDuplicate(dedupKey)) {
    return;
  }

  try {
    const memDir = getMemoryDir();
    if (!existsSync(memDir)) {
      mkdirSync(memDir, { recursive: true });
    }

    const today = getTodayDate();
    const timestamp = getMYTTimestamp();
    const filePath = join(memDir, `${today}.md`);

    let content: string;
    try {
      content = readFileSync(filePath, 'utf-8');
    } catch {
      content = getDailyMemoryTemplate(today);
    }

    const newLine = `- ${timestamp} -- ${note.entry}`;
    const sectionHeader = `## ${note.section}`;
    const idx = content.indexOf(sectionHeader);

    if (idx === -1) {
      // Section not found — append at end
      content = content.trimEnd() + `\n\n${sectionHeader}\n${newLine}\n`;
    } else {
      // Insert after section header line
      const headerEnd = content.indexOf('\n', idx);
      if (headerEnd === -1) {
        content += `\n${newLine}`;
      } else {
        content = content.slice(0, headerEnd + 1) + newLine + '\n' + content.slice(headerEnd + 1);
      }
    }

    writeFileSync(filePath, content, 'utf-8');

    // Reload KB cache so the bot immediately knows about the new entry
    reloadKBFile(`memory/${today}.md`);

    console.log(`[MemoryWriter] ${today} > ${note.section}: ${note.entry.slice(0, 60)}...`);
  } catch (err: any) {
    // Non-fatal: don't crash the router over diary writes
    console.error(`[MemoryWriter] Failed to write diary: ${err.message}`);
  }
}
