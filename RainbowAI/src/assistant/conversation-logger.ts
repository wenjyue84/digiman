/**
 * Persistent Conversation Logger — PostgreSQL Backend
 *
 * Stores real chat messages to Postgres for admin review.
 * Tables: rainbow_conversations + rainbow_messages
 *
 * Maintains the same public API as the old JSON-file version
 * so all callers (pipeline, routes, etc.) work unchanged.
 *
 * Refactored: helpers extracted to conversation-db.ts, conversation-contacts.ts,
 * conversation-context.ts, and conversation-logger-types.ts.
 */

import { eq, gt, sql, and } from 'drizzle-orm';
import { db } from '../lib/db.js';
import { withFallback } from '../lib/with-fallback.js';
import { rainbowConversations, rainbowMessages } from '../../../shared/schema-tables.js';
import {
  ensureDb,
  canonicalPhoneKey,
  rowToMessage,
  upsertConversation,
  invalidateListCache,
  getListCache,
  setListCache,
} from './conversation-db.js';
import { scheduleContextUpdate } from './conversation-context.js';

// ─── Re-export types (callers still import these from here) ─────────

export type {
  LoggedMessage,
  ContactDetails,
  ConversationLog,
  ConversationSummary,
} from './conversation-logger-types.js';

import type {
  ContactDetails,
  ConversationLog,
  ConversationSummary,
} from './conversation-logger-types.js';

// ─── Re-export contact management (callers import from here) ────────

export {
  getContactDetails,
  updateContactDetails,
  getAllContactTags,
  getAllContactUnits,
  getAllContactDates,
} from './conversation-contacts.js';

// ─── Re-export context update (used by logMessage internally + tests) ─

export { scheduleContextUpdate } from './conversation-context.js';

// ─── Public API ─────────────────────────────────────────────────────

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
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    // Allow extra keys from copilot approval flow
    [key: string]: unknown;
  }
): Promise<void> {
  if (!(await ensureDb())) return;

  try {
    const key = canonicalPhoneKey(phone);
    const now = new Date();

    // DB-level dedup: skip if identical message was logged in the last 10 seconds.
    // This prevents duplicates from multiple servers (local + Lightsail) writing
    // to the same Neon DB, or from Baileys double-fire events.
    const windowStart = new Date(now.getTime() - 10_000);
    const dupeCheck = await db.execute(sql`
      SELECT 1 FROM rainbow_messages
      WHERE phone = ${key}
        AND role = ${role}
        AND content = ${content}
        AND timestamp > ${windowStart}
      LIMIT 1
    `);
    if ((dupeCheck as any).rows?.length > 0) {
      console.log(`[ConvoLogger] Dedup: skipping duplicate ${role} message for ${key}`);
      return;
    }

    // Wrap upsert + insert + cap-delete in a single transaction (US-168)
    await db.transaction(async (tx) => {
      // Upsert conversation
      await upsertConversation(key, pushName, meta?.instanceId, tx);

      // Insert message
      await tx.insert(rainbowMessages).values({
        phone: key,
        role,
        content,
        timestamp: now,
        intent: meta?.intent ?? null,
        confidence: meta?.confidence ?? null,
        action: meta?.action ?? null,
        manual: meta?.manual ?? null,
        source: meta?.source ?? null,
        model: meta?.model ?? null,
        responseTime: meta?.responseTime ?? null,
        kbFilesJson: meta?.kbFiles ? JSON.stringify(meta.kbFiles) : null,
        messageType: meta?.messageType ?? null,
        routedAction: meta?.routedAction ?? null,
        workflowId: meta?.workflowId ?? null,
        stepId: meta?.stepId ?? null,
        usageJson: (meta?.usage || meta?.staffName)
          ? JSON.stringify({ ...(meta?.usage || {}), ...(meta?.staffName ? { staffName: meta.staffName } : {}) })
          : null,
      });

      // Cap at 500 messages per conversation
      const countResult = await tx
        .select({ count: sql<number>`count(*)` })
        .from(rainbowMessages)
        .where(eq(rainbowMessages.phone, key));

      const totalCount = Number(countResult[0]?.count ?? 0);
      if (totalCount > 500) {
        // Delete oldest messages beyond 500
        const excess = totalCount - 500;
        await tx.execute(sql`
          DELETE FROM rainbow_messages
          WHERE id IN (
            SELECT id FROM rainbow_messages
            WHERE phone = ${key}
            ORDER BY timestamp ASC
            LIMIT ${excess}
          )
        `);
      }
    });

    invalidateListCache();

    // Auto-update contact context file after assistant replies (debounced)
    if (role === 'assistant') {
      scheduleContextUpdate(key, pushName);
    }
  } catch (err: any) {
    console.error(`[ConvoLogger] Failed to log message for ${phone}:`, err.message);
  }
}

