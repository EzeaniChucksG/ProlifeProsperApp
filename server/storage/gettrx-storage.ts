/**
 * GETTRX Storage - Handles GETTRX payment processing database operations
 */
import {
  gettrxPaymentMethods,
  gettrxTransfers,
  gettrxRecurringSchedules,
  gettrxMerchantApplications,
  gettrxAcceptanceTokens,
  gettrxWebhookEvents,
  type SelectGettrxPaymentMethod,
  type InsertGettrxPaymentMethod,
  type SelectGettrxTransfer,
  type InsertGettrxTransfer,
  type SelectGettrxRecurringSchedule,
  type InsertGettrxRecurringSchedule,
  type SelectGettrxMerchantApplication,
  type InsertGettrxMerchantApplication,
  type SelectGettrxAcceptanceToken,
  type InsertGettrxAcceptanceToken,
  type SelectGettrxWebhookEvent,
  type InsertGettrxWebhookEvent,
} from "@shared/schema";
import { db } from "../db";
import { eq, desc, and, sql } from "drizzle-orm";

export class GettrxStorage {
  // GETTRX Payment Methods
  async getGettrxPaymentMethods(
    organizationId: number,
  ): Promise<SelectGettrxPaymentMethod[]> {
    return await db
      .select()
      .from(gettrxPaymentMethods)
      .where(eq(gettrxPaymentMethods.organizationId, organizationId))
      .orderBy(desc(gettrxPaymentMethods.createdAt));
  }

  async getGettrxPaymentMethod(
    id: number,
  ): Promise<SelectGettrxPaymentMethod | undefined> {
    const [paymentMethod] = await db
      .select()
      .from(gettrxPaymentMethods)
      .where(eq(gettrxPaymentMethods.id, id));
    return paymentMethod || undefined;
  }

  async createGettrxPaymentMethod(
    paymentMethod: InsertGettrxPaymentMethod,
  ): Promise<SelectGettrxPaymentMethod> {
    const [newPaymentMethod] = await db
      .insert(gettrxPaymentMethods)
      .values(paymentMethod)
      .returning();
    return newPaymentMethod;
  }

