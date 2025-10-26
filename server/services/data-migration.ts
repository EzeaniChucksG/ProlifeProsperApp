/**
 * Data Migration Service
 * Handles migration/backfill for hybrid architecture implementation
 * Ensures all organizations have default funds and payment accounts
 */
import type { IStorage } from "../storage/interfaces";
import type { Fund, PaymentAccount, Donation, Organization } from "@shared/schema";

export interface MigrationResult {
  organizationsProcessed: number;
  fundsCreated: number;
  paymentAccountsCreated: number;
  donationsUpdated: number;
  errors: string[];
}

export class DataMigrationService {
  constructor(private storage: IStorage) {}

  /**
   * Run complete migration for all organizations
   */
  async runFullMigration(): Promise<MigrationResult> {
    const result: MigrationResult = {
      organizationsProcessed: 0,
      fundsCreated: 0,
      paymentAccountsCreated: 0,
      donationsUpdated: 0,
      errors: []
    };

    try {
      // Get all organizations - we'll need a method to get all organizations
      const organizations = await this.getAllOrganizations();
      
      for (const org of organizations) {
        try {
          await this.migrateOrganization(org.id, result);
          result.organizationsProcessed++;
        } catch (error) {
          const errorMsg = `Failed to migrate organization ${org.id}: ${error instanceof Error ? error.message : String(error)}`;
          result.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      console.log("Migration completed:", result);
      return result;
    } catch (error) {
      const errorMsg = `Migration failed: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMsg);
      console.error(errorMsg);
      return result;
    }
  }

  /**
   * Migrate a single organization
   */
  async migrateOrganization(organizationId: number, result?: MigrationResult): Promise<void> {
    const localResult = result || {
      organizationsProcessed: 0,
      fundsCreated: 0,
      paymentAccountsCreated: 0,
      donationsUpdated: 0,
      errors: []
    };

    // 1. Ensure organization has a default fund
    await this.ensureDefaultFund(organizationId, localResult);

    // 2. Ensure organization has a default payment account
    await this.ensureDefaultPaymentAccount(organizationId, localResult);

    // 3. Backfill donations for this organization
    await this.backfillDonations(organizationId, localResult);
  }

  /**
   * Ensure organization has a default fund
   */
  private async ensureDefaultFund(organizationId: number, result: MigrationResult): Promise<Fund> {
    // Check if organization already has a default fund
    let defaultFund = await this.storage.getDefaultFund(organizationId);
    
    if (!defaultFund) {
      // Create default general fund
      try {
        defaultFund = await this.storage.createFund({
          organizationId,
          name: "General Fund",
          code: "GENERAL",
          type: "general",
          description: "Default fund for general donations and operations",
          isActive: true,
          isDefault: true,
          settings: {}
        });
        result.fundsCreated++;
        console.log(`Created default fund for organization ${organizationId}`);
      } catch (error) {
        throw new Error(`Failed to create default fund: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return defaultFund;
  }

  /**
   * Ensure organization has a default payment account
   */
  private async ensureDefaultPaymentAccount(organizationId: number, result: MigrationResult): Promise<PaymentAccount> {
    // Check if organization already has a default payment account
    let defaultAccount = await this.storage.getDefaultPaymentAccount(organizationId);
    
    if (!defaultAccount) {
      // Get organization details
      const organization = await this.storage.getOrganizationById(organizationId);
      if (!organization) {
        throw new Error(`Organization ${organizationId} not found`);
      }

      // Create default payment account
      try {
        defaultAccount = await this.storage.createPaymentAccount({
          organizationId,
          name: `${organization.name || 'Organization'} Default Account`,
          merchantAccountId: organization.merchantAccountId || "",
          provider: "gettrx",
          isActive: true,
          isDefault: true,
          metadata: {}
        });
        result.paymentAccountsCreated++;
        console.log(`Created default payment account for organization ${organizationId}`);
      } catch (error) {
        throw new Error(`Failed to create default payment account: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return defaultAccount;
  }

  /**
   * Backfill existing donations with fund and payment account attribution
   */
  private async backfillDonations(organizationId: number, result: MigrationResult): Promise<void> {
    try {
      // Get all donations for this organization that need backfilling
      const donations = await this.storage.getDonationsByOrganization(organizationId);
      
      // Filter donations that need backfilling (missing fund or payment account attribution)
      const donationsToUpdate = donations.filter(donation => 
        !donation.fundId || !donation.paymentAccountId
      );

      if (donationsToUpdate.length === 0) {
        return; // No donations need updating
      }

      // Get default fund and payment account
      const defaultFund = await this.storage.getDefaultFund(organizationId);
      const defaultPaymentAccount = await this.storage.getDefaultPaymentAccount(organizationId);

      if (!defaultFund || !defaultPaymentAccount) {
        throw new Error(`Missing default fund or payment account for organization ${organizationId}`);
      }

      // Update donations in batches
      for (const donation of donationsToUpdate) {
        try {
          const updates: any = {};
          
          // Set fund attribution
          if (!donation.fundId) {
            // Try to determine fund based on existing data
            if (donation.campaignId) {
              // Try to find or create campaign-specific fund
              const campaign = await this.storage.getCampaign(donation.campaignId);
              if (campaign) {
                const campaignFund = await this.getOrCreateCampaignFund(organizationId, donation.campaignId, campaign.name);
                updates.fundId = campaignFund.id;
                updates.contextType = "campaign";
                updates.contextId = donation.campaignId;
              } else {
                updates.fundId = defaultFund.id;
                updates.contextType = "general";
              }
            } else {
              updates.fundId = defaultFund.id;
              updates.contextType = "general";
            }
          }

          // Set payment account attribution
          if (!donation.paymentAccountId) {
            updates.paymentAccountId = defaultPaymentAccount.id;
          }

          // Update the donation
          if (Object.keys(updates).length > 0) {
            await this.storage.updateDonation(donation.id, updates);
            result.donationsUpdated++;
          }
        } catch (error) {
          const errorMsg = `Failed to update donation ${donation.id}: ${error instanceof Error ? error.message : String(error)}`;
          result.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      console.log(`Backfilled ${donationsToUpdate.length} donations for organization ${organizationId}`);
    } catch (error) {
      throw new Error(`Failed to backfill donations: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get or create campaign-specific fund
   */
  private async getOrCreateCampaignFund(organizationId: number, campaignId: number, campaignName: string): Promise<Fund> {
    // Try to find existing campaign fund
    const funds = await this.storage.getFundsByOrganization(organizationId);
    const existingFund = funds.find(fund => {
      const settings = fund.settings as any;
      return fund.type === "campaign" && settings?.contextId === campaignId;
    });

    if (existingFund) {
      return existingFund;
    }

    // Create new campaign fund
    return await this.storage.createFund({
      organizationId,
      name: `${campaignName} Fund`,
      code: `CAMPAIGN_${campaignId}`,
      type: "campaign",
      description: `Fund for campaign: ${campaignName}`,
      isActive: true,
      isDefault: false,
      settings: { contextId: campaignId }
    });
  }

  /**
   * Get all organizations (we'll need to implement this)
   */
  private async getAllOrganizations(): Promise<Organization[]> {
    // For now, let's get organizations that have donations
    // This is a simplified approach - in production we'd want all organizations
    try {
      // We need to implement a method to get all organizations
      // For now, let's use a workaround by getting unique organization IDs from donations
      const donations = await this.getAllDonations();
      const uniqueOrgIds = [...new Set(donations.map(d => d.organizationId))];
      
      const organizations: Organization[] = [];
      for (const orgId of uniqueOrgIds) {
        const org = await this.storage.getOrganizationById(orgId);
        if (org) {
          organizations.push(org);
        }
      }
      
      return organizations;
    } catch (error) {
      console.error("Error getting organizations:", error);
      return [];
    }
  }

  /**
   * Get all donations (simplified approach)
   */
  private async getAllDonations(): Promise<Donation[]> {
    // This is a simplified approach - in production we'd want a more efficient method
    // For now, we'll assume we can get donations by organization
    // We'd need a method to get all donations across all organizations
    try {
      // This is a placeholder - we'd need to implement this properly
      return [];
    } catch (error) {
      console.error("Error getting all donations:", error);
      return [];
    }
  }

  /**
   * Check migration status for an organization
   */
  async checkOrganizationMigrationStatus(organizationId: number): Promise<{
    hasDefaultFund: boolean;
    hasDefaultPaymentAccount: boolean;
    donationsNeedingBackfill: number;
    isComplete: boolean;
  }> {
    const defaultFund = await this.storage.getDefaultFund(organizationId);
    const defaultPaymentAccount = await this.storage.getDefaultPaymentAccount(organizationId);
    
    const donations = await this.storage.getDonationsByOrganization(organizationId);
    const donationsNeedingBackfill = donations.filter(d => !d.fundId || !d.paymentAccountId).length;

    return {
      hasDefaultFund: !!defaultFund,
      hasDefaultPaymentAccount: !!defaultPaymentAccount,
      donationsNeedingBackfill,
      isComplete: !!defaultFund && !!defaultPaymentAccount && donationsNeedingBackfill === 0
    };
  }
}