/** Log a user non-text message and the assistant reply in one write. */
export async function logNonTextExchange(
  phone: string,
  pushName: string,
  userPlaceholder: string,
  assistantReply: string,
  instanceId?: string
): Promise<void> {
  if (!(await ensureDb())) return;

  try {
    const key = canonicalPhoneKey(phone);
    const now = new Date();
    const nowPlus1 = new Date(now.getTime() + 1);

    // DB-level dedup: skip if this non-text exchange was already logged recently
    const windowStart = new Date(now.getTime() - 10_000);
    const dupeCheck = await db.execute(sql`
      SELECT 1 FROM rainbow_messages
      WHERE phone = ${key}
        AND role = 'user'
        AND content = ${userPlaceholder}
        AND timestamp > ${windowStart}
      LIMIT 1
    `);
    if ((dupeCheck as any).rows?.length > 0) {
      console.log(`[ConvoLogger] Dedup: skipping duplicate non-text exchange for ${key}`);
      return;
    }

    // Wrap upsert + insert in a single transaction (US-168)
    await db.transaction(async (tx) => {
      await upsertConversation(key, pushName, instanceId, tx);

      // Insert both messages
      await tx.insert(rainbowMessages).values([
        { phone: key, role: 'user', content: userPlaceholder, timestamp: now },
        { phone: key, role: 'assistant', content: assistantReply, timestamp: nowPlus1, responseTime: 0 },
      ]);
    });
  } catch (err: any) {
    console.error(`[ConvoLogger] Failed to log non-text exchange for ${phone}:`, err.message);
  }
}

/** List all conversations with summaries. */
export async function listConversations(): Promise<ConversationSummary[]> {
  const cached = getListCache();
  if (cached) return cached.data;

  if (!(await ensureDb())) return [];

  return withFallback(
    async () => {
      // Single query with LATERAL JOINs — eliminates N+1 problem
      // NOTE: db.execute(sql``) returns raw PG column names (snake_case), NOT Drizzle camelCase
      const result = await db.execute(sql`
        SELECT
          c.phone,
          c.push_name,
          c.instance_id,
          c.pinned,
          c.favourite,
          c.created_at,
          c.last_read_at,
          lm.content   AS last_msg_content,
          lm.role       AS last_msg_role,
          lm.timestamp  AS last_msg_at,
          COALESCE(mc.total, 0)::int  AS message_count,
          COALESCE(uc.unread, 0)::int AS unread_count
        FROM rainbow_conversations c
        LEFT JOIN LATERAL (
          SELECT content, role, timestamp
          FROM rainbow_messages
          WHERE phone = c.phone
          ORDER BY timestamp DESC
          LIMIT 1
        ) lm ON true
        LEFT JOIN LATERAL (
          SELECT count(*)::int AS total
          FROM rainbow_messages
          WHERE phone = c.phone
        ) mc ON true
        LEFT JOIN LATERAL (
          SELECT count(*)::int AS unread
          FROM rainbow_messages
          WHERE phone = c.phone
            AND role = 'user'
            AND (
              c.last_read_at IS NULL
              OR timestamp > c.last_read_at
            )
        ) uc ON true
        WHERE lm.content IS NOT NULL
        ORDER BY lm.timestamp DESC
      `);
      const rows: any[] = result.rows;

      const summaries: ConversationSummary[] = rows.map((r: any) => ({
        phone: r.phone,
        pushName: r.push_name,
        instanceId: r.instance_id ?? undefined,
        lastMessage: (r.last_msg_content || '').slice(0, 100),
        lastMessageRole: r.last_msg_role as 'user' | 'assistant',
        lastMessageAt: r.last_msg_at instanceof Date
          ? r.last_msg_at.getTime()
          : new Date(r.last_msg_at).getTime(),
        messageCount: Number(r.message_count ?? 0),
        unreadCount: Number(r.unread_count ?? 0),
        pinned: r.pinned,
        favourite: r.favourite,
        createdAt: r.created_at instanceof Date
          ? r.created_at.getTime()
          : new Date(r.created_at).getTime(),
      }));
      setListCache(summaries);
      return summaries;
    },
    async () => [],
    '[ConvoLogger] listConversations'
  );
}