  async updateGettrxPaymentMethod(
    id: number,
    updates: Partial<SelectGettrxPaymentMethod>,
  ): Promise<SelectGettrxPaymentMethod> {
    const [paymentMethod] = await db
      .update(gettrxPaymentMethods)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(gettrxPaymentMethods.id, id))
      .returning();
    return paymentMethod;
  }

  async deleteGettrxPaymentMethod(id: number): Promise<void> {
    await db
      .delete(gettrxPaymentMethods)
      .where(eq(gettrxPaymentMethods.id, id));
  }

  // GETTRX Transfers
  async getGettrxTransfers(organizationId: number): Promise<SelectGettrxTransfer[]> {
    return await db
      .select()
      .from(gettrxTransfers)
      .where(eq(gettrxTransfers.organizationId, organizationId))
      .orderBy(desc(gettrxTransfers.createdAt));
  }

  async getGettrxTransfer(id: number): Promise<SelectGettrxTransfer | undefined> {
    const [transfer] = await db
      .select()
      .from(gettrxTransfers)
      .where(eq(gettrxTransfers.id, id));
    return transfer || undefined;
  }

  async createGettrxTransfer(
    transfer: InsertGettrxTransfer,
  ): Promise<SelectGettrxTransfer> {
    const [newTransfer] = await db
      .insert(gettrxTransfers)
      .values(transfer)
      .returning();
    return newTransfer;
  }

  async updateGettrxTransfer(
    id: number,
    updates: Partial<SelectGettrxTransfer>,
  ): Promise<SelectGettrxTransfer> {
    const [transfer] = await db
      .update(gettrxTransfers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(gettrxTransfers.id, id))
      .returning();
    return transfer;
  }

  // GETTRX Recurring Schedules
  async getGettrxRecurringSchedules(
    organizationId: number,
  ): Promise<SelectGettrxRecurringSchedule[]> {
    return await db
      .select()
      .from(gettrxRecurringSchedules)
      .where(eq(gettrxRecurringSchedules.organizationId, organizationId))
      .orderBy(desc(gettrxRecurringSchedules.createdAt));
  }

  async getGettrxRecurringSchedule(
    id: number,
  ): Promise<SelectGettrxRecurringSchedule | undefined> {
    const [schedule] = await db
      .select()
      .from(gettrxRecurringSchedules)
      .where(eq(gettrxRecurringSchedules.id, id));
    return schedule || undefined;
  }

  async getGettrxRecurringSchedulesDue(
    beforeDate: Date,
  ): Promise<SelectGettrxRecurringSchedule[]> {
    return await db
      .select()
      .from(gettrxRecurringSchedules)
      .where(
        and(
          eq(gettrxRecurringSchedules.status, "active"),
          sql`${gettrxRecurringSchedules.nextPaymentDate} <= ${beforeDate.toISOString()}`,
        ),
      )
      .orderBy(gettrxRecurringSchedules.nextPaymentDate);
  }

  async createGettrxRecurringSchedule(
    schedule: InsertGettrxRecurringSchedule,
  ): Promise<SelectGettrxRecurringSchedule> {
    const [newSchedule] = await db
      .insert(gettrxRecurringSchedules)
      .values(schedule)
      .returning();
    return newSchedule;
  }

  async updateGettrxRecurringSchedule(
    id: number,
    updates: Partial<SelectGettrxRecurringSchedule>,
  ): Promise<SelectGettrxRecurringSchedule> {
    const [schedule] = await db
      .update(gettrxRecurringSchedules)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(gettrxRecurringSchedules.id, id))
      .returning();
    return schedule;
  }

  async cancelGettrxRecurringSchedule(
    id: number,
  ): Promise<SelectGettrxRecurringSchedule> {
    const [schedule] = await db
      .update(gettrxRecurringSchedules)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(gettrxRecurringSchedules.id, id))
      .returning();
    return schedule;
  }

  // GETTRX Merchant Applications
  async getGettrxMerchantApplications(
    organizationId: number,
  ): Promise<SelectGettrxMerchantApplication[]> {
    return await db
      .select()
      .from(gettrxMerchantApplications)
      .where(eq(gettrxMerchantApplications.organizationId, organizationId))
      .orderBy(desc(gettrxMerchantApplications.createdAt));
  }

  async getGettrxMerchantApplication(
    id: number,
  ): Promise<SelectGettrxMerchantApplication | undefined> {
    const [application] = await db
      .select()
      .from(gettrxMerchantApplications)
      .where(eq(gettrxMerchantApplications.id, id));
    return application || undefined;
  }

  async createGettrxMerchantApplication(
    application: InsertGettrxMerchantApplication,
  ): Promise<SelectGettrxMerchantApplication> {
    const [newApplication] = await db
      .insert(gettrxMerchantApplications)
      .values(application)
      .returning();
    return newApplication;
  }

  async getGettrxMerchantApplicationByGettrxId(
    gettrxApplicationId: string,
  ): Promise<SelectGettrxMerchantApplication | undefined> {
    const [application] = await db
      .select()
      .from(gettrxMerchantApplications)
      .where(eq(gettrxMerchantApplications.gettrxApplicationId, gettrxApplicationId));
    return application || undefined;
  }

  async updateGettrxMerchantApplication(
    id: number,
    updates: Partial<SelectGettrxMerchantApplication>,
  ): Promise<SelectGettrxMerchantApplication> {
    const [application] = await db
      .update(gettrxMerchantApplications)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(gettrxMerchantApplications.id, id))
      .returning();
    return application;
  }

  // GETTRX Acceptance Tokens
  async getGettrxAcceptanceTokens(
    applicationId: number,
  ): Promise<SelectGettrxAcceptanceToken[]> {
    return await db
      .select()
      .from(gettrxAcceptanceTokens)
      .where(eq(gettrxAcceptanceTokens.applicationId, applicationId))
      .orderBy(desc(gettrxAcceptanceTokens.createdAt));
  }

  async getGettrxAcceptanceToken(
    id: number,
  ): Promise<SelectGettrxAcceptanceToken | undefined> {
    const [token] = await db
      .select()
      .from(gettrxAcceptanceTokens)
      .where(eq(gettrxAcceptanceTokens.id, id));
    return token || undefined;
  }

  async createGettrxAcceptanceToken(
    token: InsertGettrxAcceptanceToken,
  ): Promise<SelectGettrxAcceptanceToken> {
    const [newToken] = await db
      .insert(gettrxAcceptanceTokens)
      .values(token)
      .returning();
    return newToken;
  }

  async updateGettrxAcceptanceToken(
    id: number,
    updates: Partial<SelectGettrxAcceptanceToken>,
  ): Promise<SelectGettrxAcceptanceToken> {
    const [token] = await db
      .update(gettrxAcceptanceTokens)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(gettrxAcceptanceTokens.id, id))
      .returning();
    return token;
  }

  // GETTRX Webhook Events (for idempotency protection)
  async getGettrxWebhookEvent(
    webhookEventId: string,
  ): Promise<SelectGettrxWebhookEvent | undefined> {
    const [event] = await db
      .select()
      .from(gettrxWebhookEvents)
      .where(eq(gettrxWebhookEvents.webhookEventId, webhookEventId));
    return event || undefined;
  }

  async createGettrxWebhookEvent(
    webhookEvent: InsertGettrxWebhookEvent,
  ): Promise<SelectGettrxWebhookEvent> {
    const [newEvent] = await db
      .insert(gettrxWebhookEvents)
      .values(webhookEvent)
      .returning();
    return newEvent;
  }

  async updateGettrxWebhookEvent(
    id: number,
    updates: Partial<SelectGettrxWebhookEvent>,
  ): Promise<SelectGettrxWebhookEvent> {
    const [event] = await db
      .update(gettrxWebhookEvents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(gettrxWebhookEvents.id, id))
      .returning();
    return event;
  }

  async getRecentGettrxWebhookEvents(
    applicationId: string,
    hours: number = 24,
  ): Promise<SelectGettrxWebhookEvent[]> {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    return await db
      .select()
      .from(gettrxWebhookEvents)
      .where(
        and(
          eq(gettrxWebhookEvents.applicationId, applicationId),
          sql`${gettrxWebhookEvents.timestamp} >= ${cutoffTime.toISOString()}`,
        ),
      )
      .orderBy(desc(gettrxWebhookEvents.timestamp));
  }

  async isWebhookEventProcessed(
    webhookEventId: string,
  ): Promise<boolean> {
    const event = await this.getGettrxWebhookEvent(webhookEventId);
    return event !== undefined && event.status === 'processed';
  }

  async markWebhookEventProcessed(
    webhookEventId: string,
    processingResult: any,
  ): Promise<void> {
    await db
      .update(gettrxWebhookEvents)
      .set({
        status: 'processed',
        processedAt: new Date(),
        processingResult: processingResult,
        updatedAt: new Date(),
      })
      .where(eq(gettrxWebhookEvents.webhookEventId, webhookEventId));
  }

  async markWebhookEventFailed(
    webhookEventId: string,
    errorMessage: string,
    incrementRetryCount: boolean = true,
  ): Promise<void> {
    const updateData: any = {
      status: 'failed',
      errorMessage: errorMessage,
      updatedAt: new Date(),
    };

    if (incrementRetryCount) {
      updateData.retryCount = sql`${gettrxWebhookEvents.retryCount} + 1`;
    }

    await db
      .update(gettrxWebhookEvents)
      .set(updateData)
      .where(eq(gettrxWebhookEvents.webhookEventId, webhookEventId));
  }

  async cleanupOldWebhookEvents(days: number = 30): Promise<number> {
    const cutoffTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await db
      .delete(gettrxWebhookEvents)
      .where(sql`${gettrxWebhookEvents.createdAt} < ${cutoffTime.toISOString()}`)
      .returning({ id: gettrxWebhookEvents.id });
    return result.length;
  }
}