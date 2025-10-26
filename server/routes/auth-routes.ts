/**
 * Authentication Routes
 * Handles user authentication, registration, and profile management
 */
import type { Express } from "express";
import { storage } from "../storage/index";
import { authService } from "../auth/auth-service";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { authenticateToken } from "../middleware";
import crypto from "crypto";

export function registerAuthRoutes(app: Express): void {
  // Login page (serves social auth buttons)
  app.get("/api/login", (req, res) => {
    res.json({
      message: "Use social authentication endpoints",
      providers: ["google", "facebook"],
    });
  });

  // User signin (email/password)
  app.post("/api/auth/signin", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ 
          message: "Email and password are required" 
        });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Verify password (assuming password verification logic exists in authService)
      const isValid = await authService.verifyPassword(password, user.hashedPassword);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Generate token
      const token = await authService.generateToken(user);
      
      res.json({ 
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          organizationId: user.organizationId
        },
        token 
      });
    } catch (error) {
      console.error("Signin error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // User registration
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(409).json({ message: "User already exists" });
      }

      // Create new user
      const newUser = await storage.createUser(userData);
      
      // Generate token
      const token = await authService.generateToken(newUser);
      
      res.status(201).json({ 
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role,
          organizationId: newUser.organizationId
        },
        token 
      });
    } catch (error) {
      console.error("Registration error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error",
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Register with organization
  app.post("/api/auth/signup-with-organization", async (req, res) => {
    try {
      const { 
        firstName, 
        lastName, 
        email, 
        password,
        organizationName,
        organizationType = "nonprofit"
      } = req.body;

      // Validate required fields
      if (!firstName || !lastName || !email || !password || !organizationName) {
        return res.status(400).json({
          message: "All fields are required"
        });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ message: "User already exists" });
      }

      // Create organization first
      const organization = await storage.createOrganization({
        name: organizationName,
        slug: organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        email: email,
        organizationType
      });

      // Create user with organization ID
      const hashedPassword = await authService.hashPassword(password);
      const newUser = await storage.createUser({
        id: crypto.randomUUID(),
        email,
        firstName,
        lastName,
        hashedPassword,
        organizationId: organization.id,
        role: 'admin',
        onboardingStep: 1,
        onboardingCompleted: false
      });

      // Generate token
      const token = await authService.generateToken(newUser);
      
      res.status(201).json({ 
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role,
          organizationId: newUser.organizationId
        },
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug
        },
        token 
      });
    } catch (error) {
      console.error("Signup with organization error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  // Get current user
  app.get("/api/auth/user", authenticateToken, async (req: any, res) => {
    res.json(req.user);
  });

  // Refresh token
  app.post("/api/auth/refresh", authenticateToken, async (req: any, res) => {
    try {
      const newToken = await authService.generateToken(req.user);
      res.json({ token: newToken });
    } catch (error) {
      console.error("Token refresh error:", error);
      res.status(500).json({ message: "Failed to refresh token" });
    }
  });

  // Get available auth providers
  app.get("/api/auth/providers", (req, res) => {
    res.json({
      providers: ["google", "facebook"],
      socialAuthEnabled: true
    });
  });

  // Logout
  app.get("/api/logout", (req, res) => {
    res.json({ message: "Logout successful" });
  });

  // Get user profile
  app.get("/api/profile", authenticateToken, async (req, res) => {
    try {
      const user = req.user as { id: string; organizationId: number };
      
      // Get full user data
      const fullUser = await storage.getUser(user.id);
      if (!fullUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get organization data
      const organization = await storage.getOrganizationById(user.organizationId);
      
      res.json({
        id: fullUser.id,
        email: fullUser.email,
        firstName: fullUser.firstName,
        lastName: fullUser.lastName,
        profileImageUrl: fullUser.profileImageUrl,
        phone: fullUser.phone,
        title: fullUser.title,
        bio: fullUser.bio,
        location: fullUser.location,
        role: fullUser.role,
        onboardingStep: fullUser.onboardingStep,
        onboardingCompleted: fullUser.onboardingCompleted,
        organization: organization ? {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          logoUrl: organization.logoUrl,
          primaryColor: organization.primaryColor
        } : null
      });
    } catch (error) {
      console.error("Profile fetch error:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  // Update user profile
  app.patch("/api/profile", authenticateToken, async (req, res) => {
    try {
      const user = req.user as { id: string };
      const updates = req.body;

      // Validate and sanitize updates
      const allowedFields = ['firstName', 'lastName', 'profileImageUrl', 'phone', 'title', 'bio', 'location'];
      const sanitizedUpdates = Object.keys(updates)
        .filter(key => allowedFields.includes(key))
        .reduce((obj: any, key) => {
          obj[key] = updates[key];
          return obj;
        }, {});

      if (Object.keys(sanitizedUpdates).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }

      const updatedUser = await storage.updateUser(user.id, sanitizedUpdates);
      
      res.json({
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        profileImageUrl: updatedUser.profileImageUrl,
        phone: updatedUser.phone,
        title: updatedUser.title,
        bio: updatedUser.bio,
        location: updatedUser.location,
        role: updatedUser.role
      });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Update user notification preferences
  app.put("/api/profile/notifications", authenticateToken, async (req, res) => {
    try {
      const user = req.user as { id: string };
      const notificationSettings = req.body;

      // For now, we'll store notification preferences in the user's custom permissions
      // In a real app, you might want a separate notifications table
      const updatedUser = await storage.updateUser(user.id, {
        customPermissions: {
          ...user.customPermissions,
          notificationSettings
        }
      });

      res.json({
        success: true,
        message: "Notification preferences updated successfully",
        settings: notificationSettings
      });
    } catch (error) {
      console.error("Notification preferences update error:", error);
      res.status(500).json({ message: "Failed to update notification preferences" });
    }
  });

  // Update user password
  app.put("/api/profile/password", authenticateToken, async (req, res) => {
    try {
      const user = req.user as { id: string };
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      // Get current user to verify password
      const fullUser = await storage.getUser(user.id);
      if (!fullUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const isValid = await authService.verifyPassword(currentPassword, fullUser.hashedPassword);
      if (!isValid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      // Hash new password and update
      const hashedNewPassword = await authService.hashPassword(newPassword);
      await storage.updateUser(user.id, {
        hashedPassword: hashedNewPassword
      });

      res.json({
        success: true,
        message: "Password updated successfully"
      });
    } catch (error) {
      console.error("Password update error:", error);
      res.status(500).json({ message: "Failed to update password" });
    }
  });
}