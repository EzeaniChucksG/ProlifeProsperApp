import { SendGridService } from './sendgrid';
import { db } from '../db';
import { organizations, donations, campaigns } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface DonationReceiptData {
  donationId: number;
  organizationId: number;
  donorName: string;
  donorEmail: string;
  amount: number;
  donationType: 'one-time' | 'recurring';
  campaignName?: string;
  campaignId?: number;
  donationDate: Date;
  paymentMethod: string;
  transactionId: string;
  isRecurring: boolean;
  recurringInterval?: string;
  dedicationType?: 'none' | 'honor' | 'memory';
  dedicationInfo?: {
    recipientName: string;
    recipientEmail: string;
    message: string;
    notifyRecipient: boolean;
  };
}

interface OrganizationBranding {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  website?: string;
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  taxId?: string;
  mission?: string;
}

export class ReceiptService {
  /**
   * Generate and send automated receipt after successful donation
   */
  static async generateAndSendReceipt(receiptData: DonationReceiptData): Promise<{ success: boolean; error?: string }> {
    try {
      // Get organization details for branding
      const organization = await this.getOrganizationBranding(receiptData.organizationId);
      
      if (!organization) {
        return { success: false, error: 'Organization not found' };
      }

      // Generate receipt HTML
      const receiptHtml = this.generateReceiptHTML(receiptData, organization);
      const receiptText = this.generateReceiptText(receiptData, organization);

      // Send receipt email
      const emailResult = await SendGridService.sendEmail({
        to: receiptData.donorEmail,
        from: organization.email || 'receipts@prolifegive.com',
        fromName: organization.name,
        subject: `Your donation receipt - ${organization.name}`,
        html: receiptHtml,
        text: receiptText,
        customArgs: {
          donation_id: receiptData.donationId.toString(),
          organization_id: receiptData.organizationId.toString(),
          email_type: 'receipt'
        },
        categories: ['donation_receipt', 'automated']
      });

      if (!emailResult.success) {
        return { success: false, error: `Failed to send receipt: ${emailResult.error}` };
      }

      return { success: true };
    } catch (error) {
      console.error('Error generating receipt:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Generate and send personalized thank-you note
   */
  static async generateAndSendThankYouNote(receiptData: DonationReceiptData): Promise<{ success: boolean; error?: string }> {
    try {
      // Get organization details for branding
      const organization = await this.getOrganizationBranding(receiptData.organizationId);
      
      if (!organization) {
        return { success: false, error: 'Organization not found' };
      }

      // Generate thank-you note HTML
      const thankYouHtml = this.generateThankYouHTML(receiptData, organization);
      const thankYouText = this.generateThankYouText(receiptData, organization);

      // Send thank-you email
      const emailResult = await SendGridService.sendEmail({
        to: receiptData.donorEmail,
        from: organization.email || 'thankyou@prolifegive.com',
        fromName: organization.name,
        subject: `Thank you for your generous donation - ${organization.name}`,
        html: thankYouHtml,
        text: thankYouText,
        customArgs: {
          donation_id: receiptData.donationId.toString(),
          organization_id: receiptData.organizationId.toString(),
          email_type: 'thank_you'
        },
        categories: ['thank_you_note', 'automated']
      });

      if (!emailResult.success) {
        return { success: false, error: `Failed to send thank-you note: ${emailResult.error}` };
      }

      // Send dedication notification if applicable
      if (receiptData.dedicationType && receiptData.dedicationType !== 'none' && receiptData.dedicationInfo?.notifyRecipient) {
        await this.sendDedicationNotification(receiptData, organization);
      }

      return { success: true };
    } catch (error) {
      console.error('Error generating thank-you note:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Send both receipt and thank-you note automatically
   */
  static async sendAutomatedEmails(receiptData: DonationReceiptData): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Send receipt
    const receiptResult = await this.generateAndSendReceipt(receiptData);
    if (!receiptResult.success) {
      errors.push(`Receipt: ${receiptResult.error}`);
    }

    // Send thank-you note (with small delay)
    setTimeout(async () => {
      const thankYouResult = await this.generateAndSendThankYouNote(receiptData);
      if (!thankYouResult.success) {
        console.error('Thank-you note failed:', thankYouResult.error);
      }
    }, 2000); // 2-second delay

    return { 
      success: errors.length === 0, 
      errors 
    };
  }

  /**
   * Get organization branding information
   */
  private static async getOrganizationBranding(organizationId: number): Promise<OrganizationBranding | null> {
    try {
      const [organization] = await db
        .select({
          name: organizations.name,
          email: organizations.email,
          phone: organizations.phone,
          address: organizations.address,
          website: organizations.website,
          primaryColor: organizations.primaryColor,
          secondaryColor: organizations.secondaryColor
        })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);

      if (!organization) return null;

      return {
        name: organization.name,
        email: organization.email,
        phone: organization.phone || undefined,
        address: organization.address || undefined,
        website: organization.website || undefined,
        logo: undefined, // Will be added when logo field is available
        primaryColor: organization.primaryColor || '#0d72b9',
        secondaryColor: organization.secondaryColor || '#26b578',
        taxId: undefined, // Will be added when taxId field is available
        mission: undefined // Will be added when mission field is available
      };
    } catch (error) {
      console.error('Error fetching organization branding:', error);
      return null;
    }
  }

  /**
   * Generate HTML receipt template
   */
  private static generateReceiptHTML(data: DonationReceiptData, org: OrganizationBranding): string {
    const receiptNumber = `PLG-${data.donationId.toString().padStart(6, '0')}`;
    const currentYear = new Date().getFullYear();
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Donation Receipt - ${org.name}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 3px solid ${org.primaryColor}; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { max-width: 150px; margin-bottom: 15px; }
        .org-name { font-size: 24px; font-weight: bold; color: ${org.primaryColor}; margin: 0; }
        .receipt-title { font-size: 20px; color: #666; margin: 10px 0; }
        .receipt-number { background: ${org.primaryColor}; color: white; padding: 8px 16px; border-radius: 6px; font-weight: bold; display: inline-block; margin: 15px 0; }
        .donation-details { background: #f8f9fa; border-radius: 8px; padding: 25px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #e9ecef; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { font-weight: 600; color: #495057; }
        .detail-value { color: #212529; }
        .amount { font-size: 24px; font-weight: bold; color: ${org.primaryColor}; }
        .tax-info { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .thank-you { text-align: center; background: linear-gradient(135deg, ${org.primaryColor}20, ${org.secondaryColor}20); padding: 25px; border-radius: 8px; margin: 25px 0; }
        .footer { text-align: center; font-size: 12px; color: #6c757d; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; }
        @media (max-width: 600px) { body { padding: 10px; } .donation-details { padding: 15px; } }
      </style>
    </head>
    <body>
      <div class="header">
        ${org.logo ? `<img src="${org.logo}" alt="${org.name}" class="logo">` : ''}
        <h1 class="org-name">${org.name}</h1>
        <h2 class="receipt-title">Donation Receipt</h2>
        <div class="receipt-number">Receipt #${receiptNumber}</div>
      </div>

      <div class="donation-details">
        <div class="detail-row">
          <span class="detail-label">Donor Name:</span>
          <span class="detail-value">${data.donorName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Email:</span>
          <span class="detail-value">${data.donorEmail}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Donation Amount:</span>
          <span class="detail-value amount">$${data.amount.toFixed(2)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Donation Type:</span>
          <span class="detail-value">${data.donationType === 'recurring' ? `Recurring (${data.recurringInterval})` : 'One-time'}</span>
        </div>
        ${data.campaignName ? `
        <div class="detail-row">
          <span class="detail-label">Campaign:</span>
          <span class="detail-value">${data.campaignName}</span>
        </div>
        ` : ''}
        <div class="detail-row">
          <span class="detail-label">Date:</span>
          <span class="detail-value">${data.donationDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Payment Method:</span>
          <span class="detail-value">${data.paymentMethod}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Transaction ID:</span>
          <span class="detail-value">${data.transactionId}</span>
        </div>
        ${data.dedicationType !== 'none' ? `
        <div class="detail-row">
          <span class="detail-label">Dedication:</span>
          <span class="detail-value">${data.dedicationType === 'honor' ? 'In Honor Of' : 'In Memory Of'} ${data.dedicationInfo?.recipientName}</span>
        </div>
        ` : ''}
      </div>

      <div class="tax-info">
        <strong>Tax Information:</strong> This donation is tax-deductible to the full extent allowed by law. 
        ${org.taxId ? `Our Tax ID: ${org.taxId}.` : ''} 
        No goods or services were provided in exchange for this donation. 
        Please keep this receipt for your tax records.
      </div>

      <div class="thank-you">
        <h3 style="color: ${org.primaryColor}; margin-top: 0;">Thank You for Your Generosity!</h3>
        <p style="margin-bottom: 0;">${org.mission || 'Your donation makes a meaningful difference in the lives of those we serve. Together, we are building a culture of life and hope.'}</p>
      </div>

      <div class="footer">
        <p><strong>${org.name}</strong></p>
        ${org.address ? `<p>${org.address}</p>` : ''}
        ${org.phone ? `<p>Phone: ${org.phone}</p>` : ''}
        ${org.website ? `<p>Website: <a href="${org.website}" style="color: ${org.primaryColor};">${org.website}</a></p>` : ''}
        <p style="margin-top: 15px;">© ${currentYear} ${org.name}. All rights reserved.</p>
        <p style="font-size: 11px; color: #999;">Powered by Pro-Life Prosper</p>
      </div>
    </body>
    </html>
    `;
  }

  /**
   * Generate plain text receipt
   */
  private static generateReceiptText(data: DonationReceiptData, org: OrganizationBranding): string {
    const receiptNumber = `PLG-${data.donationId.toString().padStart(6, '0')}`;
    
    return `
DONATION RECEIPT
${org.name}
Receipt #${receiptNumber}

Donor Information:
Name: ${data.donorName}
Email: ${data.donorEmail}

Donation Details:
Amount: $${data.amount.toFixed(2)}
Type: ${data.donationType === 'recurring' ? `Recurring (${data.recurringInterval})` : 'One-time'}
${data.campaignName ? `Campaign: ${data.campaignName}\n` : ''}Date: ${data.donationDate.toLocaleDateString()}
Payment Method: ${data.paymentMethod}
Transaction ID: ${data.transactionId}
${data.dedicationType !== 'none' ? `Dedication: ${data.dedicationType === 'honor' ? 'In Honor Of' : 'In Memory Of'} ${data.dedicationInfo?.recipientName}\n` : ''}
Tax Information:
This donation is tax-deductible to the full extent allowed by law. ${org.taxId ? `Tax ID: ${org.taxId}.` : ''} No goods or services were provided in exchange for this donation.

Thank you for your generosity! Your donation makes a meaningful difference.

${org.name}
${org.address || ''}
${org.phone || ''}
${org.website || ''}
    `.trim();
  }

  /**
   * Generate HTML thank-you note template
   */
  private static generateThankYouHTML(data: DonationReceiptData, org: OrganizationBranding): string {
    const impactMessage = this.getImpactMessage(data.amount, data.campaignName);
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Thank You - ${org.name}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 30px 20px; background: linear-gradient(135deg, ${org.primaryColor}15, ${org.secondaryColor}15); border-radius: 12px; margin-bottom: 30px; }
        .logo { max-width: 120px; margin-bottom: 15px; }
        .org-name { font-size: 22px; font-weight: bold; color: ${org.primaryColor}; margin: 0 0 10px 0; }
        .thank-you-title { font-size: 28px; color: #2c3e50; margin: 0; font-weight: 300; }
        .heart { color: #e74c3c; font-size: 24px; margin: 0 5px; }
        .amount-highlight { background: ${org.primaryColor}; color: white; padding: 12px 20px; border-radius: 25px; font-size: 20px; font-weight: bold; display: inline-block; margin: 20px 0; }
        .impact-section { background: #f8f9fa; border-radius: 8px; padding: 25px; margin: 25px 0; border-left: 4px solid ${org.primaryColor}; }
        .impact-title { color: ${org.primaryColor}; font-size: 18px; font-weight: 600; margin-bottom: 15px; }
        .impact-item { margin: 10px 0; padding: 8px 0; display: flex; align-items: flex-start; }
        .impact-icon { color: ${org.secondaryColor}; margin-right: 10px; font-weight: bold; }
        .dedication-section { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .quote { font-style: italic; font-size: 16px; color: #555; text-align: center; margin: 25px 0; padding: 20px; border-left: 3px solid ${org.primaryColor}; background: #f8f9fa; }
        .cta-section { text-align: center; margin: 30px 0; }
        .cta-button { display: inline-block; background: ${org.primaryColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 5px; }
        .footer { text-align: center; font-size: 14px; color: #6c757d; margin-top: 40px; padding-top: 20px; border-top: 1px solid #dee2e6; }
        .social-links { margin: 15px 0; }
        .social-link { display: inline-block; margin: 0 10px; color: ${org.primaryColor}; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="header">
        ${org.logo ? `<img src="${org.logo}" alt="${org.name}" class="logo">` : ''}
        <h1 class="org-name">${org.name}</h1>
        <h2 class="thank-you-title">Thank You<span class="heart">❤️</span>${data.donorName.split(' ')[0]}!</h2>
        <div class="amount-highlight">Your $${data.amount.toFixed(2)} gift is making a difference</div>
      </div>

      <div style="font-size: 16px; margin-bottom: 25px;">
        Dear ${data.donorName.split(' ')[0]},
        <br><br>
        Words cannot express how grateful we are for your generous donation of <strong>$${data.amount.toFixed(2)}</strong> ${data.campaignName ? `to our ${data.campaignName} campaign` : 'to our mission'}. 
        ${data.donationType === 'recurring' ? 'Your decision to become a monthly partner means we can count on your support to sustain our life-saving work.' : 'Your one-time gift provides immediate help to those who need it most.'}
      </div>

      <div class="impact-section">
        <h3 class="impact-title">Your Impact In Action</h3>
        ${impactMessage.map(item => `
          <div class="impact-item">
            <span class="impact-icon">•</span>
            <span>${item}</span>
          </div>
        `).join('')}
      </div>

      ${data.dedicationType !== 'none' ? `
      <div class="dedication-section">
        <h3 style="color: #856404; margin-top: 0;">Dedication ${data.dedicationType === 'honor' ? 'Honor' : 'Memorial'}</h3>
        <p style="margin-bottom: 0;">This donation was made ${data.dedicationType === 'honor' ? 'in honor of' : 'in loving memory of'} <strong>${data.dedicationInfo?.recipientName}</strong>.</p>
        ${data.dedicationInfo?.message ? `<p style="font-style: italic; margin-top: 10px;">"${data.dedicationInfo.message}"</p>` : ''}
      </div>
      ` : ''}

      <div class="quote">
        "${org.mission || 'Together, we are building a culture of life, hope, and love. Every donation, no matter the size, contributes to saving precious lives and supporting families in need.'}"
      </div>

      <div style="margin: 25px 0;">
        <strong>What happens next:</strong>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>Your donation will be processed and distributed within 3-5 business days</li>
          <li>You'll receive a tax-deductible receipt via email</li>
          <li>We'll send you updates on how your gift is making a difference</li>
          ${data.donationType === 'recurring' ? '<li>Your next recurring donation will be processed automatically</li>' : ''}
        </ul>
      </div>

      <div class="cta-section">
        <h3 style="color: ${org.primaryColor};">Stay Connected</h3>
        <p>Continue supporting our mission and see the lives you're changing:</p>
        ${org.website ? `<a href="${org.website}" class="cta-button">Visit Our Website</a>` : ''}
        <a href="mailto:${org.email}?subject=Thank%20you%20for%20your%20mission" class="cta-button">Contact Us</a>
      </div>

      <div class="footer">
        <p><strong>With heartfelt gratitude,</strong><br>The ${org.name} Team</p>
        ${org.address ? `<p style="margin-top: 15px;">${org.address}</p>` : ''}
        ${org.phone ? `<p>📞 ${org.phone}</p>` : ''}
        ${org.email ? `<p>✉️ ${org.email}</p>` : ''}
        <div class="social-links">
          <p style="margin-top: 20px; font-size: 12px; color: #999;">
            This email was sent because you made a donation to ${org.name}. 
            We respect your privacy and will only send you important updates about your donation and our mission.
          </p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  /**
   * Generate plain text thank-you note
   */
  private static generateThankYouText(data: DonationReceiptData, org: OrganizationBranding): string {
    const impactMessage = this.getImpactMessage(data.amount, data.campaignName);
    
    return `
Thank You ${data.donorName.split(' ')[0]}!

Dear ${data.donorName.split(' ')[0]},

Words cannot express how grateful we are for your generous donation of $${data.amount.toFixed(2)} ${data.campaignName ? `to our ${data.campaignName} campaign` : 'to our mission'}. ${data.donationType === 'recurring' ? 'Your decision to become a monthly partner means we can count on your support to sustain our life-saving work.' : 'Your one-time gift provides immediate help to those who need it most.'}

YOUR IMPACT IN ACTION:
${impactMessage.map(item => `• ${item}`).join('\n')}

${data.dedicationType !== 'none' ? `
DEDICATION ${data.dedicationType.toUpperCase()}:
This donation was made ${data.dedicationType === 'honor' ? 'in honor of' : 'in loving memory of'} ${data.dedicationInfo?.recipientName}.
${data.dedicationInfo?.message ? `"${data.dedicationInfo.message}"` : ''}
` : ''}

WHAT HAPPENS NEXT:
• Your donation will be processed and distributed within 3-5 business days
• You'll receive a tax-deductible receipt via email
• We'll send you updates on how your gift is making a difference
${data.donationType === 'recurring' ? '• Your next recurring donation will be processed automatically' : ''}

With heartfelt gratitude,
The ${org.name} Team

${org.address || ''}
${org.phone || ''}
${org.email || ''}
${org.website || ''}

---
This email was sent because you made a donation to ${org.name}. We respect your privacy and will only send you important updates.
    `.trim();
  }

  /**
   * Send dedication notification to recipient
   */
  private static async sendDedicationNotification(data: DonationReceiptData, org: OrganizationBranding): Promise<void> {
    if (!data.dedicationInfo?.recipientEmail || !data.dedicationInfo?.notifyRecipient) {
      return;
    }

    const dedicationHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>A donation has been made in your ${data.dedicationType} - ${org.name}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 25px; background: linear-gradient(135deg, ${org.primaryColor}10, ${org.secondaryColor}10); border-radius: 8px; margin-bottom: 25px; }
        .dedication-card { background: white; border: 2px solid ${org.primaryColor}; border-radius: 8px; padding: 25px; margin: 20px 0; }
        .message { background: #f8f9fa; border-left: 4px solid ${org.primaryColor}; padding: 15px; margin: 15px 0; border-radius: 4px; font-style: italic; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 style="color: ${org.primaryColor}; margin: 0;">A Special Gift</h1>
        <p style="margin: 10px 0 0 0; color: #666;">A donation has been made in your ${data.dedicationType}</p>
      </div>
      
      <div class="dedication-card">
        <h2 style="color: ${org.primaryColor}; margin-top: 0;">Dear ${data.dedicationInfo.recipientName},</h2>
        <p>We wanted to let you know that <strong>${data.donorName}</strong> has made a generous donation of <strong>$${data.amount.toFixed(2)}</strong> to ${org.name} ${data.dedicationType === 'honor' ? 'in your honor' : 'in loving memory of you'}.</p>
        
        ${data.dedicationInfo.message ? `
        <div class="message">
          <strong>Personal Message:</strong><br>
          "${data.dedicationInfo.message}"
        </div>
        ` : ''}
        
        <p>This thoughtful gift will help support our mission and make a meaningful difference in the lives of those we serve.</p>
        
        <p style="margin-bottom: 0;">With warm regards,<br>The ${org.name} Team</p>
      </div>
      
      <div style="text-align: center; font-size: 12px; color: #666; margin-top: 25px;">
        <p>${org.name} | ${org.website || ''}</p>
      </div>
    </body>
    </html>
    `;

    await SendGridService.sendEmail({
      to: data.dedicationInfo.recipientEmail,
      from: org.email || 'notifications@prolifegive.com',
      fromName: org.name,
      subject: `A donation has been made in your ${data.dedicationType} - ${org.name}`,
      html: dedicationHtml,
      customArgs: {
        donation_id: data.donationId.toString(),
        organization_id: data.organizationId.toString(),
        email_type: 'dedication_notification'
      },
      categories: ['dedication_notification', 'automated']
    });
  }

  /**
   * Get impact message based on donation amount and campaign
   */
  private static getImpactMessage(amount: number, campaignName?: string): string[] {
    const impacts: string[] = [];
    
    // Base impacts that apply to most donations
    if (amount >= 25) {
      impacts.push("Provides prenatal vitamins for a mother in need");
    }
    if (amount >= 50) {
      impacts.push("Funds counseling sessions for families facing difficult decisions");
    }
    if (amount >= 100) {
      impacts.push("Supplies essential baby items for a newborn");
    }
    if (amount >= 250) {
      impacts.push("Covers medical care for an expectant mother");
    }
    if (amount >= 500) {
      impacts.push("Supports our educational outreach programs in the community");
    }
    if (amount >= 1000) {
      impacts.push("Helps fund our life-saving advocacy initiatives");
    }

    // Campaign-specific impacts
    if (campaignName?.toLowerCase().includes('sponsor')) {
      impacts.push("Directly supports a child or family through our sponsorship program");
    } else if (campaignName?.toLowerCase().includes('pregnancy')) {
      impacts.push("Provides critical support services for pregnant mothers");
    } else if (campaignName?.toLowerCase().includes('church')) {
      impacts.push("Strengthens our church community and outreach efforts");
    } else if (campaignName?.toLowerCase().includes('disaster') || campaignName?.toLowerCase().includes('relief')) {
      impacts.push("Delivers emergency aid to families affected by disasters");
    } else if (campaignName?.toLowerCase().includes('education')) {
      impacts.push("Advances our educational mission and programs");
    } else if (campaignName?.toLowerCase().includes('medical')) {
      impacts.push("Provides essential medical care and services");
    }

    // Always include a general impact message
    impacts.push("Advances our mission to protect and support precious life");

    return impacts.slice(0, 4); // Return top 4 most relevant impacts
  }
}

export default ReceiptService;