/**
 * Donation Routes
 * Handles donation processing and donor management
 */
import type { Express } from "express";
import { storage } from "../storage/index";
import { insertDonationSchema, insertDonorSchema } from "@shared/schema";
import { z } from "zod";
import { authenticateToken } from "../middleware";
import { PaymentRoutingService } from "../services/payment-routing";
import { DataMigrationService } from "../services/data-migration";

export function registerDonationRoutes(app: Express): void {
  // Initialize payment routing service
  const paymentRouting = new PaymentRoutingService(storage);

  // Enhanced donation creation with comprehensive donor management
  app.post("/api/donations/enhanced", async (req, res) => {
    try {
      const {
        amount,
        currency = "usd",
        donorEmail,
        donorFirstName,
        donorLastName,
        donorPhone,
        organizationId,
        campaignId,
        productId,
        eventId,
        contextType = "general", // general, campaign, product, event, church_offering, etc.
        contextId,
        contextName,
        isAnonymous = false,
        paymentMethod = "card",
        recurringFrequency,
        donorAddress,
        donorCity,
        donorState,
        donorZipCode,
        donorCountry = "US",
        metadata = {}
      } = req.body;

      // Validate required fields
      if (!amount || !organizationId || !donorEmail) {
        return res.status(400).json({
          message: "Amount, organization ID, and donor email are required"
        });
      }

      // Find or create donor
      let donor = await storage.getDonorByEmail(organizationId, donorEmail);
      
      if (!donor) {
        // Create new donor
        const donorData = {
          email: donorEmail,
          firstName: donorFirstName || "",
          lastName: donorLastName || "",
          phone: donorPhone,
          address: donorAddress,
          city: donorCity,
          state: donorState,
          zipCode: donorZipCode,
          country: donorCountry,
          organizationId,
          isAnonymous,
          totalDonated: amount.toString(),
          donationCount: 1,
          firstDonationAt: new Date(),
          lastDonationAt: new Date()
        };

        donor = await storage.createDonor(donorData);
      } else {
        // Update existing donor
        const newTotal = parseFloat(donor.totalDonated || "0") + amount;
        await storage.updateDonor(donor.id, {
          totalDonated: newTotal.toString(),
          donationCount: (donor.donationCount || 0) + 1,
          lastDonationAt: new Date(),
          // Update contact info if provided
          ...(donorFirstName && { firstName: donorFirstName }),
          ...(donorLastName && { lastName: donorLastName }),
          ...(donorPhone && { phone: donorPhone })
        });
      }

      // Determine payment context for routing
      let finalContextType = contextType;
      let finalContextId = contextId;
      let finalContextName = contextName;

      // Legacy support: derive context from campaignId, productId, eventId
      if (campaignId && !contextId) {
        finalContextType = "campaign";
        finalContextId = campaignId;
        // Get campaign name for fund creation
        const campaign = await storage.getCampaign(campaignId);
        finalContextName = campaign?.name || `Campaign ${campaignId}`;
      } else if (productId && !contextId) {
        finalContextType = "product";
        finalContextId = productId;
        // Get product name for fund creation
        const product = await storage.getDonationProduct(productId);
        finalContextName = product?.name || `Product ${productId}`;
      } else if (eventId && !contextId) {
        finalContextType = "event";
        finalContextId = eventId;
        finalContextName = `Event ${eventId}`;
      }

      // Use payment routing service to resolve fund and payment account
      const routing = await paymentRouting.routePayment({
        organizationId,
        contextType: finalContextType as any,
        contextId: finalContextId,
        contextName: finalContextName,
        amount,
        donorId: donor.id,
        paymentMethod
      });

      // Validate routing
      const validation = await paymentRouting.validateRouting(routing);
      if (!validation.valid) {
        console.error("Payment routing validation failed:", validation.errors);
        return res.status(400).json({
          message: "Payment routing failed",
          errors: validation.errors
        });
      }

      // Create donation record with new attribution fields
      const feeAmount = 0; // No fees for this test donation
      const totalAmount = amount + feeAmount;
      
      const donationData = {
        amount: amount.toString(),
        feeAmount: feeAmount.toString(),
        totalAmount: totalAmount.toString(),
        currency,
        status: "completed",
        organizationId,
        campaignId, // Keep for backwards compatibility
        donorId: donor.id,
        paymentMethod,
        recurringFrequency,
        isAnonymous,
        metadata,
        processedAt: new Date(),
        // New hybrid architecture fields
        fundId: routing.fundId,
        contextType: finalContextType,
        contextId: finalContextId,
        paymentAccountId: routing.paymentAccountId,
        source: "website", // Default source for API donations
        amountCents: amount * 100 // Convert to cents
      };

      console.log("DEBUG: Donation data being sent:", JSON.stringify(donationData, null, 2));
      const donation = await storage.createDonation(donationData);

      res.status(201).json({
        donation,
        donor: {
          id: donor.id,
          email: donor.email,
          firstName: donor.firstName,
          lastName: donor.lastName,
          isAnonymous: isAnonymous
        },
        routing: {
          fund: {
            id: routing.fund.id,
            name: routing.fund.name,
            type: routing.fund.type
          },
          paymentAccount: {
            id: routing.paymentAccount.id,
            name: routing.paymentAccount.name,
            provider: routing.paymentAccount.provider
          },
          summary: paymentRouting.getRoutingSummary({
            organizationId,
            contextType: finalContextType as any,
            contextId: finalContextId,
            contextName: finalContextName,
            amount,
            donorId: donor.id,
            paymentMethod
          }, routing)
        }
      });
    } catch (error) {
      console.error("Error creating enhanced donation:", error);
      res.status(500).json({ message: "Failed to process donation" });
    }
  });

  // Simple donation creation
  app.post("/api/donations", async (req, res) => {
    try {
      const donationData = insertDonationSchema.parse(req.body);
      const donation = await storage.createDonation(donationData);
      res.status(201).json(donation);
    } catch (error) {
      console.error("Error creating donation:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error",
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create donation" });
    }
  });

  // Donor payment methods management - DEPRECATED: Use /api/donor/payment-methods from donor-routes.ts instead
  // app.get("/api/donor/payment-methods", async (req, res) => {
  //   try {
  //     const { donorEmail, organizationId } = req.query;

  //     if (!donorEmail || !organizationId) {
  //       return res.status(400).json({
  //         message: "Donor email and organization ID are required"
  //       });
  //     }

  //     const donor = await storage.getDonorByEmail(
  //       parseInt(organizationId as string),
  //       donorEmail as string
  //     );

  //     if (!donor) {
  //       return res.status(404).json({ message: "Donor not found" });
  //     }

  //     // Get payment methods from GETTRX storage
  //     const paymentMethods = await storage.getGettrxPaymentMethods(parseInt(organizationId as string));
  //     
  //     // Filter payment methods for this donor (if we had donor-specific payment methods)
  //     const donorPaymentMethods = paymentMethods.filter(pm => pm.donorId === donor.id);

  //     res.json(donorPaymentMethods);
  //   } catch (error) {
  //     console.error("Error fetching payment methods:", error);
  //     res.status(500).json({ message: "Failed to fetch payment methods" });
  //   }
  // });

  // Add card payment method - DEPRECATED: Use donor-routes.ts endpoints instead
  /* app.post("/api/donor/payment-methods/card", async (req, res) => {
    try {
      const {
        donorEmail,
        organizationId,
        cardToken,
        last4,
        expiryMonth,
        expiryYear,
        brand,
        isDefault = false
      } = req.body;

      if (!donorEmail || !organizationId || !cardToken) {
        return res.status(400).json({
          message: "Donor email, organization ID, and card token are required"
        });
      }

      const donor = await storage.getDonorByEmail(organizationId, donorEmail);
      if (!donor) {
        return res.status(404).json({ message: "Donor not found" });
      }

      // Create payment method record
      const paymentMethod = await storage.createGettrxPaymentMethod({
        organizationId,
        donorId: donor.id,
        gettrxCustomerId: donor.gettrxCustomerId || 'unknown',
        gettrxPaymentMethodId: cardToken,
        payment_type: "card",
        last_four: last4,
        exp_month: expiryMonth,
        exp_year: expiryYear,
        brand,
        is_default: isDefault,
        is_active: true,
        usage_type: 'off_session',
        consent_given: true,
        consent_timestamp: new Date(),
        consent_ip_address: req.ip || 'unknown'
      });

      res.status(201).json(paymentMethod);
    } catch (error) {
      console.error("Error adding card payment method:", error);
      res.status(500).json({ message: "Failed to add payment method" });
    }
  }); */

  // Add bank payment method - DEPRECATED: Use donor-routes.ts endpoints instead
  /* app.post("/api/donor/payment-methods/bank", async (req, res) => {
    try {
      const {
        donorEmail,
        organizationId,
        bankToken,
        accountType,
        last4,
        bankName,
        isDefault = false
      } = req.body;

      if (!donorEmail || !organizationId || !bankToken) {
        return res.status(400).json({
          message: "Donor email, organization ID, and bank token are required"
        });
      }

      const donor = await storage.getDonorByEmail(organizationId, donorEmail);
      if (!donor) {
        return res.status(404).json({ message: "Donor not found" });
      }

      // Create bank payment method record
      const paymentMethod = await storage.createGettrxPaymentMethod({
        organizationId,
        donorId: donor.id,
        gettrxCustomerId: donor.gettrxCustomerId || 'unknown',
        gettrxPaymentMethodId: bankToken,
        payment_type: "us_bank_account",
        account_type: accountType,
        last_four: last4,
        bank_name: bankName,
        is_default: isDefault,
        is_active: true,
        usage_type: 'off_session',
        consent_given: true,
        consent_timestamp: new Date(),
        consent_ip_address: req.ip || 'unknown'
      });

      res.status(201).json(paymentMethod);
    } catch (error) {
      console.error("Error adding bank payment method:", error);
      res.status(500).json({ message: "Failed to add payment method" });
    }
  }); */

  // Add Google Pay payment method - DEPRECATED: Use donor-routes.ts endpoints instead
  /* app.post("/api/donor/payment-methods/google-pay", async (req, res) => {
    try {
      const {
        donorEmail,
        organizationId,
        googlePayToken,
        last4,
        brand,
        isDefault = false
      } = req.body;

      if (!donorEmail || !organizationId || !googlePayToken) {
        return res.status(400).json({
          message: "Donor email, organization ID, and Google Pay token are required"
        });
      }

      const donor = await storage.getDonorByEmail(organizationId, donorEmail);
      if (!donor) {
        return res.status(404).json({ message: "Donor not found" });
      }

      const paymentMethod = await storage.createGettrxPaymentMethod({
        organizationId,
        donorId: donor.id,
        gettrxCustomerId: donor.gettrxCustomerId || 'unknown',
        gettrxPaymentMethodId: googlePayToken,
        payment_type: "google_pay",
        last_four: last4,
        brand,
        is_default: isDefault,
        is_active: true,
        usage_type: 'off_session',
        consent_given: true,
        consent_timestamp: new Date(),
        consent_ip_address: req.ip || 'unknown'
      });

      res.status(201).json(paymentMethod);
    } catch (error) {
      console.error("Error adding Google Pay payment method:", error);
      res.status(500).json({ message: "Failed to add payment method" });
    }
  }); */

  // Add Apple Pay payment method - DEPRECATED: Use donor-routes.ts endpoints instead
  /* app.post("/api/donor/payment-methods/apple-pay", async (req, res) => {
    try {
      const {
        donorEmail,
        organizationId,
        applePayToken,
        last4,
        brand,
        isDefault = false
      } = req.body;

      if (!donorEmail || !organizationId || !applePayToken) {
        return res.status(400).json({
          message: "Donor email, organization ID, and Apple Pay token are required"
        });
      }

      const donor = await storage.getDonorByEmail(organizationId, donorEmail);
      if (!donor) {
        return res.status(404).json({ message: "Donor not found" });
      }

      const paymentMethod = await storage.createGettrxPaymentMethod({
        organizationId,
        donorId: donor.id,
        gettrxCustomerId: donor.gettrxCustomerId || 'unknown',
        gettrxPaymentMethodId: applePayToken,
        payment_type: "apple_pay",
        last_four: last4,
        brand,
        is_default: isDefault,
        is_active: true,
        usage_type: 'off_session',
        consent_given: true,
        consent_timestamp: new Date(),
        consent_ip_address: req.ip || 'unknown'
      });

      res.status(201).json(paymentMethod);
    } catch (error) {
      console.error("Error adding Apple Pay payment method:", error);
      res.status(500).json({ message: "Failed to add payment method" });
    }
  }); */

  // Set default payment method - DEPRECATED: Use donor-routes.ts endpoints instead
  /* app.put("/api/donor/payment-methods/:id/default", async (req, res) => {
    try {
      const paymentMethodId = parseInt(req.params.id);
      const { donorEmail, organizationId } = req.body;

      const donor = await storage.getDonorByEmail(organizationId, donorEmail);
      if (!donor) {
        return res.status(404).json({ message: "Donor not found" });
      }

      // First, set all donor's payment methods to non-default
      const donorPaymentMethods = await storage.getGettrxPaymentMethods(organizationId);
      const donorSpecificMethods = donorPaymentMethods.filter(pm => pm.donorId === donor.id);
      
      for (const method of donorSpecificMethods) {
        if (method.id !== paymentMethodId) {
          await storage.updateGettrxPaymentMethod(method.id, { isDefault: false });
        }
      }

      // Set the specified payment method as default
      const updatedPaymentMethod = await storage.updateGettrxPaymentMethod(paymentMethodId, {
        isDefault: true
      });

      res.json(updatedPaymentMethod);
    } catch (error) {
      console.error("Error setting default payment method:", error);
      res.status(500).json({ message: "Failed to set default payment method" });
    }
  }); */

  // Delete payment method - DEPRECATED: Use donor-routes.ts endpoints instead
  /* app.delete("/api/donor/payment-methods/:id", async (req, res) => {
    try {
      const paymentMethodId = parseInt(req.params.id);
      await storage.deleteGettrxPaymentMethod(paymentMethodId);
      res.json({ message: "Payment method deleted successfully" });
    } catch (error) {
      console.error("Error deleting payment method:", error);
      res.status(500).json({ message: "Failed to delete payment method" });
    }
  }); */

  // Get donor saved campaigns - DEPRECATED: Use /api/donor/saved-campaigns from donor-routes.ts instead
  // app.get("/api/donor/saved-campaigns", async (req, res) => {
  //   try {
  //     const { donorEmail, organizationId } = req.query;

  //     if (!donorEmail || !organizationId) {
  //       return res.status(400).json({
  //         message: "Donor email and organization ID are required"
  //       });
  //     }

  //     const donor = await storage.getDonorByEmail(
  //       parseInt(organizationId as string),
  //       donorEmail as string
  //     );

  //     if (!donor) {
  //       return res.json([]); // Return empty array if donor not found
  //     }

  //     // Get donations by donor to find campaigns they've donated to
  //     const donations = await storage.getDonationsByOrganization(
  //       parseInt(organizationId as string)
  //     );
  //     
  //     const donorDonations = donations.filter(d => d.donorId === donor.id);
  //     const campaignIds = [...new Set(donorDonations.map(d => d.campaignId).filter(Boolean))];
  //     
  //     // Get campaign details
  //     const campaigns = [];
  //     for (const campaignId of campaignIds) {
  //       if (campaignId) {
  //         const campaign = await storage.getCampaign(campaignId);
  //         if (campaign) {
  //           campaigns.push(campaign);
  //         }
  //       }
  //     }

  //     res.json(campaigns);
  //   } catch (error) {
  //     console.error("Error fetching saved campaigns:", error);
  //     res.status(500).json({ message: "Failed to fetch saved campaigns" });
  //   }
  // });

  // Get donor impact summary - DEPRECATED: Use /api/donor/impact from donor-routes.ts instead
  // app.get("/api/donor/impact", async (req, res) => {
  //   try {
  //     const { donorEmail, organizationId } = req.query;

  //     if (!donorEmail || !organizationId) {
  //       return res.status(400).json({
  //         message: "Donor email and organization ID are required"
  //       });
  //     }

  //     const donor = await storage.getDonorByEmail(
  //       parseInt(organizationId as string),
  //       donorEmail as string
  //     );

  //     if (!donor) {
  //       return res.status(404).json({ message: "Donor not found" });
  //     }

  //     // Get donor's donations for impact calculation
  //     const donations = await storage.getDonationsByOrganization(
  //       parseInt(organizationId as string)
  //     );
  //     
  //     const donorDonations = donations.filter(d => d.donorId === donor.id);
  //     const totalImpact = donorDonations.reduce((sum, d) => sum + parseFloat(d.amount), 0);
  //     
  //     // Calculate impact metrics
  //     const impactSummary = {
  //       totalDonated: totalImpact,
  //       donationCount: donorDonations.length,
  //       averageDonation: donorDonations.length > 0 ? totalImpact / donorDonations.length : 0,
  //       firstDonation: donor.firstDonationAt,
  //       lastDonation: donor.lastDonationAt,
  //       campaignCount: new Set(donorDonations.map(d => d.campaignId).filter(Boolean)).size,
  //       impactMessage: `Your ${donorDonations.length} donations totaling $${totalImpact.toFixed(2)} have made a real difference in advancing our mission.`
  //     };

  //     res.json(impactSummary);
  //   } catch (error) {
  //     console.error("Error calculating donor impact:", error);
  //     res.status(500).json({ message: "Failed to calculate impact" });
  //   }
  // });

  // Initialize migration service
  const migrationService = new DataMigrationService(storage);

  // Migration endpoints (admin only)
  
  // Check migration status for an organization
  app.get("/api/admin/migration/status/:organizationId", authenticateToken, async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const status = await migrationService.checkOrganizationMigrationStatus(organizationId);
      res.json(status);
    } catch (error) {
      console.error("Error checking migration status:", error);
      res.status(500).json({ message: "Failed to check migration status" });
    }
  });

  // Run migration for a specific organization
  app.post("/api/admin/migration/organization/:organizationId", authenticateToken, async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      await migrationService.migrateOrganization(organizationId);
      res.json({ 
        message: "Organization migration completed successfully",
        organizationId 
      });
    } catch (error) {
      console.error("Error running organization migration:", error);
      res.status(500).json({ message: "Failed to run organization migration" });
    }
  });

  // Run full migration for all organizations (super admin only)
  app.post("/api/admin/migration/full", authenticateToken, async (req, res) => {
    try {
      const result = await migrationService.runFullMigration();
      res.json({
        message: "Full migration completed",
        result
      });
    } catch (error) {
      console.error("Error running full migration:", error);
      res.status(500).json({ message: "Failed to run full migration" });
    }
  });
}