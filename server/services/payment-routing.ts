/**
 * Payment Routing Service
 * Implements server-side payment routing algorithm:
 * Context → Fund → Payment Account
 */
import type { Fund, PaymentAccount, InsertFund, InsertPaymentAccount } from "@shared/schema";
import type { IStorage } from "../storage/interfaces";

export interface PaymentContext {
  organizationId: number;
  contextType: "campaign" | "product" | "event" | "church_offering" | "sponsorship" | "general" | "auction" | "kiosk" | "virtual_terminal" | "text_to_give" | "envelope" | "recurring" | "social";
  contextId?: number;
  contextName?: string;
  amount: number;
  donorId?: number;
  paymentMethod?: string;
}

export interface PaymentRouting {
  fund: Fund;
  paymentAccount: PaymentAccount;
  fundId: number;
  paymentAccountId: number;
}

export class PaymentRoutingService {
  constructor(private storage: IStorage) {}

  /**
   * Main routing algorithm: Context → Fund → Payment Account
   */
  async routePayment(context: PaymentContext): Promise<PaymentRouting> {
    const fund = await this.resolveFund(context);
    const paymentAccount = await this.resolvePaymentAccount(context, fund);

    return {
      fund,
      paymentAccount,
      fundId: fund.id,
      paymentAccountId: paymentAccount.id
    };
  }

  /**
   * Step 1: Resolve payment context to appropriate fund
   */
  private async resolveFund(context: PaymentContext): Promise<Fund> {
    const { organizationId, contextType, contextId, contextName } = context;

    // For general donations, use default fund
    if (contextType === "general") {
      let defaultFund = await this.storage.getDefaultFund(organizationId);
      if (!defaultFund) {
        defaultFund = await this.createDefaultGeneralFund(organizationId);
      }
      return defaultFund;
    }

    // For specific contexts (campaigns, products, events), find or create dedicated fund
    if (contextId && contextName) {
      return await this.getOrCreateContextFund(organizationId, contextType, contextId, contextName);
    }

    // For context types without specific ID, try to find type-based fund
    let typeFund = await this.storage.getFundByType(organizationId, contextType);
    if (!typeFund) {
      typeFund = await this.createTypeFund(organizationId, contextType);
    }
    return typeFund;
  }

  /**
   * Step 2: Resolve fund to appropriate payment account
   */
  private async resolvePaymentAccount(context: PaymentContext, fund: Fund): Promise<PaymentAccount> {
    const { organizationId } = context;

    // Check if fund has a specific payment account preference
    const fundSettings = fund.settings as any;
    if (fundSettings?.paymentAccountId) {
      const specificAccount = await this.storage.getPaymentAccount(fundSettings.paymentAccountId);
      if (specificAccount && specificAccount.isActive) {
        return specificAccount;
      }
    }

    // For church offerings, try to find church-specific payment account
    if (context.contextType === "church_offering" && context.contextId) {
      const churchAccount = await this.findChurchPaymentAccount(organizationId, context.contextId);
      if (churchAccount) {
        return churchAccount;
      }
    }

    // Fall back to organization's default payment account
    let defaultAccount = await this.storage.getDefaultPaymentAccount(organizationId);
    if (!defaultAccount) {
      defaultAccount = await this.createDefaultPaymentAccount(organizationId);
    }
    return defaultAccount;
  }

  /**
   * Create default general fund for organization
   */
  private async createDefaultGeneralFund(organizationId: number): Promise<Fund> {
    const generalFund: InsertFund = {
      organizationId,
      name: "General Fund",
      code: "GENERAL",
      type: "general",
      description: "Default fund for general donations and operations",
      isActive: true,
      isDefault: true,
      settings: {}
    };

    return await this.storage.createFund(generalFund);
  }

  /**
   * Create or find fund for specific context (campaign, product, event)
   */
  private async getOrCreateContextFund(
    organizationId: number,
    contextType: string,
    contextId: number,
    contextName: string
  ): Promise<Fund> {
    // Try to find existing fund for this context
    const funds = await this.storage.getFundsByOrganization(organizationId);
    const existingFund = funds.find(fund => {
      const settings = fund.settings as any;
      return fund.type === contextType && settings?.contextId === contextId;
    });

    if (existingFund) {
      return existingFund;
    }

    // Create new fund for this context
    const contextFund: InsertFund = {
      organizationId,
      name: `${contextName} Fund`,
      code: `${contextType.toUpperCase()}_${contextId}`,
      type: contextType,
      description: `Fund for ${contextType}: ${contextName}`,
      isActive: true,
      isDefault: false,
      settings: { contextId }
    };

    return await this.storage.createFund(contextFund);
  }

  /**
   * Create type-based fund (e.g., for text-to-give, kiosks)
   */
  private async createTypeFund(organizationId: number, contextType: string): Promise<Fund> {
    const typeDisplayNames: Record<string, string> = {
      "text_to_give": "Text-to-Give",
      "kiosk": "Kiosk Donations",
      "virtual_terminal": "Virtual Terminal",
      "envelope": "Envelope Donations",
      "recurring": "Recurring Donations",
      "social": "Social Media",
      "auction": "Auction",
      "church_offering": "Church Offerings",
      "sponsorship": "Sponsorships"
    };

    const displayName = typeDisplayNames[contextType] || contextType;
    
    const typeFund: InsertFund = {
      organizationId,
      name: `${displayName} Fund`,
      code: contextType.toUpperCase(),
      type: contextType,
      description: `Fund for ${displayName} donations`,
      isActive: true,
      isDefault: false,
      settings: {}
    };

    return await this.storage.createFund(typeFund);
  }

  /**
   * Find church-specific payment account
   */
  private async findChurchPaymentAccount(organizationId: number, churchId: number): Promise<PaymentAccount | undefined> {
    const accounts = await this.storage.getPaymentAccountsByOrganization(organizationId);
    return accounts.find(account => {
      const metadata = account.metadata as any;
      return metadata?.entityType === "church" && metadata?.entityId === churchId && account.isActive;
    });
  }

  /**
   * Create default payment account for organization
   */
  private async createDefaultPaymentAccount(organizationId: number): Promise<PaymentAccount> {
    // Get organization details to create meaningful account name
    const organization = await this.storage.getOrganizationById(organizationId);
    
    const defaultAccount: InsertPaymentAccount = {
      organizationId,
      name: `${organization?.name || 'Organization'} Default Account`,
      merchantAccountId: organization?.merchantAccountId || "",
      provider: "gettrx",
      isActive: true,
      isDefault: true,
      metadata: {}
    };

    return await this.storage.createPaymentAccount(defaultAccount);
  }

  /**
   * Validate payment routing result
   */
  async validateRouting(routing: PaymentRouting): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check fund is active
    if (!routing.fund.isActive) {
      errors.push("Selected fund is inactive");
    }

    // Check payment account is active
    if (!routing.paymentAccount.isActive) {
      errors.push("Selected payment account is inactive");
    }

    // Check payment account has valid merchant ID
    if (!routing.paymentAccount.merchantAccountId) {
      errors.push("Payment account missing merchant account ID");
    }

    // Check organization match
    if (routing.fund.organizationId !== routing.paymentAccount.organizationId) {
      errors.push("Fund and payment account belong to different organizations");
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get routing summary for logging/debugging
   */
  getRoutingSummary(context: PaymentContext, routing: PaymentRouting): string {
    return `Payment Routing: ${context.contextType}${context.contextId ? `:${context.contextId}` : ''} → Fund[${routing.fund.id}:${routing.fund.name}] → Account[${routing.paymentAccount.id}:${routing.paymentAccount.name}]`;
  }
}