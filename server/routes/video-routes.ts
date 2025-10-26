/**
 * Video Routes
 * Handles video messaging templates, messages, and automation rules
 */
import type { Express } from "express";
import { storage } from "../storage/index";
import { authenticateToken } from "../middleware";

export function registerVideoRoutes(app: Express): void {
  // Video Templates Management
  app.get("/api/organizations/:orgId/video/templates", authenticateToken, async (req, res) => {
    try {
      const orgId = parseInt(req.params.orgId);

      // Mock video templates
      const templates = [
        {
          id: 1,
          name: "Thank You Message",
          description: "Express gratitude to donors",
          thumbnailUrl: "https://via.placeholder.com/300x200?text=Thank+You",
          duration: 30,
          organizationId: orgId,
          isActive: true,
        },
        {
          id: 2,
          name: "Impact Report",
          description: "Share the impact of donations",
          thumbnailUrl: "https://via.placeholder.com/300x200?text=Impact+Report",
          duration: 60,
          organizationId: orgId,
          isActive: true,
        },
      ];

      res.json(templates);
    } catch (error) {
      console.error("Error fetching video templates:", error);
      res.status(500).json({ message: "Failed to fetch video templates" });
    }
  });

  app.get("/api/video/templates/:id", authenticateToken, async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);

      // Mock template details
      const template = {
        id: templateId,
        name: "Thank You Message",
        description: "Express gratitude to donors",
        script: "Thank you for your generous donation of ${donationAmount}. Your support means the world to us!",
        thumbnailUrl: "https://via.placeholder.com/300x200?text=Thank+You",
        videoUrl: "https://via.placeholder.com/640x480.mp4",
        duration: 30,
        variables: ["donationAmount", "donorName"],
        isActive: true,
      };

      res.json(template);
    } catch (error) {
      console.error("Error fetching video template:", error);
      res.status(500).json({ message: "Failed to fetch video template" });
    }
  });

  app.post("/api/organizations/:orgId/video/templates", authenticateToken, async (req, res) => {
    try {
      const orgId = parseInt(req.params.orgId);
      const templateData = req.body;

      // Mock template creation
      const newTemplate = {
        id: Date.now(),
        organizationId: orgId,
        ...templateData,
        createdAt: new Date(),
        isActive: true,
      };

      res.status(201).json(newTemplate);
    } catch (error) {
      console.error("Error creating video template:", error);
      res.status(500).json({ message: "Failed to create video template" });
    }
  });

  app.patch("/api/video/templates/:id", authenticateToken, async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const updates = req.body;

      // Mock template update
      res.json({
        id: templateId,
        ...updates,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error("Error updating video template:", error);
      res.status(500).json({ message: "Failed to update video template" });
    }
  });

  app.delete("/api/video/templates/:id", authenticateToken, async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);

      // Mock template deletion
      res.json({ 
        message: "Video template deleted successfully",
        templateId 
      });
    } catch (error) {
      console.error("Error deleting video template:", error);
      res.status(500).json({ message: "Failed to delete video template" });
    }
  });

  // Video Messages Management
  app.get("/api/organizations/:orgId/video/messages", authenticateToken, async (req, res) => {
    try {
      const orgId = parseInt(req.params.orgId);

      // Mock video messages
      const messages = [
        {
          id: 1,
          templateId: 1,
          recipientEmail: "donor@example.com",
          personalizedData: { donationAmount: "$100", donorName: "John" },
          status: "sent",
          sentAt: new Date(),
          organizationId: orgId,
        },
      ];

      res.json(messages);
    } catch (error) {
      console.error("Error fetching video messages:", error);
      res.status(500).json({ message: "Failed to fetch video messages" });
    }
  });

  app.get("/api/video/messages/:id", authenticateToken, async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);

      // Mock message details
      const message = {
        id: messageId,
        templateId: 1,
        recipientEmail: "donor@example.com",
        personalizedData: { donationAmount: "$100", donorName: "John" },
        videoUrl: "https://via.placeholder.com/640x480.mp4",
        status: "sent",
        sentAt: new Date(),
        viewedAt: null,
      };

      res.json(message);
    } catch (error) {
      console.error("Error fetching video message:", error);
      res.status(500).json({ message: "Failed to fetch video message" });
    }
  });

  app.post("/api/organizations/:orgId/video/messages", authenticateToken, async (req, res) => {
    try {
      const orgId = parseInt(req.params.orgId);
      const messageData = req.body;

      // Mock message creation
      const newMessage = {
        id: Date.now(),
        organizationId: orgId,
        ...messageData,
        status: "processing",
        createdAt: new Date(),
      };

      res.status(201).json(newMessage);
    } catch (error) {
      console.error("Error creating video message:", error);
      res.status(500).json({ message: "Failed to create video message" });
    }
  });

  app.patch("/api/video/messages/:id", authenticateToken, async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const updates = req.body;

      // Mock message update
      res.json({
        id: messageId,
        ...updates,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error("Error updating video message:", error);
      res.status(500).json({ message: "Failed to update video message" });
    }
  });

  // Video Automation Rules
  app.get("/api/organizations/:orgId/video/automation-rules", authenticateToken, async (req, res) => {
    try {
      const orgId = parseInt(req.params.orgId);

      // Mock automation rules
      const rules = [
        {
          id: 1,
          name: "Thank You for $100+ Donations",
          triggerEvent: "donation_received",
          conditions: { minAmount: 100 },
          templateId: 1,
          isActive: true,
          organizationId: orgId,
        },
      ];

      res.json(rules);
    } catch (error) {
      console.error("Error fetching automation rules:", error);
      res.status(500).json({ message: "Failed to fetch automation rules" });
    }
  });

  app.post("/api/organizations/:orgId/video/automation-rules", authenticateToken, async (req, res) => {
    try {
      const orgId = parseInt(req.params.orgId);
      const ruleData = req.body;

      // Mock rule creation
      const newRule = {
        id: Date.now(),
        organizationId: orgId,
        ...ruleData,
        createdAt: new Date(),
        isActive: true,
      };

      res.status(201).json(newRule);
    } catch (error) {
      console.error("Error creating automation rule:", error);
      res.status(500).json({ message: "Failed to create automation rule" });
    }
  });
}