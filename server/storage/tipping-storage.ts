/**
 * Platform Tipping Storage Module
 * Handles CRUD operations for organization tipping settings
 */
import { db } from "../db";
import { organizationTippingSettings } from "@shared/schema";
import type { OrganizationTippingSettings, InsertOrganizationTippingSettings } from "@shared/schema";
import { eq } from "drizzle-orm";

export class TippingStorage {
  async getTippingSettings(organizationId: number): Promise<OrganizationTippingSettings | undefined> {
    const result = await db
      .select()
      .from(organizationTippingSettings)
      .where(eq(organizationTippingSettings.organizationId, organizationId))
      .limit(1);
    
    return result[0];
  }

  async createTippingSettings(settings: InsertOrganizationTippingSettings): Promise<OrganizationTippingSettings> {
    const result = await db
      .insert(organizationTippingSettings)
      .values(settings)
      .returning();
    
    return result[0];
  }

  async updateTippingSettings(
    organizationId: number, 
    updates: Partial<OrganizationTippingSettings>
  ): Promise<OrganizationTippingSettings> {
    const result = await db
      .update(organizationTippingSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(organizationTippingSettings.organizationId, organizationId))
      .returning();
    
    return result[0];
  }

  async upsertTippingSettings(
    organizationId: number,
    settings: Partial<OrganizationTippingSettings>
  ): Promise<OrganizationTippingSettings> {
    const existing = await this.getTippingSettings(organizationId);
    
    if (existing) {
      return this.updateTippingSettings(organizationId, settings);
    } else {
      return this.createTippingSettings({
        organizationId,
        ...settings
      } as InsertOrganizationTippingSettings);
    }
  }
}