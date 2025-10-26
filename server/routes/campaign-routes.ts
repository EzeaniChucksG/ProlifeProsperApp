/**
 * Campaign Routes
 * Handles fundraising campaign management and operations
 */
import type { Express } from "express";
import { storage } from "../storage/index";
import { insertCampaignSchema, insertCampaignCategorySchema } from "@shared/schema";
import { z } from "zod";
import { authenticateToken } from "../middleware";
import { Parser } from 'json2csv';
import multer from 'multer';

// Configure multer for file upload
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'text/csv' && !file.originalname.endsWith('.csv')) {
      return cb(new Error('Only CSV files are allowed'));
    }
    cb(null, true);
  }
});

// Helper function to parse CSV text
function parseCSV(csvText: string): Array<Record<string, string>> {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) throw new Error('CSV must have headers and at least one data row');
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    data.push(row);
  }
  
  return data;
}

export function registerCampaignRoutes(app: Express): void {
  // Get organization campaigns
  app.get("/api/organizations/:orgId/campaigns", authenticateToken, async (req, res) => {
    try {
      const orgId = parseInt(req.params.orgId);
      const user = req.user as { organizationId: number };

      if (user.organizationId !== orgId && req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const campaigns = await storage.getCampaignsByOrganization(orgId);
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  // Get single campaign by ID
  app.get("/api/campaigns/:id", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      const campaign = await storage.getCampaign(campaignId);
      
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      res.json(campaign);
    } catch (error) {
      console.error("Error fetching campaign:", error);
      res.status(500).json({ message: "Failed to fetch campaign" });
    }
  });

  // Update campaign
  app.put("/api/campaigns/:id", authenticateToken, async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      const user = req.user as { organizationId: number };
      const updates = req.body;

      // Verify user owns the campaign
      const existingCampaign = await storage.getCampaign(campaignId);
      if (!existingCampaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      if (existingCampaign.organizationId !== user.organizationId && req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      // Prevent removing donation page (campaigns must always have a parent)
      if (updates.donationPageId === null || updates.donationPageId === undefined) {
        delete updates.donationPageId; // Don't allow changing it to null
      }

      // If changing donation page, validate the new one exists and belongs to same org
      if (updates.donationPageId && updates.donationPageId !== existingCampaign.donationPageId) {
        const newDonationPage = await storage.getDonationPage(updates.donationPageId);
        if (!newDonationPage) {
          return res.status(404).json({ message: "Donation page not found" });
        }
        if (newDonationPage.organizationId !== existingCampaign.organizationId && req.user.role !== 'super_admin') {
          return res.status(403).json({ message: "Cannot move campaign to donation page from another organization" });
        }
      }

      const updatedCampaign = await storage.updateCampaign(campaignId, updates);
      res.json(updatedCampaign);
    } catch (error) {
      console.error("Error updating campaign:", error);
      res.status(500).json({ message: "Failed to update campaign" });
    }
  });

  // Get campaign by slug (public endpoint with organization data)
  app.get("/api/campaigns/by-slug/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const result = await storage.getCampaignBySlugWithOrganization(slug);
      
      if (!result) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching campaign by slug:", error);
      res.status(500).json({ message: "Failed to fetch campaign" });
    }
  });

  // Get recent supporters for a campaign (public endpoint)
  app.get("/api/campaigns/:campaignId/recent-supporters", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      const limit = parseInt(req.query.limit as string) || 5;
      
      // Get recent donations for this campaign
      const donations = await storage.getDonationsByCampaign(campaignId);
      
      // Sort by date (most recent first) and limit
      const recentDonations = donations
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
      
      // Format for public display (respect anonymity)
      const supporters = recentDonations.map((donation) => {
        const isAnonymous = donation.isAnonymous;
        const donorName = isAnonymous 
          ? "Anonymous" 
          : `${donation.donorFirstName || ''} ${donation.donorLastName || ''}`.trim() || "Anonymous";
        
        return {
          id: donation.id,
          name: donorName,
          amount: parseFloat(donation.amount),
          donatedAt: donation.createdAt,
          isAnonymous
        };
      });
      
      res.json(supporters);
    } catch (error) {
      console.error("Error fetching recent supporters:", error);
      res.status(500).json({ message: "Failed to fetch recent supporters" });
    }
  });

  // Create new campaign
  app.post("/api/organizations/:orgId/campaigns", authenticateToken, async (req, res) => {
    try {
      const orgId = parseInt(req.params.orgId);
      const user = req.user as { organizationId: number };
      const campaignData = req.body;

      if (user.organizationId !== orgId && req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      // REQUIRED: Campaigns must belong to a donation page
      if (!campaignData.donationPageId) {
        return res.status(400).json({ 
          message: "Donation page is required. Campaigns must belong to a donation page." 
        });
      }

      // Validate donation page exists and belongs to the organization
      const donationPage = await storage.getDonationPage(campaignData.donationPageId);
      if (!donationPage) {
        return res.status(404).json({ message: "Donation page not found" });
      }
      
      // Security check: Ensure donation page belongs to the same organization
      if (donationPage.organizationId !== orgId && req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Cannot link to donation page from another organization" });
      }
      
      // Inherit donation page's surchargeOption
      let finalCampaignData = { ...campaignData };
      if (donationPage.surchargeOption) {
        finalCampaignData.surchargeOption = donationPage.surchargeOption;
      }

      // Transform data to match schema expectations
      const transformedData = {
        ...finalCampaignData,
        organizationId: orgId,
        // Convert string dates to Date objects if provided
        startDate: finalCampaignData.startDate ? new Date(finalCampaignData.startDate) : null,
        endDate: finalCampaignData.endDate ? new Date(finalCampaignData.endDate) : null,
        // Convert boolean embedCode to empty string if false/null, otherwise keep as is
        embedCode: finalCampaignData.embedCode === false || finalCampaignData.embedCode === null 
          ? '' 
          : String(finalCampaignData.embedCode || '')
      };

      // Validate campaign data
      const validatedData = insertCampaignSchema.parse(transformedData);

      const newCampaign = await storage.createCampaign(validatedData);
      res.status(201).json(newCampaign);
    } catch (error) {
      console.error("Error creating campaign:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error",
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create campaign" });
    }
  });

  // Clone campaign
  app.post("/api/campaigns/:campaignId/clone", authenticateToken, async (req, res) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      const user = req.user as { organizationId: number };

      // Verify user owns the campaign
      const existingCampaign = await storage.getCampaign(campaignId);
      if (!existingCampaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      if (existingCampaign.organizationId !== user.organizationId && req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const clonedCampaign = await storage.cloneCampaign(campaignId);
      res.status(201).json(clonedCampaign);
    } catch (error) {
      console.error("Error cloning campaign:", error);
      res.status(500).json({ message: "Failed to clone campaign" });
    }
  });

  // Smart clone campaign with enhanced options
  app.post("/api/campaigns/:campaignId/smart-clone", authenticateToken, async (req, res) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      const user = req.user as { organizationId: number };

      // Verify user owns the campaign
      const existingCampaign = await storage.getCampaign(campaignId);
      if (!existingCampaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      if (existingCampaign.organizationId !== user.organizationId && req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const smartCloneSchema = z.object({
        suffix: z.string().optional(),
        preserveGoal: z.boolean().default(true),
        preserveDates: z.boolean().default(false),
        applyTemplate: z.string().optional(),
        resetProgress: z.boolean().default(true),
      });

      const options = smartCloneSchema.parse(req.body);
      const clonedCampaign = await storage.smartCloneCampaign(campaignId, options);
      
      res.status(201).json(clonedCampaign);
    } catch (error) {
      console.error("Error smart cloning campaign:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid clone options", details: error.errors });
      }
      res.status(500).json({ message: "Failed to clone campaign" });
    }
  });

  // Bulk create campaigns from CSV
  app.post("/api/organizations/:orgId/campaigns/bulk-import", 
    authenticateToken, 
    upload.single('csvFile'), 
    async (req, res) => {
    try {
      const orgId = parseInt(req.params.orgId);
      const user = req.user as { organizationId: number };
      
      // Verify user has access to this organization
      if (user.organizationId !== orgId && req.user.role !== 'super_admin' && req.user.role !== 'staff_member') {
        return res.status(403).json({ error: "Access denied" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "CSV file is required" });
      }

      // Parse CSV data
      const csvText = req.file.buffer.toString('utf-8');
      const csvData = parseCSV(csvText);

      // Process bulk creation
      const result = await storage.bulkCreateCampaigns(orgId, csvData);
      
      res.status(201).json({
        message: `Successfully created ${result.created.length} campaigns`,
        created: result.created,
        errors: result.errors,
        summary: {
          total: csvData.length,
          successful: result.created.length,
          failed: result.errors.length
        }
      });
    } catch (error) {
      console.error("Error bulk importing campaigns:", error);
      res.status(500).json({ error: "Failed to import campaigns" });
    }
  });

  // Get CSV template for campaigns
  app.get("/api/campaigns/csv-template", authenticateToken, async (req, res) => {
    try {
      const templateData = [
        {
          name: "Example Campaign",
          slug: "example-campaign",
          description: "This is an example campaign description",
          goal: "10000",
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          template: "sponsor-child",
          donationPageId: "",
          isActive: "true"
        }
      ];

      const parser = new Parser();
      const csv = parser.parse(templateData);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="campaigns-template.csv"');
      res.send(csv);
    } catch (error) {
      console.error("Error generating CSV template:", error);
      res.status(500).json({ error: "Failed to generate template" });
    }
  });

  // Generate embed code
  app.post("/api/campaigns/:campaignId/embed-code", authenticateToken, async (req, res) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      const user = req.user as { organizationId: number };

      // Verify user owns the campaign
      const existingCampaign = await storage.getCampaign(campaignId);
      if (!existingCampaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      if (existingCampaign.organizationId !== user.organizationId && req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const embedCode = await storage.generateEmbedCode(campaignId);
      res.json({ embedCode });
    } catch (error) {
      console.error("Error generating embed code:", error);
      res.status(500).json({ message: "Failed to generate embed code" });
    }
  });

  // Generate QR code
  app.post("/api/campaigns/:campaignId/qr-code", authenticateToken, async (req, res) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      const user = req.user as { organizationId: number };

      // Verify user owns the campaign
      const existingCampaign = await storage.getCampaign(campaignId);
      if (!existingCampaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      if (existingCampaign.organizationId !== user.organizationId && req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const qrCodeUrl = await storage.generateQRCode(campaignId);
      res.json({ qrCodeUrl });
    } catch (error) {
      console.error("Error generating QR code:", error);
      res.status(500).json({ message: "Failed to generate QR code" });
    }
  });

  // Validate campaign for deletion
  app.get("/api/campaigns/:campaignId/deletion-validation", authenticateToken, async (req, res) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      const user = req.user as { organizationId: number };

      // Verify user owns the campaign
      const existingCampaign = await storage.getCampaign(campaignId);
      if (!existingCampaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      if (existingCampaign.organizationId !== user.organizationId && req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      // Check if campaign has donations
      const donations = await storage.getDonationsByCampaign(campaignId);
      const canDelete = donations.length === 0;

      res.json({
        canDelete,
        donationCount: donations.length,
        message: canDelete 
          ? "Campaign can be safely deleted" 
          : `Campaign has ${donations.length} donations and cannot be deleted`
      });
    } catch (error) {
      console.error("Error validating campaign deletion:", error);
      res.status(500).json({ message: "Failed to validate deletion" });
    }
  });

  // Archive campaign
  app.patch("/api/campaigns/:campaignId/archive", authenticateToken, async (req, res) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      const user = req.user as { organizationId: number };

      // Verify user owns the campaign
      const existingCampaign = await storage.getCampaign(campaignId);
      if (!existingCampaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      if (existingCampaign.organizationId !== user.organizationId && req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedCampaign = await storage.updateCampaign(campaignId, {
        status: 'archived',
        archivedAt: new Date()
      });

      res.json(updatedCampaign);
    } catch (error) {
      console.error("Error archiving campaign:", error);
      res.status(500).json({ message: "Failed to archive campaign" });
    }
  });

  // Delete campaign
  app.delete("/api/campaigns/:campaignId", authenticateToken, async (req, res) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      const user = req.user as { organizationId: number };

      // Verify user owns the campaign
      const existingCampaign = await storage.getCampaign(campaignId);
      if (!existingCampaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      if (existingCampaign.organizationId !== user.organizationId && req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      // Check if campaign has any revenue (money) - prevent deletion if it does
      const donations = await storage.getDonationsByCampaign(campaignId);
      
      // Calculate total revenue from successful donations
      const totalRevenue = donations
        .filter(d => d.status === 'completed' || d.status === 'succeeded')
        .reduce((sum, d) => sum + parseFloat(d.amount.toString()), 0);
      
      if (totalRevenue > 0) {
        return res.status(400).json({ 
          message: `Cannot delete campaign with $${totalRevenue.toFixed(2)} in processed donations. Campaigns with transaction history must be archived for record-keeping.`,
          revenue: totalRevenue
        });
      }

      // Since there's no deleteCampaign method shown, we'll archive instead
      const updatedCampaign = await storage.updateCampaign(campaignId, {
        status: 'deleted',
        deletedAt: new Date()
      });

      res.json({ message: "Campaign deleted successfully" });
    } catch (error) {
      console.error("Error deleting campaign:", error);
      res.status(500).json({ message: "Failed to delete campaign" });
    }
  });

  // ==================== Campaign Category Routes ====================
  
  // Get all categories for a campaign
  app.get("/api/campaigns/:campaignId/categories", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      const categories = await storage.getCategoriesByCampaign(campaignId);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching campaign categories:", error);
      res.status(500).json({ message: "Failed to fetch campaign categories" });
    }
  });

  // Create a new category for a campaign
  app.post("/api/campaigns/:campaignId/categories", authenticateToken, async (req, res) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      const user = req.user as { organizationId: number };

      // Verify user owns the campaign
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      if (campaign.organizationId !== user.organizationId && req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      // Validate and create category
      const categoryData = insertCampaignCategorySchema.parse({
        ...req.body,
        campaignId,
      });

      const newCategory = await storage.createCategory(categoryData);
      res.status(201).json(newCategory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid category data", errors: error.errors });
      }
      console.error("Error creating campaign category:", error);
      res.status(500).json({ message: "Failed to create campaign category" });
    }
  });

  // Update a category
  app.put("/api/campaigns/:campaignId/categories/:categoryId", authenticateToken, async (req, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      const campaignId = parseInt(req.params.campaignId);
      const user = req.user as { organizationId: number };

      // Verify user owns the campaign
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      if (campaign.organizationId !== user.organizationId && req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      // Verify category belongs to campaign
      const category = await storage.getCategory(categoryId);
      if (!category || category.campaignId !== campaignId) {
        return res.status(404).json({ message: "Category not found" });
      }

      const updatedCategory = await storage.updateCategory(categoryId, req.body);
      res.json(updatedCategory);
    } catch (error) {
      console.error("Error updating campaign category:", error);
      res.status(500).json({ message: "Failed to update campaign category" });
    }
  });

  // Delete a category
  app.delete("/api/campaigns/:campaignId/categories/:categoryId", authenticateToken, async (req, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      const campaignId = parseInt(req.params.campaignId);
      const user = req.user as { organizationId: number };

      // Verify user owns the campaign
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      if (campaign.organizationId !== user.organizationId && req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      // Verify category belongs to campaign
      const category = await storage.getCategory(categoryId);
      if (!category || category.campaignId !== campaignId) {
        return res.status(404).json({ message: "Category not found" });
      }

      await storage.deleteCategory(categoryId);
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error("Error deleting campaign category:", error);
      res.status(500).json({ message: "Failed to delete campaign category" });
    }
  });
}