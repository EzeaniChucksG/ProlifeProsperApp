/**
 * Payment Methods Service
 * 
 * Manages payment methods for organizations with multi-provider support:
 * - Syncs payment methods from payment providers (GETTRX, BTCPay, etc.)
 * - Handles payment method priority and default selection
 * - Provides fallback logic for subscription billing
 * - Tracks payment method success/failure rates
 * - Provider-agnostic architecture for future payment integrations
 */

import { db } from "../db";
import { paymentMethods, organizations } from "../../shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { GettrxService } from "./gettrx";

export class PaymentMethodsService {
  private gettrxService: GettrxService;

  constructor() {
    this.gettrxService = new GettrxService();
  }

  /**
   * List all payment methods for an organization from database
   * Returns methods ordered by priority (default first, then by priority number)
   */
  async listPaymentMethods(organizationId: number) {
    const methods = await db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.organizationId, organizationId))
      .orderBy(desc(paymentMethods.isDefault), paymentMethods.priority);

    return methods;
  }

  /**
   * Sync payment methods from GETTRX to local database
   * This should be called periodically or after payment method changes
   */
  async syncPaymentMethods(organizationId: number) {
    try {
      // Get organization to find GETTRX customer ID
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId));

      if (!org?.merchantAccountId) {
        throw new Error("Organization does not have a merchant account");
      }

      // Fetch payment methods from GETTRX
      const gettrxMethods = await this.gettrxService.getPaymentMethods(
        org.merchantAccountId
      );

      // Store in database
      const syncedMethods = [];
      for (const method of gettrxMethods) {
        // Check if method already exists
        const [existing] = await db
          .select()
          .from(paymentMethods)
          .where(
            and(
              eq(paymentMethods.paymentProvider, 'gettrx'),
              eq(paymentMethods.providerPaymentMethodId, method.id)
            )
          );

        if (existing) {
          // Update existing
          const [updated] = await db
            .update(paymentMethods)
            .set({
              paymentMethodType: method.type,
              lastFour: method.card?.last4,
              cardBrand: method.card?.brand,
              expiryMonth: method.card?.exp_month,
              expiryYear: method.card?.exp_year,
              status: "active",
              providerMetadata: method as any,
              updatedAt: new Date(),
            })
            .where(eq(paymentMethods.id, existing.id))
            .returning();
          syncedMethods.push(updated);
        } else {
          // Insert new
          const [inserted] = await db
            .insert(paymentMethods)
            .values({
              organizationId,
              paymentProvider: 'gettrx',
              providerPaymentMethodId: method.id,
              paymentMethodType: method.type,
              lastFour: method.card?.last4,
              cardBrand: method.card?.brand,
              expiryMonth: method.card?.exp_month,
              expiryYear: method.card?.exp_year,
              isDefault: false, // Don't auto-set as default
              priority: 999, // Low priority by default
              status: "active",
              providerMetadata: method as any,
            })
            .returning();
          syncedMethods.push(inserted);
        }
      }

      return syncedMethods;
    } catch (error: any) {
      console.error("Error syncing payment methods:", error);
      throw new Error(`Failed to sync payment methods: ${error.message}`);
    }
  }

  /**
   * Add a new payment method for an organization
   * Supports multiple payment providers (GETTRX, BTCPay, etc.)
   * Includes duplicate detection based on payment method fingerprint
   */
  async addPaymentMethod(data: {
    organizationId: number;
    paymentProvider: string; // 'gettrx', 'btcpay', 'stripe', etc.
    providerPaymentMethodId: string;
    paymentMethodType: string;
    lastFour?: string;
    cardBrand?: string;
    expiryMonth?: number;
    expiryYear?: number;
    cryptoAddress?: string;
    cryptoType?: string;
    bankName?: string;
    accountType?: string;
    providerMetadata?: any;
    setAsDefault?: boolean;
  }) {
    try {
      // Check for duplicate payment methods using fingerprint matching
      if (data.paymentMethodType === 'card' && data.lastFour && data.cardBrand && data.expiryMonth && data.expiryYear) {
        // For cards: brand + last4 + expiry (globally unique across all organizations)
        const existingCards = await db
          .select()
          .from(paymentMethods)
          .where(
            and(
              eq(paymentMethods.paymentMethodType, 'card'),
              eq(paymentMethods.cardBrand, data.cardBrand),
              eq(paymentMethods.lastFour, data.lastFour),
              eq(paymentMethods.expiryMonth, data.expiryMonth),
              eq(paymentMethods.expiryYear, data.expiryYear)
            )
          );

        if (existingCards.length > 0) {
          throw new Error('This payment method has already been added');
        }
      } else if (data.paymentMethodType === 'bank_account' && data.lastFour) {
        // For bank accounts: last4 (unique per organization)
        const existingBankAccounts = await db
          .select()
          .from(paymentMethods)
          .where(
            and(
              eq(paymentMethods.organizationId, data.organizationId),
              eq(paymentMethods.paymentMethodType, 'bank_account'),
              eq(paymentMethods.lastFour, data.lastFour)
            )
          );

        if (existingBankAccounts.length > 0) {
          throw new Error('This bank account has already been added');
        }
      }

      // If setting as default, unset other defaults first
      if (data.setAsDefault) {
        await db
          .update(paymentMethods)
          .set({ isDefault: false })
          .where(eq(paymentMethods.organizationId, data.organizationId));
      }

      // Determine priority
      const priority = data.setAsDefault ? 0 : 999;

      // Insert the payment method
      const [method] = await db
        .insert(paymentMethods)
        .values({
          organizationId: data.organizationId,
          paymentProvider: data.paymentProvider,
          providerPaymentMethodId: data.providerPaymentMethodId,
          paymentMethodType: data.paymentMethodType,
          lastFour: data.lastFour,
          cardBrand: data.cardBrand,
          expiryMonth: data.expiryMonth,
          expiryYear: data.expiryYear,
          cryptoAddress: data.cryptoAddress,
          cryptoType: data.cryptoType,
          bankName: data.bankName,
          accountType: data.accountType,
          providerMetadata: data.providerMetadata,
          isDefault: data.setAsDefault || false,
          priority,
          status: "active",
        })
        .returning();

      return method;
    } catch (error: any) {
      console.error("Error adding payment method:", error);
      throw new Error(`Failed to add payment method: ${error.message}`);
    }
  }

  /**
   * Set a payment method as the default
   * Updates priority to 0 (highest) and unsets other defaults
   */
  async setDefaultPaymentMethod(organizationId: number, paymentMethodId: number) {
    try {
      // Unset all defaults for this organization
      await db
        .update(paymentMethods)
        .set({ isDefault: false })
        .where(eq(paymentMethods.organizationId, organizationId));

      // Set the specified method as default with priority 0
      const [updated] = await db
        .update(paymentMethods)
        .set({
          isDefault: true,
          priority: 0,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(paymentMethods.id, paymentMethodId),
            eq(paymentMethods.organizationId, organizationId)
          )
        )
        .returning();

      if (!updated) {
        throw new Error("Payment method not found");
      }

      return updated;
    } catch (error: any) {
      console.error("Error setting default payment method:", error);
      throw new Error(`Failed to set default payment method: ${error.message}`);
    }
  }

  /**
   * Update payment method priority for fallback logic
   * Lower numbers = higher priority
   */
  async updatePaymentMethodPriority(
    organizationId: number,
    paymentMethodId: number,
    priority: number
  ) {
    try {
      const [updated] = await db
        .update(paymentMethods)
        .set({
          priority,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(paymentMethods.id, paymentMethodId),
            eq(paymentMethods.organizationId, organizationId)
          )
        )
        .returning();

      if (!updated) {
        throw new Error("Payment method not found");
      }

      return updated;
    } catch (error: any) {
      console.error("Error updating payment method priority:", error);
      throw new Error(`Failed to update payment method priority: ${error.message}`);
    }
  }

  /**
   * Record payment method usage (success or failure)
   * Updates lastUsedAt, lastSuccessAt/lastFailureAt, and failureCount
   */
  async recordPaymentMethodUsage(
    paymentMethodId: number,
    success: boolean
  ) {
    try {
      const updates: any = {
        lastUsedAt: new Date(),
        updatedAt: new Date(),
      };

      if (success) {
        updates.lastSuccessAt = new Date();
        updates.failureCount = 0; // Reset failure count on success
      } else {
        updates.lastFailureAt = new Date();
        // Increment failure count
        const [method] = await db
          .select()
          .from(paymentMethods)
          .where(eq(paymentMethods.id, paymentMethodId));
        
        updates.failureCount = (method?.failureCount || 0) + 1;

        // If too many failures, disable the payment method
        if (updates.failureCount >= 3) {
          updates.status = "failed";
        }
      }

      const [updated] = await db
        .update(paymentMethods)
        .set(updates)
        .where(eq(paymentMethods.id, paymentMethodId))
        .returning();

      return updated;
    } catch (error: any) {
      console.error("Error recording payment method usage:", error);
      throw new Error(`Failed to record payment method usage: ${error.message}`);
    }
  }

  /**
   * Get the default payment method for an organization
   */
  async getDefaultPaymentMethod(organizationId: number) {
    const [method] = await db
      .select()
      .from(paymentMethods)
      .where(
        and(
          eq(paymentMethods.organizationId, organizationId),
          eq(paymentMethods.isDefault, true),
          eq(paymentMethods.status, "active")
        )
      )
      .limit(1);

    return method || null;
  }

  /**
   * Delete a payment method
   * Supports provider-specific deletion logic
   */
  async deletePaymentMethod(organizationId: number, paymentMethodId: number) {
    try {
      // Get the payment method
      const [method] = await db
        .select()
        .from(paymentMethods)
        .where(
          and(
            eq(paymentMethods.id, paymentMethodId),
            eq(paymentMethods.organizationId, organizationId)
          )
        );

      if (!method) {
        throw new Error("Payment method not found");
      }

      // Delete from provider based on payment provider
      if (method.paymentProvider === 'gettrx') {
        // Get organization for customer ID
        const [org] = await db
          .select()
          .from(organizations)
          .where(eq(organizations.id, organizationId));
        
        if (org?.gettrxCustomerId) {
          await this.gettrxService.deletePaymentMethod(
            org.gettrxCustomerId,
            method.providerPaymentMethodId
          );
        }
      }
      // TODO: Add deletion logic for other providers (btcpay, stripe, etc.)

      // Delete from database
      await db
        .delete(paymentMethods)
        .where(eq(paymentMethods.id, paymentMethodId));

      return { success: true };
    } catch (error: any) {
      console.error("Error deleting payment method:", error);
      throw new Error(`Failed to delete payment method: ${error.message}`);
    }
  }

  /**
   * Map GETTRX payment method status to our status
   */
  private mapGettrxStatus(gettrxStatus?: string): string {
    if (!gettrxStatus) return "active";
    
    switch (gettrxStatus.toLowerCase()) {
      case "active":
      case "verified":
        return "active";
      case "expired":
        return "expired";
      case "failed":
      case "declined":
        return "failed";
      default:
        return "active";
    }
  }
}

export const paymentMethodsService = new PaymentMethodsService();
