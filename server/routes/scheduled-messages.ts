/**
 * scheduled-messages.ts — PMS proxy to Rainbow AI scheduled-rules API
 *
 * Proxies all requests to Rainbow API at localhost:3002.
 * Rainbow owns the DB tables (rainbow_scheduled_rules / _logs) AND the execution engine.
 * PMS adds Passport.js session auth + transforms field names between PMS and Rainbow formats.
 *
 * Field mapping (PMS ↔ Rainbow):
 *   PMS triggerOffsetHours  ↔  Rainbow offsetHours
 *   PMS messageEn/Ms/Zh     ↔  Rainbow messages: { en, ms, zh }
 */
import { Router } from "express";
import { authenticateToken } from "./middleware/auth";
import { rainbowFetch } from "./lib/rainbow-proxy";

const router = Router();

// ─── Transform helpers ───────────────────────────────────────────────────────

/** Rainbow → PMS: convert Rainbow rule format to what PMS React expects */
function toClientFormat(rule: any): any {
  const messages = rule.messages || {};
  return {
    id: rule.id,
    name: rule.name,
    isActive: rule.isActive ?? rule.is_active ?? true,
    triggerField: rule.triggerField ?? rule.trigger_field,
    triggerOffsetHours: rule.offsetHours ?? rule.offset_hours ?? 0,
    messageEn: messages.en || "",
    messageMs: messages.ms || null,
    messageZh: messages.zh || null,
    cooldownHours: rule.cooldownHours ?? rule.cooldown_hours ?? 24,
    createdAt: rule.createdAt ?? rule.created_at,
  };
}

/** PMS → Rainbow: convert PMS form data to Rainbow API format */
function toRainbowFormat(body: any): any {
  return {
    name: body.name,
    triggerField: body.triggerField,
    offsetHours: body.triggerOffsetHours ?? 0,
    messages: {
      en: body.messageEn || "",
      ms: body.messageMs || null,
      zh: body.messageZh || null,
    },
    cooldownHours: body.cooldownHours ?? 24,
    matchValue: body.matchValue || null,
  };
}

// ─── Rules ───────────────────────────────────────────────────────────────────

// GET /api/scheduled-messages/rules
router.get("/rules", authenticateToken, async (_req, res) => {
  try {
    const resp = await rainbowFetch("/scheduled-rules");
    const rules = await resp.json();
    if (!Array.isArray(rules)) return res.status(resp.status).json(rules);
    res.json(rules.map(toClientFormat));
  } catch (error: any) {
    console.error("[scheduled-messages proxy] GET rules:", error.message);
    res.status(502).json({ message: "Rainbow AI service unavailable" });
  }
});

// POST /api/scheduled-messages/rules
router.post("/rules", authenticateToken, async (req, res) => {
  try {
    const resp = await rainbowFetch("/scheduled-rules", {
      method: "POST",
      body: JSON.stringify(toRainbowFormat(req.body)),
    });
    const data = await resp.json();
    res.status(resp.status).json(resp.ok ? toClientFormat(data) : data);
  } catch (error: any) {
    console.error("[scheduled-messages proxy] POST rules:", error.message);
    res.status(502).json({ message: "Rainbow AI service unavailable" });
  }
});

// PUT /api/scheduled-messages/rules/:id
router.put("/rules/:id", authenticateToken, async (req, res) => {
  try {
    const resp = await rainbowFetch(`/scheduled-rules/${req.params.id}`, {
      method: "PUT",
      body: JSON.stringify(toRainbowFormat(req.body)),
    });
    const data = await resp.json();
    res.status(resp.status).json(resp.ok ? toClientFormat(data) : data);
  } catch (error: any) {
    console.error("[scheduled-messages proxy] PUT rules:", error.message);
    res.status(502).json({ message: "Rainbow AI service unavailable" });
  }
});

// PATCH /api/scheduled-messages/rules/:id/toggle
router.patch("/rules/:id/toggle", authenticateToken, async (req, res) => {
  try {
    const resp = await rainbowFetch(`/scheduled-rules/${req.params.id}/toggle`, {
      method: "PATCH",
    });
    const data = await resp.json();
    res.status(resp.status).json(data);
  } catch (error: any) {
    console.error("[scheduled-messages proxy] TOGGLE:", error.message);
    res.status(502).json({ message: "Rainbow AI service unavailable" });
  }
});

// DELETE /api/scheduled-messages/rules/:id
router.delete("/rules/:id", authenticateToken, async (req, res) => {
  try {
    const resp = await rainbowFetch(`/scheduled-rules/${req.params.id}`, {
      method: "DELETE",
    });
    const data = await resp.json();
    res.status(resp.status).json(data);
  } catch (error: any) {
    console.error("[scheduled-messages proxy] DELETE:", error.message);
    res.status(502).json({ message: "Rainbow AI service unavailable" });
  }
});

// ─── Logs ────────────────────────────────────────────────────────────────────

// GET /api/scheduled-messages/logs?ruleId=&limit=
router.get("/logs", authenticateToken, async (req, res) => {
  try {
    const ruleId = req.query.ruleId as string;
    const limit = req.query.limit as string || "50";
    if (!ruleId) return res.json([]);
    const resp = await rainbowFetch(`/scheduled-rules/${ruleId}/logs?limit=${limit}`);
    const data = await resp.json();
    res.status(resp.status).json(data);
  } catch (error: any) {
    console.error("[scheduled-messages proxy] GET logs:", error.message);
    res.status(502).json({ message: "Rainbow AI service unavailable" });
  }
});

export default router;
