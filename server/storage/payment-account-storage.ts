/**
 * Payment Account Storage Module
 * Handles payment account operations for the hybrid architecture
 */
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { paymentAccounts } from "@shared/schema";
import type { PaymentAccount, InsertPaymentAccount } from "@shared/schema";

export class PaymentAccountStorage {
  /**
   * Get all payment accounts for an organization
   */
  async getPaymentAccountsByOrganization(organizationId: number): Promise<PaymentAccount[]> {
    return await db
      .select()
      .from(paymentAccounts)
      .where(eq(paymentAccounts.organizationId, organizationId))
      .orderBy(paymentAccounts.isDefault.desc(), paymentAccounts.createdAt.desc());
  }

  /**
   * Get a specific payment account by ID
   */
  async getPaymentAccount(id: number): Promise<PaymentAccount | undefined> {
    const result = await db
      .select()
      .from(paymentAccounts)
      .where(eq(paymentAccounts.id, id))
      .limit(1);
    
    return result[0];
  }

  /**
   * Get the default payment account for an organization
   */
  async getDefaultPaymentAccount(organizationId: number): Promise<PaymentAccount | undefined> {
    const result = await db
      .select()
      .from(paymentAccounts)
      .where(
        and(
          eq(paymentAccounts.organizationId, organizationId),
          eq(paymentAccounts.isDefault, true),
          eq(paymentAccounts.isActive, true)
        )
      )
      .limit(1);
    
    return result[0];
  }

  /**
   * Create a new payment account
   */
  async createPaymentAccount(account: InsertPaymentAccount): Promise<PaymentAccount> {
    const result = await db
      .insert(paymentAccounts)
      .values(account)
      .returning();
    
    return result[0];
  }

  /**
   * Update a payment account
   */
  async updatePaymentAccount(id: number, updates: Partial<PaymentAccount>): Promise<PaymentAccount> {
    const result = await db
      .update(paymentAccounts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(paymentAccounts.id, id))
      .returning();
    
    return result[0];
  }

  /**
   * Set a payment account as the default for an organization
   * This will unset any existing default and set the new one
   */
  async setDefaultPaymentAccount(organizationId: number, accountId: number): Promise<void> {
    await db.transaction(async (tx) => {
      // First, unset any existing default
      await tx
        .update(paymentAccounts)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(
          and(
            eq(paymentAccounts.organizationId, organizationId),
            eq(paymentAccounts.isDefault, true)
          )
        );

      // Then set the new default
      await tx
        .update(paymentAccounts)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(eq(paymentAccounts.id, accountId));
    });
  }

  /**
   * Get payment account by merchant account ID
   */
  async getPaymentAccountByMerchantId(
    organizationId: number, 
    merchantAccountId: string
  ): Promise<PaymentAccount | undefined> {
    const result = await db
      .select()
      .from(paymentAccounts)
      .where(
        and(
          eq(paymentAccounts.organizationId, organizationId),
          eq(paymentAccounts.merchantAccountId, merchantAccountId)
        )
      )
      .limit(1);
    
    return result[0];
  }
}