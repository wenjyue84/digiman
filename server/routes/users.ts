import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { insertUserSchema } from "@shared/schema";
import { validateData, securityValidationMiddleware, validators } from "../validation";
import { authenticateToken } from "./middleware/auth";
import { hashPassword } from "../lib/password";

const router = Router();

// Get all users - Staff only see themselves, admins see all
router.get("/", authenticateToken, async (req: any, res) => {
  try {
    const isAdmin = req.user?.role === "admin";
    let users = await storage.getAllUsers();
    
    // Staff users can only see themselves
    if (!isAdmin) {
      users = users.filter((u) => u.id === req.user?.id);
    }
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to get users" });
  }
});

// Create new user - Admin only
router.post(
  "/",
  securityValidationMiddleware,
  authenticateToken,
  validateData(insertUserSchema, "body"),
  async (req: any, res) => {
    try {
      // Check if current user is admin
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Only admin can create new users" });
      }

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

      // Hash password before storage
      if (userData.password) {
        userData.password = await hashPassword(userData.password);
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

// Update user - Role-based permissions
router.patch("/:id", authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    let updates = req.body;
    const currentUser = req.user;

    // Role-based permission check
    const isAdmin = currentUser?.role === "admin";
    const isOwnAccount = currentUser?.id === id;

    if (!isAdmin && !isOwnAccount) {
      return res.status(403).json({ message: "You can only edit your own account" });
    }

    // Staff users can only update their own account - allow certain fields
    if (!isAdmin) {
      if (!isOwnAccount) {
        return res.status(403).json({ message: "Staff users cannot edit other users" });
      }
      // Staff can update: email, username, firstName, lastName, password
      // Strip: role, googleId, profileImage, createdAt, updatedAt, id
      const allowedFields = ["email", "username", "firstName", "lastName", "password"];
      const filtered: any = {};
      allowedFields.forEach((field) => {
        if (field in updates) {
          filtered[field] = updates[field];
        }
      });
      updates = filtered;
    }

    // Remove empty password field
    if (updates.password === "") {
      delete updates.password;
    }

    // Prevent role escalation for non-admin users
    if (!isAdmin && updates.role) {
      delete updates.role;
    }

    // Check if there's anything to update
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    // Validate password strength if being updated
    if (updates.password) {
      const passwordCheck = validators.isStrongPassword(updates.password);
      if (!passwordCheck.isValid) {
        return res.status(400).json({
          message: "Password does not meet strength requirements",
          issues: passwordCheck.issues,
        });
      }
      // Hash the new password before storage
      updates.password = await hashPassword(updates.password);
    }

    // Validate email uniqueness if being updated
    if (updates.email) {
      const existingUser = await storage.getUserByEmail(updates.email);
      if (existingUser && existingUser.id !== id) {
        return res.status(409).json({ message: "Email is already in use" });
      }
    }

    // Validate username uniqueness if being updated
    if (updates.username) {
      const existingUser = await storage.getUserByUsername(updates.username);
      if (existingUser && existingUser.id !== id) {
        return res.status(409).json({ message: "Username is already in use" });
      }
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

// Delete user - Admin only
router.delete("/:id", authenticateToken, async (req: any, res) => {
  try {
    // Check if current user is admin
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Only admin can delete users" });
    }

    const { id } = req.params;
    
    // Prevent admin from deleting themselves
    if (req.user?.id === id) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }

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

