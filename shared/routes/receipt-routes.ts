/**
 * Receipt Routes
 * Handles automated receipt generation and thank-you notes
 */
import type { Express } from "express";
import { ReceiptService } from "../services/receipt-service";
import { authenticateToken } from "../middleware";

export function registerReceiptRoutes(app: Express): void {
  
  /**
   * Send automated receipt and thank-you note after donation
   */
  app.post("/api/receipts/send-automated", async (req, res) => {
    try {
      const receiptData = req.body;
      
      // Validate required fields
      const required = ['donationId', 'organizationId', 'donorName', 'donorEmail', 'amount', 'donationType', 'donationDate', 'paymentMethod', 'transactionId'];
      const missing = required.filter(field => !receiptData[field]);
      
      if (missing.length > 0) {
        return res.status(400).json({ 
          success: false, 
          error: `Missing required fields: ${missing.join(', ')}` 
        });
      }

      // Convert date string to Date object if needed
      if (typeof receiptData.donationDate === 'string') {
        receiptData.donationDate = new Date(receiptData.donationDate);
      }

      // Send automated emails
      const result = await ReceiptService.sendAutomatedEmails(receiptData);
      
      if (result.success) {
        res.json({ 
          success: true, 
          message: "Receipt and thank-you note sent successfully" 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: "Failed to send some emails", 
          details: result.errors 
        });
      }
    } catch (error) {
      console.error("Error sending automated receipt:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to send automated receipt" 
      });
    }
  });

  /**
   * Send receipt only (for manual resending)
   */
  app.post("/api/receipts/send-receipt", authenticateToken, async (req, res) => {
    try {
      const receiptData = req.body;
      
      // Convert date string to Date object if needed
      if (typeof receiptData.donationDate === 'string') {
        receiptData.donationDate = new Date(receiptData.donationDate);
      }

      const result = await ReceiptService.generateAndSendReceipt(receiptData);
      
      if (result.success) {
        res.json({ 
          success: true, 
          message: "Receipt sent successfully" 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: result.error 
        });
      }
    } catch (error) {
      console.error("Error sending receipt:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to send receipt" 
      });
    }
  });

  /**
   * Send thank-you note only (for manual resending)
   */
  app.post("/api/receipts/send-thank-you", authenticateToken, async (req, res) => {
    try {
      const receiptData = req.body;
      
      // Convert date string to Date object if needed
      if (typeof receiptData.donationDate === 'string') {
        receiptData.donationDate = new Date(receiptData.donationDate);
      }

      const result = await ReceiptService.generateAndSendThankYouNote(receiptData);
      
      if (result.success) {
        res.json({ 
          success: true, 
          message: "Thank-you note sent successfully" 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: result.error 
        });
      }
    } catch (error) {
      console.error("Error sending thank-you note:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to send thank-you note" 
      });
    }
  });

  /**
   * Get receipt data for a donation (for preview or regeneration)
   */
  app.get("/api/receipts/donation/:donationId", authenticateToken, async (req, res) => {
    try {
      const donationId = parseInt(req.params.donationId);
      
      if (isNaN(donationId)) {
        return res.status(400).json({ 
          success: false, 
          error: "Invalid donation ID" 
        });
      }

      // In a real implementation, this would fetch donation data from the database
      // For now, return a mock response indicating the endpoint is ready
      res.json({
        success: true,
        message: "Receipt data endpoint ready",
        donationId: donationId,
        note: "This endpoint would fetch donation details from the database for receipt generation"
      });
    } catch (error) {
      console.error("Error fetching receipt data:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to fetch receipt data" 
      });
    }
  });

  /**
   * Bulk resend receipts for an organization
   */
  app.post("/api/receipts/bulk-resend", authenticateToken, async (req, res) => {
    try {
      const { organizationId, donationIds, emailType } = req.body;
      
      if (!organizationId || !donationIds || !Array.isArray(donationIds)) {
        return res.status(400).json({ 
          success: false, 
          error: "organizationId and donationIds array are required" 
        });
      }

      // This would implement bulk receipt resending
      // For now, return a mock response
      res.json({
        success: true,
        message: `Bulk ${emailType || 'receipt'} sending initiated`,
        organizationId: organizationId,
        donationCount: donationIds.length,
        note: "This endpoint would process bulk receipt resending in the background"
      });
    } catch (error) {
      console.error("Error bulk resending receipts:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to bulk resend receipts" 
      });
    }
  });

  /**
   * Get receipt statistics for an organization
   */
  app.get("/api/receipts/stats/:organizationId", authenticateToken, async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      
      if (isNaN(organizationId)) {
        return res.status(400).json({ 
          success: false, 
          error: "Invalid organization ID" 
        });
      }

      // Mock receipt statistics
      const stats = {
        totalReceiptsSent: 1247,
        totalThankYouNotesSent: 1189,
        totalDedicationNotifications: 89,
        receiptSuccessRate: 98.7,
        averageEmailOpenRate: 76.3,
        mostRecentReceipt: new Date().toISOString(),
        topCampaigns: [
          { name: "Monthly Sponsorship", receipts: 445 },
          { name: "Emergency Relief Fund", receipts: 287 },
          { name: "Pregnancy Support", receipts: 198 }
        ]
      };

      res.json({
        success: true,
        organizationId: organizationId,
        stats: stats
      });
    } catch (error) {
      console.error("Error fetching receipt stats:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to fetch receipt statistics" 
      });
    }
  });

  /**
   * Test receipt generation (for development/preview)
   */
  app.post("/api/receipts/test", authenticateToken, async (req, res) => {
    try {
      const testData = {
        donationId: 12345,
        organizationId: req.body.organizationId || 1,
        donorName: "John & Jane Donor",
        donorEmail: req.body.testEmail || "test@example.com",
        amount: 250.00,
        donationType: "one-time" as const,
        campaignName: "Monthly Sponsorship Program",
        campaignId: 1,
        donationDate: new Date(),
        paymentMethod: "Credit Card (**** 4242)",
        transactionId: "txn_test_" + Date.now(),
        isRecurring: false,
        dedicationType: "none" as const
      };

      if (req.body.emailType === 'receipt') {
        const result = await ReceiptService.generateAndSendReceipt(testData);
        res.json(result);
      } else if (req.body.emailType === 'thank-you') {
        const result = await ReceiptService.generateAndSendThankYouNote(testData);
        res.json(result);
      } else {
        const result = await ReceiptService.sendAutomatedEmails(testData);
        res.json(result);
      }
    } catch (error) {
      console.error("Error sending test receipt:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to send test receipt" 
      });
    }
  });
}