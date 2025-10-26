/**
 * Subscription Service
 * Manages organization subscription lifecycle with GETTRX payment processing
 *
 * Features:
 * - Subscription creation and upgrades
 * - Recurring billing with GETTRX
 * - Payment failure handling with grace periods
 * - Smart retry logic (3 attempts over 7 days)
 * - Automatic tier downgrades after failed payments
 */

import { db } from "../db";
import { organizations } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { GettrxService } from "./gettrx";

interface SubscriptionPlan {
  id: string;
  name: string;
  tier: "pro" | "elite";
  amount: number;
  features: string[];
}

interface CreateSubscriptionParams {
  organizationId: number;
  planId: string;
  paymentMethodId?: string;
}

interface ProcessSubscriptionPaymentParams {
  organizationId: number;
  amount: number;
  paymentMethodId: string;
  description: string;
}

export class SubscriptionService {
  private gettrx: GettrxService;

  // Define available subscription plans
  private static PLANS: Record<string, SubscriptionPlan> = {
    pro_monthly: {
      id: "pro_monthly",
      name: "Pro Plan",
      tier: "pro",
      amount: 20.0,
      features: [
        "Custom Domain",
        "Advanced Analytics",
        "Priority Support",
        "Remove Platform Branding",
      ],
    },
    elite_monthly: {
      id: "elite_monthly",
      name: "Elite Plan",
      tier: "elite",
      amount: 50.0,
      features: [
        "Everything in Pro",
        "White Label",
        "Dedicated Account Manager",
        "Custom Integrations",
      ],
    },
  };

  constructor() {
    this.gettrx = new GettrxService();
  }

  /**
   * Get available subscription plans
   */
  getPlans(): SubscriptionPlan[] {
    return Object.values(SubscriptionService.PLANS);
  }

  /**
   * Get specific plan details
   */
  getPlan(planId: string): SubscriptionPlan | null {
    return SubscriptionService.PLANS[planId] || null;
  }

  /**
   * Create a new subscription
   */
  async createSubscription(params: CreateSubscriptionParams): Promise<any> {
    const { organizationId, planId, paymentMethodId } = params;

    // Get plan details
    const plan = this.getPlan(planId);
    if (!plan) {
      throw new Error(`Invalid plan ID: ${planId}`);
    }

    // Get organization
    const org = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);
    if (!org.length) {
      throw new Error(`Organization not found: ${organizationId}`);
    }

    const organization = org[0];

    // If no payment method provided, check if org has one stored
    const finalPaymentMethodId =
      paymentMethodId || organization.paymentMethodId;
    if (!finalPaymentMethodId) {
      throw new Error(
        "No payment method available. Please add a payment method first.",
      );
    }

    // Process initial payment
    const payment = await this.processSubscriptionPayment({
      organizationId,
      amount: plan.amount,
      paymentMethodId: finalPaymentMethodId,
      description: `${plan.name} - Monthly Subscription`,
    });

    // Calculate billing dates
    const now = new Date();
    const nextBillingDate = new Date(now);
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

    // Update organization with subscription details
    await db
      .update(organizations)
      .set({
        subscriptionTier: plan.tier,
        subscriptionStatus: "active",
        subscriptionPlanId: planId,
        subscriptionAmount: plan.amount.toString(),
        subscriptionStartDate: now,
        billingCycleAnchor: now,
        lastPaymentDate: now,
        nextBillingDate: nextBillingDate,
        paymentMethodId: finalPaymentMethodId,
        failedPaymentAttempts: 0,
        gracePeriodEndsAt: null,
        updatedAt: now,
      })
      .where(eq(organizations.id, organizationId));

