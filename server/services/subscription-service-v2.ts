/**
 * Subscription Service V2 - Reusable, Multi-Product Subscription System
 * 
 * Features:
 * - Works with any subscription product type (custom_domain, storage, seats, etc.)
 * - Multi-payment-method fallback (try default → secondary → tertiary → grace period)
 * - Payment method usage tracking (success/failure rates)
 * - Smart retry logic with grace periods
 * - Reusable across all subscription types
 */

import { db } from "../db";
import { 
  organizationSubscriptions, 
  subscriptionPlans, 
  subscriptionProducts,
  paymentMethods,
  organizations
} from "../../shared/schema";
import { eq, and, or, lt, desc, inArray } from "drizzle-orm";
import { GettrxService } from "./gettrx";
import { paymentMethodsService } from "./payment-methods-service";

interface CreateSubscriptionParams {
  organizationId: number;
  planCode: string; // e.g., 'pro_monthly', 'elite_monthly'
  paymentMethodId?: number; // Optional: specific payment method to use
}

interface ProcessSubscriptionPaymentResult {
  success: boolean;
  paymentMethodId?: number;
  paymentMethodsAttempted: number;
  error?: string;
}

export class SubscriptionServiceV2 {
  private gettrx: GettrxService;

  constructor() {
    this.gettrx = new GettrxService();
  }

  /**
   * Get available subscription plans for a product
   */
  async getPlans(productCode?: string) {
    const query = db
      .select({
        plan: subscriptionPlans,
        product: subscriptionProducts,
      })
      .from(subscriptionPlans)
      .innerJoin(
        subscriptionProducts,
        eq(subscriptionPlans.productId, subscriptionProducts.id)
      )
      .where(eq(subscriptionPlans.isActive, true));

    if (productCode) {
      query.where(eq(subscriptionProducts.productCode, productCode));
    }

    return await query;
  }

  /**
   * Get a specific plan by code
   */
  async getPlanByCode(planCode: string) {
    const [result] = await db
      .select({
        plan: subscriptionPlans,
        product: subscriptionProducts,
      })
      .from(subscriptionPlans)
      .innerJoin(
        subscriptionProducts,
        eq(subscriptionPlans.productId, subscriptionProducts.id)
      )
      .where(eq(subscriptionPlans.planCode, planCode))
      .limit(1);

    return result;
  }

  /**
   * Create a new subscription for an organization
   * Implements multi-payment-method fallback logic
   */
  async createSubscription(params: CreateSubscriptionParams) {
    const { organizationId, planCode, paymentMethodId } = params;

    // Get plan details
    const planData = await this.getPlanByCode(planCode);
    if (!planData) {
      throw new Error(`Plan not found: ${planCode}`);
    }

    const { plan, product } = planData;

    // Get organization
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!org) {
      throw new Error(`Organization not found: ${organizationId}`);
    }

    // Try to process payment with fallback logic
    const paymentResult = await this.processSubscriptionPaymentWithFallback({
      organizationId,
      amount: parseFloat(plan.amount),
      description: `${plan.name} - Subscription`,
      preferredPaymentMethodId: paymentMethodId,
    });

    if (!paymentResult.success) {
      throw new Error(
        `Payment failed after trying ${paymentResult.paymentMethodsAttempted} payment method(s). ${paymentResult.error || ''}`
      );
    }

    // Calculate billing dates
    const now = new Date();
    const nextBillingDate = new Date(now);
    
    // Add billing interval
    if (plan.billingInterval === 'month') {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    } else if (plan.billingInterval === 'year') {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
    }

    // Create subscription record
    const [subscription] = await db
      .insert(organizationSubscriptions)
      .values({
        organizationId,
        planId: plan.id,
        productId: product.id,
        status: 'active',
        startDate: now,
        nextBillingDate,
        lastBillingDate: now,
        billingCycleAnchor: now,
        amount: plan.amount,
        primaryPaymentMethodId: paymentResult.paymentMethodId,
        failedAttempts: 0,
      })
      .returning();

    // Update organization tier if this is a custom domain subscription
    if (product.productCode === 'custom_domain') {
      await db
        .update(organizations)
        .set({
          subscriptionTier: plan.tierLevel || 'pro',
          subscriptionStatus: 'active',
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, organizationId));
    }

