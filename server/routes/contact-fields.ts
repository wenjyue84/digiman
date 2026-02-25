import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import {
  contactFieldDefinitions,
  contactFieldValues,
} from "@shared/schema";
import { authenticateToken } from "./middleware/auth";

const router = Router();

// ─── Field Definitions ────────────────────────────────────────────────────────

// GET /api/contact-fields/definitions
router.get("/definitions", authenticateToken, async (_req, res) => {
  try {
    if (!db) return res.status(503).json({ message: "Database not available" });
    const defs = await db
      .select()
      .from(contactFieldDefinitions)
      .orderBy(contactFieldDefinitions.sortOrder);
    res.json(defs);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch field definitions" });
  }
});

// POST /api/contact-fields/definitions
router.post("/definitions", authenticateToken, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ message: "Database not available" });
    const { fieldKey, fieldLabel, fieldType, fieldOptions, sortOrder } = req.body;

    if (!fieldKey || !fieldLabel || !fieldType) {
      return res.status(400).json({ message: "fieldKey, fieldLabel, fieldType are required" });
    }

    const [created] = await db
      .insert(contactFieldDefinitions)
      .values({
        fieldKey: fieldKey.toLowerCase().replace(/\s+/g, "_"),
        fieldLabel,
        fieldType,
        fieldOptions: fieldOptions ?? null,
        isBuiltIn: false,
        sortOrder: sortOrder ?? 0,
      })
      .returning();

    res.status(201).json(created);
  } catch (error: any) {
    if (error?.code === "23505") {
      return res.status(409).json({ message: "Field key already exists" });
    }
    res.status(500).json({ message: "Failed to create field definition" });
  }
});

// PUT /api/contact-fields/definitions/:key
router.put("/definitions/:key", authenticateToken, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ message: "Database not available" });
    const { key } = req.params;
    const { fieldLabel, fieldType, fieldOptions, sortOrder } = req.body;

    const [updated] = await db
      .update(contactFieldDefinitions)
      .set({
        ...(fieldLabel !== undefined && { fieldLabel }),
        ...(fieldType !== undefined && { fieldType }),
        ...(fieldOptions !== undefined && { fieldOptions }),
        ...(sortOrder !== undefined && { sortOrder }),
      })
      .where(eq(contactFieldDefinitions.fieldKey, key))
      .returning();

    if (!updated) return res.status(404).json({ message: "Field definition not found" });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Failed to update field definition" });
  }
});

// DELETE /api/contact-fields/definitions/:key  (only non-built-in)
router.delete("/definitions/:key", authenticateToken, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ message: "Database not available" });
    const { key } = req.params;

    // Prevent deleting built-in fields
    const [def] = await db
      .select()
      .from(contactFieldDefinitions)
      .where(eq(contactFieldDefinitions.fieldKey, key));

    if (!def) return res.status(404).json({ message: "Field definition not found" });
    if (def.isBuiltIn) return res.status(403).json({ message: "Built-in fields cannot be deleted" });

    await db
      .delete(contactFieldDefinitions)
      .where(eq(contactFieldDefinitions.fieldKey, key));

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete field definition" });
  }
});

// ─── Field Values (per contact) ───────────────────────────────────────────────

// GET /api/contact-fields/values/:phone
router.get("/values/:phone", authenticateToken, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ message: "Database not available" });
    const { phone } = req.params;
    const values = await db
      .select()
      .from(contactFieldValues)
      .where(eq(contactFieldValues.phone, phone));

    // Return as a { fieldKey: value } map for easier frontend consumption
    const map: Record<string, string | null> = {};
    for (const v of values) {
      map[v.fieldKey] = v.value;
    }
    res.json(map);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch contact field values" });
  }
});

// PUT /api/contact-fields/values/:phone  — upsert a map of { fieldKey: value }
router.put("/values/:phone", authenticateToken, async (req: any, res) => {
  try {
    if (!db) return res.status(503).json({ message: "Database not available" });
    const { phone } = req.params;
    const updates: Record<string, string> = req.body;
    const updatedBy = `staff:${req.user?.username ?? "unknown"}`;

    for (const [fieldKey, value] of Object.entries(updates)) {
      await db
        .insert(contactFieldValues)
        .values({ phone, fieldKey, value, updatedBy })
        .onConflictDoUpdate({
          target: [contactFieldValues.phone, contactFieldValues.fieldKey],
          set: { value, updatedBy, updatedAt: new Date() },
        });
    }

    res.json({ success: true, updated: Object.keys(updates).length });
  } catch (error) {
    res.status(500).json({ message: "Failed to update contact field values" });
  }
});

export default router;
