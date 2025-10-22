/**
 * Subscription Management API Routes
 * 
 * Endpoints:
 * - GET /api/subscriptions/plans - Get available subscription plans
 * - POST /api/subscriptions/create - Create new subscription
 * - POST /api/subscriptions/cancel - Cancel active subscription
 * - POST /api/subscriptions/reactivate - Reactivate canceled subscription
 * - GET /api/subscriptions/status/:orgId - Get subscription status
 * - POST /api/subscriptions/renew/:orgId - Manually trigger renewal (admin only)
 */

import express from 'express';
import subscriptionService from '../services/subscription-service';
import { db } from '../db';
import { organizations } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = express.Router();

/**
 * Get available subscription plans
 */
router.get('/plans', async (req, res) => {
  try {
    const plans = subscriptionService.getPlans();
    res.json(plans);
  } catch (error: any) {
    console.error('❌ Error fetching plans:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get organization's subscription status
 */
router.get('/status/:orgId', async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);
    
    const org = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
    if (!org.length) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const organization = org[0];

    res.json({
      tier: organization.subscriptionTier,
      status: organization.subscriptionStatus,
      planId: organization.subscriptionPlanId,
      amount: organization.subscriptionAmount,
      startDate: organization.subscriptionStartDate,
      nextBillingDate: organization.nextBillingDate,
      lastPaymentDate: organization.lastPaymentDate,
      failedAttempts: organization.failedPaymentAttempts,
      gracePeriodEndsAt: organization.gracePeriodEndsAt,
      hasPaymentMethod: !!organization.paymentMethodId
    });
  } catch (error: any) {
    console.error('❌ Error fetching subscription status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create new subscription
 */
router.post('/create', async (req, res) => {
  try {
    const { organizationId, planId, paymentMethodId } = req.body;

    if (!organizationId || !planId) {
      return res.status(400).json({ error: 'Missing required fields: organizationId, planId' });
    }

    const result = await subscriptionService.createSubscription({
      organizationId: parseInt(organizationId),
      planId,
      paymentMethodId
    });

    res.json(result);
  } catch (error: any) {
    console.error('❌ Error creating subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Cancel subscription
 */
router.post('/cancel', async (req, res) => {
  try {
    const { organizationId } = req.body;

    if (!organizationId) {
      return res.status(400).json({ error: 'Missing required field: organizationId' });
    }

    const result = await subscriptionService.cancelSubscription(parseInt(organizationId));
    res.json(result);
  } catch (error: any) {
    console.error('❌ Error canceling subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Reactivate canceled subscription
 */
router.post('/reactivate', async (req, res) => {
  try {
    const { organizationId, paymentMethodId } = req.body;

    if (!organizationId) {
      return res.status(400).json({ error: 'Missing required field: organizationId' });
    }

    const result = await subscriptionService.reactivateSubscription(
      parseInt(organizationId),
      paymentMethodId
    );

    res.json(result);
  } catch (error: any) {
    console.error('❌ Error reactivating subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Manually trigger subscription renewal (admin/cron only)
 */
router.post('/renew/:orgId', async (req, res) => {
  try {
    const orgId = parseInt(req.params.orgId);

    // TODO: Add admin authentication check here
    // if (req.user?.role !== 'super_admin') {
    //   return res.status(403).json({ error: 'Unauthorized' });
    // }

    const result = await subscriptionService.processRenewal(orgId);
    res.json(result);
  } catch (error: any) {
    console.error('❌ Error processing renewal:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
