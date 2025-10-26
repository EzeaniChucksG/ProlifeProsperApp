/**
 * Campaign Storage - Handles campaign-related database operations
 */
import {
  campaigns,
  campaignCategories,
  organizations,
  donationPages,
  type Campaign,
  type InsertCampaign,
  type CampaignCategory,
  type InsertCampaignCategory,
} from "@shared/schema";
import { db } from "../db";
import { eq, and } from "drizzle-orm";

export class CampaignStorage {
  async getCampaignsByOrganization(organizationId: number): Promise<any[]> {
    const results = await db
      .select({
        id: campaigns.id,
        organizationId: campaigns.organizationId,
        name: campaigns.name,
        slug: campaigns.slug,
        description: campaigns.description,
        goal: campaigns.goal,
        raised: campaigns.raised,
        startDate: campaigns.startDate,
        endDate: campaigns.endDate,
        logoUrl: campaigns.logoUrl,
        bannerImageUrl: campaigns.bannerImageUrl,
        bannerVideoUrl: campaigns.bannerVideoUrl,
        bannerDisplayStyle: campaigns.bannerDisplayStyle,
        mainImageUrl: campaigns.mainImageUrl,
        mainVideoUrl: campaigns.mainVideoUrl,
        videoType: campaigns.videoType,
        hasFullPage: campaigns.hasFullPage,
        embedCode: campaigns.embedCode,
        qrCodeUrl: campaigns.qrCodeUrl,
        clonedFromId: campaigns.clonedFromId,
        socialShareEnabled: campaigns.socialShareEnabled,
        surchargeOption: campaigns.surchargeOption,
        showImpactSection: campaigns.showImpactSection,
        showSocialProof: campaigns.showSocialProof,
        showTrustBadges: campaigns.showTrustBadges,
        showLiveDonors: campaigns.showLiveDonors,
        isActive: campaigns.isActive,
        isDefault: campaigns.isDefault,
        createdAt: campaigns.createdAt,
        updatedAt: campaigns.updatedAt,
        donationPageId: campaigns.donationPageId,
        donationPage: {
          id: donationPages.id,
          name: donationPages.name,
          slug: donationPages.slug,
        }
      })
      .from(campaigns)
      .leftJoin(donationPages, eq(campaigns.donationPageId, donationPages.id))
      .where(eq(campaigns.organizationId, organizationId));
    
    return results;
  }

