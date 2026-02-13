import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "crypto";
import { OAuth2Client } from "google-auth-library";
import { storage } from "../storage";
import { loginSchema, googleAuthSchema } from "@shared/schema";
import { validateData, securityValidationMiddleware } from "../validation";
import { AppConfig } from "../configManager";
import { authenticateToken } from "./middleware/auth";

const router = Router();

// Google OAuth client
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Login endpoint
router.post("/login", 
  securityValidationMiddleware,
  validateData(loginSchema, 'body'),
  async (req, res) => {
  try {
    console.log("Login attempt:", req.body);
    const { email, password } = req.body;
    
    // Try to find user by email first, then by username
    let user = await storage.getUserByEmail(email);
    if (!user) {
      user = await storage.getUserByUsername(email); // Allow login with username in email field
    }
    console.log("User found:", user ? "Yes" : "No");
    
    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Create session
    const token = randomUUID();
    const sessionTtlMs = await AppConfig.getSessionExpirationMs();
    const expiresAt = new Date(Date.now() + sessionTtlMs);
    const session = await storage.createSession(user.id, token, expiresAt);

    res.json({ token, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role } });
  } catch (error) {
    console.error("Login error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid data", errors: error.errors });
    }
    // Database/storage errors (e.g. connection failed, relation does not exist)
    const msg = error instanceof Error ? error.message : String(error);
    const isDbError = /relation ".*" does not exist|connection|ECONNREFUSED|ETIMEDOUT|connect ECONNREFUSED|database|timeout|Connection terminated/i.test(msg);
    if (isDbError) {
      return res.status(503).json({ message: "Database unavailable. Run 'npm run db:push' if the schema was never applied, then restart the server." });
    }
    res.status(500).json({ message: "Login failed" });
  }
});

// Logout endpoint
router.post("/logout", authenticateToken, async (req: any, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      await storage.deleteSession(token);
    }
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Logout failed" });
  }
});

// Google OAuth login
router.post("/google", async (req, res) => {
  try {
    const { token } = googleAuthSchema.parse(req.body);
    
    // Verify the Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(401).json({ message: "Invalid Google token" });
    }

    const { sub: googleId, email, given_name: firstName, family_name: lastName, picture: profileImage } = payload;
    
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Check if user exists
    let user = await storage.getUserByGoogleId(googleId);
    if (!user) {
      // Check if user exists with same email
      user = await storage.getUserByEmail(email);
      if (user) {
        // Link Google account to existing user
        // This would require updating the user with Google ID
        return res.status(400).json({ message: "User with this email already exists. Please login with email/password first." });
      } else {
        // Create new user
        user = await storage.createUser({
          email,
          googleId,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          profileImage: profileImage || undefined,
          role: "staff"
        });
      }
    }

    // Create session
    const sessionToken = randomUUID();
    const sessionTtlMs = await AppConfig.getSessionExpirationMs();
    const expiresAt = new Date(Date.now() + sessionTtlMs);
    await storage.createSession(user.id, sessionToken, expiresAt);

    res.json({ 
      token: sessionToken, 
      user: { 
        id: user.id, 
        email: user.email, 
        firstName: user.firstName, 
        lastName: user.lastName, 
        profileImage: user.profileImage,
        role: user.role 
      } 
    });
  } catch (error) {
    console.error("Google auth error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid data", errors: error.errors });
    }
    res.status(500).json({ message: "Google authentication failed" });
  }
});

// Get current user
router.get("/me", authenticateToken, async (req: any, res) => {
  res.json({ user: { id: req.user.id, email: req.user.email, firstName: req.user.firstName, lastName: req.user.lastName, role: req.user.role } });
});

export default router;