/**
 * Organization Routes
 * Handles organization management, settings, and configurations
 */
import type { Express, Request, Response } from "express";
import { storage } from "../storage/index";
import { insertOrganizationSchema } from "@shared/schema";
import { z } from "zod";

// Schema for organization integration settings
const organizationIntegrationSchema = z.object({
  smsProvider: z.string().optional(),
  smsConnectionStatus: z.enum(["connected", "disconnected", "error", "pending"]).optional(),
  smsMetadata: z.any().optional(),
  marketingProvider: z.string().optional(),
  marketingConnectionStatus: z.enum(["connected", "disconnected", "error", "pending"]).optional(),
  marketingMetadata: z.any().optional(),
  crmProvider: z.string().optional(),
  crmConnectionStatus: z.enum(["connected", "disconnected", "error", "pending"]).optional(),
  crmMetadata: z.any().optional(),
});
import { authenticateToken, requireOrganizationAccess } from "../middleware";
import { zohoCrmService } from "../services/zoho-crm";

export function registerOrganizationRoutes(app: Express): void {
  // Get organization by ID
  app.get("/api/organizations/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const orgId = parseInt(req.params.id);
      const user = req.user;

      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Ensure user can only access their own organization (unless super admin)
      if (user.organizationId !== orgId && user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const organization = await storage.getOrganizationById(orgId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      console.log(`Organization request - User: ${JSON.stringify(user)} Requested ID: ${orgId}`);
      console.log(`Organization found: ${JSON.stringify(organization)}`);

      // Redact sensitive fields before returning to client
      const safeOrganization = storage.redactOrganizationSecrets(organization);
      res.json(safeOrganization);
    } catch (error) {
      console.error("Error fetching organization:", error);
      res.status(500).json({ message: "Failed to fetch organization" });
    }
  });

  // Get organization by slug
  app.get("/api/organizations/by-slug/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const organization = await storage.getOrganizationBySlug(slug);
      
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      // Redact sensitive fields before returning to client
      const safeOrganization = storage.redactOrganizationSecrets(organization);
      res.json(safeOrganization);
    } catch (error) {
      console.error("Error fetching organization by slug:", error);
      res.status(500).json({ message: "Failed to fetch organization" });
    }
  });

  // Create new organization
  app.post("/api/organizations", authenticateToken, async (req: Request, res: Response) => {
    try {
      const organizationData = insertOrganizationSchema.parse(req.body);
      const user = req.user;

      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Only allow super admins to create organizations
      if (user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const newOrganization = await storage.createOrganization(organizationData);

      // Integrate with Zoho CRM if available
      if (zohoCrmService.isAvailable()) {
        try {
          await zohoCrmService.createOrganizationContact(
            organizationData.name,
            organizationData.email,
            organizationData.phone || undefined,
            organizationData.organizationType || undefined
          );
          console.log(`Zoho CRM contact created for organization: ${organizationData.name}`);
        } catch (error) {
          console.warn(`Zoho CRM integration failed for ${organizationData.name}:`, error);
          // Don't fail the organization creation if CRM integration fails
        }
      }

      // Redact sensitive fields before returning to client
      const safeOrganization = storage.redactOrganizationSecrets(newOrganization);
      res.status(201).json(safeOrganization);
    } catch (error) {
      console.error("Error creating organization:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error",
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create organization" });
    }
  });

  // Update organization settings
  app.patch("/api/organizations/:id/settings", authenticateToken, async (req: Request, res: Response) => {
    try {
      const orgId = parseInt(req.params.id);
      const user = req.user;
      const settings = req.body;

      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!orgId) {
        return res.status(400).json({ message: "Organization ID is required" });
      }

      // Ensure user can only update their own organization settings
      if (user.organizationId !== orgId && user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      // Validate GETTRX required fields if they are provided
      const validationErrors = [];
      
      if (settings.legalBusinessName !== undefined && !settings.legalBusinessName) {
        validationErrors.push({
          field: 'legalBusinessName',
          message: 'Legal business name is required for payment processing'
        });
      }
      
      if (settings.businessPhone !== undefined && settings.businessPhone) {
        const phoneRegex = /^\(\d{3}\)-\d{3}-\d{4}$/;
        if (!phoneRegex.test(settings.businessPhone)) {
          validationErrors.push({
            field: 'businessPhone',
            message: 'Business phone must be in format (xxx)-xxx-xxxx'
          });
        }
      }
      
      if (settings.customerServicePhone !== undefined && settings.customerServicePhone) {
        const phoneRegex = /^\(\d{3}\)-\d{3}-\d{4}$/;
        if (!phoneRegex.test(settings.customerServicePhone)) {
          validationErrors.push({
            field: 'customerServicePhone',
            message: 'Customer service phone must be in format (xxx)-xxx-xxxx'
          });
        }
      }
      
      if (validationErrors.length > 0) {
        return res.status(400).json({
          message: "Validation failed",
          errors: validationErrors
        });
      }

      const updatedOrganization = await storage.updateOrganizationSettings(orgId, settings);
      res.json(updatedOrganization);
    } catch (error) {
      console.error("Error updating organization settings:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error",
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // Update church-specific settings
  app.patch("/api/organizations/:orgId/church-settings", authenticateToken, async (req: Request, res: Response) => {
    try {
      const orgId = parseInt(req.params.orgId);
      const user = req.user;
      const churchSettings = req.body;

      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (user.organizationId !== orgId && user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      // Update organization with church-specific settings
      const updatedOrganization = await storage.updateOrganization(orgId, {
        settings: {
          ...churchSettings,
          churchManagementEnabled: true
        }
      });

      res.json(updatedOrganization);
    } catch (error) {
      console.error("Error updating church settings:", error);
      res.status(500).json({ message: "Failed to update church settings" });
    }
  });

  // Get organization onboarding status
  app.get("/api/organizations/:orgId/onboarding", authenticateToken, async (req: Request, res: Response) => {
    try {
      const orgId = parseInt(req.params.orgId);
      const user = req.user;

      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (user.organizationId !== orgId && user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const onboardingSteps = await storage.getOnboardingSteps(orgId);
      res.json(onboardingSteps);
    } catch (error) {
      console.error("Error fetching onboarding status:", error);
      res.status(500).json({ message: "Failed to fetch onboarding status" });
    }
  });

  // Validate custom domain
  app.post("/api/organizations/:id/validate-domain", async (req, res) => {
    try {
      const { domain } = req.body;
      
      if (!domain) {
        return res.status(400).json({ message: "Domain is required" });
      }

      const validation = await storage.validateCustomDomain(domain);
      res.json(validation);
    } catch (error) {
      console.error("Domain validation error:", error);
      res.status(500).json({ message: "Failed to validate domain" });
    }
  });

  // Get organization statistics
  app.get("/api/organizations/:orgId/stats", authenticateToken, async (req: Request, res: Response) => {
    try {
      const orgId = parseInt(req.params.orgId);
      const user = req.user;

      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (user.organizationId !== orgId && user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const stats = await storage.getOrganizationStats(orgId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching organization stats:", error);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  // Get organization donors
  app.get("/api/organizations/:orgId/donors", authenticateToken, async (req: Request, res: Response) => {
    try {
      const orgId = parseInt(req.params.orgId);
      const user = req.user;

      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (user.organizationId !== orgId && user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const donors = await storage.getDonorsByOrganization(orgId);
      res.json(donors);
    } catch (error) {
      console.error("Error fetching donors:", error);
      res.status(500).json({ message: "Failed to fetch donors" });
    }
  });

  // Bulk import donors with donations
  app.post("/api/organizations/:orgId/donors/bulk-import", authenticateToken, async (req: Request, res: Response) => {
    try {
      const orgId = parseInt(req.params.orgId);
      const user = req.user;
      const { donors: importedDonors } = req.body;

      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (user.organizationId !== orgId && user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      if (!Array.isArray(importedDonors) || importedDonors.length === 0) {
        return res.status(400).json({ message: "Invalid donor data" });
      }

      const results = {
        created: 0,
        failed: 0,
        errors: [] as string[]
      };

      for (const donorData of importedDonors) {
        try {
          // Parse name into first/last
          const nameParts = donorData.Name?.split(' ') || [];
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          // Check if donor already exists
          let donor = await storage.getDonorByEmail(orgId, donorData.Email);
          
          if (!donor) {
            // Create new donor
            donor = await storage.createDonor({
              email: donorData.Email,
              firstName,
              lastName,
              phone: donorData.Phone || null,
              address: donorData.Location || null,
              city: null,
              state: null,
              zipCode: null,
              organizationId: orgId,
              totalDonated: parseFloat(donorData["Total Donated"] || "0").toString(),
              donationCount: parseInt(donorData["Donation Count"] || "0"),
              firstDonationAt: donorData["First Donation"] ? new Date(donorData["First Donation"]) : new Date(),
              lastDonationAt: donorData["Last Donation"] ? new Date(donorData["Last Donation"]) : new Date(),
              achievementBadges: donorData["Achievement Badges"] || null,
              gettrxCustomerId: null
            });
          } else {
            // Donor already exists - skip donation record creation
            results.errors.push(`Donor ${donorData.Email} already exists - skipped donation record`);
            continue;
          }

          // Create external donation record if Total Donated > 0
          const totalDonated = parseFloat(donorData["Total Donated"] || "0");
          if (totalDonated > 0 && donor) {
            const externalPaymentType = donorData["Payment Type"]?.toLowerCase() || "imported"; // cash, check, wire_transfer, etc.
            
            await storage.createDonation({
              organizationId: orgId,
              donorId: donor.id,
              amount: totalDonated.toString(),
              totalAmount: totalDonated.toString(),
              feeAmount: "0",
              frequency: 'one-time',
              status: 'completed',
              paymentMethod: externalPaymentType, // Use CSV payment type or default to 'imported'
              isExternalDonation: true, // Mark as external/historical
              externalPaymentType: externalPaymentType, // cash, check, wire_transfer, etc.
              externalReferenceNumber: donorData["Reference Number"] || null, // Check number, wire ref, etc.
              externalNotes: donorData["Notes"] || null, // Any additional notes from CSV
              donorEmail: donorData.Email,
              donorFirstName: firstName,
              donorLastName: lastName,
              donorPhone: donorData.Phone || null,
              donorAddress: donorData.Location || null,
              donorCity: null,
              donorState: null,
              donorZipCode: null,
              isAnonymous: false,
              feeCovered: false,
              gettrxTransactionId: null,
              gettrxPaymentMethodId: null,
              checkoutMode: 'standard',
              customFieldResponses: null,
              campaignId: null,
              fundId: null,
              donationPageId: null,
              donationProductId: null
            });
          }

          results.created++;
        } catch (error) {
          results.failed++;
          results.errors.push(`Failed to import ${donorData.Name || donorData.Email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          console.error(`Error importing donor ${donorData.Email}:`, error);
        }
      }

      res.json({
        success: true,
        created: results.created,
        failed: results.failed,
        errors: results.errors
      });
    } catch (error) {
      console.error("Error bulk importing donors:", error);
      res.status(500).json({ message: "Failed to import donors" });
    }
  });

  // Get organization donations
  app.get("/api/organizations/:orgId/donations", authenticateToken, async (req: Request, res: Response) => {
    try {
      const orgId = parseInt(req.params.orgId);
      const user = req.user;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (user.organizationId !== orgId && user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const donations = await storage.getDonationsByOrganization(orgId, limit);
      res.json(donations);
    } catch (error) {
      console.error("Error fetching donations:", error);
      res.status(500).json({ message: "Failed to fetch donations" });
    }
  });

  // Update organization integration settings
  app.patch("/api/organizations/:id/integrations", authenticateToken, async (req: Request, res: Response) => {
    try {
      const orgId = parseInt(req.params.id);
      const user = req.user;

      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!orgId) {
        return res.status(400).json({ message: "Organization ID is required" });
      }

      // Ensure user can only update their own organization integrations
      if (user.organizationId !== orgId && user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      // Validate the request body using the Zod schema
      const validationResult = organizationIntegrationSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: validationResult.error.errors
        });
      }

      const integrationSettings = validationResult.data;

      // Update organization integrations
      const updatedOrganization = await storage.updateOrganizationIntegrations(orgId, integrationSettings);
      
      res.json(updatedOrganization);
    } catch (error) {
      console.error("Error updating organization integrations:", error);
      res.status(500).json({ message: "Failed to update integration settings" });
    }
  });
}