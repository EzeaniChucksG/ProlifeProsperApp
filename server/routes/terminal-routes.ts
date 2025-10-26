/**
 * Terminal Mode Routes
 * Handles in-person donation processing via Terminal Mode UI and Dejavoo P8 device
 */
import type { Express } from "express";
import { storage } from "../storage/index";
import { z } from "zod";
import { authenticateToken } from "../middleware";
import { PaymentRoutingService } from "../services/payment-routing";
import { GettrxService } from "../services/gettrx";

const gettrxService = new GettrxService();

const terminalTransactionSchema = z.object({
  amount: z.number().min(0.01),
  tipAmount: z.number().min(0).default(0),
  organizationId: z.number().positive(),
  campaignId: z.number().positive().optional(),
  donorName: z.string().optional(),
  receiptType: z.enum(["email", "sms", "text", "both", "none"]).optional(),
  receiptEmail: z.string().email().optional(),
  receiptPhone: z.string().optional(),
  transactionNotes: z.string().optional(),
  deviceId: z.string().optional(),
  paymentToken: z.string().min(1),
  contextType: z.string().default("general"),
  contextId: z.number().optional(),
});

const dejavooWebhookSchema = z.object({
  eventId: z.string(),
  eventType: z.string(),
  terminalId: z.string(),
  amount: z.number(),
  tipAmount: z.number().optional(),
  status: z.string(),
  approvalCode: z.string().optional(),
  cardLast4: z.string().optional(),
  cardBrand: z.string().optional(),
  transactionId: z.string(),
  timestamp: z.string(),
  metadata: z.record(z.any()).optional(),
});

