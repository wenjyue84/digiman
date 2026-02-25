import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../db";
import {
  scheduledMessageRules,
  scheduledMessageLogs,
} from "@shared/schema";
import { authenticateToken } from "./middleware/auth";

const router = Router();

// ─── Rules ────────────────────────────────────────────────────────────────────

// GET /api/scheduled-messages/rules
router.get("/rules", authenticateToken, async (_req, res) => {
  try {
    if (!db) return res.status(503).json({ message: "Database not available" });
    const rules = await db
      .select()
      .from(scheduledMessageRules)
      .orderBy(scheduledMessageRules.createdAt);
    res.json(rules);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch scheduled message rules" });
  }
});

// POST /api/scheduled-messages/rules
router.post("/rules", authenticateToken, async (req: any, res) => {
  try {
    if (!db) return res.status(503).json({ message: "Database not available" });
    const {
      name, description, triggerField, triggerOffsetHours,
      triggerTimeExact, filterRules, messageEn, messageMs, messageZh, cooldownHours,
    } = req.body;

    if (!name || !triggerField || triggerOffsetHours === undefined || !messageEn) {
      return res.status(400).json({ message: "name, triggerField, triggerOffsetHours, messageEn are required" });
    }

    const [created] = await db
      .insert(scheduledMessageRules)
      .values({
        name,
        description: description ?? null,
        isActive: true,
        triggerField,
        triggerOffsetHours: Number(triggerOffsetHours),
        triggerTimeExact: triggerTimeExact ?? null,
        filterRules: filterRules ?? null,
        messageEn,
        messageMs: messageMs ?? null,
        messageZh: messageZh ?? null,
        cooldownHours: Number(cooldownHours ?? 0),
        createdBy: req.user?.id ?? null,
      })
      .returning();

    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ message: "Failed to create scheduled message rule" });
  }
});

// PUT /api/scheduled-messages/rules/:id
router.put("/rules/:id", authenticateToken, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ message: "Database not available" });
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid rule id" });

    const {
      name, description, isActive, triggerField, triggerOffsetHours,
      triggerTimeExact, filterRules, messageEn, messageMs, messageZh, cooldownHours,
    } = req.body;

    const [updated] = await db
      .update(scheduledMessageRules)
      .set({
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
        ...(triggerField !== undefined && { triggerField }),
        ...(triggerOffsetHours !== undefined && { triggerOffsetHours: Number(triggerOffsetHours) }),
        ...(triggerTimeExact !== undefined && { triggerTimeExact }),
        ...(filterRules !== undefined && { filterRules }),
        ...(messageEn !== undefined && { messageEn }),
        ...(messageMs !== undefined && { messageMs }),
        ...(messageZh !== undefined && { messageZh }),
        ...(cooldownHours !== undefined && { cooldownHours: Number(cooldownHours) }),
        updatedAt: new Date(),
      })
      .where(eq(scheduledMessageRules.id, id))
      .returning();

    if (!updated) return res.status(404).json({ message: "Rule not found" });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Failed to update scheduled message rule" });
  }
});

// PATCH /api/scheduled-messages/rules/:id/toggle
router.patch("/rules/:id/toggle", authenticateToken, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ message: "Database not available" });
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid rule id" });

    const [current] = await db
      .select({ isActive: scheduledMessageRules.isActive })
      .from(scheduledMessageRules)
      .where(eq(scheduledMessageRules.id, id));

    if (!current) return res.status(404).json({ message: "Rule not found" });

    const [updated] = await db
      .update(scheduledMessageRules)
      .set({ isActive: !current.isActive, updatedAt: new Date() })
      .where(eq(scheduledMessageRules.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Failed to toggle rule" });
  }
});

// DELETE /api/scheduled-messages/rules/:id
router.delete("/rules/:id", authenticateToken, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ message: "Database not available" });
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid rule id" });

    const [deleted] = await db
      .delete(scheduledMessageRules)
      .where(eq(scheduledMessageRules.id, id))
      .returning();

    if (!deleted) return res.status(404).json({ message: "Rule not found" });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete scheduled message rule" });
  }
});

// ─── Logs ─────────────────────────────────────────────────────────────────────

// GET /api/scheduled-messages/logs?ruleId=&phone=&limit=
router.get("/logs", authenticateToken, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ message: "Database not available" });
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

    const logs = await db
      .select()
      .from(scheduledMessageLogs)
      .orderBy(desc(scheduledMessageLogs.sentAt))
      .limit(limit);

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch scheduled message logs" });
  }
});

export default router;
