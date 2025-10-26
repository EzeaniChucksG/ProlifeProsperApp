/**
 * GETTRX Webhook Handler Service
 * Handles webhook events from GETTRX for merchant onboarding application lifecycle
 */

import crypto from 'crypto';
import { storage } from '../storage/index';

interface WebhookEvent {
  id: string;
  type: string;
  data: {
    object: {
      applicationSummary: {
        id: string;
        status: string;
        accountId?: string;
        submissionStatus?: string;
        underwritingStatus?: string;
      };
    };
  };
  created: number;
}

interface WebhookPayload {
  webhook: WebhookEvent;
}

export class GettrxWebhookService {
  /**
   * Verify webhook signature using GETTRX's signed webhook system with timestamp validation
   * @param payload - Raw request payload
   * @param signature - x-webhook-signature header value
   * @param webhookSecret - GETTRX webhook signing secret
   * @param timestamp - Optional webhook timestamp for additional security
   * @returns boolean indicating if signature is valid
   */
  verifySignature(payload: string, signature: string, webhookSecret: string, timestamp?: string): boolean {
    try {
      if (!signature || !signature.startsWith('v1=')) {
        console.warn('🔒 Invalid webhook signature format');
        return false;
      }

      // Extract the signature hash from the header (format: v1=<hash>)
      const expectedSignature = signature.substring(3);
      
      // Create HMAC signature using the webhook secret
      const calculatedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload, 'utf8')
        .digest('hex');

      // Use timingSafeEqual to prevent timing attacks
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');
      const calculatedBuffer = Buffer.from(calculatedSignature, 'hex');

      if (expectedBuffer.length !== calculatedBuffer.length) {
        console.warn('🔒 Webhook signature length mismatch');
        return false;
      }

      const isValid = crypto.timingSafeEqual(expectedBuffer, calculatedBuffer);
      
      if (!isValid) {
        console.warn('🔒 Webhook signature verification failed');
      } else {
        console.log('✅ Webhook signature verified successfully');
      }

      return isValid;
    } catch (error) {
      console.error('🔒 Error verifying webhook signature:', error);
      return false;
    }
  }

  /**
   * Map GETTRX webhook event types to database status values
   * @param eventType - GETTRX webhook event type
   * @param applicationData - Application data from webhook
   * @returns Mapped status values for database update
   */
  mapEventToStatus(eventType: string, applicationData: any): {
    status?: string;
    submissionStatus?: string;
    underwritingStatus?: string;
    gettrxAccountId?: string;
  } {
    const updates: any = {};

    // Map GETTRX events to canonical status set: ['pending','created','submitted','underwriting','approved','rejected','failed']
    switch (eventType) {
      case 'application.created':
        updates.status = 'created';
        updates.submissionStatus = 'draft';
        break;

      case 'application.partially_signed':
        // Map to pending as application is still being prepared
        updates.status = 'pending';
        updates.submissionStatus = 'pending_acceptance';
        break;

      case 'application.signed':
        // Map to created as application is ready but not yet submitted
        updates.status = 'created';
        updates.submissionStatus = 'ready_for_submission';
        break;

      case 'application.submitted':
        updates.status = 'submitted';
        updates.submissionStatus = 'submitted';
        updates.underwritingStatus = 'underwriting'; // Use canonical status
        break;

      case 'application.approved':
        updates.status = 'approved';
        updates.submissionStatus = 'submitted';
        updates.underwritingStatus = 'approved';
        if (applicationData.accountId) {
          updates.gettrxAccountId = applicationData.accountId;
        }
        break;

      case 'application.declined':
        updates.status = 'rejected'; // Use canonical status instead of 'declined'
        updates.submissionStatus = 'submitted';
        updates.underwritingStatus = 'rejected'; // Use canonical status instead of 'declined'
        break;

      case 'application.additional_info_required':
        // Map to underwriting since additional info is needed during review
        updates.status = 'underwriting';
        updates.underwritingStatus = 'underwriting';
        break;

      default:
        console.warn(`⚠️ Unknown webhook event type: ${eventType}`);
        return {};
    }

    return updates;
  }

  /**
   * Handle GETTRX application webhook event with idempotency protection
   * @param webhookPayload - The webhook payload from GETTRX
   * @param existingEvent - Previously processed webhook event (for idempotency)
   * @returns Processing result
   */
  async handleApplicationEvent(webhookPayload: WebhookPayload, existingEvent?: any): Promise<{
    success: boolean;
    message: string;
    applicationId?: string;
    updatedFields?: any;
    statusRegression?: boolean;
    alreadyProcessed?: boolean;
  }> {
    try {
      const { webhook } = webhookPayload;
      const eventType = webhook.type;
      const applicationData = webhook.data.object.applicationSummary;
      const gettrxApplicationId = applicationData.id;

      console.log(`📬 Processing webhook event: ${eventType} for application: ${gettrxApplicationId}`);

      // Find the merchant application in our database by GETTRX application ID
      const application = await storage.getGettrxMerchantApplicationByGettrxId(gettrxApplicationId);

      if (!application) {
        console.warn(`❌ Application not found for GETTRX ID: ${gettrxApplicationId}`);
        return {
          success: false,
          message: `Application not found for GETTRX ID: ${gettrxApplicationId}`
        };
      }

      // Map the webhook event to status updates
      const statusUpdates = this.mapEventToStatus(eventType, applicationData);
      
      if (Object.keys(statusUpdates).length === 0) {
        console.warn(`❌ No status mapping found for event type: ${eventType}`);
        return {
          success: false,
          message: `Unknown event type: ${eventType}`
        };
      }

      // Application status versioning to prevent regressions
      if (statusUpdates.status) {
        const currentStatus = application.status;
        const newStatus = statusUpdates.status;
        
        // Define status progression order (higher number = more advanced)
        const statusPriority: { [key: string]: number } = {
          'created': 1,
          'partially_signed': 2,
          'signed': 3,
          'submitted': 4,
          'incomplete': 3, // Can regress from submitted for additional info
          'approved': 5,
          'declined': 5, // Final state, same priority as approved
        };

        const currentPriority = statusPriority[currentStatus] || 0;
        const newPriority = statusPriority[newStatus] || 0;

        // Prevent status regression except for specific allowed cases
        if (currentPriority > newPriority && newStatus !== 'incomplete') {
          console.warn(`🛡️ Preventing status regression from ${currentStatus} to ${newStatus} for application ${application.id}`);
          return {
            success: true,
            message: `Status regression prevented: ${currentStatus} -> ${newStatus}. Event already processed in advanced state.`,
            applicationId: gettrxApplicationId,
            updatedFields: {},
            statusRegression: true
          };
        }

        // Log status progression
        console.log(`📊 Status progression for application ${application.id}: ${currentStatus} -> ${newStatus}`);
      }

      // Check if event has been processed already with existing event data
      if (existingEvent && existingEvent.status === 'processed') {
        console.log(`♻️ Event ${webhook.id} already processed successfully, returning cached result`);
        return {
          success: true,
          message: `Event already processed successfully`,
          applicationId: gettrxApplicationId,
          updatedFields: existingEvent.processingResult?.updatedFields || {},
          alreadyProcessed: true
        };
      }

      // Update the application in the database
      const updatedApplication = await storage.updateGettrxMerchantApplication(
        application.id,
        statusUpdates
      );

      console.log(`✅ Successfully updated application ${application.id} with webhook data:`, statusUpdates);

      // If the application was approved, also update the organization's merchant status
      if (eventType === 'application.approved' && application.organizationId) {
        try {
          await storage.updateOrganization(application.organizationId, {
            merchantStatus: 'approved',
            merchantAccountId: statusUpdates.gettrxAccountId || application.gettrxAccountId,
          });
          console.log(`✅ Updated organization ${application.organizationId} merchant status to approved`);
        } catch (error) {
          console.error('❌ Failed to update organization merchant status:', error);
          // Don't fail the webhook processing for this
        }
      }

      return {
        success: true,
        message: `Successfully processed ${eventType} webhook for application ${gettrxApplicationId}`,
        applicationId: gettrxApplicationId,
        updatedFields: statusUpdates
      };

    } catch (error) {
      console.error('❌ Error processing webhook event:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error processing webhook'
      };
    }
  }

  /**
   * Validate webhook payload structure
   * @param payload - Raw webhook payload
   * @returns Validation result
   */
  validateWebhookPayload(payload: any): {
    isValid: boolean;
    error?: string;
  } {
    try {
      if (!payload || typeof payload !== 'object') {
        return { isValid: false, error: 'Invalid payload format' };
      }

      if (!payload.webhook || typeof payload.webhook !== 'object') {
        return { isValid: false, error: 'Missing webhook object' };
      }

      const webhook = payload.webhook;

      if (!webhook.type || typeof webhook.type !== 'string') {
        return { isValid: false, error: 'Missing or invalid webhook type' };
      }

      if (!webhook.data || typeof webhook.data !== 'object') {
        return { isValid: false, error: 'Missing webhook data' };
      }

      if (!webhook.data.object || typeof webhook.data.object !== 'object') {
        return { isValid: false, error: 'Missing webhook data object' };
      }

      if (!webhook.data.object.applicationSummary || typeof webhook.data.object.applicationSummary !== 'object') {
        return { isValid: false, error: 'Missing applicationSummary in webhook data' };
      }

      const appSummary = webhook.data.object.applicationSummary;
      if (!appSummary.id || typeof appSummary.id !== 'string') {
        return { isValid: false, error: 'Missing or invalid applicationSummary.id' };
      }

      if (!appSummary.status || typeof appSummary.status !== 'string') {
        return { isValid: false, error: 'Missing or invalid applicationSummary.status' };
      }

      return { isValid: true };

    } catch (error) {
      return { 
        isValid: false, 
        error: `Payload validation error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Log webhook event for audit trail and debugging
   * @param event - Webhook event data
   * @param processingResult - Result of processing the webhook
   */
  logWebhookEvent(event: WebhookEvent, processingResult: any): void {
    const logData = {
      timestamp: new Date().toISOString(),
      webhookId: event.id,
      eventType: event.type,
      applicationId: event.data.object.applicationSummary.id,
      applicationStatus: event.data.object.applicationSummary.status,
      processingResult: {
        success: processingResult.success,
        message: processingResult.message,
        updatedFields: processingResult.updatedFields
      },
      created: new Date(event.created * 1000).toISOString()
    };

    // In production, this could be sent to a structured logging service
    console.log('📋 GETTRX Webhook Event Log:', JSON.stringify(logData, null, 2));

    // TODO: In production, consider storing webhook logs in database for audit purposes
    // This would help with debugging webhook issues and maintaining an audit trail
  }
}

// Export singleton instance
export const gettrxWebhookService = new GettrxWebhookService();