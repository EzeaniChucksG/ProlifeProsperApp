/**
 * GETTRX Payment Processing API Routes
 * Handles card tokenization, payment processing, recurring billing, and transfers
 */

import type { Express } from "express";
import express from "express";
import { z } from "zod";
import { gettrxService } from "../services/gettrx";
import { gettrxWebhookService } from "../services/gettrx-webhooks";
import { storage } from "../storage/index";
import { authenticateToken } from "../middleware";
import { 
  insertGettrxPaymentMethodSchema, 
  insertGettrxTransferSchema, 
  insertGettrxRecurringScheduleSchema,
  insertDonationSchema 
} from "@shared/schema";

// Validation schemas
const createPaymentSchema = z.object({
  amount: z.number().min(0.01).max(1000000),
  currency: z.string().default("usd"),
  paymentToken: z.string().min(1, "Payment token is required"),
  organizationId: z.number().positive(),
  campaignId: z.number().positive().optional(),
  donorEmail: z.string().email(),
  donorFirstName: z.string().min(1).optional(),
  donorLastName: z.string().min(1).optional(),
  donorPhone: z.string().optional(),
  isAnonymous: z.boolean().default(false),
  donorCoversFees: z.boolean().default(false),
  savePaymentMethod: z.boolean().default(false),
  setupRecurring: z.boolean().default(false),
  recurringInterval: z.enum(["monthly", "quarterly", "annually"]).optional(),
  metadata: z.record(z.any()).optional(),
});

const createTransferSchema = z.object({
  organizationId: z.number().positive(),
  amount: z.number().min(0.01),
  currency: z.string().default("usd"),
  destination: z.string().min(1),
  description: z.string().optional(),
  relatedDonationIds: z.array(z.number()).optional(),
});

