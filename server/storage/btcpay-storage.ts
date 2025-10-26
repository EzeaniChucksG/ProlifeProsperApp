/**
 * BTCPay Server Storage Module
 * Handles database operations for BTCPay Server cryptocurrency invoices and payments
 */

import { eq, desc, and } from 'drizzle-orm';
import { db } from '../db';
import { 
  btcpayInvoices, 
  btcpayPayments,
  type InsertBtcpayInvoice,
  type SelectBtcpayInvoice,
  type InsertBtcpayPayment,
  type SelectBtcpayPayment 
} from '../../shared/schema';

export class BTCPayStorage {
  // BTCPay Invoice Methods
  async createBTCPayInvoice(invoiceData: InsertBtcpayInvoice): Promise<SelectBtcpayInvoice> {
    console.log('💾 Creating BTCPay invoice in database:', invoiceData.btcpayInvoiceId);
    
    const [invoice] = await db.insert(btcpayInvoices).values(invoiceData).returning();
    
    console.log('✅ BTCPay invoice created in database with ID:', invoice.id);
    return invoice;
  }

  async getBTCPayInvoice(id: number): Promise<SelectBtcpayInvoice | null> {
    console.log('📋 Fetching BTCPay invoice from database:', id);
    
    const [invoice] = await db
      .select()
      .from(btcpayInvoices)
      .where(eq(btcpayInvoices.id, id))
      .limit(1);
    
    return invoice || null;
  }

  async getBTCPayInvoiceByInvoiceId(btcpayInvoiceId: string): Promise<SelectBtcpayInvoice | null> {
    console.log('📋 Fetching BTCPay invoice by BTCPay ID:', btcpayInvoiceId);
    
    const [invoice] = await db
      .select()
      .from(btcpayInvoices)
      .where(eq(btcpayInvoices.btcpayInvoiceId, btcpayInvoiceId))
      .limit(1);
    
    return invoice || null;
  }

  async getBTCPayInvoicesByOrganization(organizationId: number): Promise<SelectBtcpayInvoice[]> {
    console.log('📋 Fetching BTCPay invoices for organization:', organizationId);
    
    const invoices = await db
      .select()
      .from(btcpayInvoices)
      .where(eq(btcpayInvoices.organizationId, organizationId))
      .orderBy(desc(btcpayInvoices.createdAt));
    
    console.log('✅ Found', invoices.length, 'BTCPay invoices for organization');
    return invoices;
  }

  async getBTCPayInvoicesByDonation(donationId: number): Promise<SelectBtcpayInvoice[]> {
    console.log('📋 Fetching BTCPay invoices for donation:', donationId);
    
    const invoices = await db
      .select()
      .from(btcpayInvoices)
      .where(eq(btcpayInvoices.donationId, donationId))
      .orderBy(desc(btcpayInvoices.createdAt));
    
    return invoices;
  }

  async updateBTCPayInvoice(id: number, updates: Partial<SelectBtcpayInvoice>): Promise<SelectBtcpayInvoice | null> {
    console.log('🔄 Updating BTCPay invoice:', id, updates);
    
    const [invoice] = await db
      .update(btcpayInvoices)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(btcpayInvoices.id, id))
      .returning();
    
    if (invoice) {
      console.log('✅ BTCPay invoice updated successfully');
    }
    
