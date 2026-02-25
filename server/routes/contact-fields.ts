/**
 * contact-fields.ts — PMS proxy to Rainbow AI contact-fields API
 *
 * Proxies all requests to Rainbow API at localhost:3002.
 * Rainbow owns the DB tables (rainbow_custom_field_defs / _values).
 * PMS adds Passport.js session auth on top.
 */
import { Router } from "express";
import { authenticateToken } from "./middleware/auth";
import { rainbowFetch } from "./lib/rainbow-proxy";

const router = Router();

// ─── Field Definitions ───────────────────────────────────────────────────────

// GET /api/contact-fields/definitions
router.get("/definitions", authenticateToken, async (_req, res) => {
  try {
    const resp = await rainbowFetch("/contact-fields/definitions");
    const data = await resp.json();
    res.status(resp.status).json(data);
  } catch (error: any) {
    console.error("[contact-fields proxy] GET definitions:", error.message);
    res.status(502).json({ message: "Rainbow AI service unavailable" });
  }
});

// POST /api/contact-fields/definitions
router.post("/definitions", authenticateToken, async (req, res) => {
  try {
    const resp = await rainbowFetch("/contact-fields/definitions", {
      method: "POST",
      body: JSON.stringify(req.body),
    });
    const data = await resp.json();
    res.status(resp.status).json(data);
  } catch (error: any) {
    console.error("[contact-fields proxy] POST definitions:", error.message);
    res.status(502).json({ message: "Rainbow AI service unavailable" });
  }
});

// DELETE /api/contact-fields/definitions/:key
router.delete("/definitions/:key", authenticateToken, async (req, res) => {
  try {
    const resp = await rainbowFetch(`/contact-fields/definitions/${req.params.key}`, {
      method: "DELETE",
    });
    const data = await resp.json();
    res.status(resp.status).json(data);
  } catch (error: any) {
    console.error("[contact-fields proxy] DELETE definitions:", error.message);
    res.status(502).json({ message: "Rainbow AI service unavailable" });
  }
});

// ─── Field Values (per contact) ──────────────────────────────────────────────

// GET /api/contact-fields/values/:phone
router.get("/values/:phone", authenticateToken, async (req, res) => {
  try {
    const resp = await rainbowFetch(`/contact-fields/values/${encodeURIComponent(req.params.phone)}`);
    const data = await resp.json();
    res.status(resp.status).json(data);
  } catch (error: any) {
    console.error("[contact-fields proxy] GET values:", error.message);
    res.status(502).json({ message: "Rainbow AI service unavailable" });
  }
});

// PUT /api/contact-fields/values/:phone  (Rainbow uses PATCH, we transform)
router.put("/values/:phone", authenticateToken, async (req, res) => {
  try {
    const resp = await rainbowFetch(`/contact-fields/values/${encodeURIComponent(req.params.phone)}`, {
      method: "PATCH",
      body: JSON.stringify(req.body),
    });
    const data = await resp.json();
    res.status(resp.status).json(data);
  } catch (error: any) {
    console.error("[contact-fields proxy] PUT values:", error.message);
    res.status(502).json({ message: "Rainbow AI service unavailable" });
  }
});

export default router;
