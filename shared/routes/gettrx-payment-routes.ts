/**
 * GETTRX Payment Processing API Routes
 * Simplified routes for campaign donation processing with card tokenization
 */

import type { Express } from "express";
import { z } from "zod";
import { GettrxService } from "../services/gettrx";
import { paymentMethodsService } from "../services/payment-methods-service";
import { storage } from "../storage/index";
import { calculateAchievementBadges } from "../services/achievement-badges";

const gettrxService = new GettrxService();

// Validation schemas
const createTokenSchema = z.object({
  cardNumber: z.string().min(13).max(19),
  expiryMonth: z.string().length(2),
  expiryYear: z.string().length(4),
  cvv: z.string().min(3).max(4),
  cardholderName: z.string().min(1),
});

const processPaymentSchema = z.object({
  paymentToken: z.string().min(1), // Token from GettrxOne SDK
  amount: z.number().min(0.01).max(1000000),
  organizationId: z.number().positive(),
  campaignId: z.number().positive().optional(),
  donorInfo: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
  }),
  anonymous: z.boolean().default(false),
  savePaymentMethod: z.boolean().default(false), // Whether to save payment method for future use
  setupFutureUsage: z.enum(['off_session', 'on_session']).optional(), // Either off_session, on_session, or undefined
  donationType: z.enum(['one-time', 'recurring']).default('one-time'), // Type of donation
  recurringInterval: z.enum(['monthly', 'quarterly', 'annually']).optional(), // Recurring interval if donationType is recurring
});