    return invoice || null;
  }

  async deleteBTCPayInvoice(id: number): Promise<boolean> {
    console.log('🗑️ Deleting BTCPay invoice:', id);
    
    const result = await db
      .delete(btcpayInvoices)
      .where(eq(btcpayInvoices.id, id));
    
    const success = result.rowCount !== null && result.rowCount > 0;
    console.log(success ? '✅ BTCPay invoice deleted' : '❌ BTCPay invoice not found');
    
    return success;
  }

  // BTCPay Payment Methods
  async createBTCPayPayment(paymentData: InsertBtcpayPayment): Promise<SelectBtcpayPayment> {
    console.log('💾 Creating BTCPay payment in database:', paymentData.btcpayPaymentId);
    
    const [payment] = await db.insert(btcpayPayments).values(paymentData).returning();
    
    console.log('✅ BTCPay payment created in database with ID:', payment.id);
    return payment;
  }

  async getBTCPayPayment(id: number): Promise<SelectBtcpayPayment | null> {
    console.log('📋 Fetching BTCPay payment from database:', id);
    
    const [payment] = await db
      .select()
      .from(btcpayPayments)
      .where(eq(btcpayPayments.id, id))
      .limit(1);
    
    return payment || null;
  }

  async getBTCPayPaymentByPaymentId(btcpayPaymentId: string): Promise<SelectBtcpayPayment | null> {
    console.log('📋 Fetching BTCPay payment by BTCPay ID:', btcpayPaymentId);
    
    const [payment] = await db
      .select()
      .from(btcpayPayments)
      .where(eq(btcpayPayments.btcpayPaymentId, btcpayPaymentId))
      .limit(1);
    
    return payment || null;
  }

  async getBTCPayPaymentsByInvoice(invoiceId: number): Promise<SelectBtcpayPayment[]> {
    console.log('📋 Fetching BTCPay payments for invoice:', invoiceId);
    
    const payments = await db
      .select()
      .from(btcpayPayments)
      .where(eq(btcpayPayments.invoiceId, invoiceId))
      .orderBy(desc(btcpayPayments.createdAt));
    
    console.log('✅ Found', payments.length, 'BTCPay payments for invoice');
    return payments;
  }

  async updateBTCPayPayment(id: number, updates: Partial<SelectBtcpayPayment>): Promise<SelectBtcpayPayment | null> {
    console.log('🔄 Updating BTCPay payment:', id, updates);
    
    const [payment] = await db
      .update(btcpayPayments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(btcpayPayments.id, id))
      .returning();
    
    if (payment) {
      console.log('✅ BTCPay payment updated successfully');
    }
    
    return payment || null;
  }

  async deleteBTCPayPayment(id: number): Promise<boolean> {
    console.log('🗑️ Deleting BTCPay payment:', id);
    
    const result = await db
      .delete(btcpayPayments)
      .where(eq(btcpayPayments.id, id));
    
    const success = result.rowCount !== null && result.rowCount > 0;
    console.log(success ? '✅ BTCPay payment deleted' : '❌ BTCPay payment not found');
    
    return success;
  }

  // Analytics and Reporting Methods
  async getBTCPayInvoiceStats(organizationId: number, startDate?: Date, endDate?: Date): Promise<{
    totalInvoices: number;
    paidInvoices: number;
    totalAmount: number;
    paidAmount: number;
    pendingInvoices: number;
    expiredInvoices: number;
  }> {
    console.log('📊 Calculating BTCPay invoice statistics for organization:', organizationId);
    
    const invoices = await db
      .select()
      .from(btcpayInvoices)
      .where(eq(btcpayInvoices.organizationId, organizationId));
    
    const stats = {
      totalInvoices: invoices.length,
      paidInvoices: invoices.filter(i => i.status === 'settled' || i.status === 'confirmed').length,
      totalAmount: invoices.reduce((sum, i) => sum + Number(i.amount), 0),
      paidAmount: invoices
        .filter(i => i.status === 'settled' || i.status === 'confirmed')
        .reduce((sum, i) => sum + Number(i.settledAmount || i.amount), 0),
      pendingInvoices: invoices.filter(i => i.status === 'new' || i.status === 'processing').length,
      expiredInvoices: invoices.filter(i => i.status === 'expired').length,
    };
    
    console.log('✅ BTCPay statistics calculated:', stats);
    return stats;
  }

  async getRecentBTCPayActivity(organizationId: number, limit: number = 10): Promise<SelectBtcpayInvoice[]> {
    console.log('📋 Fetching recent BTCPay activity for organization:', organizationId);
    
    const invoices = await db
      .select()
      .from(btcpayInvoices)
      .where(eq(btcpayInvoices.organizationId, organizationId))
      .orderBy(desc(btcpayInvoices.updatedAt))
      .limit(limit);
    
    console.log('✅ Found', invoices.length, 'recent BTCPay invoices');
    return invoices;
  }
}