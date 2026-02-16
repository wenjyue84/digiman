/**
 * Generic fallback utility — try primary, fall back on error.
 *
 * Replaces the repeated try/catch pattern:
 *   try { return await dbOperation(); }
 *   catch (err) { console.error(label, err.message); return defaultValue; }
 *
 * Usage:
 *   const result = await withFallback(
 *     () => db.select().from(table),
 *     () => Promise.resolve([]),
 *     'listConversations'
 *   );
 */
export async function withFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
  label?: string
): Promise<T> {
  try {
    return await primary();
  } catch (err: any) {
    if (label) {
      console.error(`[withFallback] ${label}: primary failed, using fallback —`, err.message);
    }
    return await fallback();
  }
}
