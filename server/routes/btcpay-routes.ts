/**
 * BTCPay Server Cryptocurrency Payment API Routes
 * Handles cryptocurrency invoice creation, payment processing, and webhook notifications
 */

import type { Express } from "express";
import express from "express";
import { z } from "zod";
import { btcpayService } from "../services/btcpay";
import { storage } from "../storage/index";
import { authenticateToken } from "../middleware";
import { 
  insertBtcpayInvoiceSchema,
  insertDonationSchema 
} from "@shared/schema";

// Validation schemas
const createInvoiceSchema = z.object({
  amount: z.number().min(0.01).max(1000000),
  currency: z.string().default("USD"),
  organizationId: z.number().positive(),
  donationId: z.number().positive().optional(),
  donorEmail: z.string().email().optional(),
  donorName: z.string().min(1).optional(),
  defaultPaymentMethod: z.string().default("BTC"),
  metadata: z.record(z.any()).optional(),
});

const createDonationInvoiceSchema = z.object({
  amount: z.number().min(0.01).max(1000000),
  currency: z.string().default("USD"),
  organizationId: z.number().positive(),
  campaignId: z.number().positive().optional(),
  donorEmail: z.string().email().optional(),
  donorFirstName: z.string().min(1).optional(),
  donorLastName: z.string().min(1).optional(),
  donorPhone: z.string().optional(),
  isAnonymous: z.boolean().default(false),
  metadata: z.record(z.any()).optional(),
});

const updateConfigSchema = z.object({
  organizationId: z.number().positive(),
  btcpayEnabled: z.boolean(),
  btcpayServerUrl: z.string().url().optional(),
  btcpayStoreId: z.string().min(1).optional(),
  btcpayApiKey: z.string().min(1).optional(),
  btcpayWebhookSecret: z.string().min(1).optional(),
});

// Raw body parser for webhooks (needed for signature verification)
const rawBodyParser = express.raw({ type: 'application/json' });

