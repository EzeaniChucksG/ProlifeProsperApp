/**
 * Recurring Donations Cron Service
 * 
 * Automatically processes recurring donor donations based on their
 * saved payment methods and recurring schedules.
 * 
 * Runs every hour to check for due recurring donations and process them.
 */

import { db } from '../db';
import { gettrxRecurringSchedules } from '../../shared/schema';
import { lt, and, eq } from 'drizzle-orm';
import { storage } from '../storage/index';
import { gettrxService } from './gettrx';

class RecurringDonationsCronService {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * Start the recurring donations cron job
   * Runs every hour to check for due recurring donations
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  Recurring donations cron already running');
      return;
    }

    console.log('🔄 Starting recurring donations cron service...');
    
    // Run immediately on startup
    this.processRecurringDonations();
    
    // Run every hour (3600000ms) to process all due recurring donations
    this.intervalId = setInterval(() => {
      this.processRecurringDonations();
    }, 3600000); // 1 hour

    this.isRunning = true;
    console.log('✅ Recurring donations cron service started (runs every hour)');
  }

  /**
   * Stop the recurring donations cron job
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🛑 Recurring donations cron service stopped');
  }

  /**
   * Process all due recurring donations
   */
  async processRecurringDonations(): Promise<void> {
    try {
      console.log('🔍 Checking for due recurring donations...');
      
      const now = new Date();
      
      // Find all active recurring schedules due for payment
      const schedulesToProcess = await storage.getGettrxRecurringSchedulesDue(now);

      if (schedulesToProcess.length === 0) {
        console.log('✅ No recurring donations due for processing');
        return;
      }

      console.log(`💳 Processing ${schedulesToProcess.length} recurring donations...`);

      // Process each recurring donation
      const results = await Promise.allSettled(
        schedulesToProcess.map(async (schedule: any) => {
          try {
            console.log(`🔄 Processing recurring donation ${schedule.id} for donor ${schedule.donorId}`);
            
            // Get payment method
            const paymentMethod = await storage.getGettrxPaymentMethod(schedule.paymentMethodId);
            if (!paymentMethod) {
              throw new Error('Payment method not found');
            }

            // Calculate fees if donor covers them
            const feeAmount = schedule.donorCoversFees 
              ? gettrxService.calculateProcessingFee(parseFloat(schedule.amount), 'card')
              : 0;
            const totalAmount = parseFloat(schedule.amount) + feeAmount;

            // Validate payment method has required fields
            if (!paymentMethod.providerPaymentMethodId) {
              throw new Error('Payment method missing providerPaymentMethodId');
            }

            // Process the recurring payment via GETTRX
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
              paymentProcessorId: payment.id,
              status: payment.status === 'succeeded' ? 'completed' : 'pending',
              isAnonymous: false,
              isRecurring: true,
              recurringInterval: schedule.interval,
              donorCoversFees: schedule.donorCoversFees,
              source: 'recurring_billing', // IMPORTANT: Set source for recurring donations
              gettrxPaymentRequestId: payment.id,
              gettrxCustomerId: paymentMethod.gettrxCustomerId,
              gettrxPaymentMethodId: paymentMethod.providerPaymentMethodId,
              metadata: { recurringScheduleId: schedule.id },
            });

            // Calculate next payment date
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

            // Update schedule with success
            await storage.updateGettrxRecurringSchedule(schedule.id, {
              lastPaymentDate: now,
              nextPaymentDate: nextPaymentDate,
              totalPayments: (schedule.totalPayments || 0) + 1,
              failedAttempts: 0, // Reset on success
            });

            console.log(`✅ Recurring donation processed successfully: $${schedule.amount} from donor ${schedule.donorId}`);
            
            return { scheduleId: schedule.id, success: true, donation };
          } catch (error: any) {
            console.error(`❌ Failed to process recurring donation ${schedule.id}:`, error.message);
            
            // Handle failed payment - increment failed attempts
            const newFailedAttempts = (schedule.failedAttempts || 0) + 1;
            const shouldCancel = newFailedAttempts >= (schedule.maxFailedAttempts || 3);

            await storage.updateGettrxRecurringSchedule(schedule.id, {
              failedAttempts: newFailedAttempts,
              status: shouldCancel ? 'cancelled' : 'active',
            });

            if (shouldCancel) {
              console.log(`⚠️  Recurring donation ${schedule.id} cancelled after ${newFailedAttempts} failed attempts`);
            }

            return { scheduleId: schedule.id, success: false, error: error.message };
          }
        })
      );

      // Log summary
      const successful = results.filter((r: any) => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.length - successful;
      
      console.log(`📊 Recurring donations summary: ${successful} successful, ${failed} failed`);

    } catch (error: any) {
      console.error('❌ Error processing recurring donations:', error);
    }
  }

  /**
   * Manually trigger recurring donation processing (for testing or admin use)
   */
  async triggerManual(): Promise<any> {
    await this.processRecurringDonations();
    return { success: true, message: 'Manual recurring donation processing triggered' };
  }
}

export default new RecurringDonationsCronService();
