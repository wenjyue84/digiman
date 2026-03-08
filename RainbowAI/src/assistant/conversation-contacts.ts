/**
 * Contact management for the Conversation Logger subsystem.
 *
 * Extracted from conversation-logger.ts — contact details CRUD
 * and bulk contact queries (tags, units, dates).
 */

import { eq, sql } from 'drizzle-orm';
import { db } from '../lib/db.js';
import { withFallback } from '../lib/with-fallback.js';
import { rainbowConversations } from '../../../shared/schema-tables.js';
import type { ContactDetails } from './conversation-logger-types.js';
import { ensureDb, canonicalPhoneKey } from './conversation-db.js';

/** Get contact details for a phone number */
export async function getContactDetails(phone: string): Promise<ContactDetails> {
  if (!(await ensureDb())) return {};

  return withFallback(
    async () => {
      const key = canonicalPhoneKey(phone);
      const rows = await db
        .select({ json: rainbowConversations.contactDetailsJson })
        .from(rainbowConversations)
        .where(eq(rainbowConversations.phone, key))
        .limit(1);

      if (rows.length === 0 || !rows[0].json) return {};
      return JSON.parse(rows[0].json);
    },
    async () => ({}),
    `[ConvoLogger] getContactDetails(${phone})`
  );
}

/** Merge partial contact details update for a phone number */
export async function updateContactDetails(phone: string, partial: Partial<ContactDetails>): Promise<ContactDetails> {
  if (!(await ensureDb())) return {};

  return withFallback(
    async () => {
      const key = canonicalPhoneKey(phone);

      // Ensure conversation exists
      await db
        .insert(rainbowConversations)
        .values({ phone: key, pushName: '', createdAt: new Date(), updatedAt: new Date() })
        .onConflictDoNothing();

      // Get existing details
      const rows = await db
        .select({ json: rainbowConversations.contactDetailsJson })
        .from(rainbowConversations)
        .where(eq(rainbowConversations.phone, key))
        .limit(1);

      let existing: ContactDetails = {};
      if (rows.length > 0 && rows[0].json) {
        try { existing = JSON.parse(rows[0].json); } catch { /* ignore */ }
      }

      const merged = { ...existing, ...partial };

      await db
        .update(rainbowConversations)
        .set({ contactDetailsJson: JSON.stringify(merged), updatedAt: new Date() })
        .where(eq(rainbowConversations.phone, key));

      return merged;
    },
    async () => ({}),
    `[ConvoLogger] updateContactDetails(${phone})`
  );
}

/** Get phone→tags[] map for all contacts that have tags (US-009). */
export async function getAllContactTags(): Promise<Record<string, string[]>> {
  if (!(await ensureDb())) return {};

  return withFallback(
    async () => {
      const rows = await db
        .select({
          phone: rainbowConversations.phone,
          json: rainbowConversations.contactDetailsJson,
        })
        .from(rainbowConversations)
        .where(sql`${rainbowConversations.contactDetailsJson} IS NOT NULL`);

      const result: Record<string, string[]> = {};
      for (const r of rows) {
        if (!r.json) continue;
        try {
          const details = JSON.parse(r.json);
          if (Array.isArray(details.tags) && details.tags.length > 0) {
            result[r.phone] = details.tags;
          }
        } catch { /* ignore malformed JSON */ }
      }
      return result;
    },
    async () => ({}),
    '[ConvoLogger] getAllContactTags'
  );
}

/** Get phone→unit map for all contacts that have a unit assigned (US-012). */
export async function getAllContactUnits(): Promise<Record<string, string>> {
  if (!(await ensureDb())) return {};

  return withFallback(
    async () => {
      const rows = await db
        .select({
          phone: rainbowConversations.phone,
          json: rainbowConversations.contactDetailsJson,
        })
        .from(rainbowConversations)
        .where(sql`${rainbowConversations.contactDetailsJson} IS NOT NULL`);

      const result: Record<string, string> = {};
      for (const r of rows) {
        if (!r.json) continue;
        try {
          const details = JSON.parse(r.json);
          if (details.unit && typeof details.unit === 'string' && details.unit.trim()) {
            result[r.phone] = details.unit.trim();
          }
        } catch { /* ignore malformed JSON */ }
      }
      return result;
    },
    async () => ({}),
    '[ConvoLogger] getAllContactUnits'
  );
}

/** Get phone→{checkIn, checkOut} map for all contacts that have dates set (US-014). */
export async function getAllContactDates(): Promise<Record<string, { checkIn: string; checkOut: string }>> {
  if (!(await ensureDb())) return {};

  return withFallback(
    async () => {
      const rows = await db
        .select({
          phone: rainbowConversations.phone,
          json: rainbowConversations.contactDetailsJson,
        })
        .from(rainbowConversations)
        .where(sql`${rainbowConversations.contactDetailsJson} IS NOT NULL`);

      const result: Record<string, { checkIn: string; checkOut: string }> = {};
      for (const r of rows) {
        if (!r.json) continue;
        try {
          const details = JSON.parse(r.json);
          if (details.checkIn && details.checkOut) {
            result[r.phone] = { checkIn: details.checkIn, checkOut: details.checkOut };
          }
        } catch { /* ignore malformed JSON */ }
      }
      return result;
    },
    async () => ({}),
    '[ConvoLogger] getAllContactDates'
  );
}
