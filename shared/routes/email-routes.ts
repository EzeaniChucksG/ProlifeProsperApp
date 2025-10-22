/**
 * Email Routes
 * Handles email templates, campaigns, and integrations
 */
import type { Express } from "express";
import { storage } from "../storage/index";
import { SendGridService } from "../services/sendgrid";
import { authenticateToken } from "../middleware";

const sendGridService = new SendGridService();

export function registerEmailRoutes(app: Express): void {
  // Email Templates
  app.get("/api/email-templates", authenticateToken, async (req, res) => {
    try {
      const templates = await storage.getEmailTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching email templates:", error);
      res.status(500).json({ message: "Failed to fetch email templates" });
    }
  });

  app.get("/api/email-templates/:id", authenticateToken, async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const template = await storage.getEmailTemplateById(templateId);
      
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      res.json(template);
    } catch (error) {
      console.error("Error fetching email template:", error);
      res.status(500).json({ message: "Failed to fetch email template" });
    }
  });

  app.post("/api/email-templates", authenticateToken, async (req, res) => {
    try {
      const templateData = req.body;
      const newTemplate = await storage.createEmailTemplate(templateData);
      res.status(201).json(newTemplate);
    } catch (error) {
      console.error("Error creating email template:", error);
      res.status(500).json({ message: "Failed to create email template" });
    }
  });

  app.patch("/api/email-templates/:id", authenticateToken, async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const updates = req.body;
      const updatedTemplate = await storage.updateEmailTemplate(templateId, updates);
      res.json(updatedTemplate);
    } catch (error) {
      console.error("Error updating email template:", error);
      res.status(500).json({ message: "Failed to update email template" });
    }
  });

  app.delete("/api/email-templates/:id", async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      await storage.deleteEmailTemplate(templateId);
      res.json({ message: "Email template deleted successfully" });
    } catch (error) {
      console.error("Error deleting email template:", error);
      res.status(500).json({ message: "Failed to delete email template" });
    }
  });

  app.get("/api/email-templates/:id/variables", async (req, res) => {
    try {
      const variables = await storage.getEmailTemplateVariables();
      res.json(variables);
    } catch (error) {
      console.error("Error fetching template variables:", error);
      res.status(500).json({ message: "Failed to fetch template variables" });
    }
  });

  app.post("/api/email-templates/:id/send", async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const { recipients, variables } = req.body;

      const result = await storage.sendTemplateEmail({
        templateId,
        recipients,
        variables
      });

      res.json(result);
    } catch (error) {
      console.error("Error sending template email:", error);
      res.status(500).json({ message: "Failed to send template email" });
    }
  });

  // Email Integrations
  app.post("/api/organizations/:id/email-integrations", async (req, res) => {
    try {
      const organizationId = parseInt(req.params.id);
      const { provider, settings } = req.body;

      // Mock integration setup - in reality this would configure actual email service
      res.json({
        success: true,
        message: `${provider} integration configured successfully`,
        provider,
        organizationId
      });
    } catch (error) {
      console.error("Error setting up email integration:", error);
      res.status(500).json({ message: "Failed to setup email integration" });
    }
  });

  app.patch("/api/organizations/:id/email-integrations/:provider", async (req, res) => {
    try {
      const organizationId = parseInt(req.params.id);
      const { provider } = req.params;
      const updates = req.body;

      // Mock integration update
      res.json({
        success: true,
        message: `${provider} integration updated successfully`,
        provider,
        organizationId,
        settings: updates
      });
    } catch (error) {
      console.error("Error updating email integration:", error);
      res.status(500).json({ message: "Failed to update email integration" });
    }
  });

  app.get("/api/organizations/:id/email-integrations", async (req, res) => {
    try {
      const organizationId = parseInt(req.params.id);

      // Mock integration status
      const integrations = [
        {
          provider: "sendgrid",
          status: "connected",
          lastSync: new Date(),
          settings: {
            apiKeyConfigured: true,
            webhooksEnabled: true
          }
        },
        {
          provider: "mailchimp",
          status: "not_connected",
          lastSync: null,
          settings: null
        }
      ];

      res.json(integrations);
    } catch (error) {
      console.error("Error fetching email integrations:", error);
      res.status(500).json({ message: "Failed to fetch email integrations" });
    }
  });
}