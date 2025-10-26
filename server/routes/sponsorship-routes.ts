/**
 * Event Sponsorship Management API Routes
 * Handles sponsorship tiers and sponsors for events
 */
import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage/index";
import { insertSponsorshipTierSchema, insertEventSponsorSchema } from "@shared/schema";
import { authenticateToken } from "../middleware/auth";
// import { requireRoles } from "../middleware/roles";

const router = Router();

// ==================== SPONSORSHIP TIERS ====================

// Get sponsorship tiers for an organization
router.get(
  "/organizations/:organizationId/sponsorship-tiers",
  authenticateToken,
  // requireRoles(['admin', 'super_admin']),
  async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const tiers = await storage.getSponsorshipTiersByOrganization(organizationId);
      res.json(tiers);
    } catch (error) {
      console.error("Error fetching sponsorship tiers:", error);
      res.status(500).json({ error: "Failed to fetch sponsorship tiers" });
    }
  }
);

// Get sponsorship tiers for a specific event
router.get(
  "/events/:eventId/sponsorship-tiers",
  authenticateToken,
  // requireRoles(['admin', 'super_admin']),
  async (req, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const tiers = await storage.getSponsorshipTiersByEvent(eventId);
      res.json(tiers);
    } catch (error) {
      console.error("Error fetching event sponsorship tiers:", error);
      res.status(500).json({ error: "Failed to fetch event sponsorship tiers" });
    }
  }
);

// Create new sponsorship tier
router.post(
  "/organizations/:organizationId/sponsorship-tiers",
  authenticateToken,
  // requireRoles(['admin', 'super_admin']),
  async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      
      // Validate request body
      const tierData = insertSponsorshipTierSchema.parse({
        ...req.body,
        organizationId
      });
      
      const newTier = await storage.createSponsorshipTier(tierData);
      res.status(201).json(newTier);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid tier data", details: error.errors });
      } else {
        console.error("Error creating sponsorship tier:", error);
        res.status(500).json({ error: "Failed to create sponsorship tier" });
      }
    }
  }
);

// Update sponsorship tier
router.put(
  "/sponsorship-tiers/:tierId",
  authenticateToken,
  // requireRoles(['admin', 'super_admin']),
  async (req, res) => {
    try {
      const tierId = parseInt(req.params.tierId);
      
      // Validate request body
      const updateSchema = insertSponsorshipTierSchema.partial();
      const tierData = updateSchema.parse(req.body);
      
      const updatedTier = await storage.updateSponsorshipTier(tierId, tierData);
      res.json(updatedTier);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid tier data", details: error.errors });
      } else {
        console.error("Error updating sponsorship tier:", error);
        res.status(500).json({ error: "Failed to update sponsorship tier" });
      }
    }
  }
);

// Delete sponsorship tier
router.delete(
  "/sponsorship-tiers/:tierId",
  authenticateToken,
  // requireRoles(['admin', 'super_admin']),
  async (req, res) => {
    try {
      const tierId = parseInt(req.params.tierId);
      await storage.deleteSponsorshipTier(tierId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting sponsorship tier:", error);
      res.status(500).json({ error: "Failed to delete sponsorship tier" });
    }
  }
);

// ==================== EVENT SPONSORS ====================

// Get sponsors for an organization
router.get(
  "/organizations/:organizationId/sponsors",
  authenticateToken,
  // requireRoles(['admin', 'super_admin']),
  async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const sponsors = await storage.getEventSponsorsByOrganization(organizationId);
      res.json(sponsors);
    } catch (error) {
      console.error("Error fetching sponsors:", error);
      res.status(500).json({ error: "Failed to fetch sponsors" });
    }
  }
);

// Get sponsors for a specific tier
router.get(
  "/sponsorship-tiers/:tierId/sponsors",
  authenticateToken,
  // requireRoles(['admin', 'super_admin']),
  async (req, res) => {
    try {
      const tierId = parseInt(req.params.tierId);
      const sponsors = await storage.getEventSponsorsByTier(tierId);
      res.json(sponsors);
    } catch (error) {
      console.error("Error fetching tier sponsors:", error);
      res.status(500).json({ error: "Failed to fetch tier sponsors" });
    }
  }
);

// Create new sponsor
router.post(
  "/sponsorship-tiers/:tierId/sponsors",
  authenticateToken,
  // requireRoles(['admin', 'super_admin']),
  async (req, res) => {
    try {
      const tierId = parseInt(req.params.tierId);
      
      // Validate request body
      const sponsorData = insertEventSponsorSchema.parse({
        ...req.body,
        tierID: tierId
      });
      
      const newSponsor = await storage.createEventSponsor(sponsorData);
      res.status(201).json(newSponsor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid sponsor data", details: error.errors });
      } else {
        console.error("Error creating sponsor:", error);
        res.status(500).json({ error: "Failed to create sponsor" });
      }
    }
  }
);

// Update sponsor
router.put(
  "/sponsors/:sponsorId",
  authenticateToken,
  // requireRoles(['admin', 'super_admin']),
  async (req, res) => {
    try {
      const sponsorId = parseInt(req.params.sponsorId);
      
      // Validate request body
      const updateSchema = insertEventSponsorSchema.partial();
      const sponsorData = updateSchema.parse(req.body);
      
      const updatedSponsor = await storage.updateEventSponsor(sponsorId, sponsorData);
      res.json(updatedSponsor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid sponsor data", details: error.errors });
      } else {
        console.error("Error updating sponsor:", error);
        res.status(500).json({ error: "Failed to update sponsor" });
      }
    }
  }
);

// Delete sponsor
router.delete(
  "/sponsors/:sponsorId",
  authenticateToken,
  // requireRoles(['admin', 'super_admin']),
  async (req, res) => {
    try {
      const sponsorId = parseInt(req.params.sponsorId);
      await storage.deleteEventSponsor(sponsorId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting sponsor:", error);
      res.status(500).json({ error: "Failed to delete sponsor" });
    }
  }
);

export default router;