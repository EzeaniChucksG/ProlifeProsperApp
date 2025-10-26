/**
 * SendGrid Storage - Handles SendGrid email campaign and analytics database operations
 */
import {
  sendgridEmailCampaigns,
  sendgridEmailRecipients,
  sendgridWebhookEvents,
  sendgridEmailAnalytics,
  type SendgridEmailCampaign,
  type InsertSendgridEmailCampaign,
  type SendgridEmailRecipient,
  type InsertSendgridEmailRecipient,
  type SendgridWebhookEvent,
  type InsertSendgridWebhookEvent,
  type SendgridEmailAnalytics,
  type InsertSendgridEmailAnalytics,
} from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

export class SendgridStorage {
  // SendGrid Campaign methods
  async getSendgridCampaignsByOrganization(
    organizationId: number,
  ): Promise<SendgridEmailCampaign[]> {
    return await db
      .select()
      .from(sendgridEmailCampaigns)
      .where(eq(sendgridEmailCampaigns.organizationId, organizationId));
  }

  async getSendgridCampaignById(
    campaignId: number,
  ): Promise<SendgridEmailCampaign | undefined> {
    const [campaign] = await db
      .select()
      .from(sendgridEmailCampaigns)
      .where(eq(sendgridEmailCampaigns.id, campaignId));
    return campaign || undefined;
  }

  async createSendgridCampaign(
    campaign: InsertSendgridEmailCampaign,
  ): Promise<SendgridEmailCampaign> {
    const [newCampaign] = await db
      .insert(sendgridEmailCampaigns)
      .values(campaign)
      .returning();
    return newCampaign;
  }

  async updateSendgridCampaign(
    campaignId: number,
    updates: Partial<SendgridEmailCampaign>,
  ): Promise<SendgridEmailCampaign> {
    const [campaign] = await db
      .update(sendgridEmailCampaigns)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(sendgridEmailCampaigns.id, campaignId))
      .returning();
    return campaign;
  }

  async deleteSendgridCampaign(campaignId: number): Promise<void> {
    await db
      .delete(sendgridEmailCampaigns)
      .where(eq(sendgridEmailCampaigns.id, campaignId));
  }

  // SendGrid Recipient methods
  async getSendgridRecipientsByCampaign(
    campaignId: number,
  ): Promise<SendgridEmailRecipient[]> {
    return await db
      .select()
      .from(sendgridEmailRecipients)
      .where(eq(sendgridEmailRecipients.campaignId, campaignId));
  }

  async createSendgridRecipient(
    recipient: InsertSendgridEmailRecipient,
  ): Promise<SendgridEmailRecipient> {
    const [newRecipient] = await db
      .insert(sendgridEmailRecipients)
      .values(recipient)
      .returning();
    return newRecipient;
  }

  async updateSendgridRecipient(
    recipientId: number,
    updates: Partial<SendgridEmailRecipient>,
  ): Promise<SendgridEmailRecipient> {
    const [recipient] = await db
      .update(sendgridEmailRecipients)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(sendgridEmailRecipients.id, recipientId))
      .returning();
    return recipient;
  }

  // SendGrid Webhook Event methods
  async createSendgridWebhookEvent(
    event: InsertSendgridWebhookEvent,
  ): Promise<SendgridWebhookEvent> {
    const [newEvent] = await db
      .insert(sendgridWebhookEvents)
      .values(event)
      .returning();
    return newEvent;
  }

  async getSendgridWebhookEventsByCampaign(
    campaignId: number,
  ): Promise<SendgridWebhookEvent[]> {
    return await db
      .select()
      .from(sendgridWebhookEvents)
      .where(eq(sendgridWebhookEvents.campaignId, campaignId));
  }

  // SendGrid Analytics methods
  async getSendgridAnalyticsByCampaign(
    campaignId: number,
  ): Promise<SendgridEmailAnalytics[]> {
    return await db
      .select()
      .from(sendgridEmailAnalytics)
      .where(eq(sendgridEmailAnalytics.campaignId, campaignId));
  }

  async createOrUpdateSendgridAnalytics(
    analytics: InsertSendgridEmailAnalytics,
  ): Promise<SendgridEmailAnalytics> {
    // Try to find existing analytics for this campaign
    const existing = await db
      .select()
      .from(sendgridEmailAnalytics)
      .where(eq(sendgridEmailAnalytics.campaignId, analytics.campaignId));

    if (existing.length > 0) {
      // Update existing
      const [updatedAnalytics] = await db
        .update(sendgridEmailAnalytics)
        .set({ ...analytics, updatedAt: new Date() })
        .where(eq(sendgridEmailAnalytics.campaignId, analytics.campaignId))
        .returning();
      return updatedAnalytics;
    } else {
      // Create new
      const [newAnalytics] = await db
        .insert(sendgridEmailAnalytics)
        .values(analytics)
        .returning();
      return newAnalytics;
    }
  }

  // Email Template methods (placeholder implementations)
  async getEmailTemplates(): Promise<any[]> {
    // This would integrate with actual email template storage
    // For now, return empty array
    return [];
  }

  async getEmailTemplateById(id: number): Promise<any> {
    // Placeholder implementation
    return null;
  }

  async createEmailTemplate(template: any): Promise<any> {
    // Placeholder implementation
    return template;
  }

  async updateEmailTemplate(id: number, updates: any): Promise<any> {
    // Placeholder implementation
    return updates;
  }

  async deleteEmailTemplate(id: number): Promise<void> {
    // Placeholder implementation
  }

  async getEmailTemplateVariables(): Promise<any[]> {
    // Placeholder implementation
    return [];
  }

  async sendTemplateEmail(params: any): Promise<any> {
    // Placeholder implementation
    return params;
  }
}