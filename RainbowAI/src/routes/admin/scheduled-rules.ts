/**
 * scheduled-rules.ts — CRUD API for automated scheduled message rules
 *
 * Rules define: trigger_field (date custom field) + offset_hours + messages (multi-lang).
 * The engine (scheduled-rules-engine.ts) evaluates these every 30s.
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import { pool } from '../../lib/db.js';

const router = Router();

function hasDB(): boolean {
  return !!process.env.DATABASE_URL;
}

// ─── GET /scheduled-rules ────────────────────────────────────────
router.get('/scheduled-rules', async (_req: Request, res: Response) => {
  if (!hasDB()) return res.status(503).json({ error: 'Database not configured' });
  try {
    const result = await pool.query(
      `SELECT id, name, is_active, trigger_field, offset_hours, messages, cooldown_hours, match_value, created_at
       FROM rainbow_scheduled_rules
       ORDER BY created_at DESC`
    );
    const rules = result.rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      isActive: r.is_active,
      triggerField: r.trigger_field,
      offsetHours: r.offset_hours,
      messages: r.messages,
      cooldownHours: r.cooldown_hours,
      matchValue: r.match_value || null,
      createdAt: r.created_at,
    }));
    res.json(rules);
  } catch (err: any) {
    if (err.code === '42P01') return res.json([]);
    console.error('[scheduled-rules] GET error:', err.message);
    res.status(500).json({ error: 'Failed to fetch rules' });
  }
});

// ─── POST /scheduled-rules ───────────────────────────────────────
router.post('/scheduled-rules', async (req: Request, res: Response) => {
  if (!hasDB()) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { name, triggerField, offsetHours, messages, cooldownHours, matchValue } = req.body;
    if (!name || !triggerField || !messages) {
      return res.status(400).json({ error: 'name, triggerField, messages required' });
    }
    const result = await pool.query(
      `INSERT INTO rainbow_scheduled_rules (name, trigger_field, offset_hours, messages, cooldown_hours, match_value)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6)
       RETURNING *`,
      [name, triggerField, offsetHours || 0, JSON.stringify(messages), cooldownHours || 24, matchValue || null]
    );
    console.log(`[scheduled-rules] Created rule "${name}" → trigger ${triggerField}` + (matchValue ? ` = "${matchValue}"` : ` @ ${offsetHours}h`));
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error('[scheduled-rules] POST error:', err.message);
    res.status(500).json({ error: 'Failed to create rule' });
  }
});

// ─── PUT /scheduled-rules/:id ────────────────────────────────────
router.put('/scheduled-rules/:id', async (req: Request, res: Response) => {
  if (!hasDB()) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { id } = req.params;
    const { name, triggerField, offsetHours, messages, cooldownHours, matchValue } = req.body;
    const result = await pool.query(
      `UPDATE rainbow_scheduled_rules
       SET name = COALESCE($2, name),
           trigger_field = COALESCE($3, trigger_field),
           offset_hours = COALESCE($4, offset_hours),
           messages = COALESCE($5::jsonb, messages),
           cooldown_hours = COALESCE($6, cooldown_hours),
           match_value = $7
       WHERE id = $1
       RETURNING *`,
      [id, name, triggerField, offsetHours, messages ? JSON.stringify(messages) : null, cooldownHours, matchValue !== undefined ? (matchValue || null) : null]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Rule not found' });
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('[scheduled-rules] PUT error:', err.message);
    res.status(500).json({ error: 'Failed to update rule' });
  }
});

// ─── PATCH /scheduled-rules/:id/toggle ───────────────────────────
router.patch('/scheduled-rules/:id/toggle', async (req: Request, res: Response) => {
  if (!hasDB()) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE rainbow_scheduled_rules
       SET is_active = NOT is_active
       WHERE id = $1
       RETURNING id, is_active`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Rule not found' });
    res.json({ id: result.rows[0].id, isActive: result.rows[0].is_active });
  } catch (err: any) {
    console.error('[scheduled-rules] TOGGLE error:', err.message);
    res.status(500).json({ error: 'Failed to toggle rule' });
  }
});

// ─── DELETE /scheduled-rules/:id ─────────────────────────────────
router.delete('/scheduled-rules/:id', async (req: Request, res: Response) => {
  if (!hasDB()) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM rainbow_scheduled_rules WHERE id = $1 RETURNING id`, [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Rule not found' });
    // Also clean up logs
    await pool.query(`DELETE FROM rainbow_scheduled_logs WHERE rule_id = $1`, [id]);
    res.json({ success: true });
  } catch (err: any) {
    console.error('[scheduled-rules] DELETE error:', err.message);
    res.status(500).json({ error: 'Failed to delete rule' });
  }
});

// ─── GET /scheduled-rules/:id/logs ───────────────────────────────
router.get('/scheduled-rules/:id/logs', async (req: Request, res: Response) => {
  if (!hasDB()) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const result = await pool.query(
      `SELECT id, phone, sent_at FROM rainbow_scheduled_logs
       WHERE rule_id = $1
       ORDER BY sent_at DESC
       LIMIT $2`,
      [id, limit]
    );
    res.json(result.rows);
  } catch (err: any) {
    if (err.code === '42P01') return res.json([]);
    console.error('[scheduled-rules] GET logs error:', err.message);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

export default router;
