/**
 * Organization Storage - Handles organization-related database operations
 */
import {
  organizations,
  type Organization,
  type InsertOrganization,
} from "@shared/schema";
import { db } from "../db";
import { eq, sql } from "drizzle-orm";
import { 
  safeEncryptSecret, 
  safeDecryptSecret, 
  redactSensitiveFields 
} from "../utils/crypto";

export class OrganizationStorage {
  /**
   * Helper method to encrypt BTCPay secrets in organization data
   */
  private encryptOrganizationSecrets(org: any): any {
    const encrypted = { ...org };
    if (encrypted.btcpayApiKey) {
      encrypted.btcpayApiKey = safeEncryptSecret(encrypted.btcpayApiKey);
    }
    if (encrypted.btcpayWebhookSecret) {
      encrypted.btcpayWebhookSecret = safeEncryptSecret(encrypted.btcpayWebhookSecret);
    }
    return encrypted;
  }

  /**
   * Helper method to decrypt BTCPay secrets in organization data  
   */
  private decryptOrganizationSecrets(org: Organization): Organization {
    if (!org) return org;
    
    const decrypted = { ...org };
    if (decrypted.btcpayApiKey) {
      decrypted.btcpayApiKey = safeDecryptSecret(decrypted.btcpayApiKey);
    }
    if (decrypted.btcpayWebhookSecret) {
      decrypted.btcpayWebhookSecret = safeDecryptSecret(decrypted.btcpayWebhookSecret);
    }
    return decrypted;
  }

  /**
   * Helper method to redact organization secrets for API responses
   */
  public redactOrganizationSecrets(org: Organization): any {
    if (!org) return org;
    return redactSensitiveFields(org);
  }
  async getOrganizationById(id: number): Promise<Organization | undefined> {
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id));
    
    if (!organization) return undefined;
    
    // Decrypt secrets for application use
    return this.decryptOrganizationSecrets(organization);
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | undefined> {
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, slug));
    
    if (!organization) return undefined;
    
    // Decrypt secrets for application use
    return this.decryptOrganizationSecrets(organization);
  }

  async getDefaultAdminOrganization(): Promise<Organization | undefined> {
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, 1));
    
    if (!organization) return undefined;
    
    // Decrypt secrets for application use
    return this.decryptOrganizationSecrets(organization);
  }

  async createOrganization(organization: InsertOrganization): Promise<Organization> {
    // Encrypt BTCPay secrets before storing
    const orgWithEncryptedSecrets = this.encryptOrganizationSecrets(organization);

    const [newOrganization] = await db
      .insert(organizations)
      .values(orgWithEncryptedSecrets)
      .returning();
    
    // Decrypt secrets for return value (but don't expose them)
    return this.decryptOrganizationSecrets(newOrganization);
  }

  async updateOrganization(
    id: number,
    updates: Partial<Organization>,
  ): Promise<Organization> {
    // Encrypt BTCPay secrets before storing
    const updatesWithEncryptedSecrets = this.encryptOrganizationSecrets(updates);
    
    const [organization] = await db
      .update(organizations)
      .set({ ...updatesWithEncryptedSecrets, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();
    
    // Decrypt secrets for return value
    return this.decryptOrganizationSecrets(organization);
  }

  async updateOrganizationSettings(id: number, settings: any): Promise<Organization> {
    // Extract direct organization fields from settings
    const { settings: orgSettings, ...directFields } = settings;
    
    // Build update object with direct fields and settings
    const updateData: any = {
      ...directFields,
      updatedAt: new Date()
    };
    
    // If there are additional settings, merge them with existing settings
    if (orgSettings) {
      // Get current organization to preserve existing settings
      const [currentOrg] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, id));
      
      if (currentOrg) {
        updateData.settings = {
          ...(currentOrg.settings || {}),
          ...orgSettings
        };
      } else {
        updateData.settings = orgSettings;
      }
    }
    
    const [organization] = await db
      .update(organizations)
      .set(updateData)
      .where(eq(organizations.id, id))
      .returning();
    return organization;
  }

  async updateOrganizationIntegrations(
    id: number,
    integrations: {
      smsProvider?: string;
      smsConnectionStatus?: string;
      smsMetadata?: any;
      marketingProvider?: string;
      marketingConnectionStatus?: string;
      marketingMetadata?: any;
      crmProvider?: string;
      crmConnectionStatus?: string;
      crmMetadata?: any;
    },
  ): Promise<Organization> {
    const updateData: any = {
      ...integrations,
      updatedAt: new Date()
    };

    const [organization] = await db
      .update(organizations)
      .set(updateData)
      .where(eq(organizations.id, id))
      .returning();
    
    return organization;
  }

  async validateCustomDomain(
    domain: string,
  ): Promise<{ valid: boolean; message: string }> {
    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    
    if (!domainRegex.test(domain)) {
      return {
        valid: false,
        message: "Invalid domain format"
      };
    }

    // Check if domain is already in use
    const [existingOrg] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.customDomain, domain));
    
    if (existingOrg) {
      return {
        valid: false,
        message: "Domain is already in use"
      };
    }

    return {
      valid: true,
      message: "Domain is available"
    };
  }
}