export function registerTerminalRoutes(app: Express): void {
  const paymentRouting = new PaymentRoutingService(storage);

  app.post("/api/terminal/transactions", authenticateToken, async (req, res) => {
    try {
      const data = terminalTransactionSchema.parse(req.body);
      
      const receiptType = data.receiptType === 'text' ? 'sms' : data.receiptType;
      
      const totalAmount = data.amount + data.tipAmount;

      const organization = await storage.getOrganizationById(data.organizationId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const merchantAccountId = organization.merchantAccountId || 
        (process.env.NODE_ENV === 'development' ? 'acm_673cad763c541000016e6497' : null);
      
      if (!merchantAccountId) {
        return res.status(400).json({ 
          message: "Organization does not have a merchant account configured" 
        });
      }

      let donorEmail = data.receiptEmail || "anonymous@terminal.local";
      const [firstName, ...lastNameParts] = (data.donorName || "").split(" ");
      const lastName = lastNameParts.join(" ");

      let donor = await storage.getDonorByEmail(data.organizationId, donorEmail);
      
      if (!donor) {
        const donorData = {
          email: donorEmail,
          firstName: firstName || "Terminal",
          lastName: lastName || "Donor",
          phone: data.receiptPhone,
          organizationId: data.organizationId,
          isAnonymous: !data.donorName,
          totalDonated: totalAmount.toString(),
          donationCount: 1,
          firstDonationAt: new Date(),
          lastDonationAt: new Date()
        };
        donor = await storage.createDonor(donorData);
      } else {
        const newTotal = parseFloat(donor.totalDonated || "0") + totalAmount;
        await storage.updateDonor(donor.id, {
          totalDonated: newTotal.toString(),
          donationCount: (donor.donationCount || 0) + 1,
          lastDonationAt: new Date(),
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(data.receiptPhone && { phone: data.receiptPhone })
        });
      }

      let finalContextType = data.contextType;
      let finalContextId = data.contextId;
      let finalContextName = "Terminal Donation";

      if (data.campaignId) {
        finalContextType = "campaign";
        finalContextId = data.campaignId;
        const campaign = await storage.getCampaign(data.campaignId);
        finalContextName = campaign?.name || `Campaign ${data.campaignId}`;
      }

      const routing = await paymentRouting.routePayment({
        organizationId: data.organizationId,
        contextType: finalContextType as any,
        contextId: finalContextId,
        contextName: finalContextName,
        amount: totalAmount,
        donorId: donor.id,
        paymentMethod: "card"
      });

      const validation = await paymentRouting.validateRouting(routing);
      if (!validation.valid) {
        console.error("Payment routing validation failed:", validation.errors);
        return res.status(400).json({
          message: "Payment routing failed",
          errors: validation.errors
        });
      }

      let paymentResult;
      try {
        paymentResult = await gettrxService.createPayment({
          amount: totalAmount,
          currency: "USD",
          merchantAccountId,
          paymentToken: data.paymentToken,
          organizationId: data.organizationId,
          donorId: donor.id,
          campaignId: data.campaignId,
          metadata: {
            source: "terminal",
            deviceId: data.deviceId,
            tipAmount: data.tipAmount,
            transactionNotes: data.transactionNotes,
            contextName: finalContextName
          }
        });
      } catch (error: any) {
        console.error("Payment processing error:", error);
        return res.status(400).json({
          message: "Payment failed",
          error: error.message
        });
      }

      const donationData = {
        amount: data.amount.toString(),
        feeAmount: "0",
        totalAmount: totalAmount.toString(),
        currency: "usd",
        status: "completed",
        organizationId: data.organizationId,
        campaignId: data.campaignId,
        donorId: donor.id,
        paymentMethod: "card",
        isAnonymous: !data.donorName,
        fundId: routing.fundId,
        contextType: finalContextType,
        contextId: finalContextId,
        paymentAccountId: routing.paymentAccountId,
        source: "terminal",
        amountCents: data.amount * 100,
        deviceId: data.deviceId,
        tipAmount: data.tipAmount.toString(),
        receiptType: receiptType,
        transactionNotes: data.transactionNotes,
        externalTxId: paymentResult?.id || `terminal_${Date.now()}`,
        gettrxPaymentRequestId: paymentResult?.id,
        donorEmail: donorEmail,
        donorFirstName: firstName || "Terminal",
        donorLastName: lastName || "Donor",
        metadata: {
          paymentResult,
          receiptEmail: data.receiptEmail,
          receiptPhone: data.receiptPhone
        },
        processedAt: new Date()
      };

      const donation = await storage.createDonation(donationData);

      if (data.campaignId) {
        const campaign = await storage.getCampaign(data.campaignId);
        if (campaign) {
          const currentRaised = parseFloat(campaign.raised || "0");
          await storage.updateCampaign(data.campaignId, {
            raised: (currentRaised + totalAmount).toString()
          });
        }
      }

      res.status(201).json({
        success: true,
        donation: {
          id: donation.id,
          amount: donation.amount,
          tipAmount: donation.tipAmount,
          totalAmount: donation.totalAmount,
          status: donation.status,
          createdAt: donation.createdAt
        },
        donor: {
          id: donor.id,
          name: data.donorName || "Anonymous",
          email: donorEmail
        },
        receipt: {
          type: receiptType,
          email: data.receiptEmail,
          phone: data.receiptPhone
        }
      });
    } catch (error) {
      console.error("Error creating terminal transaction:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error",
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to process terminal transaction" });
    }
  });

  app.post("/api/terminal/webhooks/dejavoo", async (req, res) => {
    try {
      const webhookData = dejavooWebhookSchema.parse(req.body);

      console.log("Dejavoo webhook received:", webhookData);

      res.status(200).json({ 
        success: true, 
        message: "Webhook received",
        eventId: webhookData.eventId 
      });
    } catch (error) {
      console.error("Error processing Dejavoo webhook:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid webhook payload",
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to process webhook" });
    }
  });

  app.post("/api/terminal/transactions/:id/refund", authenticateToken, async (req, res) => {
    try {
      const donationId = parseInt(req.params.id);
      const { reason } = req.body;

      const donation = await storage.getDonation(donationId);
      if (!donation) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      if (donation.status === "refunded") {
        return res.status(400).json({ message: "Transaction already refunded" });
      }

      await storage.updateDonation(donationId, {
        status: "refunded",
        metadata: {
          ...donation.metadata,
          refundReason: reason,
          refundedAt: new Date().toISOString()
        }
      });

      if (donation.donorId) {
        const donor = await storage.getDonor(donation.donorId);
        if (donor) {
          const refundAmount = parseFloat(donation.totalAmount || "0");
          const newTotal = Math.max(0, parseFloat(donor.totalDonated || "0") - refundAmount);
          await storage.updateDonor(donation.donorId, {
            totalDonated: newTotal.toString(),
            donationCount: Math.max(0, (donor.donationCount || 0) - 1)
          });
        }
      }

      if (donation.campaignId) {
        const campaign = await storage.getCampaign(donation.campaignId);
        if (campaign) {
          const refundAmount = parseFloat(donation.totalAmount || "0");
          const currentRaised = parseFloat(campaign.raised || "0");
          await storage.updateCampaign(donation.campaignId, {
            raised: Math.max(0, currentRaised - refundAmount).toString()
          });
        }
      }

      res.json({
        success: true,
        message: "Transaction refunded successfully",
        donation: {
          id: donation.id,
          status: "refunded"
        }
      });
    } catch (error) {
      console.error("Error refunding transaction:", error);
      res.status(500).json({ message: "Failed to refund transaction" });
    }
  });

  app.get("/api/terminal/config/:organizationId", authenticateToken, async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      
      const organization = await storage.getOrganizationById(organizationId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      if (!organization.terminalModeEnabled) {
        return res.status(403).json({ message: "Terminal Mode not enabled for this organization" });
      }

      const campaigns = await storage.getCampaigns(organizationId);
      
      res.json({
        success: true,
        config: {
          organizationId,
          merchantAccountId: organization.merchantAccountId,
          campaigns: campaigns.map(c => ({
            id: c.id,
            name: c.name,
            goal: c.goal,
            raised: c.raised
          })),
          tipOptions: [
            { label: "10%", value: 0.1 },
            { label: "15%", value: 0.15 },
            { label: "20%", value: 0.2 }
          ],
          defaultReceiptType: "email"
        }
      });
    } catch (error) {
      console.error("Error fetching terminal config:", error);
      res.status(500).json({ message: "Failed to fetch terminal configuration" });
    }
  });
}
