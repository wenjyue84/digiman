/**
 * HTTP response utilities for admin routes.
 *
 * Replaces 150+ duplicate res.status(N).json({ error: '...' }) patterns across 12 files:
 * - 58 × res.status(400)
 * - 28 × res.status(404)
 * - 64 × res.status(500)
 */

import type { Response } from 'express';

// ─── Success Responses ──────────────────────────────────────────────

export function ok(res: Response, data: Record<string, any> = {}): void {
  res.json({ ok: true, ...data });
}

// ─── Error Responses ────────────────────────────────────────────────

export function badRequest(res: Response, error: string): void {
  res.status(400).json({ error });
}

export function notFound(res: Response, resource: string): void {
  res.status(404).json({ error: `${resource} not found` });
}

export function conflict(res: Response, error: string): void {
  res.status(409).json({ error });
}

export function serverError(res: Response, error: Error | string): void {
  const message = error instanceof Error ? error.message : error;
  res.status(500).json({ error: message });
}

// ─── Validation Helpers ─────────────────────────────────────────────

/**
 * Validate that required fields exist in the request body.
 *
 * @example
 * ```ts
 * const err = validateRequired(req.body, ['key', 'en']);
 * if (err) return badRequest(res, err);
 * ```
 */
export function validateRequired(body: any, fields: string[]): string | null {
  const missing = fields.filter(f => body[f] === undefined || body[f] === null || body[f] === '');
  if (missing.length === 0) return null;
  return `${missing.join(', ')} required`;
}

/**
 * Validate filename doesn't contain path traversal characters.
 */
export function validateFilename(filename: string): string | null {
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return 'Invalid filename';
  }
  return null;
}
