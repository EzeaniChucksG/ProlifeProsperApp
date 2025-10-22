/**
 * Association/Diocese Management Routes
 * Handles Bishop Blast communications and diocese-level management
 */
import { Router, type Express } from "express";
import { storage } from "../storage";
import { authenticateToken } from "../middleware/auth";
import { z } from "zod";
import { insertBishopBlastMessageSchema, insertBishopBlastRecipientSchema, insertBishopBlastLogSchema } from "@shared/schema";

const router = Router();

// ================================
// BISHOP BLAST MESSAGES
// ================================

// Get all messages for an association
router.get("/associations/:associationId/bishop-blast/messages", authenticateToken, async (req, res) => {
  try {
    const associationId = parseInt(req.params.associationId);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Verify user has permission for this association
    const hasPermission = await storage.verifyBishopPermission(userId, associationId);
    if (!hasPermission) {
      return res.status(403).json({ error: "Insufficient permissions. Only bishops can access these messages." });
    }

    const messages = await storage.getBishopBlastMessagesByAssociation(associationId);
    res.json(messages);
  } catch (error) {
    console.error("Error fetching Bishop Blast messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Get specific message by ID
router.get("/associations/:associationId/bishop-blast/messages/:messageId", authenticateToken, async (req, res) => {
  try {
    const associationId = parseInt(req.params.associationId);
    const messageId = parseInt(req.params.messageId);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Verify user has permission for this association
    const hasPermission = await storage.verifyBishopPermission(userId, associationId);
    if (!hasPermission) {
      return res.status(403).json({ error: "Insufficient permissions. Only bishops can access these messages." });
    }

    const message = await storage.getBishopBlastMessageById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Verify message belongs to the association
    if (message.associationId !== associationId) {
      return res.status(403).json({ error: "Message does not belong to this association" });
    }

    res.json(message);
  } catch (error) {
    console.error("Error fetching Bishop Blast message:", error);
    res.status(500).json({ error: "Failed to fetch message" });
  }
});

// Create new Bishop Blast message
const createMessageSchema = insertBishopBlastMessageSchema.extend({
  associationId: z.number().int().positive(),
  senderId: z.string().uuid(),
});

router.post("/associations/:associationId/bishop-blast/messages", 
  authenticateToken, 
  async (req, res) => {
    try {
      const associationId = parseInt(req.params.associationId);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Verify user has permission for this association
      const hasPermission = await storage.verifyBishopPermission(userId, associationId);
      if (!hasPermission) {
        return res.status(403).json({ error: "Insufficient permissions. Only bishops can send messages." });
      }

      const messageData = {
        ...req.body,
        associationId,
        senderId: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const newMessage = await storage.createBishopBlastMessage(messageData);
      
      // Log the message creation
      await storage.createBishopBlastLog({
        associationId,
        messageId: newMessage.id,
        logLevel: "info",
        logType: "message_created",
        event: "message_created",
        description: `Bishop Blast message created: ${newMessage.subject}`,
        userId,
      });

      res.status(201).json(newMessage);
    } catch (error) {
      console.error("Error creating Bishop Blast message:", error);
      res.status(500).json({ error: "Failed to create message" });
    }
  }
);

// Update Bishop Blast message
router.put("/associations/:associationId/bishop-blast/messages/:messageId", 
  authenticateToken, 
  async (req, res) => {
    try {
      const associationId = parseInt(req.params.associationId);
      const messageId = parseInt(req.params.messageId);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Verify user has permission for this association
      const hasPermission = await storage.verifyBishopPermission(userId, associationId);
      if (!hasPermission) {
        return res.status(403).json({ error: "Insufficient permissions. Only bishops can update messages." });
      }

      const updates = {
        ...req.body,
        updatedAt: new Date(),
      };

      const updatedMessage = await storage.updateBishopBlastMessage(messageId, updates);
      res.json(updatedMessage);
    } catch (error) {
      console.error("Error updating Bishop Blast message:", error);
      res.status(500).json({ error: "Failed to update message" });
    }
  }
);

// Delete Bishop Blast message
router.delete("/associations/:associationId/bishop-blast/messages/:messageId", authenticateToken, async (req, res) => {
  try {
    const associationId = parseInt(req.params.associationId);
    const messageId = parseInt(req.params.messageId);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Verify user has permission for this association
    const hasPermission = await storage.verifyBishopPermission(userId, associationId);
    if (!hasPermission) {
      return res.status(403).json({ error: "Insufficient permissions. Only bishops can delete messages." });
    }

    await storage.deleteBishopBlastMessage(messageId);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting Bishop Blast message:", error);
    res.status(500).json({ error: "Failed to delete message" });
  }
});

// ================================
// RECIPIENTS AND TARGETING
// ================================

// Get potential recipients for an association
router.get("/associations/:associationId/bishop-blast/recipients", authenticateToken, async (req, res) => {
  try {
    const associationId = parseInt(req.params.associationId);
    const recipientType = req.query.recipientType as string || "all_parishioners";
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Verify user has permission for this association
    const hasPermission = await storage.verifyBishopPermission(userId, associationId);
    if (!hasPermission) {
      return res.status(403).json({ error: "Insufficient permissions. Only bishops can view recipients." });
    }

    const recipients = await storage.getAssociationRecipients(associationId, recipientType);
    res.json(recipients);
  } catch (error) {
    console.error("Error fetching association recipients:", error);
    res.status(500).json({ error: "Failed to fetch recipients" });
  }
});

// Get recipients for a specific message
router.get("/associations/:associationId/bishop-blast/messages/:messageId/recipients", authenticateToken, async (req, res) => {
  try {
    const associationId = parseInt(req.params.associationId);
    const messageId = parseInt(req.params.messageId);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Verify user has permission for this association
    const hasPermission = await storage.verifyBishopPermission(userId, associationId);
    if (!hasPermission) {
      return res.status(403).json({ error: "Insufficient permissions. Only bishops can view message recipients." });
    }

    const recipients = await storage.getBishopBlastRecipientsByMessage(messageId);
    res.json(recipients);
  } catch (error) {
    console.error("Error fetching message recipients:", error);
    res.status(500).json({ error: "Failed to fetch message recipients" });
  }
});

// ================================
// ANALYTICS AND STATISTICS
// ================================

// Get Bishop Blast statistics for an association
router.get("/associations/:associationId/bishop-blast/stats", authenticateToken, async (req, res) => {
  try {
    const associationId = parseInt(req.params.associationId);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Verify user has permission for this association
    const hasPermission = await storage.verifyBishopPermission(userId, associationId);
    if (!hasPermission) {
      return res.status(403).json({ error: "Insufficient permissions. Only bishops can view statistics." });
    }

    const stats = await storage.getAssociationBishopBlastStats(associationId);
    res.json(stats);
  } catch (error) {
    console.error("Error fetching Bishop Blast statistics:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

// Get activity logs for an association
router.get("/associations/:associationId/bishop-blast/logs", authenticateToken, async (req, res) => {
  try {
    const associationId = parseInt(req.params.associationId);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Verify user has permission for this association
    const hasPermission = await storage.verifyBishopPermission(userId, associationId);
    if (!hasPermission) {
      return res.status(403).json({ error: "Insufficient permissions. Only bishops can view logs." });
    }

    const logs = await storage.getBishopBlastLogsByAssociation(associationId);
    res.json(logs);
  } catch (error) {
    console.error("Error fetching Bishop Blast logs:", error);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

// ================================
// USER ASSOCIATIONS
// ================================

// Get associations that the current user can manage
router.get("/associations/my-associations", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const associations = await storage.getUserAssociations(userId);
    res.json(associations);
  } catch (error) {
    console.error("Error fetching user associations:", error);
    res.status(500).json({ error: "Failed to fetch associations" });
  }
});

// Export route registration function
export function registerAssociationRoutes(app: Express): void {
  app.use("/api", router);
  console.log("🏰 Association/Diocese routes registered successfully");
}