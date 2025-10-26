/**
 * Subscription Renewal Cron Service
 * 
 * Automatically processes subscription renewals for organizations
 * whose nextBillingDate has arrived or passed.
 * 
 * Runs daily at 2:00 AM UTC to process renewals and retry failed payments.
 */

import { db } from '../db';
import { organizations } from '../../shared/schema';
import { lt, and, eq } from 'drizzle-orm';
import subscriptionService from './subscription-service';

class SubscriptionCronService {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * Start the subscription renewal cron job
   * Runs every hour to check for due renewals
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  Subscription cron already running');
      return;
    }

    console.log('🔄 Starting subscription renewal cron service...');
    
    // Run immediately on startup
    this.processRenewals();
    
    // Run every hour (3600000ms) to catch all renewals promptly
    this.intervalId = setInterval(() => {
      this.processRenewals();
    }, 3600000); // 1 hour

    this.isRunning = true;
    console.log('✅ Subscription renewal cron service started (runs every hour)');
  }

  /**
   * Stop the subscription renewal cron job
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🛑 Subscription renewal cron service stopped');
  }

  /**
   * Process all due subscription renewals
   */
  async processRenewals(): Promise<void> {
    try {
      console.log('🔍 Checking for subscription renewals...');
      
      const now = new Date();
      
      // Find all organizations with active subscriptions due for renewal
      const dueOrganizations = await db.select()
        .from(organizations)
        .where(
          and(
            eq(organizations.subscriptionStatus, 'active'),
            lt(organizations.nextBillingDate, now)
          )
        );

      if (dueOrganizations.length === 0) {
        console.log('✅ No subscriptions due for renewal');
        return;
      }

      console.log(`💳 Processing ${dueOrganizations.length} subscription renewals...`);

      // Process each renewal
      const results = await Promise.allSettled(
        dueOrganizations.map(async (org) => {
          try {
            console.log(`🔄 Processing renewal for organization ${org.id} (${org.name})`);
            const result = await subscriptionService.processRenewal(org.id);
            
            if (result.success) {
              console.log(`✅ Renewal successful for organization ${org.id}`);
            } else {
              console.log(`⚠️  Renewal skipped for organization ${org.id}: ${result.message}`);
            }
            
            return { orgId: org.id, success: true, result };
          } catch (error: any) {
            console.error(`❌ Renewal failed for organization ${org.id}:`, error.message);
            return { orgId: org.id, success: false, error: error.message };
          }
        })
      );

      // Log summary
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.length - successful;
      
      console.log(`📊 Renewal summary: ${successful} successful, ${failed} failed`);

    } catch (error: any) {
      console.error('❌ Error processing subscription renewals:', error);
    }
  }

  /**
   * Manually trigger renewal processing (for testing or admin use)
   */
  async triggerManual(): Promise<any> {
    await this.processRenewals();
    return { success: true, message: 'Manual renewal processing triggered' };
  }
}

export default new SubscriptionCronService();