    return {
      success: true,
      subscription: {
        planId,
        tier: plan.tier,
        amount: plan.amount,
        status: "active",
        nextBillingDate,
      },
      payment,
    };
  }

  /**
   * Process a subscription payment
   * Creates both payment transaction and donation record for financial tracking
   */
  private async processSubscriptionPayment(
    params: ProcessSubscriptionPaymentParams,
  ): Promise<any> {
    const { organizationId, amount, paymentMethodId, description } = params;

    try {
      // Get organization for customer details
      const org = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);
      if (!org.length) {
        throw new Error(`Organization not found: ${organizationId}`);
      }

      const organization = org[0];

      // Look up the provider payment method ID from the database
      // paymentMethodId is our database ID, but we need the provider's payment method ID
      const { paymentMethods } = await import("../../shared/schema");
      const [paymentMethod] = await db
        .select()
        .from(paymentMethods)
        .where(eq(paymentMethods.id, parseInt(paymentMethodId)))
        .limit(1);

      if (!paymentMethod) {
        throw new Error(`Payment method not found: ${paymentMethodId}`);
      }

      // Use the provider's payment method ID (e.g., "pm_xxxxx" from GETTRX)
      const providerPaymentMethodId = paymentMethod.providerPaymentMethodId;

      console.log(`💳 Using provider payment method ID: ${providerPaymentMethodId} (from database ID: ${paymentMethodId})`);

      // Process payment via GETTRX
      const payment = await this.gettrx.processRecurringPayment({
        customerId: organization.gettrxCustomerId || "",
        merchantAccountId: organization.merchantAccountId || "",
        paymentMethodId: providerPaymentMethodId, // Use provider payment method ID
        amount,
        currency: "usd",
        description,
        organizationId,
        campaignId: null,
        donorId: null,
        interval: "monthly",
      });

      // Create donation record for subscription payment tracking
      // This ensures subscription revenue appears in financial reports
      const { storage } = await import("../storage");
      await storage.createDonation({
        organizationId,
        amount: amount.toString(),
        totalAmount: amount.toString(),
        paymentMethod: "card",
        status: "completed",
        contextType: "subscription", // Track as subscription revenue
        contextId: organization.subscriptionPlanId || "subscription",
        source: "subscription_renewal",
        gettrxPaymentRequestId: payment.id,
        gettrxCustomerId: organization.merchantAccountId || "",
        providerPaymentMethodId: providerPaymentMethodId, // Use provider payment method ID
        metadata: {
          subscriptionPlanId: organization.subscriptionPlanId,
          subscriptionTier: organization.subscriptionTier,
          description: description,
        },
      });

      return payment;
    } catch (error: any) {
      console.error("💳 Subscription payment failed:", error);
      throw new Error(`Payment processing failed: ${error.message}`);
    }
  }

  /**
   * Process subscription renewal
   * Called by cron job or webhook handler
   */
  async processRenewal(organizationId: number): Promise<any> {
    const org = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);
    if (!org.length) {
      throw new Error(`Organization not found: ${organizationId}`);
    }

    const organization = org[0];

    // Check if renewal is due
    if (
      !organization.nextBillingDate ||
      new Date() < new Date(organization.nextBillingDate)
    ) {
      return { success: false, message: "Renewal not yet due" };
    }

    // Get plan details
    const plan = organization.subscriptionPlanId
      ? this.getPlan(organization.subscriptionPlanId)
      : null;
    if (!plan) {
      throw new Error("No active subscription plan found");
    }

    try {
      // Attempt payment
      const payment = await this.processSubscriptionPayment({
        organizationId,
        amount: plan.amount,
        paymentMethodId: organization.paymentMethodId || "",
        description: `${plan.name} - Monthly Renewal`,
      });

      // Calculate next billing date
      const nextBillingDate = new Date();
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

      // Update successful renewal
      await db
        .update(organizations)
        .set({
          subscriptionStatus: "active",
          lastPaymentDate: new Date(),
          nextBillingDate,
          failedPaymentAttempts: 0,
          gracePeriodEndsAt: null,
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, organizationId));

      return { success: true, payment };
    } catch (error: any) {
      // Payment failed - initiate grace period and retry logic
      return await this.handlePaymentFailure(organizationId, error);
    }
  }

  /**
   * Handle subscription payment failure
   * Implements grace period and retry logic
   */
  private async handlePaymentFailure(
    organizationId: number,
    error: any,
  ): Promise<any> {
    const org = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);
    if (!org.length) {
      throw new Error(`Organization not found: ${organizationId}`);
    }

    const organization = org[0];
    const currentAttempts = organization.failedPaymentAttempts || 0;
    const newAttempts = currentAttempts + 1;

    // Define retry schedule: Day 1, Day 3, Day 7
    const retrySchedule = [1, 3, 7];
    const maxAttempts = retrySchedule.length;

    if (newAttempts >= maxAttempts) {
      // Final attempt failed - downgrade to basic
      const gracePeriodEnd = new Date();
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);

      await db
        .update(organizations)
        .set({
          subscriptionStatus: "canceled",
          subscriptionTier: "basic",
          failedPaymentAttempts: newAttempts,
          gracePeriodEndsAt: gracePeriodEnd,
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, organizationId));

      // TODO: Send final notice email

      return {
        success: false,
        message: "Subscription canceled due to payment failure",
        attempts: newAttempts,
        downgradedToBasic: true,
      };
    } else {
      // Schedule retry
      const nextRetryDays = retrySchedule[newAttempts];
      const nextRetryDate = new Date();
      nextRetryDate.setDate(nextRetryDate.getDate() + nextRetryDays);

      // Set grace period (7 days from first failure)
      let gracePeriodEnd = organization.gracePeriodEndsAt;
      if (!gracePeriodEnd) {
        gracePeriodEnd = new Date();
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);
      }

      await db
        .update(organizations)
        .set({
          subscriptionStatus: "past_due",
          failedPaymentAttempts: newAttempts,
          nextBillingDate: nextRetryDate,
          gracePeriodEndsAt: gracePeriodEnd,
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, organizationId));

      // TODO: Send retry notification email

      return {
        success: false,
        message: "Payment failed, will retry",
        attempts: newAttempts,
        nextRetryDate,
        gracePeriodEndsAt: gracePeriodEnd,
      };
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(organizationId: number): Promise<any> {
    const org = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);
    if (!org.length) {
      throw new Error(`Organization not found: ${organizationId}`);
    }

    // Downgrade to basic tier, but preserve custom domain settings
    await db
      .update(organizations)
      .set({
        subscriptionStatus: "canceled",
        subscriptionTier: "basic",
        subscriptionEndDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organizationId));

    return {
      success: true,
      message:
        "Subscription canceled. Custom domain settings preserved for future reactivation.",
    };
  }

  /**
   * Reactivate a canceled subscription
   */
  async reactivateSubscription(
    organizationId: number,
    paymentMethodId?: string,
  ): Promise<any> {
    const org = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);
    if (!org.length) {
      throw new Error(`Organization not found: ${organizationId}`);
    }

    const organization = org[0];

    if (!organization.subscriptionPlanId) {
      throw new Error("No previous subscription plan found");
    }

    // Create new subscription with previous plan
    return await this.createSubscription({
      organizationId,
      planId: organization.subscriptionPlanId,
      paymentMethodId,
    });
  }
}

export default new SubscriptionService();
