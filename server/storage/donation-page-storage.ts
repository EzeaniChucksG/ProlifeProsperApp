import {
  type DonationPage,
  type InsertDonationPage,
  type Campaign,
  donationPages,
  campaigns,
  donations,
  type Donation,
} from "@shared/schema";
import { db } from "../db";
import { eq, desc, and, ne, gte, lte, sql, count, sum } from "drizzle-orm";
import QRCode from "qrcode";

export class DonationPageStorage {
  async getDonationPagesByOrganization(organizationId: number): Promise<DonationPage[]> {
    return await db
      .select()
      .from(donationPages)
      .where(eq(donationPages.organizationId, organizationId))
      .orderBy(desc(donationPages.createdAt));
  }

  async getDonationPage(id: number): Promise<DonationPage | undefined> {
    const [donationPage] = await db
      .select()
      .from(donationPages)
      .where(eq(donationPages.id, id));
    return donationPage;
  }

  async getDonationPageBySlug(
    organizationId: number,
    slug: string
  ): Promise<DonationPage | undefined> {
    const [donationPage] = await db
      .select()
      .from(donationPages)
      .where(
        and(
          eq(donationPages.organizationId, organizationId),
          eq(donationPages.slug, slug)
        )
      );
    return donationPage;
  }

  async getDonationPageBySlugGlobal(slug: string): Promise<DonationPage | undefined> {
    const [donationPage] = await db
      .select()
      .from(donationPages)
      .where(eq(donationPages.slug, slug));
    return donationPage;
  }

  async createDonationPage(donationPage: InsertDonationPage): Promise<DonationPage> {
    const [newDonationPage] = await db
      .insert(donationPages)
      .values(donationPage)
      .returning();
    return newDonationPage;
  }