export function registerGettrxPaymentRoutes(app: Express): void {
  // Get payment configuration for organization
  app.get("/api/gettrx/payment-config/:organizationId", async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);

      if (!organizationId || isNaN(organizationId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid organization ID",
        });
      }

      // Get organization and check merchant status
      const organization = await storage.getOrganizationById(organizationId);
      if (!organization) {
        return res.status(404).json({
          success: false,
          message: "Organization not found",
        });
      }

      // Check if organization has approved merchant status
      if (organization.merchantStatus !== "approved") {
        return res.status(400).json({
          success: false,
          message: "Merchant account not approved",
          merchantStatus: organization.merchantStatus,
        });
      }

      // Get the merchant account ID
      let merchantAccountId = organization.merchantAccountId;

      // If not set in organization, try to get from latest approved application
      if (!merchantAccountId) {
        const applications =
          await storage.getGettrxMerchantApplications(organizationId);
        const approvedApp = applications.find(
          (app) => app.status === "approved",
        );
        if (approvedApp?.gettrxAccountId) {
          merchantAccountId = approvedApp.gettrxAccountId;
          // TODO: Schedule a background job to update organization.merchantAccountId
          console.log(
            `Using account ID from application for org ${organizationId}: ${merchantAccountId}`,
          );
        }
      }

      if (!merchantAccountId) {
        return res.status(400).json({
          success: false,
          message: "No merchant account ID found for organization",
        });
      }

      // Return payment configuration
      res.json({
        success: true,
        config: {
          publishableKey: process.env.VITE_GETTRX_PUBLIC_KEY,
          accountId: merchantAccountId,
          environment:
            process.env.NODE_ENV === "production" ? "live" : "sandbox",
        },
      });
    } catch (error: any) {
      console.error("Error getting payment config:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get payment configuration",
      });
    }
  });

  // Note: /api/gettrx/create-token endpoint has been removed
  // GETTRX tokenization is now handled exclusively by the client-side SDK for PCI compliance
  // All payment forms use GettrxPaymentForm component which tokenizes client-side

  // Process payment with donation details
  app.post("/api/gettrx/process-payment", async (req, res) => {
    try {
      console.log("🔍 RAW REQUEST BODY:", JSON.stringify(req.body));
      
      const paymentData = processPaymentSchema.parse(req.body);

      console.log("Processing GETTRX payment:", {
        amount: paymentData.amount,
        organizationId: paymentData.organizationId,
        savePaymentMethod: paymentData.savePaymentMethod,
        donationType: paymentData.donationType,
        recurringInterval: paymentData.recurringInterval,
      });

      // Get organization to check merchant account
      const organization = await storage.getOrganizationById(
        paymentData.organizationId,
      );
      if (!organization) {
        return res.status(404).json({
          success: false,
          message: "Organization not found",
        });
      }

      // Create or get donor
      let donor = await storage.getDonorByEmail(
        paymentData.organizationId,
        paymentData.donorInfo.email,
      );
      if (!donor) {
        donor = await storage.createDonor({
          organizationId: paymentData.organizationId,
          email: paymentData.donorInfo.email,
          firstName: paymentData.donorInfo.firstName,
          lastName: paymentData.donorInfo.lastName,
          phone: paymentData.donorInfo.phone,
          address: paymentData.donorInfo.address,
          city: paymentData.donorInfo.city,
          state: paymentData.donorInfo.state,
          zipCode: paymentData.donorInfo.zipCode,
        });
      }

      // Create GETTRX customer if needed
      let gettrxCustomerId = donor.gettrxCustomerId;
      if (!gettrxCustomerId) {
        // Create GETTRX customer (sandbox or production based on API keys)
        const customer = await gettrxService.createCustomer(
          {
            name: `${paymentData.donorInfo.firstName} ${paymentData.donorInfo.lastName}`,
            email: paymentData.donorInfo.email,
            phone: paymentData.donorInfo.phone,
            organizationId: paymentData.organizationId,
          },
          organization.merchantAccountId
        );
        gettrxCustomerId = customer.data.id;

        // Update donor with GETTRX customer ID
        await storage.updateDonor(donor.id, { gettrxCustomerId });
      }

      // Process payment through GETTRX (sandbox or production based on API keys)
      let paymentResult;
      try {
        paymentResult = await gettrxService.createPayment({
          paymentToken: paymentData.paymentToken,
          amount: paymentData.amount,
          currency: "usd",
          customer: gettrxCustomerId,
          setupFutureUsage: paymentData.setupFutureUsage,
          organizationId: paymentData.organizationId,
          campaignId: paymentData.campaignId,
          donorId: donor.id,
          merchantAccountId: organization.merchantAccountId,
          metadata: {
            anonymous: paymentData.anonymous,
            platform: "pro-life-prosper",
          },
        });
      } catch (error: any) {
        // Check if error is due to invalid customer ID (parameter_invalid for customer field)
        const errorMessage = error.message || '';
        const isCustomerError = errorMessage.includes('customer') || 
                                errorMessage.includes('parameter') || 
                                errorMessage.includes('Invalid string');
        
        if (isCustomerError && gettrxCustomerId) {
          console.log('⚠️ Invalid customer ID detected, creating new customer...');
          console.log('Old customer ID:', gettrxCustomerId);
          
          // Create new GETTRX customer (must pass merchant account ID for onBehalfOf header)
          const customer = await gettrxService.createCustomer(
            {
              name: `${paymentData.donorInfo.firstName} ${paymentData.donorInfo.lastName}`,
              email: paymentData.donorInfo.email,
              phone: paymentData.donorInfo.phone,
              organizationId: paymentData.organizationId,
            },
            organization.merchantAccountId
          );
          gettrxCustomerId = customer.data.id;

          // Update donor with new GETTRX customer ID
          await storage.updateDonor(donor.id, { gettrxCustomerId });
          
          console.log('✅ New customer created:', gettrxCustomerId);

          // Retry payment with new customer ID
          paymentResult = await gettrxService.createPayment({
            paymentToken: paymentData.paymentToken,
            amount: paymentData.amount,
            currency: "usd",
            customer: gettrxCustomerId,
            setupFutureUsage: paymentData.setupFutureUsage,
            organizationId: paymentData.organizationId,
            campaignId: paymentData.campaignId,
            donorId: donor.id,
            merchantAccountId: organization.merchantAccountId,
            metadata: {
              anonymous: paymentData.anonymous,
              platform: "pro-life-prosper",
            },
          });
        } else {
          // Re-throw other errors
          throw error;
        }
      }

      console.log("✅ GETTRX payment processed:", paymentResult.data?.id || paymentResult.id);
      
      const chargeData = paymentResult.data?.latestCharge || paymentResult.latestCharge;
      console.log("🔍 Payment method location:", {
        hasPaymentMethod: !!paymentResult.payment_method,
        hasDataPaymentMethod: !!paymentResult.data?.payment_method,
        hasLatestCharge: !!chargeData,
        hasPaymentMethodDetails: !!chargeData?.paymentMethodDetails,
        hasPaymentMethodType: !!chargeData?.paymentMethodDetails?.type,
        chargeCustomer: chargeData?.customer,
        paymentCustomer: gettrxCustomerId
      });

      // Extract payment method from payment result (GETTRX includes it in the response)
      let paymentMethodResult = null;
      const paymentMethodId = paymentResult.payment_method || paymentResult.data?.payment_method || paymentResult.data?.latestCharge?.paymentMethod;
      
      if (paymentData.savePaymentMethod && paymentMethodId) {
        // First try to get payment method details from the payment result itself
        const chargeData = paymentResult.data?.latestCharge || paymentResult.latestCharge;
        
        if (chargeData?.paymentMethodDetails) {
          // Payment method details are already in the charge
          console.log("✅ Payment method details found in charge response");
          paymentMethodResult = {
            id: paymentMethodId,
            type: chargeData.paymentMethodDetails.type,
            card: chargeData.paymentMethodDetails.card,
            us_bank_account: chargeData.paymentMethodDetails.us_bank_account,
          };
        } else {
          // Try to fetch separately (fallback)
          try {
            console.log("🔍 Fetching payment method separately:", paymentMethodId);
            paymentMethodResult = await gettrxService.getPaymentMethod(
              gettrxCustomerId,
              paymentMethodId,
              organization.merchantAccountId
            );
            console.log("✅ Payment method fetched successfully");
          } catch (fetchError: any) {
            console.log("⚠️ Could not fetch payment method separately, using payment result data");
            // If fetch fails, create minimal payment method object from what we have
            paymentMethodResult = {
              id: paymentMethodId,
              type: "card", // Default assumption, will be updated if we have more info
            };
          }
        }
      } else {
        console.log("⚠️ Payment method not available:", { 
          saveRequested: paymentData.savePaymentMethod, 
          paymentMethodId 
        });
      }

      // Save payment method if requested (comprehensive support for cards and bank accounts)
      let savedPaymentMethod = null;
      if (paymentData.savePaymentMethod && paymentMethodResult) {
        try {
          // Comprehensive payment method data for both cards and bank accounts
          const paymentMethodData: any = {
            organizationId: paymentData.organizationId,
            donorId: donor.id,
            gettrxCustomerId: gettrxCustomerId,
            gettrxPaymentMethodId: paymentMethodResult.id,  // Fixed: correct field name
            payment_type: paymentMethodResult.type || "card",
            usageType: "off_session",
            isDefault: true, // First saved payment method becomes default
            consentGiven: true,
            consentTimestamp: new Date(),
            consentIpAddress:
              req.ip || req.connection.remoteAddress || "unknown",
          };

          // Handle different payment method types comprehensively
          if (paymentMethodResult.type === "card" && paymentMethodResult.card) {
            // Card payment method (Credit/Debit cards)
            paymentMethodData.payment_type = "card";
            paymentMethodData.brand =
              paymentMethodResult.card.brand || "unknown";
            paymentMethodData.last_four =
              paymentMethodResult.card.last4 || "0000";
            paymentMethodData.exp_month =
              paymentMethodResult.card.exp_month || 12;
            paymentMethodData.exp_year =
              paymentMethodResult.card.exp_year || new Date().getFullYear() + 1;
            console.log(
              "💳 Saving card payment method:",
              paymentMethodData.brand,
              "ending in",
              paymentMethodData.last_four,
            );
          } else if (
            paymentMethodResult.type === "us_bank_account" &&
            paymentMethodResult.us_bank_account
          ) {
            // Bank account payment method (ACH)
            paymentMethodData.payment_type = "us_bank_account";
            paymentMethodData.last_four =
              paymentMethodResult.us_bank_account.last4 || "0000";
            paymentMethodData.bank_name =
              paymentMethodResult.us_bank_account.bank_name || "Unknown Bank";
            paymentMethodData.account_type =
              paymentMethodResult.us_bank_account.account_type || "checking";
            paymentMethodData.routing_number_last4 =
              paymentMethodResult.us_bank_account.routing_number?.slice(-4) ||
              "0000";
            paymentMethodData.account_holder_type =
              paymentMethodResult.us_bank_account.account_holder_type ||
              "individual";
            console.log(
              "🏦 Saving bank account payment method:",
              paymentMethodData.bank_name,
              paymentMethodData.account_type,
              "ending in",
              paymentMethodData.last_four,
            );
          } else {
            // Generic payment method
            paymentMethodData.payment_type =
              paymentMethodResult.type || "unknown";
            paymentMethodData.last_four = "0000";
            console.log(
              "💰 Saving generic payment method type:",
              paymentMethodData.payment_type,
            );
          }

          savedPaymentMethod =
            await storage.createGettrxPaymentMethod(paymentMethodData);
          console.log(
            "✅ Payment method saved for future use:",
            savedPaymentMethod.id,
            "Type:",
            paymentMethodData.payment_type,
          );
        } catch (error) {
          console.error("❌ Error saving payment method:", error);
          // Continue with donation creation even if payment method saving fails
        }
      }

      // Create donation record
      console.log("💾 Creating donation with:", {
        isRecurring: paymentData.donationType === 'recurring',
        recurringInterval: paymentData.donationType === 'recurring' ? paymentData.recurringInterval : null,
        donationType: paymentData.donationType,
      });
      
      const donation = await storage.createDonation({
        organizationId: paymentData.organizationId,
        campaignId: paymentData.campaignId,
        donorId: donor.id,
        amount: paymentData.amount.toString(),
        totalAmount: paymentData.amount.toString(),
        status: "completed",
        paymentMethod: "card",
        source: "website",
        isAnonymous: paymentData.anonymous,
        isRecurring: paymentData.donationType === 'recurring',
        recurringInterval: paymentData.donationType === 'recurring' ? paymentData.recurringInterval : null,
        donorFirstName: paymentData.donorInfo?.firstName || donor.firstName || null,
        donorLastName: paymentData.donorInfo?.lastName || donor.lastName || null,
        donorEmail: paymentData.donorInfo?.email || donor.email || null,
        gettrxPaymentRequestId: paymentResult.id,
        gettrxCustomerId: gettrxCustomerId,
        providerPaymentMethodId: paymentMethodResult?.id || null,
        dedicatedTo: null,
        notes: null,
      });
      
      console.log("✅ Donation created:", {
        id: donation.id,
        isRecurring: donation.isRecurring,
        recurringInterval: donation.recurringInterval,
      });

      // Update donor statistics
      const currentTotal = parseFloat(donor.totalDonated || "0");
      const currentCount = donor.donationCount || 0;
      const newTotal = currentTotal + paymentData.amount;
      const newCount = currentCount + 1;
      const firstDonation = donor.firstDonationAt || new Date();
      const lastDonation = new Date();
      
      // Calculate achievement badges based on new stats
      const achievementBadges = calculateAchievementBadges({
        totalDonated: newTotal,
        donationCount: newCount,
        firstDonationAt: firstDonation,
        lastDonationAt: lastDonation,
      });
      
      await storage.updateDonor(donor.id, {
        totalDonated: newTotal.toString(),
        donationCount: newCount,
        firstDonationAt: firstDonation,
        lastDonationAt: lastDonation,
        achievementBadges: achievementBadges as any,
      });
      
      console.log(
        `👤 Donor ${donor.id} stats updated: $${currentTotal} → $${newTotal}, ${currentCount} → ${newCount} donations, ${achievementBadges.length} badges earned`,
      );

      // Update campaign raised amount if applicable
      if (paymentData.campaignId) {
        const campaign = await storage.getCampaign(paymentData.campaignId);
        if (campaign) {
          const currentRaised = parseFloat(campaign.raised || "0");
          const newRaised = currentRaised + paymentData.amount;
          await storage.updateCampaign(paymentData.campaignId, {
            raised: newRaised.toString(),
          });
          console.log(
            `💰 Campaign ${paymentData.campaignId} raised amount updated: $${currentRaised} → $${newRaised}`,
          );
        }
      }

      // If this is a recurring donation, create the recurring schedule
      if (paymentData.donationType === 'recurring' && savedPaymentMethod && paymentData.recurringInterval) {
        try {
          const startDate = new Date();
          const nextPaymentDate = new Date();
          
          // Calculate next payment date based on interval
          switch (paymentData.recurringInterval) {
            case 'monthly':
              nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
              break;
            case 'quarterly':
              nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 3);
              break;
            case 'annually':
              nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + 1);
              break;
          }

          await storage.createGettrxRecurringSchedule({
            organizationId: paymentData.organizationId,
            donorId: donor.id,
            campaignId: paymentData.campaignId,
            paymentMethodId: savedPaymentMethod.id,
            amount: paymentData.amount.toString(),
            currency: 'usd',
            interval: paymentData.recurringInterval,
            intervalCount: 1,
            startDate: startDate,
            nextPaymentDate: nextPaymentDate,
            donorCoversFees: false,
            sendReminders: true,
            status: 'active',
          });

          console.log(`✅ Recurring schedule created for donor ${donor.id}: ${paymentData.recurringInterval} $${paymentData.amount}`);
        } catch (error) {
          console.error('Failed to create recurring schedule:', error);
          // Don't fail the payment, but log the error
        }
      }

      res.json({
        success: true,
        payment: paymentResult,
        donation: donation,
        savedPaymentMethod: savedPaymentMethod,
        message: "Payment processed successfully",
      });
    } catch (error: any) {
      console.error("Payment processing error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Payment processing failed",
      });
    }
  });

  // Get payment status
  app.get("/api/gettrx/payment/:paymentId", async (req, res) => {
    try {
      const { paymentId } = req.params;

      // Get payment status from GETTRX (sandbox or production based on API keys)
      const payment = await gettrxService.getPayment(paymentId);
      res.json({
        success: true,
        payment,
      });
    } catch (error: any) {
      console.error("Payment status error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to get payment status",
      });
    }
  });

  // Save payment method for future use
  app.post("/api/gettrx/save-payment-method", async (req, res) => {
    try {
      const { organizationId, paymentToken, setAsDefault } = req.body;

      if (!organizationId || !paymentToken) {
        return res.status(400).json({
          success: false,
          message: "Organization ID and payment token are required",
        });
      }

      // Get organization
      const organization = await storage.getOrganizationById(organizationId);
      if (!organization) {
        return res.status(404).json({
          success: false,
          message: "Organization not found",
        });
      }

      if (!organization.merchantAccountId) {
        return res.status(400).json({
          success: false,
          message: "Merchant account not found for organization",
        });
      }

      // Check if organization has a GETTRX customer ID (for making payments)
      let customerId = organization.gettrxCustomerId;

      if (!customerId) {
        console.log(
          "🆕 Creating GETTRX customer for organization:",
          organizationId,
        );
        // Create a customer in GETTRX for this organization
        const customer = await gettrxService.createCustomer(
          {
            name: organization.name,
            email: organization.email,
            phone: organization.phone || undefined,
            organizationId: organizationId,
          },
          organization.merchantAccountId,
        ); // Pass merchant account as onBehalfOf

        console.log(
          "🔍 Full customer response:",
          JSON.stringify(customer, null, 2),
        );

        // GETTRX wraps response in a data object
        customerId = customer.data?.id || customer.id;

        if (!customerId) {
          throw new Error("Failed to get customer ID from GETTRX response");
        }

        // Save customer ID to organization
        await storage.updateOrganization(organizationId, {
          gettrxCustomerId: customerId,
        });

        console.log("✅ GETTRX customer created:", customerId);
      }

      console.log(
        "💳 Saving payment method - Customer:",
        customerId,
        "Account:",
        organization.merchantAccountId,
      );

      // Create payment method in GETTRX (setup intent to validate without charging)
      const paymentMethod = await gettrxService.savePaymentMethod(
        {
          paymentToken: paymentToken,
          customer: customerId, // Use customer ID, not merchant account
          usage: "off_session", // Enable for recurring payments
        },
        organization.merchantAccountId,
      ); // Pass merchant account as onBehalfOf

      console.log(
        "🔍 Full setup request response:",
        JSON.stringify(paymentMethod, null, 2),
      );

      // Extract setup request data (GETTRX wraps in data object)
      const setupData = paymentMethod.data || paymentMethod;

      // Get the actual payment method ID from the setup request response
      const actualPaymentMethodId = setupData.paymentMethod || setupData.id;

      console.log(
        "💳 Fetching payment method details for:",
        actualPaymentMethodId,
        "Customer:",
        customerId,
      );

      // Fetch actual payment method details to get type and card/bank info
      // Must use same onBehalfOf context and customer ID as when it was created
      // Official GETTRX endpoint: /customers/{customer_id}/payment_methods/{payment_method_id}
      const pmDetails = await gettrxService.getPaymentMethod(
        customerId,
        actualPaymentMethodId,
        organization.merchantAccountId,
      );
      const pmData = pmDetails.data || pmDetails;

      console.log(
        "🔍 Full payment method details:",
        JSON.stringify(pmData, null, 2),
      );

      // Determine payment method type from the actual payment method object
      const paymentMethodType = pmData.type || "card";

      console.log("💳 Payment method type:", paymentMethodType);

      // Extract card or bank account details
      // NOTE: GETTRX uses camelCase (expMonth, expYear) not snake_case (exp_month, exp_year)
      const lastFour = pmData.card?.last4 || pmData.bankAccount?.last4;
      const cardBrand = pmData.card?.brand;
      const expiryMonth = pmData.card?.expMonth
        ? parseInt(pmData.card.expMonth)
        : undefined;
      const expiryYear = pmData.card?.expYear
        ? parseInt(pmData.card.expYear)
        : undefined;
      const bankName = pmData.bankAccount?.bankName;
      const accountType = pmData.bankAccount?.accountType;

      // Check for duplicate using fingerprint (card number or bank account)
      const existingMethods =
        await paymentMethodsService.listPaymentMethods(organizationId);

      // Fingerprint-based duplicate detection
      let duplicate = null;

      if (
        paymentMethodType === "card" &&
        lastFour &&
        cardBrand &&
        expiryMonth &&
        expiryYear
      ) {
        // Card fingerprint: brand + last4 + expiry
        duplicate = existingMethods.find(
          (m) =>
            m.paymentMethodType === "card" &&
            m.lastFour === lastFour &&
            m.cardBrand === cardBrand &&
            m.expiryMonth === expiryMonth &&
            m.expiryYear === expiryYear,
        );
        if (duplicate) {
          console.log("🔍 Duplicate card detected by fingerprint:", {
            cardBrand,
            lastFour,
            expiryMonth,
            expiryYear,
          });
        }
      } else if (paymentMethodType === "bank_account" && lastFour) {
        // Bank account fingerprint: last4 of account number
        duplicate = existingMethods.find(
          (m) =>
            m.paymentMethodType === "bank_account" && m.lastFour === lastFour,
        );
        if (duplicate) {
          console.log("🔍 Duplicate bank account detected by fingerprint:", {
            lastFour,
          });
        }
      }

      if (duplicate) {
        return res.json({
          success: true,
          message: `This ${paymentMethodType === "card" ? "card" : "bank account"} is already saved`,
          paymentMethod: duplicate,
          isDuplicate: true,
        });
      }

      // Store payment method in our database with provider-agnostic structure
      const result = await paymentMethodsService.addPaymentMethod({
        organizationId,
        paymentProvider: "gettrx", // Specify GETTRX as the provider
        providerPaymentMethodId: actualPaymentMethodId,
        paymentMethodType: paymentMethodType,
        lastFour: lastFour,
        cardBrand: cardBrand,
        expiryMonth: expiryMonth,
        expiryYear: expiryYear,
        bankName: bankName,
        accountType: accountType,
        // Only store non-duplicate provider-specific data (fingerprints, networks, etc.)
        providerMetadata: filterProviderMetadata(pmData),
        setAsDefault: setAsDefault || false,
      });

      res.json({
        success: true,
        message: "Payment method saved successfully",
        paymentMethod: result,
      });
    } catch (error: any) {
      console.error("Save payment method error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to save payment method",
      });
    }
  });
}

