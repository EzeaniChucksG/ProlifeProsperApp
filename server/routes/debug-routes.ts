/**
 * Debug Routes
 * Development and debugging utilities
 */
import type { Express } from "express";
import { storage } from "../storage/index";
import { authenticateToken } from "../middleware";

export function registerDebugRoutes(app: Express): void {
  // Debug endpoint to check organization data
  app.get("/api/debug/organization", authenticateToken, async (req, res) => {
    try {
      const user = req.user as { id: string; organizationId: number };
      const organization = await storage.getOrganizationById(user.organizationId);
      
      res.json({ 
        user: {
          id: user.id,
          organizationId: user.organizationId,
          role: req.user.role
        },
        organization 
      });
    } catch (error) {
      console.error("Debug organization error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update organization with valid US phone number for testing
  app.patch("/api/debug/fix-organization-phone", authenticateToken, async (req, res) => {
    try {
      const user = req.user as { id: string; organizationId: number };

      // Update with valid US phone numbers for GETTRX testing
      const updatedOrg = await storage.updateOrganization(user.organizationId, {
        phone: "(555) 123-4567",
        zipCode: "90210",
        state: "California",
        city: "Beverly Hills",
        address: "123 Test Street",
        ein: "12-3456789",
      });

      res.json({
        success: true,
        message: "Organization updated with US-format data for GETTRX testing",
        organization: updatedOrg,
      });
    } catch (error) {
      console.error("Debug phone fix error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Debug environment info
  app.get("/api/debug/environment", (req, res) => {
    res.json({
      nodeEnv: process.env.NODE_ENV,
      hasDatabase: !!process.env.DATABASE_URL,
      hasSendGrid: !!process.env.SENDGRID_API_KEY,
      hasGettrx: !!process.env.GETTRX_API_KEY,
      timestamp: new Date().toISOString()
    });
  });

  // Debug user session
  app.get("/api/debug/user-session", authenticateToken, async (req, res) => {
    try {
      const user = req.user;
      const fullUser = await storage.getUser(user.id);
      const organization = fullUser?.organizationId 
        ? await storage.getOrganizationById(fullUser.organizationId) 
        : null;

      res.json({
        sessionUser: user,
        databaseUser: fullUser,
        organization,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Debug user session error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Debug database stats
  app.get("/api/debug/database-stats", authenticateToken, async (req, res) => {
    try {
      const user = req.user as { organizationId: number };
      
      // Get basic counts
      const organizations = await storage.getOrganizationById(1); // Check if default org exists
      const orgDonors = await storage.getDonorsByOrganization(user.organizationId);
      const orgDonations = await storage.getDonationsByOrganization(user.organizationId, 10);
      const orgCampaigns = await storage.getCampaignsByOrganization(user.organizationId);

      res.json({
        defaultOrganization: organizations ? "exists" : "missing",
        userOrganizationId: user.organizationId,
        donorCount: orgDonors.length,
        donationCount: orgDonations.length,
        campaignCount: orgCampaigns.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Debug database stats error:", error);
      res.status(500).json({ error: error.message });
    }
  });
}