    return {
      success: true,
      subscription,
      message: `Successfully subscribed to ${plan.name}`,
    };
  }

  /**
   * Process subscription payment with multi-payment-method fallback
   * Tries payment methods in priority order until one succeeds
   */
  async processSubscriptionPaymentWithFallback(params: {
    organizationId: number;
    amount: number;
    description: string;
    preferredPaymentMethodId?: number;
  }): Promise<ProcessSubscriptionPaymentResult> {
    const { organizationId, amount, description, preferredPaymentMethodId } = params;

    // Get all active payment methods for this organization, ordered by priority
    let methods = await db
      .select()
      .from(paymentMethods)
      .where(
        and(
          eq(paymentMethods.organizationId, organizationId),
          eq(paymentMethods.status, 'active')
        )
      )
      .orderBy(desc(paymentMethods.isDefault), paymentMethods.priority);

    if (methods.length === 0) {
      return {
        success: false,
        paymentMethodsAttempted: 0,
        error: 'No active payment methods available',
      };
    }

    // If a preferred payment method is specified, try it first
    if (preferredPaymentMethodId) {
      const preferredMethod = methods.find(m => m.id === preferredPaymentMethodId);
      if (preferredMethod) {
        // Move preferred method to front
        methods = [
          preferredMethod,
          ...methods.filter(m => m.id !== preferredPaymentMethodId)
        ];
      }
    }

    // Try each payment method in order until one succeeds
    let attemptsCount = 0;
    for (const method of methods) {
      attemptsCount++;

      try {
        console.log(`Attempting payment with method ${method.id} (priority ${method.priority})`);

        // Process payment with GETTRX
        const payment = await this.gettrx.createRecurringPayment({
          amount,
          merchantAccountId: '', // Get from organization
          paymentMethodId: method.gettrxPaymentMethodId,
          description,
          customerId: '', // Get from organization
        });

        if (payment && payment.status === 'approved') {
          // Payment succeeded! Record success
          await paymentMethodsService.recordPaymentMethodUsage(method.id, true);

          return {
            success: true,
            paymentMethodId: method.id,
            paymentMethodsAttempted: attemptsCount,
          };
        }

        // Payment failed, record failure and try next method
        await paymentMethodsService.recordPaymentMethodUsage(method.id, false);

      } catch (error: any) {
        console.error(`Payment method ${method.id} failed:`, error.message);
        // Record failure and continue to next method
        await paymentMethodsService.recordPaymentMethodUsage(method.id, false);
      }
    }

    // All payment methods failed
    return {
      success: false,
      paymentMethodsAttempted: attemptsCount,
      error: `All ${attemptsCount} payment method(s) failed`,
    };
  }

  /**
   * Process subscription renewal with fallback logic
   * Used by billing scheduler
   */
  async processSubscriptionRenewal(subscriptionId: number) {
    // Get subscription details
    const [sub] = await db
      .select()
      .from(organizationSubscriptions)
      .where(eq(organizationSubscriptions.id, subscriptionId))
      .limit(1);

    if (!sub) {
      throw new Error(`Subscription not found: ${subscriptionId}`);
    }

    // Get plan details
    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, sub.planId))
      .limit(1);

    if (!plan) {
      throw new Error(`Plan not found: ${sub.planId}`);
    }

    // Try payment with fallback
    const paymentResult = await this.processSubscriptionPaymentWithFallback({
      organizationId: sub.organizationId,
      amount: parseFloat(plan.amount),
      description: `${plan.name} - Renewal`,
    });

    if (paymentResult.success) {
      // Payment succeeded - reset failure counters and update billing dates
      const nextBillingDate = new Date(sub.nextBillingDate || new Date());
      if (plan.billingInterval === 'month') {
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
      } else if (plan.billingInterval === 'year') {
        nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
      }

      await db
        .update(organizationSubscriptions)
        .set({
          status: 'active',
          lastBillingDate: new Date(),
          nextBillingDate,
          primaryPaymentMethodId: paymentResult.paymentMethodId,
          failedAttempts: 0,
          lastAttemptDate: new Date(),
          nextRetryDate: null,
          gracePeriodEndsAt: null,
          updatedAt: new Date(),
        })
        .where(eq(organizationSubscriptions.id, subscriptionId));

      return { success: true, message: 'Renewal successful' };
    } else {
      // All payment methods failed - enter grace period or retry logic
      const failedAttempts = (sub.failedAttempts || 0) + 1;
      const now = new Date();
      let nextRetryDate = null;
      let gracePeriodEndsAt = sub.gracePeriodEndsAt;

      // Set grace period if this is the first failure
      if (failedAttempts === 1) {
        gracePeriodEndsAt = new Date(now);
        gracePeriodEndsAt.setDate(gracePeriodEndsAt.getDate() + 7); // 7-day grace period
      }

      // Determine next retry date (Day 1, 3, 7)
      if (failedAttempts === 1) {
        nextRetryDate = new Date(now);
        nextRetryDate.setDate(nextRetryDate.getDate() + 2); // Retry in 2 days (Day 3)
      } else if (failedAttempts === 2) {
        nextRetryDate = new Date(now);
        nextRetryDate.setDate(nextRetryDate.getDate() + 4); // Retry in 4 days (Day 7)
      }

      // Update subscription with failure info
      await db
        .update(organizationSubscriptions)
        .set({
          status: failedAttempts >= 3 ? 'past_due' : 'active', // grace_period status
          failedAttempts,
          lastAttemptDate: now,
          nextRetryDate,
          gracePeriodEndsAt,
          updatedAt: now,
        })
        .where(eq(organizationSubscriptions.id, subscriptionId));

      // If exceeded grace period, downgrade tier
      if (failedAttempts >= 3 && now > (gracePeriodEndsAt || now)) {
        await this.downgradeSubscription(subscriptionId);
      }

      return {
        success: false,
        message: `Renewal failed. Attempt ${failedAttempts}/3`,
        failedAttempts,
        gracePeriodEndsAt,
      };
    }
  }

  /**
   * Downgrade subscription after grace period expires
   * Preserves custom domain settings for easy reactivation
   */
  async downgradeSubscription(subscriptionId: number) {
    const [sub] = await db
      .select()
      .from(organizationSubscriptions)
      .where(eq(organizationSubscriptions.id, subscriptionId))
      .limit(1);

    if (!sub) {
      throw new Error(`Subscription not found: ${subscriptionId}`);
    }

    // Get product to determine what to downgrade
    const [product] = await db
      .select()
      .from(subscriptionProducts)
      .where(eq(subscriptionProducts.id, sub.productId))
      .limit(1);

    // Mark subscription as canceled
    await db
      .update(organizationSubscriptions)
      .set({
        status: 'canceled',
        endDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(organizationSubscriptions.id, subscriptionId));

    // If custom domain subscription, downgrade organization tier
    // BUT preserve custom domain settings for easy reactivation
    if (product?.productCode === 'custom_domain') {
      await db
        .update(organizations)
        .set({
          subscriptionTier: 'basic',
          subscriptionStatus: 'inactive',
          // NOTE: We do NOT clear customDomain or customDomainSSLStatus
          // This allows for easy reactivation when they update payment method
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, sub.organizationId));
    }

    return {
      success: true,
      message: 'Subscription downgraded. Settings preserved for reactivation.',
    };
  }

  /**
   * Cancel a subscription immediately
   */
  async cancelSubscription(subscriptionId: number) {
    await db
      .update(organizationSubscriptions)
      .set({
        status: 'canceled',
        endDate: new Date(),
        canceledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(organizationSubscriptions.id, subscriptionId));

    return { success: true, message: 'Subscription canceled' };
  }

  /**
   * Get subscription status for an organization
   */
  async getSubscriptionStatus(organizationId: number, productCode?: string) {
    const query = db
      .select({
        subscription: organizationSubscriptions,
        plan: subscriptionPlans,
        product: subscriptionProducts,
      })
      .from(organizationSubscriptions)
      .innerJoin(
        subscriptionPlans,
        eq(organizationSubscriptions.planId, subscriptionPlans.id)
      )
      .innerJoin(
        subscriptionProducts,
        eq(organizationSubscriptions.productId, subscriptionProducts.id)
      )
      .where(
        and(
          eq(organizationSubscriptions.organizationId, organizationId),
          or(
            eq(organizationSubscriptions.status, 'active'),
            eq(organizationSubscriptions.status, 'past_due')
          )
        )
      );

    if (productCode) {
      query.where(eq(subscriptionProducts.productCode, productCode));
    }

    const subscriptions = await query;

    // Also get payment methods count
    const methods = await paymentMethodsService.listPaymentMethods(organizationId);

    return {
      subscriptions,
      hasPaymentMethods: methods.length > 0,
      paymentMethodCount: methods.length,
    };
  }
}

export const subscriptionServiceV2 = new SubscriptionServiceV2();
