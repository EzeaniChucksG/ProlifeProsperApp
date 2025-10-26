/**
 * Donor Communication Routes
 * Handles sending emails to donors (individual emails, gift requests, thank you notes, etc.)
 */
import type { Express } from "express";
import { z } from "zod";
import { SendGridService } from "../services/sendgrid";
import { storage } from "../storage/index";

const sendDonorEmailSchema = z.object({
  organizationId: z.number().positive(),
  donorId: z.number().positive(),
  subject: z.string().min(1),
  message: z.string().min(1),
  includeOrganizationSignature: z.boolean().default(true),
});

const requestGiftSchema = z.object({
  organizationId: z.number().positive(),
  donorId: z.number().positive(),
  suggestedAmount: z.number().positive().optional(),
  message: z.string().optional(),
});

export function registerDonorCommunicationRoutes(app: Express): void {
  
  // Send individual email to a donor
  app.post("/api/organizations/:orgId/donors/:donorId/send-email", async (req, res) => {
    try {
      const organizationId = parseInt(req.params.orgId);
      const donorId = parseInt(req.params.donorId);
      
      const emailData = sendDonorEmailSchema.parse({
        ...req.body,
        organizationId,
        donorId,
      });
      
      // Get organization and donor details
      const [organization, donor] = await Promise.all([
        storage.getOrganizationById(organizationId),
        storage.getDonorById(donorId),
      ]);
      
      if (!organization) {
        return res.status(404).json({ 
          success: false, 
          message: "Organization not found" 
        });
      }
      
      if (!donor) {
        return res.status(404).json({ 
          success: false, 
          message: "Donor not found" 
        });
      }
      
      // Security check: Verify donor belongs to this organization
      if (donor.organizationId !== organizationId) {
        return res.status(403).json({ 
          success: false, 
          message: "Access denied: Donor does not belong to this organization" 
        });
      }
      
      if (!donor.email) {
        return res.status(400).json({ 
          success: false, 
          message: "Donor does not have an email address" 
        });
      }
      
      // Build email content
      const donorName = `${donor.firstName || ''} ${donor.lastName || ''}`.trim() || 'Friend';
      
      let htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Dear ${donorName},</h2>
          <div style="margin: 20px 0;">
            ${emailData.message.replace(/\n/g, '<br>')}
          </div>
      `;
      
      if (emailData.includeOrganizationSignature) {
        htmlContent += `
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p><strong>${organization.name}</strong></p>
            ${organization.website ? `<p><a href="${organization.website}">${organization.website}</a></p>` : ''}
            ${organization.phone ? `<p>Phone: ${organization.phone}</p>` : ''}
            ${organization.email ? `<p>Email: ${organization.email}</p>` : ''}
          </div>
        `;
      }
      
      htmlContent += `</div>`;
      
      const plainContent = `
Dear ${donorName},

${emailData.message}

${emailData.includeOrganizationSignature ? `
---
${organization.name}
${organization.website || ''}
${organization.phone ? `Phone: ${organization.phone}` : ''}
${organization.email ? `Email: ${organization.email}` : ''}
` : ''}
      `.trim();
      
      // Send email via SendGrid
      const result = await SendGridService.sendEmail({
        to: donor.email,
        from: organization.email,
        fromName: organization.name,
        subject: emailData.subject,
        html: htmlContent,
        text: plainContent,
        replyTo: organization.email,
        customArgs: {
          organization_id: organizationId.toString(),
          donor_id: donorId.toString(),
          email_type: 'custom_donor_email',
        },
        categories: ['donor-communication', 'custom-email'],
      });
      
      if (result.success) {
        res.json({
          success: true,
          message: `Email sent successfully to ${donor.email}`,
          messageId: result.messageId,
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.error || 'Failed to send email',
        });
      }
      
    } catch (error) {
      console.error("Error sending donor email:", error);
      res.status(500).json({
        success: false,
        message: error instanceof z.ZodError 
          ? `Validation error: ${error.errors.map(e => e.message).join(', ')}`
          : "Failed to send email to donor",
      });
    }
  });
  
  // Send gift request email to a donor
  app.post("/api/organizations/:orgId/donors/:donorId/request-gift", async (req, res) => {
    try {
      const organizationId = parseInt(req.params.orgId);
      const donorId = parseInt(req.params.donorId);
      
      const requestData = requestGiftSchema.parse({
        ...req.body,
        organizationId,
        donorId,
      });
      
      // Get organization and donor details
      const [organization, donor] = await Promise.all([
        storage.getOrganizationById(organizationId),
        storage.getDonorById(donorId),
      ]);
      
      if (!organization) {
        return res.status(404).json({ 
          success: false, 
          message: "Organization not found" 
        });
      }
      
      if (!donor) {
        return res.status(404).json({ 
          success: false, 
          message: "Donor not found" 
        });
      }
      
      // Security check: Verify donor belongs to this organization
      if (donor.organizationId !== organizationId) {
        return res.status(403).json({ 
          success: false, 
          message: "Access denied: Donor does not belong to this organization" 
        });
      }
      
      if (!donor.email) {
        return res.status(400).json({ 
          success: false, 
          message: "Donor does not have an email address" 
        });
      }
      
      // Calculate suggested amount if not provided
      const avgDonation = donor.donationCount > 0 
        ? parseFloat(donor.totalDonated || "0") / donor.donationCount 
        : 50;
      const suggestedAmount = requestData.suggestedAmount || Math.round(avgDonation);
      
      const donorName = `${donor.firstName || ''} ${donor.lastName || ''}`.trim() || 'Friend';
      
      // Build gift request email
      const subject = `${organization.name} - Your Support Makes a Difference`;
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Dear ${donorName},</h2>
          <p>Thank you for your continued support of ${organization.name}. Your generosity has made a real impact!</p>
          
          ${requestData.message ? `
            <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-left: 4px solid ${organization.primaryColor || '#0d72b9'};">
              ${requestData.message.replace(/\n/g, '<br>')}
            </div>
          ` : `
            <p>We are reaching out to see if you would consider making another gift to support our mission. Every donation helps us continue our life-saving work.</p>
          `}
          
          <div style="margin: 30px 0; text-align: center;">
            <p style="font-size: 18px; margin-bottom: 20px;">Your previous support: <strong>$${parseFloat(donor.totalDonated || "0").toFixed(2)}</strong> across ${donor.donationCount} donation${donor.donationCount !== 1 ? 's' : ''}</p>
            
            <a href="${organization.website || '#'}" 
               style="display: inline-block; padding: 15px 30px; background-color: ${organization.primaryColor || '#0d72b9'}; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Donate $${suggestedAmount} Today
            </a>
          </div>
          
          <p style="margin-top: 30px;">Thank you for standing with us in this important mission!</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p><strong>${organization.name}</strong></p>
            ${organization.website ? `<p><a href="${organization.website}">${organization.website}</a></p>` : ''}
            ${organization.phone ? `<p>Phone: ${organization.phone}</p>` : ''}
            ${organization.email ? `<p>Email: ${organization.email}</p>` : ''}
          </div>
        </div>
      `;
      
      const plainContent = `
Dear ${donorName},

Thank you for your continued support of ${organization.name}. Your generosity has made a real impact!

${requestData.message || 'We are reaching out to see if you would consider making another gift to support our mission. Every donation helps us continue our life-saving work.'}

Your previous support: $${parseFloat(donor.totalDonated || "0").toFixed(2)} across ${donor.donationCount} donation${donor.donationCount !== 1 ? 's' : ''}

Would you consider a gift of $${suggestedAmount} today?

${organization.website ? `Donate now: ${organization.website}` : ''}

Thank you for standing with us in this important mission!

---
${organization.name}
${organization.website || ''}
${organization.phone ? `Phone: ${organization.phone}` : ''}
${organization.email ? `Email: ${organization.email}` : ''}
      `.trim();
      
      // Send email via SendGrid
      const result = await SendGridService.sendEmail({
        to: donor.email,
        from: organization.email,
        fromName: organization.name,
        subject: subject,
        html: htmlContent,
        text: plainContent,
        replyTo: organization.email,
        customArgs: {
          organization_id: organizationId.toString(),
          donor_id: donorId.toString(),
          email_type: 'gift_request',
          suggested_amount: suggestedAmount.toString(),
        },
        categories: ['donor-communication', 'gift-request'],
      });
      
      if (result.success) {
        res.json({
          success: true,
          message: `Gift request sent successfully to ${donor.email}`,
          messageId: result.messageId,
          suggestedAmount,
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.error || 'Failed to send gift request',
        });
      }
      
    } catch (error) {
      console.error("Error sending gift request:", error);
      res.status(500).json({
        success: false,
        message: error instanceof z.ZodError 
          ? `Validation error: ${error.errors.map(e => e.message).join(', ')}`
          : "Failed to send gift request to donor",
      });
    }
  });
}
