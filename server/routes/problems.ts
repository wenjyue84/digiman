import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { createUnitProblemSchema, resolveProblemSchema } from "@shared/schema";
import { validateData, securityValidationMiddleware } from "../validation";
import { authenticateToken } from "./middleware/auth";

const router = Router();

// Get all problems
router.get("/", authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const problems = await storage.getAllProblems({ page, limit });
    res.json(problems);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch problems" });
  }
});

// Get active problems only
router.get("/active", authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const problems = await storage.getActiveProblems({ page, limit });
    res.json(problems);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch active problems" });
  }
});

// Report new problem
router.post("/",
  securityValidationMiddleware,
  authenticateToken,
  validateData(createUnitProblemSchema, 'body'),
  async (req: any, res) => {
  try {
    const validatedData = req.body;

    // Check if unit already has an active problem
    const existingProblems = await storage.getUnitProblems(validatedData.unitNumber);
    const hasActiveProblem = existingProblems.some(p => !p.isResolved);

    if (hasActiveProblem) {
      return res.status(400).json({
        message: "This unit already has an active problem. Please resolve it first."
      });
    }

    const problem = await storage.createUnitProblem({
      ...validatedData,
      reportedBy: req.user.username || req.user.email || "Unknown",
    });

    res.json(problem);
  } catch (error: any) {
    console.error("Error creating problem:", error);
    res.status(400).json({ message: error.message || "Failed to create problem" });
  }
});

// Resolve problem
router.patch("/:id/resolve", authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const resolvedBy = req.user.username || req.user.email || "Unknown";
    const problem = await storage.resolveProblem(id, resolvedBy, notes);

    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    res.json(problem);
  } catch (error: any) {
    console.error("Error resolving problem:", error);
    res.status(400).json({ message: error.message || "Failed to resolve problem" });
  }
});

// Update problem details
router.put("/:id",
  securityValidationMiddleware,
  authenticateToken,
  validateData(createUnitProblemSchema, 'body'),
  async (req: any, res) => {
  try {
    const { id } = req.params;
    const validatedData = req.body;

    // Check if the problem exists
    const existingProblems = await storage.getAllProblems({ page: 1, limit: 1000 });
    const existingProblem = existingProblems.data.find(p => p.id === id);

    if (!existingProblem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    // If unit number is being changed, check for active problems on the new unit
    if (validatedData.unitNumber !== existingProblem.unitNumber) {
      const newUnitProblems = await storage.getUnitProblems(validatedData.unitNumber);
      const hasActiveProblem = newUnitProblems.some(p => !p.isResolved && p.id !== id);

      if (hasActiveProblem) {
        return res.status(400).json({
          message: "The target unit already has an active problem. Please resolve it first."
        });
      }
    }

    const updatedProblem = await storage.updateProblem(id, validatedData);

    if (!updatedProblem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    res.json(updatedProblem);
  } catch (error: any) {
    console.error("Error updating problem:", error);
    res.status(400).json({ message: error.message || "Failed to update problem" });
  }
});

// Delete problem
router.delete("/:id", authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;

    const deleted = await storage.deleteProblem(id);

    if (!deleted) {
      return res.status(404).json({ message: "Problem not found" });
    }

    res.json({ message: "Problem deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting problem:", error);
    res.status(400).json({ message: error.message || "Failed to delete problem" });
  }
});

export default router;
