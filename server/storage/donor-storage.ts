/**
 * Donor Storage - Handles donor-related database operations
 */
import {
  donors,
  type Donor,
  type InsertDonor,
} from "@shared/schema";
import { db } from "../db";
import { eq, and } from "drizzle-orm";

export class DonorStorage {
  async getDonorsByOrganization(organizationId: number): Promise<Donor[]> {
    return await db
      .select()
      .from(donors)
      .where(eq(donors.organizationId, organizationId));
  }

  async getDonorByEmail(
    organizationId: number,
    email: string,
  ): Promise<Donor | undefined> {
    const [donor] = await db
      .select()
      .from(donors)
      .where(
        and(
          eq(donors.organizationId, organizationId),
          eq(donors.email, email)
        )
      );
    return donor || undefined;
  }

  async findDonorByEmail(
    organizationId: number,
    email: string,
  ): Promise<Donor | undefined> {
    return await this.getDonorByEmail(organizationId, email);
  }

  async createDonor(donor: InsertDonor): Promise<Donor> {
    const [newDonor] = await db.insert(donors).values(donor).returning();
    return newDonor;
  }

  async updateDonor(id: number, updates: Partial<Donor>): Promise<Donor> {
    const [donor] = await db
      .update(donors)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(donors.id, id))
      .returning();
    return donor;
  }

  async getDonorById(id: number): Promise<Donor | undefined> {
    const [donor] = await db
      .select()
      .from(donors)
      .where(eq(donors.id, id));
    return donor || undefined;
  }
}