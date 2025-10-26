/**
 * Donation Storage - Handles donation-related database operations
 */
import {
  donations,
  campaigns,
  type Donation,
  type InsertDonation,
} from "@shared/schema";
import { db } from "../db";
import { eq, desc } from "drizzle-orm";

export class DonationStorage {
  async getDonationsByOrganization(
    organizationId: number,
    limit?: number,
  ): Promise<any[]> {
    let query = db
      .select({
        id: donations.id,
        organizationId: donations.organizationId,
        campaignId: donations.campaignId,
        donorId: donations.donorId,
        amount: donations.amount,
        totalAmount: donations.totalAmount,
        status: donations.status,
        paymentMethod: donations.paymentMethod,
        isAnonymous: donations.isAnonymous,
        donorFirstName: donations.donorFirstName,
        donorLastName: donations.donorLastName,
        donorEmail: donations.donorEmail,
        gettrxPaymentRequestId: donations.gettrxPaymentRequestId,
        gettrxCustomerId: donations.gettrxCustomerId,
        createdAt: donations.createdAt,
        updatedAt: donations.updatedAt,
        campaignName: campaigns.name,
      })
      .from(donations)
      .leftJoin(campaigns, eq(donations.campaignId, campaigns.id))
      .where(eq(donations.organizationId, organizationId))
      .orderBy(desc(donations.createdAt));

    if (limit) {
      query = query.limit(limit);
    }

    return await query;
  }

  async getDonationsByCampaign(campaignId: number): Promise<Donation[]> {
    return await db
      .select()
      .from(donations)
      .where(eq(donations.campaignId, campaignId))
      .orderBy(desc(donations.createdAt));
  }

  async createDonation(donation: InsertDonation): Promise<Donation> {
    const [newDonation] = await db
      .insert(donations)
      .values(donation)
      .returning();
    return newDonation;
  }

  async updateDonation(id: number, updates: Partial<Donation>): Promise<Donation> {
    const [donation] = await db
      .update(donations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(donations.id, id))
      .returning();
    return donation;
  }
}