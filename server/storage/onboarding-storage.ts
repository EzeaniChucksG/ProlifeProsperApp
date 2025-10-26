/**
 * Onboarding Storage - Handles onboarding-related database operations
 */
import {
  organizationOnboarding,
  type OrganizationOnboarding,
  type InsertOnboarding,
} from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

export class OnboardingStorage {
  async getOnboardingSteps(organizationId: number): Promise<OrganizationOnboarding[]> {
    return await db
      .select()
      .from(organizationOnboarding)
      .where(eq(organizationOnboarding.organizationId, organizationId));
  }

  async createOnboardingStep(step: InsertOnboarding): Promise<OrganizationOnboarding> {
    const [newStep] = await db
      .insert(organizationOnboarding)
      .values(step)
      .returning();
    return newStep;
  }

  async updateOnboardingStep(
    id: number,
    updates: Partial<OrganizationOnboarding>,
  ): Promise<OrganizationOnboarding> {
    const [step] = await db
      .update(organizationOnboarding)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(organizationOnboarding.id, id))
      .returning();
    return step;
  }
}