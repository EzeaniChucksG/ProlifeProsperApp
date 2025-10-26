/**
 * Fund Storage Module
 * Handles fund operations for the hybrid architecture
 */
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { funds } from "@shared/schema";
import type { Fund, InsertFund } from "@shared/schema";

export class FundStorage {
  /**
   * Get all funds for an organization
   */
  async getFundsByOrganization(organizationId: number): Promise<Fund[]> {
    return await db
      .select()
      .from(funds)
      .where(eq(funds.organizationId, organizationId))
      .orderBy(funds.isDefault.desc(), funds.name.asc());
  }

  /**
   * Get a specific fund by ID
   */
  async getFund(id: number): Promise<Fund | undefined> {
    const result = await db
      .select()
      .from(funds)
      .where(eq(funds.id, id))
      .limit(1);
    
    return result[0];
  }

  /**
   * Get the default fund for an organization
   */
  async getDefaultFund(organizationId: number): Promise<Fund | undefined> {
    const result = await db
      .select()
      .from(funds)
      .where(
        and(
          eq(funds.organizationId, organizationId),
          eq(funds.isDefault, true),
          eq(funds.isActive, true)
        )
      )
      .limit(1);
    
    return result[0];
  }

  /**
   * Get a fund by type (e.g., "general", "church_offering", "campaign", "product")
   */
  async getFundByType(organizationId: number, type: string): Promise<Fund | undefined> {
    const result = await db
      .select()
      .from(funds)
      .where(
        and(
          eq(funds.organizationId, organizationId),
          eq(funds.type, type),
          eq(funds.isActive, true)
        )
      )
      .limit(1);
    
    return result[0];
  }

  /**
   * Create a new fund
   */
  async createFund(fund: InsertFund): Promise<Fund> {
    const result = await db
      .insert(funds)
      .values(fund)
      .returning();
    
    return result[0];
  }

  /**
   * Update a fund
   */
  async updateFund(id: number, updates: Partial<Fund>): Promise<Fund> {
    const result = await db
      .update(funds)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(funds.id, id))
      .returning();
    
    return result[0];
  }

  /**
   * Set a fund as the default for an organization
   * This will unset any existing default and set the new one
   */
  async setDefaultFund(organizationId: number, fundId: number): Promise<void> {
    await db.transaction(async (tx) => {
      // First, unset any existing default
      await tx
        .update(funds)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(
          and(
            eq(funds.organizationId, organizationId),
            eq(funds.isDefault, true)
          )
        );

      // Then set the new default
      await tx
        .update(funds)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(eq(funds.id, fundId));
    });
  }

  /**
   * Create a default "General Fund" for an organization
   */
  async createDefaultGeneralFund(organizationId: number): Promise<Fund> {
    const generalFund: InsertFund = {
      organizationId,
      name: "General Fund",
      code: "GENERAL",
      type: "general",
      description: "Default fund for general donations and operations",
      isActive: true,
      isDefault: true,
      settings: {}
    };

    return await this.createFund(generalFund);
  }

  /**
   * Get or create a fund for a specific context (campaign, product, event, etc.)
   */
  async getOrCreateContextFund(
    organizationId: number,
    contextType: string,
    contextId: number,
    contextName: string
  ): Promise<Fund> {
    // Try to find existing fund for this context
    const existingFund = await db
      .select()
      .from(funds)
      .where(
        and(
          eq(funds.organizationId, organizationId),
          eq(funds.type, contextType),
          eq(funds.settings, { contextId })
        )
      )
      .limit(1);

    if (existingFund[0]) {
      return existingFund[0];
    }

    // Create new fund for this context
    const newFund: InsertFund = {
      organizationId,
      name: `${contextName} Fund`,
      code: `${contextType.toUpperCase()}_${contextId}`,
      type: contextType,
      description: `Fund for ${contextType}: ${contextName}`,
      isActive: true,
      isDefault: false,
      settings: { contextId }
    };

    return await this.createFund(newFund);
  }
}