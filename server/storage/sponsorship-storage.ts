/**
 * Event Sponsorship Management Storage Module
 * Handles CRUD operations for sponsorship tiers and sponsors
 */
import { db } from "../db";
import { sponsorshipTiers, eventSponsors } from "@shared/schema";
import type { 
  SponsorshipTier, 
  InsertSponsorshipTier, 
  EventSponsor, 
  InsertEventSponsor 
} from "@shared/schema";
import { eq, and } from "drizzle-orm";

export class SponsorshipStorage {
  // Sponsorship Tiers
  async getSponsorshipTiersByOrganization(organizationId: number): Promise<SponsorshipTier[]> {
    return await db
      .select()
      .from(sponsorshipTiers)
      .where(and(
        eq(sponsorshipTiers.organizationId, organizationId),
        eq(sponsorshipTiers.isActive, true)
      ))
      .orderBy(sponsorshipTiers.tierPrice);
  }

  async getSponsorshipTiersByEvent(eventId: number): Promise<SponsorshipTier[]> {
    return await db
      .select()
      .from(sponsorshipTiers)
      .where(and(
        eq(sponsorshipTiers.eventId, eventId),
        eq(sponsorshipTiers.isActive, true)
      ))
      .orderBy(sponsorshipTiers.tierPrice);
  }

  async getSponsorshipTier(id: number): Promise<SponsorshipTier | undefined> {
    const result = await db
      .select()
      .from(sponsorshipTiers)
      .where(eq(sponsorshipTiers.id, id))
      .limit(1);
    
    return result[0];
  }

  async createSponsorshipTier(tier: InsertSponsorshipTier): Promise<SponsorshipTier> {
    const result = await db
      .insert(sponsorshipTiers)
      .values(tier)
      .returning();
    
    return result[0];
  }

  async updateSponsorshipTier(
    id: number, 
    updates: Partial<SponsorshipTier>
  ): Promise<SponsorshipTier> {
    const result = await db
      .update(sponsorshipTiers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(sponsorshipTiers.id, id))
      .returning();
    
    return result[0];
  }

  async deleteSponsorshipTier(id: number): Promise<void> {
    await db
      .update(sponsorshipTiers)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(sponsorshipTiers.id, id));
  }

  // Event Sponsors
  async getEventSponsorsByTier(tierId: number): Promise<EventSponsor[]> {
    return await db
      .select()
      .from(eventSponsors)
      .where(eq(eventSponsors.tierID, tierId))
      .orderBy(eventSponsors.createdAt);
  }

  async getEventSponsorsByOrganization(organizationId: number): Promise<any[]> {
    return await db
      .select({
        id: eventSponsors.id,
        tierID: eventSponsors.tierID,
        sponsorName: eventSponsors.sponsorName,
        contactName: eventSponsors.contactName,
        contactEmail: eventSponsors.contactEmail,
        contactPhone: eventSponsors.contactPhone,
        amountPaid: eventSponsors.amountPaid,
        status: eventSponsors.status,
        confirmationDate: eventSponsors.confirmationDate,
        paymentDate: eventSponsors.paymentDate,
        createdAt: eventSponsors.createdAt,
        updatedAt: eventSponsors.updatedAt,
        tierName: sponsorshipTiers.tierName,
        tierPrice: sponsorshipTiers.tierPrice
      })
      .from(eventSponsors)
      .innerJoin(sponsorshipTiers, eq(eventSponsors.tierID, sponsorshipTiers.id))
      .where(eq(sponsorshipTiers.organizationId, organizationId))
      .orderBy(eventSponsors.createdAt);
  }

  async getEventSponsor(id: number): Promise<EventSponsor | undefined> {
    const result = await db
      .select()
      .from(eventSponsors)
      .where(eq(eventSponsors.id, id))
      .limit(1);
    
    return result[0];
  }

  async createEventSponsor(sponsor: InsertEventSponsor): Promise<EventSponsor> {
    const result = await db
      .insert(eventSponsors)
      .values(sponsor)
      .returning();
    
    // Update sold spots count
    await this.updateTierSoldSpots(sponsor.tierID);
    
    return result[0];
  }

  async updateEventSponsor(
    id: number, 
    updates: Partial<EventSponsor>
  ): Promise<EventSponsor> {
    const result = await db
      .update(eventSponsors)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(eventSponsors.id, id))
      .returning();
    
    return result[0];
  }

  async deleteEventSponsor(id: number): Promise<void> {
    const sponsor = await this.getEventSponsor(id);
    if (sponsor) {
      await db
        .delete(eventSponsors)
        .where(eq(eventSponsors.id, id));
      
      // Update sold spots count
      await this.updateTierSoldSpots(sponsor.tierID);
    }
  }

  private async updateTierSoldSpots(tierId: number): Promise<void> {
    const sponsorCount = await db
      .select()
      .from(eventSponsors)
      .where(eq(eventSponsors.tierID, tierId));
    
    await db
      .update(sponsorshipTiers)
      .set({ 
        soldSpots: sponsorCount.length,
        updatedAt: new Date()
      })
      .where(eq(sponsorshipTiers.id, tierId));
  }
}