export function registerBTCPayRoutes(app: Express): void {

  // Health check for BTCPay Server service
  app.get('/api/btcpay/health', async (req, res) => {
    try {
      console.log('🔍 BTCPay Server health check requested');
      
      // For health check, we need organization config, so return basic status
      res.json({ 
        status: 'healthy', 
        service: 'btcpay-server',
        timestamp: new Date().toISOString(),
        message: 'BTCPay Server service is operational'
      });
    } catch (error) {
      console.error('❌ BTCPay health check failed:', error);
      res.status(500).json({ 
        status: 'error',
        service: 'btcpay-server',
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Test BTCPay Server connection for specific organization
  app.post('/api/btcpay/test-connection', authenticateToken, async (req, res) => {
    try {
      const { organizationId } = req.body;
      
      if (!organizationId) {
        return res.status(400).json({ error: 'Organization ID is required' });
      }

      console.log('🔗 Testing BTCPay Server connection for organization:', organizationId);

      // Get organization's BTCPay configuration
      const organization = await storage.getOrganizationById(organizationId);
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      if (!organization.btcpayEnabled || !organization.btcpayServerUrl || !organization.btcpayStoreId || !organization.btcpayApiKey) {
        return res.status(400).json({ 
          error: 'BTCPay Server not configured',
          configured: false
        });
      }

      // Set configuration and test connection
      btcpayService.setConfig({
        serverUrl: organization.btcpayServerUrl,
        storeId: organization.btcpayStoreId,
        apiKey: organization.btcpayApiKey,
        webhookSecret: organization.btcpayWebhookSecret || undefined
      });

      const result = await btcpayService.testConnection();
      
      if (result.success) {
        // Update connection status in database
        await storage.updateOrganization(organizationId, {
          btcpayConnectionStatus: 'connected'
        });
        
        res.json({ 
          success: true, 
          message: 'BTCPay Server connection successful',
          configured: true
        });
      } else {
        // Update connection status in database
        await storage.updateOrganization(organizationId, {
          btcpayConnectionStatus: 'error'
        });
        
        res.status(400).json({ 
          success: false, 
          error: result.error,
          configured: true
        });
      }
    } catch (error) {
      console.error('❌ BTCPay connection test failed:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Connection test failed' 
      });
    }
  });

  // Create cryptocurrency invoice
  app.post('/api/btcpay/invoices', authenticateToken, async (req, res) => {
    try {
      const validatedData = createInvoiceSchema.parse(req.body);
      console.log('💳 Creating BTCPay invoice:', validatedData);

      // Get organization's BTCPay configuration
      const organization = await storage.getOrganizationById(validatedData.organizationId);
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      if (!organization.btcpayEnabled || !organization.btcpayServerUrl || !organization.btcpayStoreId || !organization.btcpayApiKey) {
        return res.status(400).json({ error: 'BTCPay Server not configured for this organization' });
      }

      // Set configuration for this organization
      btcpayService.setConfig({
        serverUrl: organization.btcpayServerUrl,
        storeId: organization.btcpayStoreId,
        apiKey: organization.btcpayApiKey,
        webhookSecret: organization.btcpayWebhookSecret || undefined
      });

      // Create the invoice
      const result = await btcpayService.createInvoice({
        amount: validatedData.amount,
        currency: validatedData.currency,
        buyerEmail: validatedData.donorEmail,
        buyerName: validatedData.donorName,
        notificationUrl: `${process.env.REPLIT_DOMAINS || 'http://localhost:3000'}/api/btcpay/webhook`,
        defaultPaymentMethod: validatedData.defaultPaymentMethod,
        metadata: validatedData.metadata
      });

      if (!result.success || !result.invoice) {
        return res.status(400).json({ error: result.error });
      }

      // Save invoice to database
      const btcpayInvoiceData = {
        organizationId: validatedData.organizationId,
        donationId: validatedData.donationId,
        btcpayInvoiceId: result.invoice.id,
        btcpayStoreId: result.invoice.storeId,
        amount: validatedData.amount,
        currency: validatedData.currency,
        status: result.invoice.status,
        expirationTime: new Date(result.invoice.expirationTime),
        checkoutLink: result.invoice.checkoutLink,
        orderId: result.invoice.orderId,
        donorEmail: validatedData.donorEmail,
        donorName: validatedData.donorName,
        metadata: result.invoice.metadata
      };

      const savedInvoice = await storage.createBTCPayInvoice(btcpayInvoiceData);
      
      res.json({ 
        success: true, 
        invoice: { 
          ...result.invoice, 
          dbId: savedInvoice.id 
        } 
      });
    } catch (error) {
      console.error('❌ BTCPay invoice creation failed:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: error.errors 
        });
      }
      
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Invoice creation failed' 
      });
    }
  });

  // Create cryptocurrency invoice for donation (simplified endpoint)
  app.post('/api/btcpay/donations/invoice', authenticateToken, async (req, res) => {
    try {
      const validatedData = createDonationInvoiceSchema.parse(req.body);
      console.log('🎯 Creating BTCPay donation invoice:', validatedData);

      // Create donor record first
      let donor = await storage.findDonorByEmail(validatedData.organizationId, validatedData.donorEmail || 'anonymous@crypto.local');
      if (!donor && validatedData.donorEmail) {
        const donorData = {
          organizationId: validatedData.organizationId,
          email: validatedData.donorEmail,
          firstName: validatedData.donorFirstName,
          lastName: validatedData.donorLastName,
          phone: validatedData.donorPhone,
          isAnonymous: validatedData.isAnonymous || false
        };
        donor = await storage.createDonor(donorData);
      }

      // Create donation record
      const donationData = {
        organizationId: validatedData.organizationId,
        campaignId: validatedData.campaignId,
        donorId: donor?.id,
        amount: validatedData.amount,
        paymentMethod: 'cryptocurrency',
        source: 'website',
        paymentStatus: 'pending',
        isAnonymous: validatedData.isAnonymous || false,
        donorEmail: validatedData.donorEmail,
        donorFirstName: validatedData.donorFirstName,
        donorLastName: validatedData.donorLastName,
        donorPhone: validatedData.donorPhone,
        status: 'pending'
      };

      const donation = await storage.createDonation(donationData);

      // Create BTCPay invoice for the donation
      const donorName = validatedData.donorFirstName && validatedData.donorLastName 
        ? `${validatedData.donorFirstName} ${validatedData.donorLastName}`
        : validatedData.donorFirstName || 'Anonymous Donor';

      const result = await btcpayService.createDonationInvoice(
        validatedData.organizationId,
        donation.id,
        validatedData.amount,
        validatedData.currency,
        validatedData.donorEmail,
        donorName,
        {
          campaignId: validatedData.campaignId,
          isAnonymous: validatedData.isAnonymous,
          ...validatedData.metadata
        }
      );

      if (!result.success || !result.invoice) {
        return res.status(400).json({ error: result.error });
      }

      res.json({ 
        success: true, 
        donation: donation,
        invoice: result.invoice
      });
    } catch (error) {
      console.error('❌ BTCPay donation invoice creation failed:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: error.errors 
        });
      }
      
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Donation invoice creation failed' 
      });
    }
  });

  // PUBLIC ENDPOINT: Create cryptocurrency invoice for donation (no authentication required)
  app.post('/api/btcpay/donations/public/invoice', async (req, res) => {
    try {
      const validatedData = createDonationInvoiceSchema.parse(req.body);
      console.log('🌐 Creating public BTCPay donation invoice:', { 
        amount: validatedData.amount, 
        organizationId: validatedData.organizationId,
        donorEmail: validatedData.donorEmail ? 'provided' : 'none'
      });

      // Verify organization exists and has BTCPay enabled
      const organization = await storage.getOrganizationById(validatedData.organizationId);
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      if (!organization.btcpayEnabled || !organization.btcpayServerUrl || !organization.btcpayStoreId || !organization.btcpayApiKey) {
        return res.status(400).json({ error: 'Cryptocurrency payments not available for this organization' });
      }

      // Set BTCPay configuration for this organization
      btcpayService.setConfig({
        serverUrl: organization.btcpayServerUrl,
        storeId: organization.btcpayStoreId,
        apiKey: organization.btcpayApiKey,
        webhookSecret: organization.btcpayWebhookSecret || undefined
      });

      // Create donor record first (anonymous if no email provided)
      let donor = null;
      if (validatedData.donorEmail) {
        donor = await storage.findDonorByEmail(validatedData.organizationId, validatedData.donorEmail);
        if (!donor) {
          const donorData = {
            organizationId: validatedData.organizationId,
            email: validatedData.donorEmail,
            firstName: validatedData.donorFirstName,
            lastName: validatedData.donorLastName,
            phone: validatedData.donorPhone,
            isAnonymous: validatedData.isAnonymous || false
          };
          donor = await storage.createDonor(donorData);
        }
      }

      // Create donation record
      const donationData = {
        organizationId: validatedData.organizationId,
        campaignId: validatedData.campaignId,
        donorId: donor?.id,
        amount: validatedData.amount.toString(),
        currency: validatedData.currency,
        paymentMethod: 'cryptocurrency',
        source: 'website',
        donationType: 'one-time', // Crypto recurring not yet supported
        status: 'pending',
        donorEmail: validatedData.donorEmail,
        donorFirstName: validatedData.donorFirstName,
        donorLastName: validatedData.donorLastName,
        donorPhone: validatedData.donorPhone,
        isAnonymous: validatedData.isAnonymous || false,
        metadata: validatedData.metadata
      };

      const donation = await storage.createDonation(donationData);

      // Generate donor name for invoice
      const donorName = validatedData.isAnonymous 
        ? 'Anonymous Donor'
        : validatedData.donorFirstName || 'Anonymous Donor';

      const result = await btcpayService.createDonationInvoice(
        validatedData.organizationId,
        donation.id,
        validatedData.amount,
        validatedData.currency,
        validatedData.donorEmail,
        donorName,
        {
          campaignId: validatedData.campaignId,
          isAnonymous: validatedData.isAnonymous,
          ...validatedData.metadata
        }
      );

      if (!result.success || !result.invoice) {
        return res.status(400).json({ error: result.error });
      }

      res.json({ 
        success: true, 
        donation: donation,
        invoice: result.invoice
      });
    } catch (error) {
      console.error('❌ Public BTCPay donation invoice creation failed:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: error.errors 
        });
      }
      
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Donation invoice creation failed' 
      });
    }
  });

  // PUBLIC ENDPOINT: Get invoice status (no authentication required for donors)
  app.get('/api/btcpay/invoices/public/:invoiceId', async (req, res) => {
    try {
      const { invoiceId } = req.params;
      console.log('🌐 Fetching public BTCPay invoice status:', invoiceId);

      // Get invoice from database first
      const dbInvoice = await storage.getBTCPayInvoiceByInvoiceId(invoiceId);
      if (!dbInvoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      // Get organization's BTCPay configuration
      const organization = await storage.getOrganizationById(dbInvoice.organizationId);
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      if (!organization.btcpayEnabled || !organization.btcpayServerUrl || !organization.btcpayStoreId || !organization.btcpayApiKey) {
        return res.status(400).json({ error: 'Cryptocurrency payments not available' });
      }

      // Set configuration and fetch live status
      btcpayService.setConfig({
        serverUrl: organization.btcpayServerUrl,
        storeId: organization.btcpayStoreId,
        apiKey: organization.btcpayApiKey,
        webhookSecret: organization.btcpayWebhookSecret || undefined
      });

      const result = await btcpayService.getInvoice(invoiceId);
      if (!result.success || !result.invoice) {
        return res.status(400).json({ error: result.error });
      }

      // Update database with latest status if different
      if (result.invoice.status !== dbInvoice.status) {
        await storage.updateBTCPayInvoice(dbInvoice.id, {
          status: result.invoice.status
        });
      }

      res.json({ 
        success: true, 
        invoice: {
          ...result.invoice,
          dbId: dbInvoice.id,
          donationId: dbInvoice.donationId
        }
      });
    } catch (error) {
      console.error('❌ Public BTCPay invoice fetch failed:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Invoice fetch failed' 
      });
    }
  });

  // Get invoice status
  app.get('/api/btcpay/invoices/:invoiceId', authenticateToken, async (req, res) => {
    try {
      const { invoiceId } = req.params;
      console.log('📋 Fetching BTCPay invoice status:', invoiceId);

      // Get invoice from database first
      const dbInvoice = await storage.getBTCPayInvoiceByInvoiceId(invoiceId);
      if (!dbInvoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      // Get organization's BTCPay configuration
      const organization = await storage.getOrganizationById(dbInvoice.organizationId);
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      // Set configuration and fetch live status
      btcpayService.setConfig({
        serverUrl: organization.btcpayServerUrl!,
        storeId: organization.btcpayStoreId!,
        apiKey: organization.btcpayApiKey!,
        webhookSecret: organization.btcpayWebhookSecret || undefined
      });

      const result = await btcpayService.getInvoice(invoiceId);
      if (!result.success || !result.invoice) {
        return res.status(400).json({ error: result.error });
      }

      // Update database with latest status if different
      if (result.invoice.status !== dbInvoice.status) {
        await storage.updateBTCPayInvoice(dbInvoice.id, {
          status: result.invoice.status
        });
      }

      res.json({ 
        success: true, 
        invoice: {
          ...result.invoice,
          dbId: dbInvoice.id,
          donationId: dbInvoice.donationId
        }
      });
    } catch (error) {
      console.error('❌ BTCPay invoice fetch failed:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Invoice fetch failed' 
      });
    }
  });

  // Get invoice payments
  app.get('/api/btcpay/invoices/:invoiceId/payments', authenticateToken, async (req, res) => {
    try {
      const { invoiceId } = req.params;
      console.log('💰 Fetching BTCPay invoice payments:', invoiceId);

      // Get invoice from database first
      const dbInvoice = await storage.getBTCPayInvoiceByInvoiceId(invoiceId);
      if (!dbInvoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      // Get organization's BTCPay configuration
      const organization = await storage.getOrganizationById(dbInvoice.organizationId);
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      // Set configuration and fetch payments
      btcpayService.setConfig({
        serverUrl: organization.btcpayServerUrl!,
        storeId: organization.btcpayStoreId!,
        apiKey: organization.btcpayApiKey!,
        webhookSecret: organization.btcpayWebhookSecret || undefined
      });

      const result = await btcpayService.getInvoicePayments(invoiceId);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({ 
        success: true, 
        payments: result.payments || []
      });
    } catch (error) {
      console.error('❌ BTCPay payments fetch failed:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Payments fetch failed' 
      });
    }
  });

  // BTCPay Server webhook endpoint (no authentication needed, but signature verification required)
  app.post('/api/btcpay/webhook', rawBodyParser, async (req, res) => {
    try {
      console.log('📨 BTCPay webhook received');
      
      const signature = req.headers['btcpay-sig'] as string;
      const body = req.body.toString();
      
      if (!signature) {
        console.warn('⚠️ BTCPay webhook missing signature');
        return res.status(400).json({ error: 'Missing signature' });
      }

      // Parse the webhook payload
      let webhookEvent;
      try {
        webhookEvent = JSON.parse(body);
      } catch (parseError) {
        console.error('❌ BTCPay webhook payload parse error:', parseError);
        return res.status(400).json({ error: 'Invalid JSON payload' });
      }

      // Find the organization that owns this BTCPay store
      const storeId = webhookEvent.storeId;
      if (!storeId) {
        console.error('❌ BTCPay webhook missing storeId');
        return res.status(400).json({ error: 'Missing storeId in webhook' });
      }

      // Find organization by BTCPay store ID
      // For now, we'll get the organization from the invoice itself
      const dbInvoice = await storage.getBTCPayInvoiceByInvoiceId(webhookEvent.invoiceId);
      if (!dbInvoice) {
        console.error('❌ BTCPay webhook invoice not found in database');
        return res.status(400).json({ error: 'Invoice not found in database' });
      }
      
      const organization = await storage.getOrganizationById(dbInvoice.organizationId);
      
      if (!organization || !organization.btcpayWebhookSecret) {
        console.error('❌ BTCPay webhook organization not found or missing webhook secret');
        return res.status(400).json({ error: 'Organization not configured for webhooks' });
      }

      // Verify webhook signature
      const isValidSignature = btcpayService.verifyWebhookSignature(
        body, 
        signature, 
        organization.btcpayWebhookSecret
      );

      if (!isValidSignature) {
        console.warn('🔒 BTCPay webhook signature verification failed');
        return res.status(401).json({ error: 'Invalid signature' });
      }

      // Process the webhook event
      const result = await btcpayService.processWebhookEvent(webhookEvent);
      
      if (result.success) {
        console.log('✅ BTCPay webhook processed successfully');
        res.json({ received: true });
      } else {
        console.error('❌ BTCPay webhook processing failed:', result.error);
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      console.error('❌ BTCPay webhook handler error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Webhook processing failed' 
      });
    }
  });

  // Update BTCPay configuration for organization
  app.put('/api/btcpay/config', authenticateToken, async (req, res) => {
    try {
      const validatedData = updateConfigSchema.parse(req.body);
      console.log('⚙️ Updating BTCPay configuration for organization:', validatedData.organizationId);

      const updateData: any = {
        btcpayEnabled: validatedData.btcpayEnabled
      };

      if (validatedData.btcpayServerUrl) updateData.btcpayServerUrl = validatedData.btcpayServerUrl;
      if (validatedData.btcpayStoreId) updateData.btcpayStoreId = validatedData.btcpayStoreId;
      if (validatedData.btcpayApiKey) updateData.btcpayApiKey = validatedData.btcpayApiKey;
      if (validatedData.btcpayWebhookSecret) updateData.btcpayWebhookSecret = validatedData.btcpayWebhookSecret;

      // Reset connection status to pending when config changes
      updateData.btcpayConnectionStatus = 'pending';

      const organization = await storage.updateOrganization(validatedData.organizationId, updateData);
      
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      res.json({ 
        success: true, 
        message: 'BTCPay configuration updated',
        organization: {
          id: organization.id,
          btcpayEnabled: organization.btcpayEnabled,
          btcpayConnectionStatus: organization.btcpayConnectionStatus
        }
      });
    } catch (error) {
      console.error('❌ BTCPay configuration update failed:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: error.errors 
        });
      }
      
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Configuration update failed' 
      });
    }
  });

  // Get BTCPay invoices for organization
  app.get('/api/btcpay/organizations/:organizationId/invoices', authenticateToken, async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      console.log('📋 Fetching BTCPay invoices for organization:', organizationId);

      if (isNaN(organizationId)) {
        return res.status(400).json({ error: 'Invalid organization ID' });
      }

      const invoices = await storage.getBTCPayInvoicesByOrganization(organizationId);
      const stats = await storage.getBTCPayInvoiceStats(organizationId);

      res.json({ 
        success: true, 
        invoices,
        stats
      });
    } catch (error) {
      console.error('❌ BTCPay invoices fetch failed:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Invoices fetch failed' 
      });
    }
  });

  // Get BTCPay analytics for organization
  app.get('/api/btcpay/organizations/:organizationId/analytics', authenticateToken, async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const { startDate, endDate } = req.query;

      console.log('📊 Fetching BTCPay analytics for organization:', organizationId);

      if (isNaN(organizationId)) {
        return res.status(400).json({ error: 'Invalid organization ID' });
      }

      const stats = await storage.getBTCPayInvoiceStats(
        organizationId, 
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      
      const recentActivity = await storage.getRecentBTCPayActivity(organizationId, 10);

      res.json({ 
        success: true, 
        stats,
        recentActivity
      });
    } catch (error) {
      console.error('❌ BTCPay analytics fetch failed:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Analytics fetch failed' 
      });
    }
  });

  console.log('✅ BTCPay Server routes registered');
}