  async getCampaign(id: number): Promise<Campaign | undefined> {
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, id));
    return campaign || undefined;
  }

  async getCampaignBySlug(slug: string): Promise<Campaign | undefined> {
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.slug, slug));
    return campaign || undefined;
  }

  // Public method that includes organization data for campaign pages
  async getCampaignBySlugWithOrganization(slug: string): Promise<any | undefined> {
    const [result] = await db
      .select({
        // Campaign fields
        campaign: {
          id: campaigns.id,
          organizationId: campaigns.organizationId,
          name: campaigns.name,
          slug: campaigns.slug,
          description: campaigns.description,
          goal: campaigns.goal,
          raised: campaigns.raised,
          startDate: campaigns.startDate,
          endDate: campaigns.endDate,
          isActive: campaigns.isActive,
          createdAt: campaigns.createdAt,
          updatedAt: campaigns.updatedAt,
          logoUrl: campaigns.logoUrl,
          imageUrl: campaigns.bannerImageUrl,
          videoUrl: campaigns.bannerVideoUrl,
          bannerDisplayStyle: campaigns.bannerDisplayStyle,
          showImpactSection: campaigns.showImpactSection,
          showSocialProof: campaigns.showSocialProof,
          showTrustBadges: campaigns.showTrustBadges,
          showLiveDonors: campaigns.showLiveDonors,
        },
        // Organization fields
        organization: {
          id: organizations.id,
          name: organizations.name,
          slug: organizations.slug,
          primaryColor: organizations.primaryColor,
          secondaryColor: organizations.secondaryColor,
          logoUrl: organizations.logoUrl,
          website: organizations.website,
          phone: organizations.phone,
          email: organizations.email,
        }
      })
      .from(campaigns)
      .innerJoin(organizations, eq(campaigns.organizationId, organizations.id))
      .where(and(
        eq(campaigns.slug, slug),
        eq(organizations.isActive, true)
      ));
    
    return result || undefined;
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const [newCampaign] = await db
      .insert(campaigns)
      .values(campaign)
      .returning();
    return newCampaign;
  }

  async updateCampaign(id: number, updates: Partial<Campaign>): Promise<Campaign> {
    const [campaign] = await db
      .update(campaigns)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(campaigns.id, id))
      .returning();
    return campaign;
  }

  async cloneCampaign(id: number): Promise<Campaign> {
    const originalCampaign = await this.getCampaign(id);
    if (!originalCampaign) {
      throw new Error("Campaign not found");
    }

    const { id: _, createdAt: __, updatedAt: ___, ...campaignData } = originalCampaign;
    
    // Create a cloned campaign with modified name and slug
    const clonedCampaign = {
      ...campaignData,
      name: `${campaignData.name} (Copy)`,
      slug: `${campaignData.slug}-copy-${Date.now()}`,
      raised: "0", // Reset raised amount for clone
    };

    return await this.createCampaign(clonedCampaign);
  }

  async generateEmbedCode(campaignId: number): Promise<string> {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    // Update campaign with embed code
    const embedCode = `<iframe src="/give/${campaign.slug}" width="100%" height="600" frameborder="0"></iframe>`;
    
    await this.updateCampaign(campaignId, { embedCode });
    return embedCode;
  }

  async generateQRCode(campaignId: number): Promise<string> {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    // Generate QR code URL (this would typically use a QR code service)
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=/give/${campaign.slug}`;
    
    await this.updateCampaign(campaignId, { qrCodeUrl });
    return qrCodeUrl;
  }

  // BULK CREATION & SMART CLONING METHODS

  /**
   * Enhanced campaign cloning with template support
   */
  async smartCloneCampaign(
    id: number,
    options: {
      suffix?: string;
      preserveGoal?: boolean;
      preserveDates?: boolean;
      applyTemplate?: string;
      resetProgress?: boolean;
    }
  ): Promise<Campaign> {
    const originalCampaign = await this.getCampaign(id);
    if (!originalCampaign) {
      throw new Error("Campaign not found");
    }

    const { 
      id: _, 
      createdAt: __, 
      updatedAt: ___, 
      raised,
      ...campaignData 
    } = originalCampaign;

    // Template configurations for campaigns
    const templates = {
      'sponsor-child': {
        name: 'Sponsor a Child Program',
        description: 'Help provide education, healthcare, and hope to children in need through our sponsorship program.',
        goal: '25000',
      },
      'church-building': {
        name: 'Church Building Fund',
        description: 'Support the construction of our new worship facility to serve our growing congregation.',
        goal: '100000',
      },
      'disaster-relief': {
        name: 'Emergency Disaster Relief',
        description: 'Provide immediate aid and long-term recovery support to disaster-affected communities.',
        goal: '50000',
      },
      'pregnancy-center': {
        name: 'Life-Saving Services Fund',
        description: 'Support our pregnancy center with essential services for mothers and babies in need.',
        goal: '30000',
      },
      'food-bank': {
        name: 'Community Food Program',
        description: 'Help us provide nutritious meals and food assistance to families facing hunger.',
        goal: '20000',
      },
      'education': {
        name: 'Educational Excellence Fund',
        description: 'Invest in quality education and learning resources for students in our community.',
        goal: '40000',
      },
      'medical-mission': {
        name: 'Medical Mission Support',
        description: 'Fund essential healthcare services and medical missions in underserved areas.',
        goal: '35000',
      },
    };

    const template = options.applyTemplate ? templates[options.applyTemplate as keyof typeof templates] : null;

    // Create enhanced clone data
    const clonedCampaign = {
      ...campaignData,
      name: template?.name || `${campaignData.name}${options.suffix || " (Copy)"}`,
      slug: `${campaignData.slug}-copy-${Date.now()}`,
      description: template?.description || campaignData.description,
      goal: template?.goal || (options.preserveGoal ? campaignData.goal : "10000"),
      raised: options.resetProgress ? "0" : raised,
      startDate: options.preserveDates ? campaignData.startDate : null,
      endDate: options.preserveDates ? campaignData.endDate : null,
    };

    return await this.createCampaign(clonedCampaign);
  }

  /**
   * Bulk create campaigns from CSV data
   */
  async bulkCreateCampaigns(
    organizationId: number,
    csvData: Array<{
      name: string;
      slug?: string;
      description?: string;
      goal?: string;
      startDate?: string;
      endDate?: string;
      template?: string;
      donationPageId?: number;
      isActive?: boolean;
    }>
  ): Promise<{ 
    created: Campaign[], 
    errors: Array<{ row: number, error: string, data: any }> 
  }> {
    const created: Campaign[] = [];
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

        // Parse dates if provided
        const startDate = row.startDate ? new Date(row.startDate) : null;
        const endDate = row.endDate ? new Date(row.endDate) : null;

        // Validate dates
        if (startDate && endDate && startDate >= endDate) {
          throw new Error("Start date must be before end date");
        }

        // Create campaign data
        const campaignData = {
          organizationId,
          name: row.name.trim(),
          slug: `${slug}-${Date.now()}-${i}`, // Ensure uniqueness
          description: template?.description || row.description || `Support ${row.name}`,
          goal: template?.goal || row.goal || "10000",
          raised: "0",
          startDate,
          endDate,
          donationPageId: row.donationPageId || null,
          isActive: row.isActive !== undefined ? row.isActive : true,
        };

        const createdCampaign = await this.createCampaign(campaignData);
        created.push(createdCampaign);

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
   * Helper method to get template configuration for campaigns
   */
  private getTemplateConfig(templateName?: string) {
    const templates = {
      'sponsor-child': {
        name: 'Sponsor a Child Program',
        description: 'Help provide education, healthcare, and hope to children in need through our sponsorship program.',
        goal: '25000',
      },
      'church-building': {
        name: 'Church Building Fund',
        description: 'Support the construction of our new worship facility to serve our growing congregation.',
        goal: '100000',
      },
      'disaster-relief': {
        name: 'Emergency Disaster Relief',
        description: 'Provide immediate aid and long-term recovery support to disaster-affected communities.',
        goal: '50000',
      },
      'pregnancy-center': {
        name: 'Life-Saving Services Fund',
        description: 'Support our pregnancy center with essential services for mothers and babies in need.',
        goal: '30000',
      },
      'food-bank': {
        name: 'Community Food Program',
        description: 'Help us provide nutritious meals and food assistance to families facing hunger.',
        goal: '20000',
      },
      'education': {
        name: 'Educational Excellence Fund',
        description: 'Invest in quality education and learning resources for students in our community.',
        goal: '40000',
      },
      'medical-mission': {
        name: 'Medical Mission Support',
        description: 'Fund essential healthcare services and medical missions in underserved areas.',
        goal: '35000',
      },
    };

    return templateName ? templates[templateName as keyof typeof templates] : null;
  }

  // Campaign Category Methods
  async getCategoriesByCampaign(campaignId: number): Promise<CampaignCategory[]> {
    return await db
      .select()
      .from(campaignCategories)
      .where(and(
        eq(campaignCategories.campaignId, campaignId),
        eq(campaignCategories.isActive, true)
      ))
      .orderBy(campaignCategories.sortOrder);
  }

  async getCategory(id: number): Promise<CampaignCategory | undefined> {
    const [category] = await db
      .select()
      .from(campaignCategories)
      .where(eq(campaignCategories.id, id));
    return category || undefined;
  }

  async createCategory(category: InsertCampaignCategory): Promise<CampaignCategory> {
    const [newCategory] = await db
      .insert(campaignCategories)
      .values(category)
      .returning();
    return newCategory;
  }

  async updateCategory(id: number, updates: Partial<CampaignCategory>): Promise<CampaignCategory> {
    const [category] = await db
      .update(campaignCategories)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(campaignCategories.id, id))
      .returning();
    return category;
  }

  async deleteCategory(id: number): Promise<void> {
    await db
      .delete(campaignCategories)
      .where(eq(campaignCategories.id, id));
  }

  async incrementCategoryRaised(categoryId: number, amount: string): Promise<void> {
    const category = await this.getCategory(categoryId);
    if (!category) {
      throw new Error("Category not found");
    }
    
    const currentRaised = parseFloat(category.raised || "0");
    const additionalAmount = parseFloat(amount);
    const newRaised = (currentRaised + additionalAmount).toFixed(2);
    
    await this.updateCategory(categoryId, { raised: newRaised });
  }
}