/**
 * contact-fields.ts — API endpoints for dynamic custom fields
 *
 * Reads/writes `rainbow_custom_field_defs` and `rainbow_custom_field_values` tables
 * in the shared Neon Postgres DB using raw `pool` queries.
 *
 * These tables are created by config-db.ts ensureTables().
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import { pool } from '../../lib/db.js';

const router = Router();

function hasDB(): boolean {
  return !!process.env.DATABASE_URL;
}

// ─── GET /contact-fields/definitions ─────────────────────────────
router.get('/contact-fields/definitions', async (_req: Request, res: Response) => {
  if (!hasDB()) return res.status(503).json({ error: 'Database not configured' });
  try {
    const result = await pool.query(
      `SELECT id, field_key, field_label, field_type, field_options, is_built_in, sort_order
       FROM rainbow_custom_field_defs
       ORDER BY sort_order, id`
    );
    // Convert snake_case to camelCase for frontend
    const defs = result.rows.map((r: any) => ({
      id: r.id,
      fieldKey: r.field_key,
      fieldLabel: r.field_label,
      fieldType: r.field_type,
      fieldOptions: r.field_options,
      isBuiltIn: r.is_built_in,
      sortOrder: r.sort_order,
    }));
    res.json(defs);
  } catch (err: any) {
    // Table might not exist yet — return empty array
    if (err.code === '42P01') return res.json([]);
    console.error('[contact-fields] GET definitions error:', err.message);
    res.status(500).json({ error: 'Failed to fetch field definitions' });
  }
});

// ─── POST /contact-fields/definitions ────────────────────────────
router.post('/contact-fields/definitions', async (req: Request, res: Response) => {
  if (!hasDB()) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { fieldKey, fieldLabel, fieldType, fieldOptions, sortOrder } = req.body;
    if (!fieldKey || !fieldLabel || !fieldType) {
      return res.status(400).json({ error: 'fieldKey, fieldLabel, fieldType are required' });
    }
    const key = fieldKey.toLowerCase().replace(/\s+/g, '_');
    const result = await pool.query(
      `INSERT INTO rainbow_custom_field_defs (field_key, name, field_label, field_type, field_options, sort_order, is_built_in)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, false)
       RETURNING *`,
      [key, fieldLabel, fieldLabel, fieldType, fieldOptions ? JSON.stringify(fieldOptions) : null, sortOrder || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Field key already exists' });
    console.error('[contact-fields] POST definitions error:', err.message);
    res.status(500).json({ error: 'Failed to create field definition' });
  }
});

// ─── DELETE /contact-fields/definitions/:key ─────────────────────
router.delete('/contact-fields/definitions/:key', async (req: Request, res: Response) => {
  if (!hasDB()) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { key } = req.params;
    const check = await pool.query(
      `SELECT is_built_in FROM rainbow_custom_field_defs WHERE field_key = $1`, [key]
    );
    if (check.rows.length === 0) return res.status(404).json({ error: 'Field not found' });
    if (check.rows[0].is_built_in) return res.status(403).json({ error: 'Built-in fields cannot be deleted' });
    await pool.query(`DELETE FROM rainbow_custom_field_defs WHERE field_key = $1`, [key]);
    res.json({ success: true });
  } catch (err: any) {
    console.error('[contact-fields] DELETE definitions error:', err.message);
    res.status(500).json({ error: 'Failed to delete field definition' });
  }
});

// ─── GET /contact-fields/values/:phone ───────────────────────────
router.get('/contact-fields/values/:phone', async (req: Request, res: Response) => {
  if (!hasDB()) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { phone } = req.params;
    const result = await pool.query(
      `SELECT field_key, value FROM rainbow_custom_field_values WHERE phone = $1`,
      [phone]
    );
    const map: Record<string, string | null> = {};
    for (const row of result.rows) {
      map[row.field_key] = row.value;
    }
    res.json(map);
  } catch (err: any) {
    if (err.code === '42P01') return res.json({});
    console.error('[contact-fields] GET values error:', err.message);
    res.status(500).json({ error: 'Failed to fetch field values' });
  }
});

// ─── PATCH /contact-fields/values/:phone ─────────────────────────
// Body: { fieldKey: value, fieldKey2: value2, ... }
router.patch('/contact-fields/values/:phone', async (req: Request, res: Response) => {
  if (!hasDB()) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { phone } = req.params;
    const updates: Record<string, string> = req.body || {};
    const updatedBy = 'staff:live-chat';

    for (const [fieldKey, value] of Object.entries(updates)) {
      await pool.query(
        `INSERT INTO rainbow_custom_field_values (phone, field_key, value, updated_by, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (phone, field_key)
         DO UPDATE SET value = $3, updated_by = $4, updated_at = NOW()`,
        [phone, fieldKey, value || null, updatedBy]
      );
    }

    res.json({ success: true, updated: Object.keys(updates).length });
  } catch (err: any) {
    console.error('[contact-fields] PATCH values error:', err.message);
    res.status(500).json({ error: 'Failed to update field values' });
  }
});

export default router;
