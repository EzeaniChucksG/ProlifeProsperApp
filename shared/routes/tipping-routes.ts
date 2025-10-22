/**
 * Platform Tipping API Routes
 * Handles organization tipping settings and configuration
 */
import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage/index";
import { insertOrganizationTippingSettingsSchema } from "@shared/schema";
import { authenticateToken } from "../middleware/auth";
// import { requireRoles } from "../middleware/roles";

const router = Router();

// Get organization tipping settings
router.get(
  "/organizations/:organizationId/tipping-settings", 
  authenticateToken, 
  // requireRoles(['admin', 'super_admin']),
  async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const settings = await storage.getTippingSettings(organizationId);
      
      // Return default settings if none exist
      if (!settings) {
        const defaultSettings = {
          organizationId,
          tippingEnabled: false,
          defaultTipType: "percentage" as const,
          defaultTipAmount: "10.00"
        };
        res.json(defaultSettings);
      } else {
        res.json(settings);
      }
    } catch (error) {
      console.error("Error fetching tipping settings:", error);
      res.status(500).json({ error: "Failed to fetch tipping settings" });
    }
  }
);

// Update organization tipping settings
router.put(
  "/organizations/:organizationId/tipping-settings",
  authenticateToken,
  // requireRoles(['admin', 'super_admin']),
  async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      
      // Validate request body
      const settingsSchema = insertOrganizationTippingSettingsSchema.partial();
      const validatedSettings = settingsSchema.parse(req.body);
      
      const updatedSettings = await storage.upsertTippingSettings(
        organizationId, 
        validatedSettings
      );
      
      res.json(updatedSettings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid tipping settings data", details: error.errors });
      } else {
        console.error("Error updating tipping settings:", error);
        res.status(500).json({ error: "Failed to update tipping settings" });
      }
    }
  }
);

export default router;