import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { insertExpenseSchema, updateExpenseSchema } from "@shared/schema";
import { validateData, securityValidationMiddleware } from "../validation";
import { authenticateToken } from "./middleware/auth";

const router = Router();

// Get all expenses
router.get("/", authenticateToken, async (req: any, res) => {
  try {
    // Only apply pagination if client explicitly requests it
    const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;
    
    if (hasPagination) {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const expenses = await storage.getExpenses({ page, limit });
      res.json(expenses);
    } else {
      // Return all expenses without pagination for backward compatibility
      const expenses = await storage.getExpenses();
      res.json(expenses);
    }
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch expenses" });
  }
});

// Create new expense
router.post("/", authenticateToken, async (req: any, res) => {
  try {
    const validatedData = insertExpenseSchema.parse(req.body);
    const createdBy = req.user.username || req.user.email || "Unknown";
    
    const expense = await storage.addExpense({
      ...validatedData,
      createdBy
    });
    
    res.status(201).json(expense);
  } catch (error: any) {
    console.error("Error creating expense:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid data", errors: error.errors });
    }
    res.status(400).json({ message: error.message || "Failed to create expense" });
  }
});

// Update expense
router.put("/:id", authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateExpenseSchema.parse(req.body);
    
    const expense = await storage.updateExpense({
      ...validatedData,
      id
    });
    
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    res.json(expense);
  } catch (error: any) {
    console.error("Error updating expense:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid data", errors: error.errors });
    }
    res.status(400).json({ message: error.message || "Failed to update expense" });
  }
});

// Delete expense
router.delete("/:id", authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    
    const deleted = await storage.deleteExpense(id);
    
    if (!deleted) {
      return res.status(404).json({ message: "Expense not found" });
    }

    res.json({ message: "Expense deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting expense:", error);
    res.status(400).json({ message: error.message || "Failed to delete expense" });
  }
});

export default router;