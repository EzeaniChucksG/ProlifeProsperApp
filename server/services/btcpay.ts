/**
 * BTCPay Server Integration Service
 * Handles cryptocurrency payment processing via BTCPay Server
 *
 * Features:
 * - Invoice creation for cryptocurrency payments
 * - Payment status tracking and confirmation
 * - Webhook signature verification
 * - Multi-currency support (Bitcoin, Lightning Network, etc.)
 * - Self-hosted, zero-fee payment processing
 */

import crypto from 'crypto';
import { storage } from '../storage/index';
import { verifyHmacSignature } from '../utils/crypto';

// Helper functions for BTCPay Server data formatting
function generateOrderId(): string {
  return `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function formatBTCPayAmount(amount: number, currency: string = 'USD'): number {
  // BTCPay Server expects amounts in the base unit (no decimal places for fiat)
  if (currency === 'USD') {
    return Math.round(amount * 100) / 100; // Ensure 2 decimal places for USD
  }
  return amount;
}

// BTCPay Server configuration interface
interface BTCPayConfig {
  serverUrl: string;
  storeId: string;
  apiKey: string;
  webhookSecret?: string;
}

// BTCPay Server API interfaces
interface BTCPayInvoiceRequest {
  amount: number;
  currency: string;
  orderId?: string;
  buyerEmail?: string;
  buyerName?: string;
  notificationUrl?: string;
  redirectUrl?: string;
  defaultPaymentMethod?: string;
  metadata?: Record<string, any>;
}

interface BTCPayInvoiceResponse {
  id: string;
  storeId: string;
  amount: number;
  currency: string;
  status: string;
  checkoutLink: string;
  createdTime: string;
  expirationTime: string;
  orderId?: string;
  buyerEmail?: string;
  metadata?: Record<string, any>;
}

interface BTCPayPaymentResponse {
  id: string;
  invoiceId: string;
  paymentMethod: string;
  cryptoCode: string;
  destination: string;
  paymentProof?: string;
  value: number;
  networkFee?: number;
  status: string;
  receivedDate?: string;
  confirmationCount?: number;
  blockHeight?: number;
  blockHash?: string;
}

interface BTCPayWebhookEvent {
  deliveryId: string;
  webhookId: string;
  originalDeliveryId: string;
  isRedelivery: boolean;
  type: string;
  timestamp: number;
  storeId: string;
  invoiceId: string;
  data: {
    id: string;
    status: string;
    amount: number;
    currency: string;
    metadata?: Record<string, any>;
  };
}

export class BTCPayService {
  private config: BTCPayConfig;
  private lastErrorDetails: any = null;

  constructor() {
    // Initialize with empty config - will be set per organization
    this.config = {
      serverUrl: '',
      storeId: '',
      apiKey: '',
      webhookSecret: ''
    };
  }

  /**
   * Set configuration for a specific organization
   */
  setConfig(config: BTCPayConfig): void {
    this.config = config;
    console.log('🏗️ BTCPay Server config set for store:', config.storeId);
  }

  /**
   * Test connection to BTCPay Server
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔌 Testing BTCPay Server connection...');
      
      const response = await fetch(`${this.config.serverUrl}/api/v1/stores/${this.config.storeId}`, {
        method: 'GET',
        headers: {
          'Authorization': `token ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = `HTTP ${response.status}: ${response.statusText}`;
        console.error('❌ BTCPay Server connection failed:', error);
        return { success: false, error };
      }

      const storeData = await response.json();
      console.log('✅ BTCPay Server connection successful:', storeData.name);
      return { success: true };
    } catch (error: any) {
      console.error('❌ BTCPay Server connection error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a new cryptocurrency invoice
   */
  async createInvoice(request: BTCPayInvoiceRequest): Promise<{ success: boolean; invoice?: BTCPayInvoiceResponse; error?: string }> {
    try {
      console.log('💳 Creating BTCPay Server invoice for amount:', request.amount, request.currency);

      const invoiceData = {
        amount: formatBTCPayAmount(request.amount, request.currency),
        currency: request.currency,
        orderId: request.orderId || generateOrderId(),
        buyerEmail: request.buyerEmail,
        buyerName: request.buyerName,
        notificationUrl: request.notificationUrl,
        redirectUrl: request.redirectUrl,
        defaultPaymentMethod: request.defaultPaymentMethod || 'BTC',
        metadata: request.metadata || {}
      };

      console.log('📝 Invoice data:', invoiceData);

      const response = await fetch(`${this.config.serverUrl}/api/v1/stores/${this.config.storeId}/invoices`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invoiceData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = `HTTP ${response.status}: ${errorData.message || response.statusText}`;
        console.error('❌ BTCPay Server invoice creation failed:', error);
        this.lastErrorDetails = errorData;
        return { success: false, error };
      }

      const invoice = await response.json();
      console.log('✅ BTCPay Server invoice created:', invoice.id);
      
      return { success: true, invoice };
    } catch (error: any) {
      console.error('❌ BTCPay Server invoice creation error:', error);
      this.lastErrorDetails = error;
      return { success: false, error: error.message };
    }
  }

  /**
   * Get invoice status and details
   */
  async getInvoice(invoiceId: string): Promise<{ success: boolean; invoice?: BTCPayInvoiceResponse; error?: string }> {
    try {
      console.log('📋 Fetching BTCPay Server invoice:', invoiceId);

      const response = await fetch(`${this.config.serverUrl}/api/v1/stores/${this.config.storeId}/invoices/${invoiceId}`, {
        method: 'GET',
        headers: {
          'Authorization': `token ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = `HTTP ${response.status}: ${response.statusText}`;
        console.error('❌ BTCPay Server invoice fetch failed:', error);
        return { success: false, error };
      }

      const invoice = await response.json();
      console.log('✅ BTCPay Server invoice fetched:', invoice.status);
      
      return { success: true, invoice };
    } catch (error: any) {
      console.error('❌ BTCPay Server invoice fetch error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get invoice payment methods and details
   */
  async getInvoicePayments(invoiceId: string): Promise<{ success: boolean; payments?: BTCPayPaymentResponse[]; error?: string }> {
    try {
      console.log('💰 Fetching BTCPay Server invoice payments:', invoiceId);

      const response = await fetch(`${this.config.serverUrl}/api/v1/stores/${this.config.storeId}/invoices/${invoiceId}/payment-methods`, {
        method: 'GET',
        headers: {
          'Authorization': `token ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = `HTTP ${response.status}: ${response.statusText}`;
        console.error('❌ BTCPay Server payments fetch failed:', error);
        return { success: false, error };
      }

      const payments = await response.json();
      console.log('✅ BTCPay Server payments fetched:', payments.length, 'payments');
      
      return { success: true, payments };
    } catch (error: any) {
      console.error('❌ BTCPay Server payments fetch error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verify webhook signature using BTCPay Server's HMAC-SHA256 verification
   * Uses enhanced timing-safe comparison from crypto utilities
   */
  verifyWebhookSignature(payload: string, signature: string, webhookSecret: string): boolean {
    try {
      if (!signature || !signature.startsWith('sha256=')) {
        console.warn('🔒 Invalid BTCPay webhook signature format');
        return false;
      }

      // Use enhanced HMAC verification utility with timing-safe comparison
      const isValid = verifyHmacSignature(payload, signature, webhookSecret);
      
      if (!isValid) {
        console.warn('🔒 BTCPay webhook signature verification failed');
      } else {
        console.log('✅ BTCPay webhook signature verified successfully');
      }

      return isValid;
    } catch (error) {
      console.error('🔒 Error verifying BTCPay webhook signature:', error);
      return false;
    }
  }

  /**
   * Process webhook event and update database records
   */
  async processWebhookEvent(event: BTCPayWebhookEvent): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📨 Processing BTCPay webhook event:', event.type, 'for invoice:', event.invoiceId);

      // Find the organization that owns this BTCPay store
      const btcpayInvoice = await storage.getBTCPayInvoiceByInvoiceId(event.invoiceId);
      if (!btcpayInvoice) {
        console.error('❌ BTCPay invoice not found in database:', event.invoiceId);
        return { success: false, error: 'Invoice not found in database' };
      }

      // Update invoice status based on webhook event
      const updateData: any = {
        status: event.data.status,
        updatedAt: new Date()
      };

      // If invoice is settled, record settlement details
      if (event.data.status === 'settled' || event.data.status === 'confirmed') {
        updateData.settledAt = new Date();
        updateData.settlementCurrency = event.data.currency;
        updateData.settledAmount = event.data.amount;
      }

      // Update invoice in database
      await storage.updateBTCPayInvoice(btcpayInvoice.id, updateData);

      // If invoice is for a donation, update the donation status
      if (btcpayInvoice.donationId) {
        await storage.updateDonation(btcpayInvoice.donationId, {
          status: event.data.status === 'settled' ? 'completed' : 'pending',
          updatedAt: new Date()
        });
      }

      console.log('✅ BTCPay webhook event processed successfully');
      return { success: true };
    } catch (error: any) {
      console.error('❌ BTCPay webhook processing error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a BTCPay invoice for a donation
   */
  async createDonationInvoice(
    organizationId: number,
    donationId: number,
    amount: number,
    currency: string = 'USD',
    donorEmail?: string,
    donorName?: string,
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; invoice?: any; error?: string }> {
    try {
      console.log('🎯 Creating BTCPay donation invoice:', { organizationId, donationId, amount, currency });

      // Get organization's BTCPay configuration
      const organization = await storage.getOrganizationById(organizationId);
      if (!organization) {
        return { success: false, error: 'Organization not found' };
      }

      if (!organization.btcpayEnabled || !organization.btcpayServerUrl || !organization.btcpayStoreId || !organization.btcpayApiKey) {
        return { success: false, error: 'BTCPay Server not configured for this organization' };
      }

      // Set configuration for this organization
      this.setConfig({
        serverUrl: organization.btcpayServerUrl,
        storeId: organization.btcpayStoreId,
        apiKey: organization.btcpayApiKey,
        webhookSecret: organization.btcpayWebhookSecret || undefined
      });

      // Create the invoice
      const invoiceRequest: BTCPayInvoiceRequest = {
        amount,
        currency,
        orderId: `donation_${donationId}_${Date.now()}`,
        buyerEmail: donorEmail,
        buyerName: donorName,
        notificationUrl: `${process.env.REPLIT_DOMAINS || 'http://localhost:3000'}/api/btcpay/webhook`,
        defaultPaymentMethod: 'BTC',
        metadata: {
          donationId,
          organizationId,
          ...metadata
        }
      };

      const result = await this.createInvoice(invoiceRequest);
      if (!result.success || !result.invoice) {
        return result;
      }

      // Save invoice to database
      const btcpayInvoiceData = {
        organizationId,
        donationId,
        btcpayInvoiceId: result.invoice.id,
        btcpayStoreId: result.invoice.storeId,
        amount,
        currency,
        status: result.invoice.status,
        expirationTime: new Date(result.invoice.expirationTime),
        checkoutLink: result.invoice.checkoutLink,
        orderId: result.invoice.orderId,
        donorEmail,
        donorName,
        metadata: result.invoice.metadata
      };

      const savedInvoice = await storage.createBTCPayInvoice(btcpayInvoiceData);
      
      console.log('✅ BTCPay donation invoice created and saved:', savedInvoice.id);
      return { success: true, invoice: { ...result.invoice, dbId: savedInvoice.id } };
    } catch (error: any) {
      console.error('❌ BTCPay donation invoice creation error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get the last error details for debugging
   */
  getLastErrorDetails(): any {
    return this.lastErrorDetails;
  }

  /**
   * Clear stored error details
   */
  clearErrorDetails(): void {
    this.lastErrorDetails = null;
  }
}

// Export singleton instance
export const btcpayService = new BTCPayService();