// Helper function to determine card brand
function getCardBrand(cardNumber: string): string {
  const number = cardNumber.replace(/\s/g, "");

  if (number.startsWith("4")) return "visa";
  if (number.startsWith("5") || number.startsWith("2")) return "mastercard";
  if (number.startsWith("3")) return "amex";
  if (number.startsWith("6")) return "discover";

  return "unknown";
}

// Helper function to filter GETTRX payment method response
// Remove duplicate data that's already stored in dedicated columns
function filterProviderMetadata(paymentMethod: any): any {
  const filtered: any = {
    id: paymentMethod.id,
    object: paymentMethod.object,
    type: paymentMethod.type,
    created: paymentMethod.created,
    livemode: paymentMethod.livemode,
  };

  // Only store provider-specific data not in dedicated columns
  if (paymentMethod.customer) {
    filtered.customer = paymentMethod.customer;
  }

  if (paymentMethod.billing_details) {
    filtered.billing_details = paymentMethod.billing_details;
  }

  // For cards: store network tokens and fingerprints, but NOT card details (already in columns)
  if (paymentMethod.card) {
    filtered.card = {
      fingerprint: paymentMethod.card.fingerprint,
      funding: paymentMethod.card.funding,
      network: paymentMethod.card.network,
      wallet: paymentMethod.card.wallet,
      three_d_secure_usage: paymentMethod.card.three_d_secure_usage,
    };
  }

  // For ACH: store routing network info, but NOT account details (already in columns)
  if (paymentMethod.us_bank_account) {
    filtered.us_bank_account = {
      fingerprint: paymentMethod.us_bank_account.fingerprint,
      network: paymentMethod.us_bank_account.networks,
      status: paymentMethod.us_bank_account.status,
    };
  }

  return filtered;
}
