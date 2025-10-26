/**
 * Disputes Storage - Handles payment disputes and chargebacks database operations
 */
import {
  disputes,
  disputeDocuments,
  donations,
  donors,
  type SelectDispute,
  type InsertDispute,
  type SelectDisputeDocument,
  type InsertDisputeDocument,
} from "@shared/schema";
import { db } from "../db";
import { eq, desc, and, sql } from "drizzle-orm";

export class DisputesStorage {
  async getDisputesByOrganization(organizationId: number): Promise<SelectDispute[]> {
    return await db
      .select()
      .from(disputes)
      .where(eq(disputes.organizationId, organizationId))
      .orderBy(desc(disputes.createdAt));
  }

  async getDispute(id: number): Promise<SelectDispute | undefined> {
    const [dispute] = await db
      .select()
      .from(disputes)
      .where(eq(disputes.id, id));
    return dispute;
  }

  async getDisputeByCaseId(caseId: string): Promise<SelectDispute | undefined> {
    const [dispute] = await db
      .select()
      .from(disputes)
      .where(eq(disputes.initialCaseId, caseId));
    return dispute;
  }

  async createDispute(dispute: InsertDispute): Promise<SelectDispute> {
    const [newDispute] = await db
      .insert(disputes)
      .values(dispute)
      .returning();
    return newDispute;
  }

  async updateDispute(id: number, updates: Partial<SelectDispute>): Promise<SelectDispute> {
    const [dispute] = await db
      .update(disputes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(disputes.id, id))
      .returning();
    return dispute;
  }

  async deleteDispute(id: number): Promise<void> {
    await db
      .delete(disputes)
      .where(eq(disputes.id, id));
  }

  async getDisputeStats(organizationId: number): Promise<{
    totalDisputes: number;
    totalVolume: string;
    byCardBrand: Record<string, { count: number; volume: string }>;
  }> {
    // Get total disputes and volume
    const totalStats = await db
      .select({
        count: sql<number>`COUNT(*)::int`,
        volume: sql<string>`COALESCE(SUM(${disputes.amount}), 0)::text`,
      })
      .from(disputes)
      .where(eq(disputes.organizationId, organizationId));

    // Get stats by card brand
    const brandStats = await db
      .select({
        cardBrand: disputes.cardBrand,
        count: sql<number>`COUNT(*)::int`,
        volume: sql<string>`COALESCE(SUM(${disputes.amount}), 0)::text`,
      })
      .from(disputes)
      .where(and(
        eq(disputes.organizationId, organizationId),
        sql`${disputes.cardBrand} IS NOT NULL`
      ))
      .groupBy(disputes.cardBrand);

    const byCardBrand: Record<string, { count: number; volume: string }> = {};
    brandStats.forEach((stat) => {
      if (stat.cardBrand) {
        byCardBrand[stat.cardBrand] = {
          count: stat.count,
          volume: stat.volume,
        };
      }
    });

    return {
      totalDisputes: totalStats[0]?.count || 0,
      totalVolume: totalStats[0]?.volume || "0",
      byCardBrand,
    };
  }

  // Dispute Documents Methods
  async getDisputeDocuments(disputeId: number): Promise<SelectDisputeDocument[]> {
    return await db
      .select()
      .from(disputeDocuments)
      .where(eq(disputeDocuments.disputeId, disputeId))
      .orderBy(desc(disputeDocuments.createdAt));
  }

  async getDisputeDocument(id: number): Promise<SelectDisputeDocument | undefined> {
    const [document] = await db
      .select()
      .from(disputeDocuments)
      .where(eq(disputeDocuments.id, id));
    return document;
  }

  async createDisputeDocument(document: InsertDisputeDocument): Promise<SelectDisputeDocument> {
    const [newDocument] = await db
      .insert(disputeDocuments)
      .values(document)
      .returning();
    return newDocument;
  }

  async deleteDisputeDocument(id: number): Promise<void> {
    await db
      .delete(disputeDocuments)
      .where(eq(disputeDocuments.id, id));
  }
}
