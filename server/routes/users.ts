import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { insertUserSchema } from "@shared/schema";
import { validateData, securityValidationMiddleware, validators } from "../validation";
import { authenticateToken } from "./middleware/auth";

const router = Router();

// Get all users
router.get("/", authenticateToken, async (_req, res) => {
  try {
    const users = await storage.getAllUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to get users" });
  }
});

// Create new user
router.post(
  "/",
  securityValidationMiddleware,
  authenticateToken,
  validateData(insertUserSchema, "body"),
  async (req: any, res) => {
    try {
      const userData = req.body;

      // Additional password strength validation
      if (userData.password) {
        const passwordCheck = validators.isStrongPassword(userData.password);
        if (!passwordCheck.isValid) {
          return res.status(400).json({
            message: "Password does not meet strength requirements",
            issues: passwordCheck.issues,
          });
        }
      }

      // Check if user with email already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(409).json({ message: "User with this email already exists" });
      }

      // Check if user with username already exists
      if (userData.username) {
        const existingUsername = await storage.getUserByUsername(userData.username);
        if (existingUsername) {
          return res.status(409).json({ message: "User with this username already exists" });
        }
      }

      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      console.error("Create user error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  }
);

// Update user
router.patch("/:id", authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove empty password field
    if (updates.password === "") {
      delete updates.password;
    }

    const user = await storage.updateUser(id, updates);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Failed to update user" });
  }
});

// Delete user
router.delete("/:id", authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const success = await storage.deleteUser(id);

    if (!success) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete user" });
  }
});

export default router;