  async updateDonationPage(
    id: number,
    updates: Partial<DonationPage>
  ): Promise<DonationPage> {
    const [donationPage] = await db
      .update(donationPages)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(donationPages.id, id))
      .returning();
    return donationPage;
  }

  async deleteDonationPage(id: number): Promise<void> {
    await db.delete(donationPages).where(eq(donationPages.id, id));
  }

  async cloneDonationPage(
    id: number,
    options: { suffix?: string; cloneCampaigns?: boolean }
  ): Promise<DonationPage> {
    const originalPage = await this.getDonationPage(id);
    if (!originalPage) {
      throw new Error("Donation page not found");
    }

    // Create a clone of the donation page
    const clonedPageData: InsertDonationPage = {
      organizationId: originalPage.organizationId,
      name: `${originalPage.name}${options.suffix || " (Copy)"}`,
      slug: `${originalPage.slug}${options.suffix || "-copy"}`,
      description: originalPage.description,
      logoUrl: originalPage.logoUrl,
      primaryColor: originalPage.primaryColor,
      secondaryColor: originalPage.secondaryColor,
      headerImageUrl: originalPage.headerImageUrl,
      videoUrl: originalPage.videoUrl,
      videoType: originalPage.videoType,
      layout: originalPage.layout,
      featuredCampaignIds: originalPage.featuredCampaignIds as any,
      embedAllowedOrigins: originalPage.embedAllowedOrigins as any,
      ogTitle: originalPage.ogTitle,
      ogDescription: originalPage.ogDescription,
      ogImageUrl: originalPage.ogImageUrl,
      defaultFundId: originalPage.defaultFundId,
      isActive: originalPage.isActive,
    };

    const clonedPage = await this.createDonationPage(clonedPageData);

    // If cloneCampaigns is true, clone the associated campaigns
    if (options.cloneCampaigns) {
      const originalCampaigns = await this.getCampaignsByDonationPage(id);
      for (const campaign of originalCampaigns) {
        // Clone campaign logic would go here
        // For now, we'll just reference the existing campaigns
        await this.assignCampaignToPage(campaign.id, clonedPage.id);
      }
    }

    return clonedPage;
  }

  async assignCampaignToPage(
    campaignId: number,
    donationPageId: number | null
  ): Promise<Campaign> {
    const [campaign] = await db
      .update(campaigns)
      .set({ donationPageId, updatedAt: new Date() })
      .where(eq(campaigns.id, campaignId))
      .returning();
    return campaign;
  }

  async getCampaignsByDonationPage(donationPageId: number): Promise<Campaign[]> {
    return await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.donationPageId, donationPageId))
      .orderBy(desc(campaigns.createdAt));
  }

  // Get by custom URL (for custom domain/subdomain access)
  async getDonationPageByCustomUrl(customUrl: string): Promise<DonationPage | undefined> {
    const [donationPage] = await db
      .select()
      .from(donationPages)
      .where(
        and(
          eq(donationPages.customUrl, customUrl),
          eq(donationPages.isActive, true)
        )
      );
    return donationPage;
  }

  // Get by subdomain
  async getDonationPageBySubdomain(subdomain: string): Promise<DonationPage | undefined> {
    const [donationPage] = await db
      .select()
      .from(donationPages)
      .where(
        and(
          eq(donationPages.subdomain, subdomain),
          eq(donationPages.isActive, true)
        )
      );
    return donationPage;
  }

  // Check if custom URL is available
  async isCustomUrlAvailable(customUrl: string, excludePageId?: number): Promise<boolean> {
    const conditions = [eq(donationPages.customUrl, customUrl)];
    if (excludePageId) {
      conditions.push(ne(donationPages.id, excludePageId));
    }

    const existing = await db
      .select({ id: donationPages.id })
      .from(donationPages)
      .where(and(...conditions))
      .limit(1);

    return existing.length === 0;
  }

  // Check if subdomain is available
  async isSubdomainAvailable(subdomain: string, excludePageId?: number): Promise<boolean> {
    const conditions = [eq(donationPages.subdomain, subdomain)];
    if (excludePageId) {
      conditions.push(ne(donationPages.id, excludePageId));
    }

    const existing = await db
      .select({ id: donationPages.id })
      .from(donationPages)
      .where(and(...conditions))
      .limit(1);

    return existing.length === 0;
  }

  // ANALYTICS METHODS

  // Get comprehensive analytics for a donation page
  async getDonationPageAnalytics(pageId: number, startDate: Date, endDate: Date) {
    // Base donation query for this page
    const baseQuery = db
      .select()
      .from(donations)
      .where(
        and(
          eq(donations.contextType, 'donation_page'),
          eq(donations.contextId, pageId),
          gte(donations.createdAt, startDate),
          lte(donations.createdAt, endDate),
          eq(donations.status, 'completed')
        )
      );

    // Total donations and amount
    const totals = await db
      .select({
        totalDonations: count(),
        totalAmount: sum(donations.amount),
        avgDonation: sql<number>`AVG(${donations.amount})`,
      })
      .from(donations)
      .where(
        and(
          eq(donations.contextType, 'donation_page'),
          eq(donations.contextId, pageId),
          gte(donations.createdAt, startDate),
          lte(donations.createdAt, endDate),
          eq(donations.status, 'completed')
        )
      );

    // Donations by payment method
    const paymentMethods = await db
      .select({
        paymentMethod: donations.paymentMethod,
        count: count(),
        amount: sum(donations.amount),
      })
      .from(donations)
      .where(
        and(
          eq(donations.contextType, 'donation_page'),
          eq(donations.contextId, pageId),
          gte(donations.createdAt, startDate),
          lte(donations.createdAt, endDate),
          eq(donations.status, 'completed')
        )
      )
      .groupBy(donations.paymentMethod);

    // Recurring vs one-time donations
    const recurringBreakdown = await db
      .select({
        isRecurring: donations.isRecurring,
        count: count(),
        amount: sum(donations.amount),
      })
      .from(donations)
      .where(
        and(
          eq(donations.contextType, 'donation_page'),
          eq(donations.contextId, pageId),
          gte(donations.createdAt, startDate),
          lte(donations.createdAt, endDate),
          eq(donations.status, 'completed')
        )
      )
      .groupBy(donations.isRecurring);

    // Daily donation trends
    const dailyTrends = await db
      .select({
        date: sql<string>`DATE(${donations.createdAt})`,
        count: count(),
        amount: sum(donations.amount),
      })
      .from(donations)
      .where(
        and(
          eq(donations.contextType, 'donation_page'),
          eq(donations.contextId, pageId),
          gte(donations.createdAt, startDate),
          lte(donations.createdAt, endDate),
          eq(donations.status, 'completed')
        )
      )
      .groupBy(sql`DATE(${donations.createdAt})`)
      .orderBy(sql`DATE(${donations.createdAt})`);

    // Campaign performance within this page
    const campaignStats = await db
      .select({
        campaignId: campaigns.id,
        campaignName: campaigns.name,
        donationCount: count(donations.id),
        totalAmount: sum(donations.amount),
      })
      .from(campaigns)
      .leftJoin(donations, 
        and(
          eq(donations.campaignId, campaigns.id),
          eq(donations.status, 'completed'),
          gte(donations.createdAt, startDate),
          lte(donations.createdAt, endDate)
        )
      )
      .where(eq(campaigns.donationPageId, pageId))
      .groupBy(campaigns.id, campaigns.name)
      .orderBy(desc(sql`SUM(${donations.amount})`));

    return {
      totals: totals[0] || { totalDonations: 0, totalAmount: 0, avgDonation: 0 },
      paymentMethods,
      recurringBreakdown,
      dailyTrends,
      campaignStats,
      timeRange: { startDate, endDate },
    };
  }

  // Get analytics for a specific campaign
  async getCampaignAnalytics(campaignId: number, startDate: Date, endDate: Date) {
    // Total donations and amount for this campaign
    const totals = await db
      .select({
        totalDonations: count(),
        totalAmount: sum(donations.amount),
        avgDonation: sql<number>`AVG(${donations.amount})`,
      })
      .from(donations)
      .where(
        and(
          eq(donations.campaignId, campaignId),
          gte(donations.createdAt, startDate),
          lte(donations.createdAt, endDate),
          eq(donations.status, 'completed')
        )
      );

    // Daily trends for this campaign
    const dailyTrends = await db
      .select({
        date: sql<string>`DATE(${donations.createdAt})`,
        count: count(),
        amount: sum(donations.amount),
      })
      .from(donations)
      .where(
        and(
          eq(donations.campaignId, campaignId),
          gte(donations.createdAt, startDate),
          lte(donations.createdAt, endDate),
          eq(donations.status, 'completed')
        )
      )
      .groupBy(sql`DATE(${donations.createdAt})`)
      .orderBy(sql`DATE(${donations.createdAt})`);

    // Payment method breakdown
    const paymentMethods = await db
      .select({
        paymentMethod: donations.paymentMethod,
        count: count(),
        amount: sum(donations.amount),
      })
      .from(donations)
      .where(
        and(
          eq(donations.campaignId, campaignId),
          gte(donations.createdAt, startDate),
          lte(donations.createdAt, endDate),
          eq(donations.status, 'completed')
        )
      )
      .groupBy(donations.paymentMethod);

    return {
      totals: totals[0] || { totalDonations: 0, totalAmount: 0, avgDonation: 0 },
      dailyTrends,
      paymentMethods,
      timeRange: { startDate, endDate },
    };
  }

  // Get donation data for export
  async getDonationPageDonations(pageId: number, startDate: Date, endDate: Date) {
    return await db
      .select({
        id: donations.id,
        amount: donations.amount,
        donorFirstName: donations.donorFirstName,
        donorLastName: donations.donorLastName,
        donorEmail: donations.donorEmail,
        paymentMethod: donations.paymentMethod,
        status: donations.status,
        isRecurring: donations.isRecurring,
        dedicationType: donations.dedicationType,
        dedicationName: donations.dedicationName,
        source: donations.source,
        createdAt: donations.createdAt,
        campaignName: campaigns.name,
      })
      .from(donations)
      .leftJoin(campaigns, eq(donations.campaignId, campaigns.id))
      .where(
        and(
          eq(donations.contextType, 'donation_page'),
          eq(donations.contextId, pageId),
          gte(donations.createdAt, startDate),
          lte(donations.createdAt, endDate)
        )
      )
      .orderBy(desc(donations.createdAt));
  }

  // Get organization-wide analytics across all donation pages
  async getOrganizationAnalytics(orgId: number, startDate: Date, endDate: Date) {
    // Get all donation pages for this organization
    const orgPages = await db
      .select({ id: donationPages.id })
      .from(donationPages)
      .where(eq(donationPages.organizationId, orgId));
    
    const pageIds = orgPages.map(p => p.id);
    
    if (pageIds.length === 0) {
      return {
        totals: { totalDonations: 0, totalAmount: 0, avgDonation: 0 },
        pageBreakdown: [],
        dailyTrends: [],
        paymentMethods: [],
        timeRange: { startDate, endDate },
      };
    }

    // Total donations across all pages
    const totals = await db
      .select({
        totalDonations: count(),
        totalAmount: sum(donations.amount),
        avgDonation: sql<number>`AVG(${donations.amount})`,
      })
      .from(donations)
      .where(
        and(
          eq(donations.contextType, 'donation_page'),
          sql`${donations.contextId} IN (${pageIds.join(',')})`,
          gte(donations.createdAt, startDate),
          lte(donations.createdAt, endDate),
          eq(donations.status, 'completed')
        )
      );

    // Performance by donation page
    const pageBreakdown = await db
      .select({
        pageId: donationPages.id,
        pageName: donationPages.name,
        donationCount: count(donations.id),
        totalAmount: sum(donations.amount),
      })
      .from(donationPages)
      .leftJoin(donations, 
        and(
          eq(donations.contextType, 'donation_page'),
          eq(donations.contextId, donationPages.id),
          eq(donations.status, 'completed'),
          gte(donations.createdAt, startDate),
          lte(donations.createdAt, endDate)
        )
      )
      .where(eq(donationPages.organizationId, orgId))
      .groupBy(donationPages.id, donationPages.name)
      .orderBy(desc(sql`SUM(${donations.amount})`));

    // Daily trends across all pages
    const dailyTrends = await db
      .select({
        date: sql<string>`DATE(${donations.createdAt})`,
        count: count(),
        amount: sum(donations.amount),
      })
      .from(donations)
      .where(
        and(
          eq(donations.contextType, 'donation_page'),
          sql`${donations.contextId} IN (${pageIds.join(',')})`,
          gte(donations.createdAt, startDate),
          lte(donations.createdAt, endDate),
          eq(donations.status, 'completed')
        )
      )
      .groupBy(sql`DATE(${donations.createdAt})`)
      .orderBy(sql`DATE(${donations.createdAt})`);

    // Payment methods across all pages
    const paymentMethods = await db
      .select({
        paymentMethod: donations.paymentMethod,
        count: count(),
        amount: sum(donations.amount),
      })
      .from(donations)
      .where(
        and(
          eq(donations.contextType, 'donation_page'),
          sql`${donations.contextId} IN (${pageIds.join(',')})`,
          gte(donations.createdAt, startDate),
          lte(donations.createdAt, endDate),
          eq(donations.status, 'completed')
        )
      )
      .groupBy(donations.paymentMethod);

    return {
      totals: totals[0] || { totalDonations: 0, totalAmount: 0, avgDonation: 0 },
      pageBreakdown,
      dailyTrends,
      paymentMethods,
      timeRange: { startDate, endDate },
    };
  }

  // Marketing & Sharing Tools
  async generateQRCode(donationPageId: number): Promise<string> {
    const donationPage = await this.getDonationPage(donationPageId);
    if (!donationPage) {
      throw new Error("Donation page not found");
    }

    try {
      // Generate the donation page URL
      const donationUrl = `${process.env.FRONTEND_URL || 'https://your-domain.com'}/give/${donationPage.slug}`;
      
      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(donationUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: donationPage.primaryColor || '#0d72b9',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });

      // Update donation page with QR code
      await this.updateDonationPage(donationPageId, { 
        qrCodeUrl: qrCodeDataUrl 
      });

      return qrCodeDataUrl;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  async generateSharingData(donationPageId: number): Promise<{
    title: string;
    description: string;
    url: string;
    imageUrl?: string;
    qrCodeUrl?: string;
    socialLinks: {
      facebook: string;
      twitter: string;
      linkedin: string;
      whatsapp: string;
      email: string;
      sms: string;
    };
  }> {
    const donationPage = await this.getDonationPage(donationPageId);
    if (!donationPage) {
      throw new Error("Donation page not found");
    }

    const donationUrl = `${process.env.FRONTEND_URL || 'https://your-domain.com'}/give/${donationPage.slug}`;
    const title = donationPage.ogTitle || donationPage.name;
    const description = donationPage.ogDescription || donationPage.description || `Support ${donationPage.name}`;
    const imageUrl = donationPage.ogImageUrl || donationPage.headerImageUrl;

    // Generate QR code if not already exists
    let qrCodeUrl = donationPage.qrCodeUrl;
    if (!qrCodeUrl) {
      qrCodeUrl = await this.generateQRCode(donationPageId);
    }

    // Encode data for URL sharing
    const encodedTitle = encodeURIComponent(title);
    const encodedDescription = encodeURIComponent(description);
    const encodedUrl = encodeURIComponent(donationUrl);

    return {
      title,
      description,
      url: donationUrl,
      imageUrl,
      qrCodeUrl,
      socialLinks: {
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedTitle}`,
        twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
        whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
        email: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%0A%0A${encodedUrl}`,
        sms: `sms:?body=${encodedTitle}%20${encodedUrl}`,
      }
    };
  }

  // BULK CREATION & SMART CLONING METHODS

  /**
   * Enhanced cloning with template support and smart content copying
   */
  async smartCloneDonationPage(
    id: number,
    options: {
      suffix?: string;
      cloneCampaigns?: boolean;
      applyTemplate?: string;
      preserveCustomUrl?: boolean;
      preserveColors?: boolean;
      preserveMedia?: boolean;
    }
  ): Promise<DonationPage> {
    const originalPage = await this.getDonationPage(id);
    if (!originalPage) {
      throw new Error("Donation page not found");
    }

    // Smart slug generation to avoid conflicts
    const baseSlug = options.applyTemplate 
      ? `${options.applyTemplate}-${Date.now()}`
      : `${originalPage.slug}${options.suffix || `-copy-${Date.now()}`}`;

    // Template configurations (similar to existing templates)
    const templates = {
      'sponsor-child': {
        primaryColor: '#e74c3c',
        secondaryColor: '#f39c12',
        layout: 'sponsor',
        ogTitle: 'Sponsor a Child Today',
        ogDescription: 'Make a lasting impact by sponsoring a child in need',
      },
      'church-giving': {
        primaryColor: '#2c3e50',
        secondaryColor: '#3498db',
        layout: 'church',
        ogTitle: 'Support Our Church',
        ogDescription: 'Join us in building our faith community',
      },
      'disaster-relief': {
        primaryColor: '#d32f2f',
        secondaryColor: '#ff9800',
        layout: 'emergency',
        ogTitle: 'Emergency Disaster Relief',
        ogDescription: 'Help provide immediate aid to those affected by disasters',
      },
    };

    const template = options.applyTemplate ? templates[options.applyTemplate] : null;

    // Create enhanced clone data
    const clonedPageData: InsertDonationPage = {
      organizationId: originalPage.organizationId,
      name: `${originalPage.name}${options.suffix || " (Copy)"}`,
      slug: baseSlug,
      description: originalPage.description,
      logoUrl: options.preserveMedia ? originalPage.logoUrl : null,
      primaryColor: template?.primaryColor || (options.preserveColors ? originalPage.primaryColor : '#0d72b9'),
      secondaryColor: template?.secondaryColor || (options.preserveColors ? originalPage.secondaryColor : '#26b578'),
      headerImageUrl: options.preserveMedia ? originalPage.headerImageUrl : null,
      videoUrl: options.preserveMedia ? originalPage.videoUrl : null,
      videoType: options.preserveMedia ? originalPage.videoType : null,
      layout: template?.layout || originalPage.layout,
      featuredCampaignIds: originalPage.featuredCampaignIds as any,
      embedAllowedOrigins: originalPage.embedAllowedOrigins as any,
      ogTitle: template?.ogTitle || originalPage.ogTitle,
      ogDescription: template?.ogDescription || originalPage.ogDescription,
      ogImageUrl: options.preserveMedia ? originalPage.ogImageUrl : null,
      defaultFundId: originalPage.defaultFundId,
      isActive: originalPage.isActive,
      customUrl: options.preserveCustomUrl ? originalPage.customUrl : null,
      subdomain: null, // Never copy subdomain
    };

    const clonedPage = await this.createDonationPage(clonedPageData);

    // Clone campaigns if requested
    if (options.cloneCampaigns) {
      const originalCampaigns = await this.getCampaignsByDonationPage(id);
      for (const campaign of originalCampaigns) {
        await this.assignCampaignToPage(campaign.id, clonedPage.id);
      }
    }

    return clonedPage;
  }

  /**
   * Bulk create donation pages from CSV data
   */
  async bulkCreateDonationPages(
    organizationId: number,
    csvData: Array<{
      name: string;
      slug?: string;
      description?: string;
      primaryColor?: string;
      secondaryColor?: string;
      template?: string;
      logoUrl?: string;
      headerImageUrl?: string;
      videoUrl?: string;
      customUrl?: string;
      subdomain?: string;
      isActive?: boolean;
    }>
  ): Promise<{ 
    created: DonationPage[], 
    errors: Array<{ row: number, error: string, data: any }> 
  }> {
    const created: DonationPage[] = [];
    const errors: Array<{ row: number, error: string, data: any }> = [];

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      try {
        // Validate required fields
        if (!row.name || !row.name.trim()) {
          throw new Error("Name is required");
        }

        // Generate slug if not provided
        const slug = row.slug || this.generateSlugFromName(row.name);

        // Apply template if specified
        const template = this.getTemplateConfig(row.template);

        // Create donation page data
        const pageData: InsertDonationPage = {
          organizationId,
          name: row.name.trim(),
          slug: `${slug}-${Date.now()}-${i}`, // Ensure uniqueness
          description: row.description || `Support ${row.name}`,
          primaryColor: row.primaryColor || template?.primaryColor || '#0d72b9',
          secondaryColor: row.secondaryColor || template?.secondaryColor || '#26b578',
          logoUrl: row.logoUrl || null,
          headerImageUrl: row.headerImageUrl || null,
          videoUrl: row.videoUrl || null,
          videoType: row.videoUrl ? this.detectVideoType(row.videoUrl) : null,
          layout: template?.layout || 'standard',
          featuredCampaignIds: [],
          embedAllowedOrigins: [],
          ogTitle: template?.ogTitle || row.name,
          ogDescription: template?.ogDescription || row.description || `Support ${row.name}`,
          ogImageUrl: row.headerImageUrl || null,
          defaultFundId: null,
          isActive: row.isActive !== undefined ? row.isActive : true,
          customUrl: row.customUrl || null,
          subdomain: row.subdomain || null,
        };

        const createdPage = await this.createDonationPage(pageData);
        created.push(createdPage);

      } catch (error) {
        errors.push({
          row: i + 1,
          error: error instanceof Error ? error.message : "Unknown error",
          data: row
        });
      }
    }

    return { created, errors };
  }

  /**
   * Helper method to generate slug from name
   */
  private generateSlugFromName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * Helper method to get template configuration
   */
  private getTemplateConfig(templateName?: string) {
    const templates = {
      'sponsor-child': {
        primaryColor: '#e74c3c',
        secondaryColor: '#f39c12',
        layout: 'sponsor',
        ogTitle: 'Sponsor a Child Today',
        ogDescription: 'Make a lasting impact by sponsoring a child in need',
      },
      'church-giving': {
        primaryColor: '#2c3e50',
        secondaryColor: '#3498db',
        layout: 'church',
        ogTitle: 'Support Our Church',
        ogDescription: 'Join us in building our faith community',
      },
      'disaster-relief': {
        primaryColor: '#d32f2f',
        secondaryColor: '#ff9800',
        layout: 'emergency',
        ogTitle: 'Emergency Disaster Relief',
        ogDescription: 'Help provide immediate aid to those affected by disasters',
      },
      'pregnancy-center': {
        primaryColor: '#8e44ad',
        secondaryColor: '#e91e63',
        layout: 'center',
        ogTitle: 'Support Life-Saving Services',
        ogDescription: 'Help us provide essential services to mothers and babies',
      },
      'food-bank': {
        primaryColor: '#27ae60',
        secondaryColor: '#f39c12',
        layout: 'community',
        ogTitle: 'Feed Our Community',
        ogDescription: 'Help us provide nutritious meals to those in need',
      },
      'education': {
        primaryColor: '#3498db',
        secondaryColor: '#9b59b6',
        layout: 'education',
        ogTitle: 'Support Education',
        ogDescription: 'Invest in the future through quality education',
      },
      'medical-mission': {
        primaryColor: '#16a085',
        secondaryColor: '#e67e22',
        layout: 'medical',
        ogTitle: 'Medical Mission Support',
        ogDescription: 'Help us provide essential healthcare services',
      },
    };

    return templateName ? templates[templateName] : null;
  }

  /**
   * Helper method to detect video type from URL
   */
  private detectVideoType(url: string): 'youtube' | 'vimeo' | 'direct' | null {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'youtube';
    }
    if (url.includes('vimeo.com')) {
      return 'vimeo';
    }
    if (url.match(/\.(mp4|webm|ogg)$/i)) {
      return 'direct';
    }
    return null;
  }
}