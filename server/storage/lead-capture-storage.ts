/**
 * Lead Capture Storage Implementation
 * Handles storage operations for lead captures (email collection)
 */

import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import { leadCaptures } from "@shared/schema";
import type { LeadCapture, InsertLeadCapture } from "@shared/schema";

export class LeadCaptureStorage {
  /**
   * Create a new lead capture
   */
  async createLeadCapture(leadCapture: InsertLeadCapture): Promise<LeadCapture> {
    const [created] = await db
      .insert(leadCaptures)
      .values(leadCapture)
      .returning();

    if (!created) {
      throw new Error("Failed to create lead capture");
    }

    return created;
  }

  /**
   * Get all lead captures for an organization
   */
  async getLeadCapturesByOrganization(organizationId: number): Promise<LeadCapture[]> {
    return await db
      .select()
      .from(leadCaptures)
      .where(eq(leadCaptures.organizationId, organizationId))
      .orderBy(desc(leadCaptures.createdAt));
  }

  /**
   * Get all lead captures for a specific donation product
   */
  async getLeadCapturesByProduct(donationProductId: number): Promise<LeadCapture[]> {
    return await db
      .select()
      .from(leadCaptures)
      .where(eq(leadCaptures.donationProductId, donationProductId))
      .orderBy(desc(leadCaptures.createdAt));
  }

  /**
   * Get lead captures by email and organization (for deduplication)
   */
  async getLeadCapturesByEmail(organizationId: number, email: string): Promise<LeadCapture[]> {
    return await db
      .select()
      .from(leadCaptures)
      .where(
        and(
          eq(leadCaptures.organizationId, organizationId),
          eq(leadCaptures.email, email.toLowerCase())
        )
      )
      .orderBy(desc(leadCaptures.createdAt));
  }

  /**
   * Check if email has already been captured for specific product
   */
  async isEmailCapturedForProduct(donationProductId: number, email: string): Promise<boolean> {
    const existing = await db
      .select({ id: leadCaptures.id })
      .from(leadCaptures)
      .where(
        and(
          eq(leadCaptures.donationProductId, donationProductId),
          eq(leadCaptures.email, email.toLowerCase())
        )
      )
      .limit(1);

    return existing.length > 0;
  }
}