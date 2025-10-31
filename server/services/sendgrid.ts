import { MailService } from '@sendgrid/mail';
import {
  SendgridEmailCampaign,
  InsertSendgridEmailCampaign,
  SendgridEmailRecipient,
  InsertSendgridEmailRecipient,
  SendgridWebhookEvent,
  InsertSendgridWebhookEvent,
  sendgridEmailCampaigns,
  sendgridEmailRecipients,
  sendgridWebhookEvents,
  sendgridEmailAnalytics,
} from '@shared/schema';
import { db } from '../db';
import { eq, and, desc, sql } from 'drizzle-orm';

if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY environment variable not set. SendGrid functionality will be disabled.");
}

const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

interface SendEmailParams {
  to: string;
  from: string;
  fromName?: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
  customArgs?: Record<string, string>;
  categories?: string[];
}

export class SendGridService {
  /**
   * Send an individual email through SendGrid
   */
  static async sendEmail(params: SendEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!process.env.SENDGRID_API_KEY) {
      return { success: false, error: "SendGrid API key not configured" };
    }

    try {
      const mailData = {
        to: params.to,
        from: {
          email: params.from,
          name: params.fromName || 'Pro-Life Prosper'
        },
        subject: params.subject,
        ...(params.text && { text: params.text }),
        ...(params.html && { html: params.html }),
        ...(params.replyTo && { replyTo: params.replyTo }),
        ...(params.customArgs && { customArgs: params.customArgs }),
        ...(params.categories && { categories: params.categories }),
      };

      const [response] = await mailService.send(mailData);
      
      return {
        success: true,
        messageId: response.headers['x-message-id'] as string
      };
    } catch (error) {
      console.error('SendGrid email error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown email error'
      };
    }
  }

  /**
   * Create a new email campaign
   */
  static async createCampaign(campaignData: InsertSendgridEmailCampaign): Promise<SendgridEmailCampaign> {
    const [campaign] = await db
      .insert(sendgridEmailCampaigns)
      .values(campaignData)
      .returning();
    
    return campaign;
  }

  /**
   * Get campaigns for an organization
   */
  static async getCampaignsByOrganization(organizationId: number): Promise<SendgridEmailCampaign[]> {
    return await db
      .select()
      .from(sendgridEmailCampaigns)
      .where(eq(sendgridEmailCampaigns.organizationId, organizationId))
      .orderBy(desc(sendgridEmailCampaigns.createdAt));
  }

  /**
   * Get a specific campaign by ID
   */
  static async getCampaignById(campaignId: number): Promise<SendgridEmailCampaign | undefined> {
    const [campaign] = await db
      .select()
      .from(sendgridEmailCampaigns)
      .where(eq(sendgridEmailCampaigns.id, campaignId))
      .limit(1);
    
    return campaign;
  }

  /**
   * Add recipients to a campaign
   */
  static async addRecipientsToCampaign(campaignId: number, recipients: InsertSendgridEmailRecipient[]): Promise<SendgridEmailRecipient[]> {
    const recipientsWithCampaign = recipients.map(recipient => ({
      ...recipient,
      campaignId
    }));

    const insertedRecipients = await db
      .insert(sendgridEmailRecipients)
      .values(recipientsWithCampaign)
      .returning();

    // Update campaign recipient count
    await db
      .update(sendgridEmailCampaigns)
      .set({ 
        recipientCount: sql`${sendgridEmailCampaigns.recipientCount} + ${insertedRecipients.length}` 
      })
      .where(eq(sendgridEmailCampaigns.id, campaignId));

    return insertedRecipients;
  }

  /**
   * Send a campaign to all recipients
   */
  static async sendCampaign(campaignId: number): Promise<{ success: boolean; error?: string; sentCount: number }> {
    if (!process.env.SENDGRID_API_KEY) {
      return { success: false, error: "SendGrid API key not configured", sentCount: 0 };
    }

    const campaign = await this.getCampaignById(campaignId);
    if (!campaign) {
      return { success: false, error: "Campaign not found", sentCount: 0 };
    }

    const recipients = await db
      .select()
      .from(sendgridEmailRecipients)
      .where(and(
        eq(sendgridEmailRecipients.campaignId, campaignId),
        eq(sendgridEmailRecipients.status, 'pending')
      ));

    let sentCount = 0;
    const errors = [];

    // Mark campaign as sending
    await db
      .update(sendgridEmailCampaigns)
      .set({ 
        status: 'sending',
        sentAt: new Date() 
      })
      .where(eq(sendgridEmailCampaigns.id, campaignId));

    // Send emails to all recipients
    for (const recipient of recipients) {
      try {
        const personalizedContent = this.personalizeContent(
          campaign.htmlContent || '',
          campaign.plainContent || '',
          recipient
        );

        const result = await this.sendEmail({
          to: recipient.email,
          from: campaign.fromEmail,
          fromName: campaign.fromName,
          subject: campaign.subject,
          html: personalizedContent.html,
          text: personalizedContent.plain,
          replyTo: campaign.replyTo || undefined,
          customArgs: {
            campaign_id: campaignId.toString(),
            recipient_id: recipient.id.toString(),
            organization_id: campaign.organizationId.toString()
          },
          categories: campaign.tags || []
        });

        if (result.success) {
          // Update recipient status
          await db
            .update(sendgridEmailRecipients)
            .set({ 
              status: 'sent',
              sentAt: new Date(),
              sendgridMessageId: result.messageId 
            })
            .where(eq(sendgridEmailRecipients.id, recipient.id));
          
          sentCount++;
        } else {
          // Mark as failed
          await db
            .update(sendgridEmailRecipients)
            .set({ 
              status: 'failed'
            })
            .where(eq(sendgridEmailRecipients.id, recipient.id));
          
          errors.push(`${recipient.email}: ${result.error}`);
        }
      } catch (error) {
        errors.push(`${recipient.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Update campaign status
    await db
      .update(sendgridEmailCampaigns)
      .set({ 
        status: 'sent'
      })
      .where(eq(sendgridEmailCampaigns.id, campaignId));

    return {
      success: sentCount > 0,
      sentCount,
      error: errors.length > 0 ? `Some emails failed: ${errors.slice(0, 3).join(', ')}` : undefined
    };
  }

  /**
   * Handle SendGrid webhook events
   */
  static async processWebhookEvent(eventData: any): Promise<void> {
    try {
      const webhookEvent: InsertSendgridWebhookEvent = {
        eventId: eventData.sg_event_id || `${eventData.email}_${eventData.event}_${eventData.timestamp}`,
        organizationId: parseInt(eventData.organization_id) || 0,
        campaignId: eventData.campaign_id ? parseInt(eventData.campaign_id) : null,
        recipientId: eventData.recipient_id ? parseInt(eventData.recipient_id) : null,
        email: eventData.email,
        event: eventData.event,
        timestamp: eventData.timestamp,
        smtpId: eventData.smtp_id,
        reason: eventData.reason,
        status: eventData.status,
        response: eventData.response,
        url: eventData.url,
        userAgent: eventData.useragent,
        ip: eventData.ip,
        sgEventId: eventData.sg_event_id,
        sgMessageId: eventData.sg_message_id,
        category: eventData.category || [],
        rawEvent: eventData
      };

      // Insert webhook event
      await db
        .insert(sendgridWebhookEvents)
        .values(webhookEvent)
        .onConflictDoNothing(); // Prevent duplicates

      // Update recipient status based on event
      if (webhookEvent.recipientId) {
        const updates: any = {};
        
        switch (eventData.event) {
          case 'delivered':
            updates.status = 'delivered';
            updates.deliveredAt = new Date(eventData.timestamp * 1000);
            break;
          case 'open':
            updates.status = 'opened';
            updates.openedAt = new Date(eventData.timestamp * 1000);
            break;
          case 'click':
            updates.status = 'clicked';
            updates.clickedAt = new Date(eventData.timestamp * 1000);
            break;
          case 'bounce':
            updates.status = 'bounced';
            updates.bouncedAt = new Date(eventData.timestamp * 1000);
            updates.bounceReason = eventData.reason;
            break;
          case 'unsubscribe':
            updates.status = 'unsubscribed';
            updates.unsubscribedAt = new Date(eventData.timestamp * 1000);
            break;
        }

        if (Object.keys(updates).length > 0) {
          await db
            .update(sendgridEmailRecipients)
            .set(updates)
            .where(eq(sendgridEmailRecipients.id, webhookEvent.recipientId));
        }
      }

    } catch (error) {
      console.error('Error processing SendGrid webhook:', error);
    }
  }

  /**
   * Get analytics for a campaign
   */
  static async getCampaignAnalytics(campaignId: number) {
    const recipients = await db
      .select({
        total: sql<number>`count(*)`,
        sent: sql<number>`count(*) filter (where status = 'sent')`,
        delivered: sql<number>`count(*) filter (where status = 'delivered')`,
        opened: sql<number>`count(*) filter (where status = 'opened')`,
        clicked: sql<number>`count(*) filter (where status = 'clicked')`,
        bounced: sql<number>`count(*) filter (where status = 'bounced')`,
        unsubscribed: sql<number>`count(*) filter (where status = 'unsubscribed')`
      })
      .from(sendgridEmailRecipients)
      .where(eq(sendgridEmailRecipients.campaignId, campaignId));

    const stats = recipients[0];
    
    return {
      totalRecipients: stats.total,
      sent: stats.sent,
      delivered: stats.delivered,
      opened: stats.opened,
      clicked: stats.clicked,
      bounced: stats.bounced,
      unsubscribed: stats.unsubscribed,
      deliveryRate: stats.sent > 0 ? (stats.delivered / stats.sent * 100).toFixed(2) : '0.00',
      openRate: stats.delivered > 0 ? (stats.opened / stats.delivered * 100).toFixed(2) : '0.00',
      clickRate: stats.opened > 0 ? (stats.clicked / stats.opened * 100).toFixed(2) : '0.00',
      unsubscribeRate: stats.delivered > 0 ? (stats.unsubscribed / stats.delivered * 100).toFixed(2) : '0.00'
    };
  }

  /**
   * Personalize email content with recipient data
   */
  private static personalizeContent(htmlContent: string, plainContent: string, recipient: SendgridEmailRecipient) {
    const personalizations: Record<string, string> = {
      '{{first_name}}': recipient.firstName || 'Friend',
      '{{last_name}}': recipient.lastName || '',
      '{{full_name}}': `${recipient.firstName || ''} ${recipient.lastName || ''}`.trim() || 'Friend',
      '{{email}}': recipient.email,
      // Add more personalizations as needed
    };

    let personalizedHtml = htmlContent;
    let personalizedPlain = plainContent;

    Object.entries(personalizations).forEach(([placeholder, value]) => {
      personalizedHtml = personalizedHtml.replace(new RegExp(placeholder, 'g'), value);
      personalizedPlain = personalizedPlain.replace(new RegExp(placeholder, 'g'), value);
    });

    return {
      html: personalizedHtml,
      plain: personalizedPlain
    };
  }

  /**
   * Generate organization-specific email address
   */
  static generateOrganizationEmail(organizationName: string): string {
    // Convert organization name to email-friendly format
    const emailPrefix = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 20); // Limit length
    
    return `${emailPrefix}@prolifegive.com`;
  }
}

export default SendGridService;