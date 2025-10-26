import { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { authenticateToken } from "../middleware";
import { insertDonationPageSchema } from "@shared/schema";
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

export function registerDonationPageRoutes(app: Express) {
  // Get donation pages by organization
  app.get("/api/organizations/:orgId/donation-pages", authenticateToken, async (req: Request, res: Response) => {
    try {
      const orgId = parseInt(req.params.orgId);
      const user = req.user;
      
      // Verify user has access to this organization
      if (user?.organizationId !== orgId && user?.role !== 'super_admin' && user?.role !== 'staff_member') {
        return res.status(403).json({ error: "Access denied" });
      }

      const donationPages = await storage.getDonationPagesByOrganization(orgId);
      res.json(donationPages);
    } catch (error) {
      console.error("Error fetching donation pages:", error);
      res.status(500).json({ error: "Failed to fetch donation pages" });
    }
  });

  // Get donation page by ID
  app.get("/api/donation-pages/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const donationPage = await storage.getDonationPage(id);
      
      if (!donationPage) {
        return res.status(404).json({ error: "Donation page not found" });
      }

      const user = req.user;
      
      // Verify user has access to this organization
      if (user?.organizationId !== donationPage.organizationId && user?.role !== 'super_admin' && user?.role !== 'staff_member') {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(donationPage);
    } catch (error) {
      console.error("Error fetching donation page:", error);
      res.status(500).json({ error: "Failed to fetch donation page" });
    }
  });

  // Get donation page by slug (public endpoint)
  app.get("/api/organizations/:orgId/donation-pages/by-slug/:slug", async (req: Request, res: Response) => {
    try {
      const orgId = parseInt(req.params.orgId);
      const slug = req.params.slug;
      
      const donationPage = await storage.getDonationPageBySlug(orgId, slug);
      
      if (!donationPage || !donationPage.isActive) {
        return res.status(404).json({ error: "Donation page not found" });
      }

      // Get campaigns for this donation page
      const campaigns = await storage.getCampaignsByDonationPage(donationPage.id);
      
      // Map database columns to frontend property names
      const mappedCampaigns = campaigns
        .filter(c => c.isActive)
        .map(c => ({
          ...c,
          currentAmount: Number(c.raised) || 0,
          goalAmount: Number(c.goal) || 0
        }));
      
      console.log('📊 Campaigns data:', mappedCampaigns.map(c => ({
        id: c.id,
        name: c.name,
        raised: c.raised,
        goal: c.goal,
        currentAmount: c.currentAmount,
        goalAmount: c.goalAmount
      })));
      
      res.json({
        donationPage,
        campaigns: mappedCampaigns
      });
    } catch (error) {
      console.error("Error fetching donation page by slug:", error);
      res.status(500).json({ error: "Failed to fetch donation page" });
    }
  });

  // Get recent supporters for a donation page (public endpoint)
  app.get("/api/donation-pages/:donationPageId/recent-supporters", async (req: Request, res: Response) => {
    try {
      const donationPageId = parseInt(req.params.donationPageId);
      const limit = parseInt(req.query.limit as string) || 10;
      
      // Get all campaigns for this donation page
      const campaigns = await storage.getCampaignsByDonationPage(donationPageId);
      const campaignIds = campaigns.map(c => c.id);
      
      if (campaignIds.length === 0) {
        return res.json([]);
      }
      
      // Get donations from all campaigns under this donation page
      const allDonations = [];
      for (const campaignId of campaignIds) {
        const donations = await storage.getDonationsByCampaign(campaignId);
        allDonations.push(...donations);
      }
      
      // Sort by date (most recent first) and limit
      const recentDonations = allDonations
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

  // Create donation page
  app.post("/api/organizations/:orgId/donation-pages", authenticateToken, async (req: Request, res: Response) => {
    try {
      const orgId = parseInt(req.params.orgId);
      const user = req.user;
      
      // Verify user has access to this organization
      if (user?.organizationId !== orgId && user?.role !== 'super_admin' && user?.role !== 'staff_member') {
        return res.status(403).json({ error: "Access denied" });
      }

      const donationPageData = insertDonationPageSchema.parse({
        ...req.body,
        organizationId: orgId
      });

      // Check if slug is unique for this organization
      const existingPage = await storage.getDonationPageBySlug(orgId, donationPageData.slug);
      if (existingPage) {
        return res.status(400).json({ error: "A donation page with this slug already exists" });
      }

      const donationPage = await storage.createDonationPage(donationPageData);
      res.status(201).json(donationPage);
    } catch (error) {
      console.error("Error creating donation page:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create donation page" });
    }
  });

  // Update donation page (PATCH route)
  app.patch("/api/donation-pages/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const donationPage = await storage.getDonationPage(id);
      
      if (!donationPage) {
        return res.status(404).json({ error: "Donation page not found" });
      }

      const user = req.user;
      
      // Verify user has access to this organization
      if (user?.organizationId !== donationPage.organizationId && user?.role !== 'super_admin' && user?.role !== 'staff_member') {
        return res.status(403).json({ error: "Access denied" });
      }

      // If slug is being updated, check for uniqueness
      if (req.body.slug && req.body.slug !== donationPage.slug) {
        const existingPage = await storage.getDonationPageBySlug(donationPage.organizationId, req.body.slug);
        if (existingPage) {
          return res.status(400).json({ error: "A donation page with this slug already exists" });
        }
      }

      const updatedDonationPage = await storage.updateDonationPage(id, req.body);
      res.json(updatedDonationPage);
    } catch (error) {
      console.error("Error updating donation page:", error);
      res.status(500).json({ error: "Failed to update donation page" });
    }
  });

  // Update donation page (PUT route with org context)
  app.put("/api/organizations/:orgId/donation-pages/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const orgId = parseInt(req.params.orgId);
      const donationPage = await storage.getDonationPage(id);
      
      if (!donationPage) {
        return res.status(404).json({ error: "Donation page not found" });
      }

      const user = req.user;
      
      // Verify user has access to this organization
      if (user?.organizationId !== orgId && user?.role !== 'super_admin' && user?.role !== 'staff_member') {
        return res.status(403).json({ error: "Access denied" });
      }

      // Verify donation page belongs to organization
      if (donationPage.organizationId !== orgId) {
        return res.status(403).json({ error: "Donation page does not belong to this organization" });
      }

      // If slug is being updated, check for uniqueness
      if (req.body.slug && req.body.slug !== donationPage.slug) {
        const existingPage = await storage.getDonationPageBySlug(orgId, req.body.slug);
        if (existingPage) {
          return res.status(400).json({ error: "A donation page with this slug already exists" });
        }
      }

      const updatedDonationPage = await storage.updateDonationPage(id, req.body);
      res.json(updatedDonationPage);
    } catch (error) {
      console.error("Error updating donation page:", error);
      res.status(500).json({ error: "Failed to update donation page" });
    }
  });

  // Delete donation page
  app.delete("/api/donation-pages/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const donationPage = await storage.getDonationPage(id);
      
      if (!donationPage) {
        return res.status(404).json({ error: "Donation page not found" });
      }

      const user = req.user;
      
      // Verify user has access to this organization
      if (user?.organizationId !== donationPage.organizationId && user?.role !== 'super_admin' && user?.role !== 'staff_member') {
        return res.status(403).json({ error: "Access denied" });
      }

      // Check if there are campaigns assigned to this page
      const campaigns = await storage.getCampaignsByDonationPage(id);
      if (campaigns.length > 0) {
        return res.status(400).json({ 
          error: `Cannot delete donation page with ${campaigns.length} campaign${campaigns.length === 1 ? '' : 's'}. Please delete all campaigns first.`,
          campaignCount: campaigns.length
        });
      }

      await storage.deleteDonationPage(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting donation page:", error);
      res.status(500).json({ error: "Failed to delete donation page" });
    }
  });

  // Clone donation page
  app.post("/api/donation-pages/:id/clone", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const donationPage = await storage.getDonationPage(id);
      
      if (!donationPage) {
        return res.status(404).json({ error: "Donation page not found" });
      }

      const user = req.user;
      
      // Verify user has access to this organization
      if (user?.organizationId !== donationPage.organizationId && user?.role !== 'super_admin' && user?.role !== 'staff_member') {
        return res.status(403).json({ error: "Access denied" });
      }

      const cloneOptionsSchema = z.object({
        suffix: z.string().optional(),
        cloneCampaigns: z.boolean().default(false)
      });

      const options = cloneOptionsSchema.parse(req.body);
      const clonedPage = await storage.cloneDonationPage(id, options);
      
      res.status(201).json(clonedPage);
    } catch (error) {
      console.error("Error cloning donation page:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid clone options", details: error.errors });
      }
      res.status(500).json({ error: "Failed to clone donation page" });
    }
  });

  // Smart clone donation page with enhanced options
  app.post("/api/donation-pages/:id/smart-clone", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const donationPage = await storage.getDonationPage(id);
      
      if (!donationPage) {
        return res.status(404).json({ error: "Donation page not found" });
      }

      const user = req.user;
      
      // Verify user has access to this organization
      if (user?.organizationId !== donationPage.organizationId && user?.role !== 'super_admin' && user?.role !== 'staff_member') {
        return res.status(403).json({ error: "Access denied" });
      }

      const smartCloneSchema = z.object({
        suffix: z.string().optional(),
        cloneCampaigns: z.boolean().default(false),
        applyTemplate: z.string().optional(),
        preserveCustomUrl: z.boolean().default(false),
        preserveColors: z.boolean().default(true),
        preserveMedia: z.boolean().default(true),
      });

      const options = smartCloneSchema.parse(req.body);
      const clonedPage = await storage.smartCloneDonationPage(id, options);
      
      res.status(201).json(clonedPage);
    } catch (error) {
      console.error("Error smart cloning donation page:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid clone options", details: error.errors });
      }
      res.status(500).json({ error: "Failed to clone donation page" });
    }
  });

  // Bulk create donation pages from CSV
  app.post("/api/organizations/:orgId/donation-pages/bulk-import", 
    authenticateToken, 
    upload.single('csvFile'), 
    async (req: Request, res: Response) => {
    try {
      const orgId = parseInt(req.params.orgId);
      const user = req.user;
      
      // Verify user has access to this organization
      if (user?.organizationId !== orgId && user?.role !== 'super_admin' && user?.role !== 'staff_member') {
        return res.status(403).json({ error: "Access denied" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "CSV file is required" });
      }

      // Parse CSV data
      const csvText = req.file.buffer.toString('utf-8');
      const csvData = parseCSV(csvText);

      // Process bulk creation
      const result = await storage.bulkCreateDonationPages(orgId, csvData);
      
      res.status(201).json({
        message: `Successfully created ${result.created.length} donation pages`,
        created: result.created,
        errors: result.errors,
        summary: {
          total: csvData.length,
          successful: result.created.length,
          failed: result.errors.length
        }
      });
    } catch (error) {
      console.error("Error bulk importing donation pages:", error);
      res.status(500).json({ error: "Failed to import donation pages" });
    }
  });

  // Get CSV template for donation pages
  app.get("/api/donation-pages/csv-template", authenticateToken, async (req: Request, res: Response) => {
    try {
      const templateData = [
        {
          name: "Example Donation Page",
          slug: "example-page",
          description: "This is an example donation page description",
          primaryColor: "#0d72b9",
          secondaryColor: "#26b578",
          template: "sponsor-child",
          logoUrl: "https://example.com/logo.png",
          headerImageUrl: "https://example.com/header.jpg",
          videoUrl: "https://youtube.com/watch?v=example",
          customUrl: "",
          subdomain: "",
          isActive: "true"
        }
      ];

      const parser = new Parser();
      const csv = parser.parse(templateData);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="donation-pages-template.csv"');
      res.send(csv);
    } catch (error) {
      console.error("Error generating CSV template:", error);
      res.status(500).json({ error: "Failed to generate template" });
    }
  });

  // Assign campaign to donation page
  app.patch("/api/campaigns/:campaignId/assign-page", authenticateToken, async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      const { donationPageId } = req.body;
      
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      const user = req.user;
      
      // Verify user has access to this organization
      if (user?.organizationId !== campaign.organizationId && user?.role !== 'super_admin' && user?.role !== 'staff_member') {
        return res.status(403).json({ error: "Access denied" });
      }

      // If donationPageId is provided, verify it belongs to the same organization
      if (donationPageId) {
        const donationPage = await storage.getDonationPage(donationPageId);
        if (!donationPage || donationPage.organizationId !== campaign.organizationId) {
          return res.status(400).json({ error: "Invalid donation page" });
        }
      }

      const updatedCampaign = await storage.assignCampaignToPage(campaignId, donationPageId || null);
      res.json(updatedCampaign);
    } catch (error) {
      console.error("Error assigning campaign to page:", error);
      res.status(500).json({ error: "Failed to assign campaign to page" });
    }
  });

  // Get campaigns for donation page
  app.get("/api/donation-pages/:id/campaigns", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const donationPage = await storage.getDonationPage(id);
      
      if (!donationPage) {
        return res.status(404).json({ error: "Donation page not found" });
      }

      const user = req.user;
      
      // Verify user has access to this organization
      if (user?.organizationId !== donationPage.organizationId && user?.role !== 'super_admin' && user?.role !== 'staff_member') {
        return res.status(403).json({ error: "Access denied" });
      }

      const campaigns = await storage.getCampaignsByDonationPage(id);
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching campaigns for donation page:", error);
      res.status(500).json({ error: "Failed to fetch campaigns" });
    }
  });

  // PUBLIC ROUTES - No authentication required

  // Get donation page by slug (public)
  app.get("/api/donation-pages/by-slug/:slug", async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      
      const donationPage = await storage.getDonationPageBySlugGlobal(slug);
      if (!donationPage) {
        return res.status(404).json({ error: "Donation page not found" });
      }

      // Only return active donation pages for public access
      if (!donationPage.isActive) {
        return res.status(404).json({ error: "Donation page not found" });
      }

      // Also get the associated campaigns
      const campaigns = await storage.getCampaignsByDonationPage(donationPage.id);
      
      console.log('🔍 Raw campaigns from DB:', campaigns.map(c => ({ id: c.id, raised: c.raised, goal: c.goal })));

      // Map database columns to frontend property names
      const mappedCampaigns = campaigns
        .filter(campaign => campaign.isActive)
        .map(c => ({
          ...c,
          currentAmount: Number(c.raised) || 0,
          goalAmount: Number(c.goal) || 0
        }));
        
      console.log('📊 Mapped campaigns for frontend:', mappedCampaigns.map(c => ({ 
        id: c.id, currentAmount: c.currentAmount, goalAmount: c.goalAmount 
      })));

      res.json({
        donationPage,
        campaigns: mappedCampaigns,
      });
    } catch (error) {
      console.error("Error fetching donation page by slug:", error);
      res.status(500).json({ error: "Failed to fetch donation page by slug" });
    }
  });

  // Get donation page by custom URL (public endpoint)
  app.get("/api/donation-pages/by-custom-url/:customUrl", async (req: Request, res: Response) => {
    try {
      const { customUrl } = req.params;
      
      const donationPage = await storage.getDonationPageByCustomUrl(customUrl);
      if (!donationPage || !donationPage.isActive) {
        return res.status(404).json({ error: "Donation page not found" });
      }

      // Get associated campaigns
      const campaigns = await storage.getCampaignsByDonationPage(donationPage.id);

      // Map database columns to frontend property names
      const mappedCampaigns = campaigns
        .filter(campaign => campaign.isActive)
        .map(c => ({
          ...c,
          currentAmount: Number(c.raised) || 0,
          goalAmount: Number(c.goal) || 0
        }));

      res.json({
        donationPage,
        campaigns: mappedCampaigns,
      });
    } catch (error) {
      console.error("Error fetching donation page by custom URL:", error);
      res.status(500).json({ error: "Failed to fetch donation page" });
    }
  });

  // Get donation page by subdomain (public endpoint)
  app.get("/api/donation-pages/by-subdomain/:subdomain", async (req: Request, res: Response) => {
    try {
      const { subdomain } = req.params;
      
      const donationPage = await storage.getDonationPageBySubdomain(subdomain);
      if (!donationPage || !donationPage.isActive) {
        return res.status(404).json({ error: "Donation page not found" });
      }

      // Get associated campaigns
      const campaigns = await storage.getCampaignsByDonationPage(donationPage.id);

      // Map database columns to frontend property names
      const mappedCampaigns = campaigns
        .filter(campaign => campaign.isActive)
        .map(c => ({
          ...c,
          currentAmount: Number(c.raised) || 0,
          goalAmount: Number(c.goal) || 0
        }));

      res.json({
        donationPage,
        campaigns: mappedCampaigns,
      });
    } catch (error) {
      console.error("Error fetching donation page by subdomain:", error);
      res.status(500).json({ error: "Failed to fetch donation page" });
    }
  });

  // Check custom URL availability (authenticated endpoint)
  app.get("/api/donation-pages/check-custom-url/:customUrl", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { customUrl } = req.params;
      const { excludePageId } = req.query;

      const isAvailable = await storage.donationPages.isCustomUrlAvailable(
        customUrl,
        excludePageId ? Number(excludePageId) : undefined
      );

      res.json({ available: isAvailable });
    } catch (error) {
      console.error("Error checking custom URL availability:", error);
      res.status(500).json({ error: "Failed to check URL availability" });
    }
  });

  // Check subdomain availability (authenticated endpoint)
  app.get("/api/donation-pages/check-subdomain/:subdomain", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { subdomain } = req.params;
      const { excludePageId } = req.query;

      const isAvailable = await storage.donationPages.isSubdomainAvailable(
        subdomain,
        excludePageId ? Number(excludePageId) : undefined
      );

      res.json({ available: isAvailable });
    } catch (error) {
      console.error("Error checking subdomain availability:", error);
      res.status(500).json({ error: "Failed to check subdomain availability" });
    }
  });

  // ANALYTICS & REPORTING ENDPOINTS

  // Get donation page analytics summary
  app.get("/api/donation-pages/:id/analytics", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { timeRange = '30d' } = req.query;
      
      const donationPage = await storage.getDonationPage(id);
      if (!donationPage) {
        return res.status(404).json({ error: "Donation page not found" });
      }

      const user = req.user;
      if (user?.organizationId !== donationPage.organizationId && user?.role !== 'super_admin' && user?.role !== 'staff_member') {
        return res.status(403).json({ error: "Access denied" });
      }

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      switch (timeRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      const analytics = await storage.getDonationPageAnalytics(id, startDate, endDate);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching donation page analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Get campaign analytics within a donation page
  app.get("/api/donation-pages/:id/campaigns/:campaignId/analytics", authenticateToken, async (req: Request, res: Response) => {
    try {
      const pageId = parseInt(req.params.id);
      const campaignId = parseInt(req.params.campaignId);
      const { timeRange = '30d' } = req.query;
      
      const donationPage = await storage.getDonationPage(pageId);
      if (!donationPage) {
        return res.status(404).json({ error: "Donation page not found" });
      }

      const user = req.user;
      if (user?.organizationId !== donationPage.organizationId && user?.role !== 'super_admin' && user?.role !== 'staff_member') {
        return res.status(403).json({ error: "Access denied" });
      }

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      switch (timeRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      const analytics = await storage.getCampaignAnalytics(campaignId, startDate, endDate);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching campaign analytics:", error);
      res.status(500).json({ error: "Failed to fetch campaign analytics" });
    }
  });

  // Export donation page data as CSV
  app.get("/api/donation-pages/:id/export", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { format = 'csv', timeRange = '30d', includeColumns } = req.query;
      
      const donationPage = await storage.getDonationPage(id);
      if (!donationPage) {
        return res.status(404).json({ error: "Donation page not found" });
      }

      const user = req.user;
      if (user?.organizationId !== donationPage.organizationId && user?.role !== 'super_admin' && user?.role !== 'staff_member') {
        return res.status(403).json({ error: "Access denied" });
      }

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      switch (timeRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        case 'all':
          startDate.setFullYear(2020); // Far back date
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      const donations = await storage.getDonationPageDonations(id, startDate, endDate);
      
      // Define columns to include
      const defaultColumns = ['date', 'amount', 'donor_name', 'donor_email', 'campaign', 'payment_method', 'status'];
      const columnsToInclude = includeColumns ? 
        (typeof includeColumns === 'string' ? includeColumns.split(',') : defaultColumns) :
        defaultColumns;

      // Format data for export
      const exportData = donations.map(donation => {
        const row: any = {};
        
        if (columnsToInclude.includes('date')) {
          row.date = new Date(donation.createdAt).toLocaleDateString();
        }
        if (columnsToInclude.includes('amount')) {
          row.amount = `$${donation.amount.toFixed(2)}`;
        }
        if (columnsToInclude.includes('donor_name')) {
          row.donor_name = `${donation.donorFirstName || ''} ${donation.donorLastName || ''}`.trim();
        }
        if (columnsToInclude.includes('donor_email')) {
          row.donor_email = donation.donorEmail;
        }
        if (columnsToInclude.includes('campaign')) {
          row.campaign = donation.campaignName || 'General Fund';
        }
        if (columnsToInclude.includes('payment_method')) {
          row.payment_method = donation.paymentMethod;
        }
        if (columnsToInclude.includes('status')) {
          row.status = donation.status;
        }
        if (columnsToInclude.includes('recurring')) {
          row.recurring = donation.isRecurring ? 'Yes' : 'No';
        }
        if (columnsToInclude.includes('dedication_type')) {
          row.dedication_type = donation.dedicationType || '';
        }
        if (columnsToInclude.includes('dedication_name')) {
          row.dedication_name = donation.dedicationName || '';
        }
        if (columnsToInclude.includes('source')) {
          row.source = donation.source || '';
        }
        
        return row;
      });

      if (format === 'csv') {
        const parser = new Parser();
        const csv = parser.parse(exportData);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="donations-${donationPage.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csv);
      } else {
        res.json(exportData);
      }
    } catch (error) {
      console.error("Error exporting donation data:", error);
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  // Get organization-wide analytics (all donation pages)
  app.get("/api/organizations/:orgId/analytics", authenticateToken, async (req: Request, res: Response) => {
    try {
      const orgId = parseInt(req.params.orgId);
      const { timeRange = '30d' } = req.query;
      
      const user = req.user;
      if (user?.organizationId !== orgId && user?.role !== 'super_admin' && user?.role !== 'staff_member') {
        return res.status(403).json({ error: "Access denied" });
      }

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      switch (timeRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      const analytics = await storage.getOrganizationAnalytics(orgId, startDate, endDate);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching organization analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Marketing & Sharing Tools

  // Generate QR code for donation page
  app.post("/api/donation-pages/:id/qr-code", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const donationPage = await storage.getDonationPage(id);
      
      if (!donationPage) {
        return res.status(404).json({ error: "Donation page not found" });
      }

      const user = req.user;
      
      // Verify user has access to this organization
      if (user?.organizationId !== donationPage.organizationId && user?.role !== 'super_admin' && user?.role !== 'staff_member') {
        return res.status(403).json({ error: "Access denied" });
      }

      const qrCodeUrl = await storage.generateQRCode(id);
      res.json({ qrCodeUrl });
    } catch (error) {
      console.error("Error generating QR code:", error);
      res.status(500).json({ error: "Failed to generate QR code" });
    }
  });

  // Get sharing data for donation page
  app.get("/api/donation-pages/:id/sharing", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const donationPage = await storage.getDonationPage(id);
      
      if (!donationPage) {
        return res.status(404).json({ error: "Donation page not found" });
      }

      const user = req.user;
      
      // Verify user has access to this organization
      if (user?.organizationId !== donationPage.organizationId && user?.role !== 'super_admin' && user?.role !== 'staff_member') {
        return res.status(403).json({ error: "Access denied" });
      }

      const sharingData = await storage.generateSharingData(id);
      res.json(sharingData);
    } catch (error) {
      console.error("Error generating sharing data:", error);
      res.status(500).json({ error: "Failed to generate sharing data" });
    }
  });

  // Get sharing data for donation page (public endpoint - no auth required)
  app.get("/api/donation-pages/by-slug/:slug/sharing", async (req: Request, res: Response) => {
    try {
      const slug = req.params.slug;
      const donationPage = await storage.getDonationPageBySlugGlobal(slug);
      
      if (!donationPage) {
        return res.status(404).json({ error: "Donation page not found" });
      }

      const sharingData = await storage.generateSharingData(donationPage.id);
      res.json(sharingData);
    } catch (error) {
      console.error("Error generating sharing data:", error);
      res.status(500).json({ error: "Failed to generate sharing data" });
    }
  });

  // Generate marketing materials (QR code + sharing links) for donation page
  app.post("/api/donation-pages/:id/marketing", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const donationPage = await storage.getDonationPage(id);
      
      if (!donationPage) {
        return res.status(404).json({ error: "Donation page not found" });
      }

      const user = req.user;
      
      // Verify user has access to this organization
      if (user?.organizationId !== donationPage.organizationId && user?.role !== 'super_admin' && user?.role !== 'staff_member') {
        return res.status(403).json({ error: "Access denied" });
      }

      // Generate both QR code and sharing data
      const [qrCodeUrl, sharingData] = await Promise.all([
        storage.generateQRCode(id),
        storage.generateSharingData(id)
      ]);

      res.json({
        qrCodeUrl,
        sharingData,
        message: "Marketing materials generated successfully"
      });
    } catch (error) {
      console.error("Error generating marketing materials:", error);
      res.status(500).json({ error: "Failed to generate marketing materials" });
    }
  });
}