/** Get full conversation log for a phone number */
export async function getConversation(phone: string): Promise<ConversationLog | null> {
  if (!(await ensureDb())) return null;

  return withFallback(
    async () => {
      const key = canonicalPhoneKey(phone);

      const convoRows = await db
        .select()
        .from(rainbowConversations)
        .where(eq(rainbowConversations.phone, key))
        .limit(1);

      if (convoRows.length === 0) return null;
      const convo = convoRows[0];

      // Get all messages ordered by timestamp
      const msgRows = await db
        .select()
        .from(rainbowMessages)
        .where(eq(rainbowMessages.phone, key))
        .orderBy(rainbowMessages.timestamp);

      const messages = msgRows.map(rowToMessage);

      let contactDetails: ContactDetails | undefined;
      if (convo.contactDetailsJson) {
        try { contactDetails = JSON.parse(convo.contactDetailsJson); } catch { /* ignore */ }
      }

      return {
        phone: convo.phone,
        pushName: convo.pushName,
        instanceId: convo.instanceId ?? undefined,
        messages,
        contactDetails,
        pinned: convo.pinned,
        favourite: convo.favourite,
        lastReadAt: convo.lastReadAt?.getTime(),
        responseMode: convo.responseMode ?? undefined,
        createdAt: convo.createdAt.getTime(),
        updatedAt: convo.updatedAt.getTime(),
      };
    },
    async () => null,
    `[ConvoLogger] getConversation(${phone})`
  );
}

/** Mark conversation as read */
export async function markConversationAsRead(phone: string): Promise<void> {
  if (!(await ensureDb())) return;

  await withFallback(
    async () => {
      const key = canonicalPhoneKey(phone);
      await db
        .update(rainbowConversations)
        .set({ lastReadAt: new Date(), updatedAt: new Date() })
        .where(eq(rainbowConversations.phone, key));
      invalidateListCache();
    },
    async () => {},
    `[ConvoLogger] markConversationAsRead(${phone})`
  );
}

/** Delete a conversation log */
export async function deleteConversation(phone: string): Promise<boolean> {
  if (!(await ensureDb())) return false;

  return withFallback(
    async () => {
      const key = canonicalPhoneKey(phone);

      // Delete messages + conversation in a single transaction (US-168)
      await db.transaction(async (tx) => {
        await tx.delete(rainbowMessages).where(eq(rainbowMessages.phone, key));
        await tx.delete(rainbowConversations).where(eq(rainbowConversations.phone, key));
      });

      invalidateListCache();
      return true;
    },
    async () => false,
    `[ConvoLogger] deleteConversation(${phone})`
  );
}

export async function clearConversationMessages(phone: string): Promise<boolean> {
  if (!(await ensureDb())) return false;

  return withFallback(
    async () => {
      const key = canonicalPhoneKey(phone);
      await db.delete(rainbowMessages).where(eq(rainbowMessages.phone, key));
      invalidateListCache();
      return true;
    },
    async () => false,
    `[ConvoLogger] clearConversationMessages(${phone})`
  );
}

/** Toggle pin state for a conversation */
export async function togglePin(phone: string): Promise<boolean> {
  if (!(await ensureDb())) return false;

  return withFallback(
    async () => {
      const key = canonicalPhoneKey(phone);
      const rows = await db
        .select({ pinned: rainbowConversations.pinned })
        .from(rainbowConversations)
        .where(eq(rainbowConversations.phone, key))
        .limit(1);

      if (rows.length === 0) return false;
      const newPinned = !rows[0].pinned;

      await db
        .update(rainbowConversations)
        .set({ pinned: newPinned, updatedAt: new Date() })
        .where(eq(rainbowConversations.phone, key));

      invalidateListCache();
      return newPinned;
    },
    async () => false,
    `[ConvoLogger] togglePin(${phone})`
  );
}