const createRecurringScheduleSchema = z.object({
  organizationId: z.number().positive(),
  donorId: z.number().positive(),
  paymentMethodId: z.number().positive(),
  campaignId: z.number().positive().optional(),
  amount: z.number().min(0.01),
  interval: z.enum(["monthly", "quarterly", "annually"]),
  intervalCount: z.number().positive().default(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  donorCoversFees: z.boolean().default(false),
});

// Using centralized authentication middleware from middleware/auth.ts

export function registerGettrxRoutes(app: Express): void {

  // Health check for GETTRX service
  app.get('/api/gettrx/health', async (req, res) => {
    try {
      const health = await gettrxService.healthCheck();
      res.json(health);
    } catch (error) {
      console.error('GETTRX health check failed:', error);
      res.status(500).json({ 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Process a payment with GETTRX
  app.post('/api/gettrx/payments', authenticateToken, async (req, res) => {
    try {
      const validatedData = createPaymentSchema.parse(req.body);

      // Find or create donor
      const existingDonor = await storage.findDonorByEmail(
        validatedData.organizationId, 
        validatedData.donorEmail
      );

      let donor;
      if (existingDonor) {
        donor = existingDonor;
      } else {
        donor = await storage.createDonor({
          organizationId: validatedData.organizationId,
          email: validatedData.donorEmail,
          firstName: validatedData.donorFirstName || '',
          lastName: validatedData.donorLastName || '',
          phone: validatedData.donorPhone,
        });
      }

      // Create or get GETTRX customer
      let gettrxCustomerId = donor.gettrxCustomerId;
      if (!gettrxCustomerId) {
        const gettrxCustomer = await gettrxService.createCustomer({
          name: `${donor.firstName} ${donor.lastName}`.trim() || donor.email,
          email: donor.email,
          phone: donor.phone || undefined,
          organizationId: validatedData.organizationId,
        });
        gettrxCustomerId = gettrxCustomer.id;

        // Update donor with GETTRX customer ID
        await storage.updateDonor(donor.id, { gettrxCustomerId });
      }

      // Calculate fees if donor covers them
      const feeAmount = validatedData.donorCoversFees 
        ? gettrxService.calculateProcessingFee(validatedData.amount, 'card')
        : 0;
      const totalAmount = validatedData.amount + feeAmount;

      // Create payment with GETTRX
      const paymentData = {
        amount: totalAmount,
        currency: validatedData.currency,
        paymentToken: validatedData.paymentToken,
        customer: gettrxCustomerId,
        setupFutureUsage: validatedData.savePaymentMethod ? 'off_session' : undefined,
        organizationId: validatedData.organizationId,
        campaignId: validatedData.campaignId,
        donorId: donor.id,
        metadata: {
          donorEmail: donor.email,
          donorName: `${donor.firstName} ${donor.lastName}`.trim(),
          isAnonymous: validatedData.isAnonymous,
          platform: 'pro-life-prosper',
          ...validatedData.metadata,
        },
      } as const;

      const paymentRequest = await gettrxService.createPayment(paymentData);

      // Create donation record
      const donation = await storage.createDonation({
        organizationId: validatedData.organizationId,
        campaignId: validatedData.campaignId,
        donorId: donor.id,
        amount: String(validatedData.amount),
        feeAmount: String(feeAmount),
        totalAmount: String(totalAmount),
        paymentMethod: 'card',
        source: 'website',
        paymentProcessorId: paymentRequest.id,
        status: paymentRequest.status === 'succeeded' ? 'completed' : 'pending',
        isAnonymous: validatedData.isAnonymous,
        isRecurring: validatedData.setupRecurring,
        recurringInterval: validatedData.recurringInterval,
        donorCoversFees: validatedData.donorCoversFees,
        donorEmail: donor.email,
        donorFirstName: donor.firstName,
        donorLastName: donor.lastName,
        gettrxPaymentRequestId: paymentRequest.id,
        gettrxCustomerId: gettrxCustomerId,
        providerPaymentMethodId: paymentRequest.paymentMethod,
        metadata: validatedData.metadata,
      });

      // If payment method should be saved, store it
      let savedPaymentMethodId: number | null = null;
      if (validatedData.savePaymentMethod && paymentRequest.paymentMethod) {
        try {
          const savedMethod = await storage.createGettrxPaymentMethod({
            organizationId: validatedData.organizationId,
            donorId: donor.id,
            gettrxCustomerId: gettrxCustomerId,
            paymentProvider: 'gettrx',
            providerPaymentMethodId: paymentRequest.paymentMethod,
            usageType: 'off_session',
            isDefault: true,
            isActive: true,
            consentGiven: true,
            consentTimestamp: new Date().toISOString(),
            consentIpAddress: req.ip,
          });
          savedPaymentMethodId = savedMethod.id;
        } catch (error) {
          console.error('Failed to save payment method:', error);
          // Don't fail the whole payment for this
        }
      }

      // If this is a recurring donation, create the recurring schedule
      if (validatedData.setupRecurring && savedPaymentMethodId && validatedData.recurringInterval) {
        try {
          const startDate = new Date();
          const nextPaymentDate = new Date();
          
          // Calculate next payment date based on interval
          switch (validatedData.recurringInterval) {
            case 'monthly':
              nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
              break;
            case 'quarterly':
              nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 3);
              break;
            case 'annually':
              nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + 1);
              break;
          }

          await storage.createGettrxRecurringSchedule({
            organizationId: validatedData.organizationId,
            donorId: donor.id,
            campaignId: validatedData.campaignId,
            paymentMethodId: savedPaymentMethodId,
            amount: String(validatedData.amount),
            currency: validatedData.currency,
            interval: validatedData.recurringInterval,
            intervalCount: 1,
            startDate: startDate,
            nextPaymentDate: nextPaymentDate,
            donorCoversFees: validatedData.donorCoversFees,
            sendReminders: true,
            status: 'active',
          });

          console.log(`✅ Recurring schedule created for donor ${donor.id}: ${validatedData.recurringInterval} $${validatedData.amount}`);
        } catch (error) {
          console.error('Failed to create recurring schedule:', error);
          // Don't fail the payment, but log the error
        }
      }

      res.json({
        success: true,
        payment: paymentRequest,
        donation: donation,
        donor: {
          id: donor.id,
          email: donor.email,
          firstName: donor.firstName,
          lastName: donor.lastName,
        },
      });

    } catch (error) {
      console.error('Payment processing failed:', error);
      res.status(400).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Payment failed' 
      });
    }
  });

  // Get payment methods for a donor
  app.get('/api/gettrx/donors/:donorId/payment-methods', authenticateToken, async (req, res) => {
    try {
      const donorId = parseInt(req.params.donorId);
      const paymentMethods = await storage.getGettrxPaymentMethods(donorId);

      // Enrich with GETTRX data if needed
      const enrichedMethods = await Promise.all(
        paymentMethods.map(async (method) => {
          try {
            const gettrxMethods = await gettrxService.getPaymentMethods(method.gettrxCustomerId);
            const matchingMethod = gettrxMethods.find(gm => gm.id === method.providerPaymentMethodId);
            return {
              ...method,
              gettrxData: matchingMethod,
            };
          } catch (error) {
            console.error('Failed to fetch GETTRX method data:', error);
            return method;
          }
        })
      );

      res.json(enrichedMethods);
    } catch (error) {
      console.error('Failed to fetch payment methods:', error);
      res.status(500).json({ message: 'Failed to fetch payment methods' });
    }
  });

  // Delete a payment method
  app.delete('/api/gettrx/payment-methods/:methodId', authenticateToken, async (req, res) => {
    try {
      const methodId = parseInt(req.params.methodId);
      const method = await storage.getGettrxPaymentMethod(methodId);

      if (!method) {
        return res.status(404).json({ message: 'Payment method not found' });
      }

      // Delete from GETTRX
      await gettrxService.deletePaymentMethod(method.providerPaymentMethodId);

      // Delete from local database
      await storage.deleteGettrxPaymentMethod(methodId);

      res.json({ success: true, message: 'Payment method deleted' });
    } catch (error) {
      console.error('Failed to delete payment method:', error);
      res.status(500).json({ message: 'Failed to delete payment method' });
    }
  });

  // Create a transfer
  app.post('/api/gettrx/transfers', authenticateToken, async (req, res) => {
    try {
      const validatedData = createTransferSchema.parse(req.body);

      const transfer = await gettrxService.createTransfer({
        amount: validatedData.amount,
        currency: validatedData.currency,
        destination: validatedData.destination,
        organizationId: validatedData.organizationId,
        description: validatedData.description,
      });

      // Store transfer record
      const transferRecord = await storage.createGettrxTransfer({
        organizationId: validatedData.organizationId,
        gettrxTransferId: transfer.id,
        amount: String(validatedData.amount),
        currency: validatedData.currency,
        destination: validatedData.destination,
        status: transfer.status,
        description: validatedData.description || `Transfer for organization ${validatedData.organizationId}`,
        relatedDonationIds: validatedData.relatedDonationIds,
        metadata: { createdViaApi: true },
      });

      res.json({
        success: true,
        transfer: transfer,
        transferRecord: transferRecord,
      });

    } catch (error) {
      console.error('Transfer creation failed:', error);
      res.status(400).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Transfer failed' 
      });
    }
  });

  // Get transfers for an organization
  app.get('/api/gettrx/organizations/:orgId/transfers', authenticateToken, async (req, res) => {
    try {
      const orgId = parseInt(req.params.orgId);
      const transfers = await storage.getGettrxTransfers(orgId);

      // Enrich with GETTRX status if needed
      const enrichedTransfers = await Promise.all(
        transfers.map(async (transfer) => {
          try {
            const gettrxTransfer = await gettrxService.getTransfer(transfer.gettrxTransferId);
            return {
              ...transfer,
              currentStatus: gettrxTransfer.status,
              gettrxData: gettrxTransfer,
            };
          } catch (error) {
            return transfer;
          }
        })
      );

      res.json(enrichedTransfers);
    } catch (error) {
      console.error('Failed to fetch transfers:', error);
      res.status(500).json({ message: 'Failed to fetch transfers' });
    }
  });

  // Create recurring payment schedule
  app.post('/api/gettrx/recurring-schedules', authenticateToken, async (req, res) => {
    try {
      const validatedData = createRecurringScheduleSchema.parse(req.body);

      // Verify payment method exists and is active
      const paymentMethod = await storage.getGettrxPaymentMethod(validatedData.paymentMethodId);
      if (!paymentMethod || !paymentMethod.isActive) {
        return res.status(400).json({ message: 'Invalid or inactive payment method' });
      }

      // Calculate next payment date
      const startDate = new Date(validatedData.startDate);
      let nextPaymentDate = new Date(startDate);

      switch (validatedData.interval) {
        case 'monthly':
          nextPaymentDate.setMonth(nextPaymentDate.getMonth() + validatedData.intervalCount);
          break;
        case 'quarterly':
          nextPaymentDate.setMonth(nextPaymentDate.getMonth() + (3 * validatedData.intervalCount));
          break;
        case 'annually':
          nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + validatedData.intervalCount);
          break;
      }

      const schedule = await storage.createGettrxRecurringSchedule({
        organizationId: validatedData.organizationId,
        donorId: validatedData.donorId,
        campaignId: validatedData.campaignId,
        paymentMethodId: validatedData.paymentMethodId,
        amount: String(validatedData.amount),
        currency: "usd",
        interval: validatedData.interval,
        intervalCount: validatedData.intervalCount,
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,
        nextPaymentDate: nextPaymentDate.toISOString(),
        status: 'active',
        donorCoversFees: validatedData.donorCoversFees,
        sendReminders: true,
        metadata: { createdViaApi: true },
      });

      res.json({
        success: true,
        schedule: schedule,
      });

    } catch (error) {
      console.error('Recurring schedule creation failed:', error);
      res.status(400).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Schedule creation failed' 
      });
    }
  });

  // Get recurring schedules for an organization
  app.get('/api/gettrx/organizations/:orgId/recurring-schedules', authenticateToken, async (req, res) => {
    try {
      const orgId = parseInt(req.params.orgId);
      const schedules = await storage.getGettrxRecurringSchedules(orgId);

      res.json(schedules);
    } catch (error) {
      console.error('Failed to fetch recurring schedules:', error);
      res.status(500).json({ message: 'Failed to fetch recurring schedules' });
    }
  });

  // Process recurring payments (typically called by a cron job)
  app.post('/api/gettrx/process-recurring', authenticateToken, async (req, res) => {
    try {
      const now = new Date();
      const schedulesToProcess = await storage.getGettrxRecurringSchedulesDue(now);

      const results = await Promise.allSettled(
        schedulesToProcess.map(async (schedule) => {
          try {
            const paymentMethod = await storage.getGettrxPaymentMethod(schedule.paymentMethodId);
            if (!paymentMethod) throw new Error('Payment method not found');

            const feeAmount = schedule.donorCoversFees 
              ? gettrxService.calculateProcessingFee(parseFloat(schedule.amount), 'card')
              : 0;
            const totalAmount = parseFloat(schedule.amount) + feeAmount;

            // Process the recurring payment
            const payment = await gettrxService.processRecurringPayment({
              customerId: paymentMethod.gettrxCustomerId,
              paymentMethodId: paymentMethod.providerPaymentMethodId,
              amount: totalAmount,
              currency: schedule.currency || 'usd',
              organizationId: schedule.organizationId,
              campaignId: schedule.campaignId || undefined,
              donorId: schedule.donorId,
              interval: schedule.interval as 'monthly' | 'quarterly' | 'annually',
            });

            // Create donation record
            const donation = await storage.createDonation({
              organizationId: schedule.organizationId,
              campaignId: schedule.campaignId,
              donorId: schedule.donorId,
              amount: schedule.amount,
              feeAmount: String(feeAmount),
              totalAmount: String(totalAmount),
              paymentMethod: 'card',
              source: 'recurring_billing',
              paymentProcessorId: payment.id,
              status: payment.status === 'succeeded' ? 'completed' : 'pending',
              isAnonymous: false,
              isRecurring: true,
              recurringInterval: schedule.interval,
              donorCoversFees: schedule.donorCoversFees,
              gettrxPaymentRequestId: payment.id,
              gettrxCustomerId: paymentMethod.gettrxCustomerId,
              providerPaymentMethodId: paymentMethod.providerPaymentMethodId,
              metadata: { recurringScheduleId: schedule.id },
            });

            // Update schedule
            const nextPaymentDate = new Date(schedule.nextPaymentDate);
            switch (schedule.interval) {
              case 'monthly':
                nextPaymentDate.setMonth(nextPaymentDate.getMonth() + (schedule.intervalCount || 1));
                break;
              case 'quarterly':
                nextPaymentDate.setMonth(nextPaymentDate.getMonth() + (3 * (schedule.intervalCount || 1)));
                break;
              case 'annually':
                nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + (schedule.intervalCount || 1));
                break;
            }

            await storage.updateGettrxRecurringSchedule(schedule.id, {
              lastPaymentDate: now.toISOString(),
              nextPaymentDate: nextPaymentDate.toISOString(),
              totalPayments: (schedule.totalPayments || 0) + 1,
              failedAttempts: 0, // Reset on success
            });

            return { scheduleId: schedule.id, success: true, donation };
          } catch (error) {
            // Handle failed payment
            await storage.updateGettrxRecurringSchedule(schedule.id, {
              failedAttempts: (schedule.failedAttempts || 0) + 1,
              status: (schedule.failedAttempts || 0) + 1 >= (schedule.maxFailedAttempts || 3) ? 'cancelled' : 'active',
            });

            return { 
              scheduleId: schedule.id, 
              success: false, 
              error: error instanceof Error ? error.message : 'Unknown error' 
            };
          }
        })
      );

      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.length - successful;

      res.json({
        success: true,
        processed: results.length,
        successful,
        failed,
        results: results.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: 'Promise rejected' }),
      });

    } catch (error) {
      console.error('Recurring payment processing failed:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Processing failed' 
      });
    }
  });

  // GETTRX webhook endpoint for application lifecycle events
  // Use raw body middleware specifically for this webhook endpoint
  app.post('/api/gettrx/webhooks/application-events', 
    express.raw({ type: 'application/json' }), 
    async (req, res) => {
    try {
      // Get webhook signature and timestamp from headers
      const signature = req.headers['x-webhook-signature'] as string;
      const timestamp = req.headers['x-webhook-timestamp'] as string;
      const webhookSecret = process.env.GETTRX_WEBHOOK_SECRET;

      if (!webhookSecret) {
        console.error('❌ GETTRX webhook secret not configured');
        return res.status(500).json({ 
          success: false, 
          message: 'Webhook configuration error' 
        });
      }

      // Use raw body for signature verification (critical security fix)
      const rawBody = req.body.toString('utf8');
      
      // Validate timestamp to prevent replay attacks
      if (timestamp) {
        const webhookTime = parseInt(timestamp, 10) * 1000; // Convert to milliseconds
        const currentTime = Date.now();
        const toleranceMs = 10 * 60 * 1000; // 10 minute tolerance

        if (Math.abs(currentTime - webhookTime) > toleranceMs) {
          console.warn('🔒 Webhook timestamp outside tolerance window');
          return res.status(400).json({ 
            success: false, 
            message: 'Request timestamp outside acceptable range' 
          });
        }
      }

      // Verify webhook signature using raw body bytes
      const isValidSignature = gettrxWebhookService.verifySignature(
        rawBody, 
        signature, 
        webhookSecret
      );

      if (!isValidSignature) {
        console.warn('🔒 Invalid webhook signature received');
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid webhook signature' 
        });
      }

      // Parse JSON payload after signature verification
      let webhookPayload;
      try {
        webhookPayload = JSON.parse(rawBody);
      } catch (error) {
        console.error('❌ Failed to parse webhook JSON:', error);
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid JSON payload' 
        });
      }

      // Validate webhook payload structure
      const validation = gettrxWebhookService.validateWebhookPayload(webhookPayload);
      if (!validation.isValid) {
        console.warn('📋 Invalid webhook payload:', validation.error);
        return res.status(400).json({ 
          success: false, 
          message: `Invalid payload: ${validation.error}` 
        });
      }

      const { webhook } = webhookPayload;
      const eventType = webhook.type;
      const webhookEventId = webhook.id;
      const applicationId = webhook.data.object.applicationSummary.id;

      console.log(`📬 Received GETTRX webhook: ${eventType} (ID: ${webhookEventId}) for application ${applicationId}`);

      // Check for idempotency - if we've already processed this event
      const existingEvent = await storage.getGettrxWebhookEvent(webhookEventId);
      if (existingEvent) {
        if (existingEvent.status === 'processed') {
          console.log(`✅ Webhook event ${webhookEventId} already processed successfully`);
          return res.status(200).json({
            success: true,
            message: 'Event already processed',
            eventType: eventType,
            applicationId: applicationId,
            alreadyProcessed: true
          });
        } else if (existingEvent.status === 'failed' && (existingEvent.retryCount ?? 0) >= 3) {
          console.warn(`❌ Webhook event ${webhookEventId} has failed too many times`);
          return res.status(400).json({
            success: false,
            message: 'Event processing failed multiple times',
            eventType: eventType,
            applicationId: applicationId
          });
        }
      }

      // Create or update webhook event record for tracking
      const webhookEventData = {
        webhookEventId: webhookEventId,
        eventType: eventType,
        applicationId: applicationId,
        signature: signature,
        timestamp: timestamp ? new Date(parseInt(timestamp, 10) * 1000) : new Date(),
        ipAddress: req.ip,
        rawPayload: webhookPayload,
        status: 'pending' as const,
      };

      if (!existingEvent) {
        await storage.createGettrxWebhookEvent(webhookEventData);
      }

      try {
        // Handle the webhook event with idempotency protection
        const result = await gettrxWebhookService.handleApplicationEvent(webhookPayload, existingEvent);
        
        if (!result.success) {
          console.error('❌ Failed to process webhook:', result.message);
          
          // Mark as failed in database
          await storage.markWebhookEventFailed(webhookEventId, result.message);
          
          return res.status(400).json({ 
            success: false, 
            message: result.message,
            eventType: eventType,
            applicationId: applicationId
          });
        }

        // Mark as successfully processed
        await storage.markWebhookEventProcessed(webhookEventId, result);

        console.log('✅ Successfully processed GETTRX webhook:', result.message);
        
        // Return success response to GETTRX
        return res.status(200).json({
          success: true,
          message: 'Webhook processed successfully',
          eventType: eventType,
          applicationId: applicationId,
          processed: true
        });

      } catch (processingError) {
        console.error('❌ Error processing webhook event:', processingError);
        
        // Mark as failed in database
        const errorMessage = processingError instanceof Error ? processingError.message : 'Unknown processing error';
        await storage.markWebhookEventFailed(webhookEventId, errorMessage);
        
        return res.status(500).json({ 
          success: false, 
          message: 'Internal processing error',
          eventType: eventType,
          applicationId: applicationId
        });
      }

    } catch (error) {
      console.error('❌ Error processing GETTRX webhook:', error);
      return res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Internal server error' 
      });
    }
  });

  console.log('✅ GETTRX payment routes registered');
}