/** Toggle favourite state for a conversation */
export async function toggleFavourite(phone: string): Promise<boolean> {
  if (!(await ensureDb())) return false;

  return withFallback(
    async () => {
      const key = canonicalPhoneKey(phone);
      const rows = await db
        .select({ favourite: rainbowConversations.favourite })
        .from(rainbowConversations)
        .where(eq(rainbowConversations.phone, key))
        .limit(1);

      if (rows.length === 0) return false;
      const newFav = !rows[0].favourite;

      await db
        .update(rainbowConversations)
        .set({ favourite: newFav, updatedAt: new Date() })
        .where(eq(rainbowConversations.phone, key));

      invalidateListCache();
      return newFav;
    },
    async () => false,
    `[ConvoLogger] toggleFavourite(${phone})`
  );
}

/** Update the response mode for a conversation (persists to DB). */
export async function updateConversationMode(phone: string, mode: string): Promise<void> {
  if (!(await ensureDb())) return;

  await withFallback(
    async () => {
      const key = canonicalPhoneKey(phone);
      await db
        .update(rainbowConversations)
        .set({ responseMode: mode, updatedAt: new Date() })
        .where(eq(rainbowConversations.phone, key));
    },
    async () => {},
    `[ConvoLogger] updateConversationMode(${phone})`
  );
}

/** Aggregate response time from all messages (for dashboard avg). */
export async function getResponseTimeStats(): Promise<{ count: number; sumMs: number; avgMs: number | null }> {
  if (!(await ensureDb())) return { count: 0, sumMs: 0, avgMs: null };

  return withFallback(
    async () => {
      const result = await db
        .select({
          count: sql<number>`count(*)`,
          sumMs: sql<number>`coalesce(sum(response_time_ms), 0)`,
        })
        .from(rainbowMessages)
        .where(
          and(
            eq(rainbowMessages.role, 'assistant'),
            gt(rainbowMessages.responseTime, 0)
          )
        );

      const count = Number(result[0]?.count ?? 0);
      const sumMs = Number(result[0]?.sumMs ?? 0);

      return {
        count,
        sumMs,
        avgMs: count > 0 ? Math.round(sumMs / count) : null,
      };
    },
    async () => ({ count: 0, sumMs: 0, avgMs: null }),
    '[ConvoLogger] getResponseTimeStats'
  );
}

// ─── One-time Dedup Cleanup (Baileys double-fire) ────────────────────

/**
 * Remove duplicate messages caused by Baileys firing messages.upsert twice.
 * Duplicates are identified as rows with the same phone + role + content
 * where timestamps are within 10 seconds of each other. Keeps the earlier row.
 * (10s window accounts for varying AI response times when pipeline runs twice)
 *
 * Safe to call on startup — runs once, idempotent.
 */
export async function deduplicateMessages(): Promise<number> {
  if (!(await ensureDb())) return 0;

  try {
    // Find and delete duplicate messages:
    // Same phone, role, content, timestamps within 10 seconds
    const result = await db.execute(sql`
      DELETE FROM rainbow_messages
      WHERE id IN (
        SELECT b.id
        FROM rainbow_messages a
        JOIN rainbow_messages b
          ON a.phone = b.phone
          AND a.role = b.role
          AND a.content = b.content
          AND a.id < b.id
          AND ABS(EXTRACT(EPOCH FROM (a.timestamp - b.timestamp))) < 10
      )
    `);

    const deleted = (result as any).rowCount ?? 0;
    if (deleted > 0) {
      console.log(`[ConvoLogger] Dedup cleanup: removed ${deleted} duplicate message(s)`);
      invalidateListCache();
    }
    return deleted;
  } catch (err: any) {
    console.error('[ConvoLogger] Dedup cleanup failed:', err.message);
    return 0;
  }
}
