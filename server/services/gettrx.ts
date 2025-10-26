/**
 * GETTRX Payment Processing Service
 * Global Electronics Technology's gettrx API Integration
 *
 * Features:
 * - Credit/Debit card tokenization and processing
 * - Customer creation and management
 * - Payment method storage for recurring use
 * - Transfer creation and management
 * - Recurring payment processing
 */

// Helper functions for data formatting
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function formatPhoneNumber(phone: string | undefined): string {
  if (!phone) return "(555)-123-4567";

  console.log("📞 Formatting phone number:", phone);

  // Remove all non-digits
  const digits = phone.replace(/\D/g, "");
  console.log("📞 Extracted digits:", digits);

  // If we have exactly 10 digits, format as (xxx)-xxx-xxxx
  if (digits.length === 10) {
    const formatted = `(${digits.slice(0, 3)})-${digits.slice(3, 6)}-${digits.slice(6)}`;
    console.log("📞 Formatted as US number:", formatted);
    return formatted;
  }

  // If we have 11 digits and it starts with 1 (US country code), use last 10 digits
  if (digits.length === 11 && digits[0] === "1") {
    const usDigits = digits.slice(1);
    const formatted = `(${usDigits.slice(0, 3)})-${usDigits.slice(3, 6)}-${usDigits.slice(6)}`;
    console.log("📞 Formatted 11-digit US number:", formatted);
    return formatted;
  }

  // For international numbers or invalid lengths, use default US cell format for GETTRX
  // Using a realistic cell phone number from a valid US area code
  console.log(
    "📞 Using default US cell format for international/invalid number",
  );
  return "(321)-555-1234";
}

function formatZipCode(zipCode: string | undefined): string {
  if (!zipCode) return "90502";

  // Remove non-digits and take first 5
  const digits = zipCode.replace(/\D/g, "").slice(0, 5);

  // If we have exactly 5 digits, return them
  if (digits.length === 5) {
    return digits;
  }

  // Pad with zeros if needed, or use default
  return digits.length > 0 ? digits.padEnd(5, "0") : "90502";
}

function formatState(state: string | undefined): string {
  if (!state) return "California";

  console.log("🏛️ Formatting state:", state);

  // Map of international states/regions to US equivalents for GETTRX testing
  const stateMapping: { [key: string]: string } = {
    // Nigerian states mapped to US states
    Oyo: "California",
    Lagos: "New York",
    Abuja: "Texas",
    Kano: "Florida",
    Rivers: "Georgia",
    Kaduna: "Illinois",
    // UK
    England: "Massachusetts",
    Scotland: "Virginia",
    Wales: "North Carolina",
    // Canada
    Ontario: "Michigan",
    Quebec: "Vermont",
    "British Columbia": "Washington",
    // Common international variations
    Province: "California",
    Region: "California",
    County: "California",
  };

  // Check if it's already a US state (contains known US state patterns)
  const usStates = [
    "California",
    "New York",
    "Texas",
    "Florida",
    "Illinois",
    "Georgia",
    "Virginia",
    "North Carolina",
    "Massachusetts",
    "Washington",
    "Michigan",
    "Vermont",
  ];
  if (
    usStates.some((usState) =>
      state.toLowerCase().includes(usState.toLowerCase()),
    )
  ) {
    console.log("🏛️ Already US state:", state);
    return state;
  }

  // Check mapping
  const mappedState =
    stateMapping[state] ||
    stateMapping[state.toLowerCase()] ||
    stateMapping[state.toUpperCase()];
  if (mappedState) {
    console.log("🏛️ Mapped to US state:", mappedState);
    return mappedState;
  }

  // Default to California for GETTRX compatibility
  console.log("🏛️ Using default US state: California");
  return "California";
}

function formatEIN(ein: string | undefined): string {
  if (!ein) return "12-3456789";

  // Remove non-digits
  const digits = ein.replace(/\D/g, "");

  // If we have 9 digits, format as xx-xxxxxxx
  if (digits.length === 9) {
    return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  }

  // Default fallback
  return "12-3456789";
}

interface GettrxConfig {
  apiKey: string;
  baseUrl: string;
  onboardingBaseUrl: string;
  environment: "development" | "production";
}

interface PaymentToken {
  id: string;
  created: string;
  type: string;
}

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  created: string;
}

interface PaymentMethod {
  id: string;
  customer: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  bankAccount?: {
    last4: string;
    bankName?: string;
    accountType?: string;
    routingNumber?: string;
  };
  created: string;
}

// GETTRX wraps responses in a data object
interface GettrxResponse<T> {
  success: boolean;
  code: number;
  message?: string;
  data: T;
}

interface PaymentRequest {
  id: string;
  amount: number;
  currency: string;
  status: string;
  customer?: string;
  paymentMethod?: string;
  created: string;
  metadata?: Record<string, any>;
}

interface Transfer {
  id: string;
  amount: number;
  currency: string;
  destination: string;
  status: string;
  created: string;
}

interface RecurringPaymentData {
  customerId: string;
  merchantAccountId: string;
  paymentMethodId: string;
  amount: number;
  currency: string;
  organizationId: number;
  campaignId?: number | null;
  donorId: number | null;
  interval: "monthly" | "quarterly" | "annually";
  description?: string;
}

// Merchant Onboarding Interfaces
interface MerchantApplicationRequest {
  templateId: string;
  hasPortalAccess?: boolean;
  externalReferenceId?: string;
  coreBusinessInfo: {
    legalBusinessName: string;
    businessNameDBA?: string;
    businessAddress: string;
    businessCity: string;
    businessState: string;
    businessZipcode: string;
    businessPhone: string;
    customerServicePhone?: string;
    billingAddress?: string;
    billingCity?: string;
    billingState?: string;
    billingZipcode?: string;
    businessRegistrationType:
      | "llc"
      | "corporation"
      | "sole_proprietorship"
      | "partnership";
    businessWebsite?: string;
    businessRegistrationState: string;
    businessStockTicker?: string;
    ein: string;
    businessStartYear: number;
    businessStartMonth: number;
    deliveryLeadTime?: string;
    productOrServicesSoldDescription: string;
    currentProcessorName?: string;
    priorBankruptcyExplanation?: string;
    priorMerchantRelationshipTerminatedExplanation?: string;
  };
  processingEstimates: {
    estimatedMonthlySales: number;
    avgAmountPerSale: number;
    highSaleAmount: number;
  };
  bankingInformation: {
    bankName: string;
    routingNumber: string;
    accountNumber: string;
  };
  businessPrincipals: Array<{
    firstName: string;
    lastName: string;
    position: string;
    ssn: string;
    dateOfBirth: string;
    driverLicenseNumber: string;
    driverLicenseIssuingState: string;
    homeOwnershipType: "own" | "rent";
    homeAddress: string;
    city: string;
    state: string;
    zip: string;
    cellNumber?: string;
    homePhone?: string;
    ownershipPercentage: number;
    isControllingPrincipal: boolean;
    isPrimaryContact: boolean;
    ownerEmail: string;
  }>;
  paymentMethods: {
    onlinePaymentsPercentage: number;
    inStorePaymentsPercentage: number;
    keyedInPaymentsPercentage: number;
  };
  processingEquipment: {
    gateways: Array<{
      shortId: string;
      hasExistingAccount: boolean;
    }>;
    onlinePaymentMethods?: Array<{
      shortId: string;
      name: string;
    }>;
  };
  motoQuestionnaire?: {
    productAdvertisementChannels: string;
    orderPlacementChannel: string;
    productAndServiceDeliveryChannel: string;
    refundPolicyDescription: string;
    fulfillmentHouseInfo?: {
      fulfillmentHouseServiceName: string;
      fulfillmentHousePhoneNo: string;
    };
  };
  securityInfo: {
    creditCardDataStoredElectronically?: boolean | any[];
    isPciCompliant: boolean;
    priorDataBreachExplanation?: string;
  };
}

interface MerchantApplicationResponse {
  success: boolean;
  code: number;
  message: string;
  data: {
    accountId: string;
    applicationId: string;
    signers: Array<{
      id: string;
      userId: string;
      type: "primary_signer" | "secondary_signer";
    }>;
  };
}

interface AcceptanceTokenResponse {
  success: boolean;
  code: number;
  message: string;
  data: {
    token: string;
  };
}

interface ApplicationDetailsResponse {
  success: boolean;
  code: number;
  message: string;
  data: {
    applicationId: string;
    accountId: string;
    status: string;
    submissionStatus: string;
    underwritingStatus?: string;
    // ... other application details
  };
}

export class GettrxService {
  private config: GettrxConfig;
  private lastErrorDetails: any = null;

  // Sandbox Configuration - Production ready infrastructure
  private sandboxConfig = {
    // Pre-approved sandbox merchant for testing
    defaultMerchantAccount: "acm_673cad763c541000016e6497", // Lowe - Miller DBA (Sandbox)
    merchantName: "Lowe - Miller DBA (Sandbox)",
    // Template ID will be configured per organization or use default
    defaultTemplateId: process.env.GETTRX_TEMPLATE_ID || "",
  };

  constructor() {
    this.config = {
      apiKey: process.env.GETTRX_SECRET_KEY || "",
      baseUrl:
        process.env.NODE_ENV === "production"
          ? "https://api.gettrx.com/payments/v1"
          : "https://api-dev.gettrx.com/payments/v1",
      onboardingBaseUrl:
        process.env.NODE_ENV === "production"
          ? "https://api.gettrx.com/onboard/v1"
          : "https://api-dev.gettrx.com/onboard/v1",
      environment:
        process.env.NODE_ENV === "production" ? "production" : "development",
    };

    if (!this.config.apiKey) {
      console.warn(
        "GETTRX_SECRET_KEY not found in environment variables. Payment processing will be disabled.",
      );
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    baseUrl?: string,
  ): Promise<T> {
    if (!this.config.apiKey) {
      throw new Error("GETTRX API key not configured");
    }

    const url = `${baseUrl || this.config.baseUrl}${endpoint}`;

    console.log(`🔧 GETTRX API Request: ${options.method || "GET"} ${url}`);
    console.log(
      `🔑 Using API Key: ${this.config.apiKey ? "***" + this.config.apiKey.slice(-4) : "MISSING"}`,
    );
    if (options.headers) {
      console.log(`📋 Custom Headers:`, options.headers);
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        secretKey: this.config.apiKey,
        ...options.headers,
      },
    });

    console.log(
      `📊 GETTRX Response: ${response.status} ${response.statusText}`,
    );

    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = await response.json();
        console.error(
          `❌ GETTRX Error Response:`,
          JSON.stringify(errorData, null, 2),
        );

        // Store error details for access from routes
        this.lastErrorDetails = errorData;
      } catch (e) {
        console.error(`❌ Failed to parse GETTRX error response`);
        this.lastErrorDetails = {
          message: response.statusText,
          status: response.status,
        };
      }

      throw new Error(
        `GETTRX API Error: ${response.status} - ${errorData.message || response.statusText}`,
      );
    }

    return response.json();
  }

  // Get Account ID for Organization (Sandbox or Live)
  getAccountIdForOrganization(
    organizationId: number,
    merchantAccountId?: string,
  ): string {
    // In sandbox environment, use pre-approved merchant account if no specific merchant account is configured
    if (this.config.environment === "development") {
      return merchantAccountId || this.sandboxConfig.defaultMerchantAccount;
    }

    // In production, must have specific merchant account
    if (!merchantAccountId) {
      throw new Error(
        `No GETTRX merchant account configured for organization ${organizationId}`,
      );
    }

    return merchantAccountId;
  }

  /**
   * Get the last error details from a failed GETTRX API call
   */
  getLastErrorDetails() {
    return this.lastErrorDetails;
  }

  /**
   * Clear stored error details
   */
  clearErrorDetails() {
    this.lastErrorDetails = null;
  }

  // ======================
  // MERCHANT ONBOARDING API
  // ======================

  /**
   * Create a new merchant application
   * Makes real API calls to GETTRX in both development (sandbox) and production
   * NODE_ENV only determines which API endpoint URL to use
   */
  async createMerchantApplication(
    organizationId: number,
    applicationData: MerchantApplicationRequest,
  ): Promise<MerchantApplicationResponse> {
    // Log application creation for both environments
    console.log(
      `Creating merchant application for organization ${organizationId} in ${this.config.environment} environment`,
    );
    console.log(
      `📦 Application data being sent:`,
      JSON.stringify(applicationData, null, 2),
    );
    
    // Make real API call to GETTRX (sandbox or production based on configuration)
    return this.makeRequest<MerchantApplicationResponse>(
      "/applications",
      {
        method: "POST",
        body: JSON.stringify(applicationData),
      },
      this.config.onboardingBaseUrl,
    );
  }

  /**
   * Get acceptance token for merchant signature collection
   */
  async getAcceptanceToken(
    applicationId: string,
    signerId: string,
    accountId: string,
  ): Promise<AcceptanceTokenResponse> {
    return this.makeRequest<AcceptanceTokenResponse>(
      `/application/${applicationId}/signers/${signerId}/acceptance-token`,
      {
        method: "GET",
        headers: {
          onBehalfOf: accountId,
        },
      },
      this.config.onboardingBaseUrl,
    );
  }

  /**
   * Get application details and status
   */
  async getApplicationDetails(
    applicationId: string,
  ): Promise<ApplicationDetailsResponse> {
    return this.makeRequest<ApplicationDetailsResponse>(
      `/application/${applicationId}`,
      {
        method: "GET",
      },
      this.config.onboardingBaseUrl,
    );
  }

  /**
   * Get merchant application status from GETTRX API
   */
  async getMerchantApplicationStatus(
    applicationId: string
  ): Promise<{
    success: boolean;
    status: number;
    code: number;
    message: string;
    data?: any;
  }> {
    try {
      const response = await this.getApplicationDetails(applicationId);
      return {
        success: true,
        status: 200,
        code: 200,
        message: "Status retrieved successfully",
        data: response.data
      };
    } catch (error: any) {
      console.error('Failed to get application status from GETTRX:', error);
      
      let statusCode = 500;
      const statusMatch = error.message?.match(/GETTRX API Error: (\d+)/);
      if (statusMatch) {
        statusCode = parseInt(statusMatch[1], 10);
      }

      return {
        success: false,
        status: statusCode,
        code: statusCode,
        message: error.message || 'Unknown error occurred while fetching status',
        data: this.lastErrorDetails
      };
    }
  }

  /**
   * Submit application for underwriting (if not auto-submit)
   */
  async submitApplication(applicationId: string, bypassReadinessChecks?: boolean): Promise<{
    success: boolean;
    status: number;
    message: string;
    data?: any;
  }> {
    try {
      const requestBody: any = {};
      if (bypassReadinessChecks !== undefined) {
        requestBody.bypassReadinessChecks = bypassReadinessChecks;
      }

      const response = await this.makeRequest(
        `/application/${applicationId}/submit`,
        {
          method: "POST",
          body: Object.keys(requestBody).length > 0 ? JSON.stringify(requestBody) : undefined,
        },
        this.config.onboardingBaseUrl,
      );

      // GETTRX API returns 201 on successful submission
      return {
        success: true,
        status: 201,
        message: "Application successfully submitted to underwriting",
        data: response
      };
    } catch (error: any) {
      console.error('GETTRX submit application failed:', error);
      
      // Extract status code from error message if available
      let statusCode = 500;
      const statusMatch = error.message?.match(/GETTRX API Error: (\d+)/);
      if (statusMatch) {
        statusCode = parseInt(statusMatch[1], 10);
      }

      return {
        success: false,
        status: statusCode,
        message: error.message || 'Unknown error occurred during submission',
        data: this.lastErrorDetails
      };
    }
  }

  /**
   * Build sandbox-compatible merchant application data
   */
  buildSandboxMerchantApplication(
    organizationName: string,
    organizationData: {
      website?: string;
      phone?: string;
      address?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      ein?: string;
      ownerFirstName?: string;
      ownerLastName?: string;
      ownerEmail?: string;
    },
  ): MerchantApplicationRequest {
    const formattedPhone = formatPhoneNumber(organizationData.phone);
    const formattedZipCode = formatZipCode(organizationData.zipCode);
    const formattedEIN = formatEIN(organizationData.ein);
    const formattedState = formatState(organizationData.state);

    return {
      templateId: this.sandboxConfig.defaultTemplateId,
      hasPortalAccess: true,
      externalReferenceId: `org_${Date.now()}`,
      coreBusinessInfo: {
        legalBusinessName: organizationName,
        businessNameDBA: organizationName,
        businessAddress: organizationData.address || "199 Sesame St",
        businessCity: organizationData.city || "Torrance",
        businessState: formattedState,
        businessZipcode: formattedZipCode,
        businessPhone: formattedPhone,
        customerServicePhone: formattedPhone,
        businessRegistrationType: "llc",
        businessWebsite: organizationData.website || "https://example.org",
        businessRegistrationState: formattedState,
        ein: formattedEIN,
        businessStartYear: new Date().getFullYear() - 1,
        businessStartMonth: 1,
        productOrServicesSoldDescription:
          "Nonprofit services and donation processing",
        currentProcessorName: "None",
      },
      processingEstimates: {
        estimatedMonthlySales: 10000,
        avgAmountPerSale: 100,
        highSaleAmount: 500,
      },
      bankingInformation: {
        bankName: "Bank of America",
        routingNumber: "121000358",
        accountNumber: "12345678901", // Sandbox account number
      },
      businessPrincipals: [
        {
          firstName: organizationData.ownerFirstName || "John",
          lastName: organizationData.ownerLastName || "Doe",
          position: "President",
          ssn: "123-45-6789", // Test SSN for sandbox
          dateOfBirth: "1990-01-01",
          driverLicenseNumber: "123456789",
          driverLicenseIssuingState: formattedState,
          homeOwnershipType: "own",
          homeAddress: organizationData.address || "1900 Sample St",
          city: organizationData.city || "Torrance",
          state: formattedState,
          zip: formattedZipCode,
          homePhone: formattedPhone,
          cellNumber: "(321)-555-1234", // Use a realistic US cell number format
          ownershipPercentage: 100,
          isControllingPrincipal: true,
          isPrimaryContact: true,
          ownerEmail: organizationData.ownerEmail || "owner@prolifeprosper.com",
        },
      ],
      paymentMethods: {
        onlinePaymentsPercentage: 100,
        inStorePaymentsPercentage: 0,
        keyedInPaymentsPercentage: 0,
      },
      processingEquipment: {
        gateways: [
          {
            shortId: "edgepay",
            hasExistingAccount: false,
          },
        ],
        onlinePaymentMethods: [
          {
            shortId: "other",
            name: "Pro Life Prosper Platform",
          },
        ],
      },
      motoQuestionnaire: {
        productAdvertisementChannels: "Website, Social Media",
        orderPlacementChannel: "Online",
        productAndServiceDeliveryChannel: "Digital Services",
        refundPolicyDescription: "30 days full refund policy",
      },
      securityInfo: {
        isPciCompliant: true,
        creditCardDataStoredElectronically: [],
      },
    };
  }

  // Customer Management
  async createCustomer(
    data: {
      name: string;
      email?: string;
      phone?: string;
      organizationId?: number;
    },
    accountId?: string
  ): Promise<GettrxResponse<Customer>> {
    const headers: Record<string, string> = {};
    if (accountId) {
      headers.onBehalfOf = accountId;
    }
    
    return this.makeRequest<GettrxResponse<Customer>>("/customers", {
      method: "POST",
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        phone: data.phone,
        metadata: {
          organizationId: data.organizationId,
        },
      }),
      headers,
    });
  }

  async getCustomer(customerId: string): Promise<Customer> {
    return this.makeRequest<Customer>(`/customers/${customerId}`);
  }

  async updateCustomer(
    customerId: string,
    data: Partial<Customer>,
  ): Promise<Customer> {
    return this.makeRequest<Customer>(`/customers/${customerId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  // Payment Processing with Account ID routing
  async createPayment(data: {
    amount: number;
    currency: string;
    paymentToken: string;
    customer?: string;
    setupFutureUsage?: "off_session" | "on_session";
    organizationId: number;
    campaignId?: number;
    donorId?: number;
    merchantAccountId?: string; // Organization's GETTRX account ID
    metadata?: Record<string, any>;
  }): Promise<PaymentRequest> {
    const accountId = this.getAccountIdForOrganization(
      data.organizationId,
      data.merchantAccountId,
    );

    const paymentData: any = {
      amount: Math.round(data.amount * 100), // Convert to cents
      currency: data.currency.toLowerCase(),
      paymentToken: data.paymentToken,
      metadata: {
        organizationId: data.organizationId,
        campaignId: data.campaignId,
        donorId: data.donorId,
        platform: "pro-life-prosper",
        ...data.metadata,
      },
    };

    if (data.customer) {
      paymentData.customer = data.customer;
    }

    if (data.setupFutureUsage) {
      paymentData.setupFutureUsage = data.setupFutureUsage;
    }

    return this.makeRequest<PaymentRequest>("/payment-requests", {
      method: "POST",
      body: JSON.stringify(paymentData),
      headers: {
        onBehalfOf: accountId,
      },
    });
  }

  async getPayment(paymentId: string): Promise<PaymentRequest> {
    return this.makeRequest<PaymentRequest>(`/payment-requests/${paymentId}`);
  }

  async getPaymentMethod(customerId: string, paymentMethodId: string, accountId?: string): Promise<GettrxResponse<PaymentMethod>> {
    const headers: Record<string, string> = {};
    if (accountId) {
      headers.onBehalfOf = accountId;
    }
    
    // Official GETTRX endpoint format: /customers/{customer_id}/payment_methods/{payment_method_id}
    return this.makeRequest<GettrxResponse<PaymentMethod>>(`/customers/${customerId}/payment_methods/${paymentMethodId}`, {
      headers,
    });
  }

  async capturePayment(paymentId: string): Promise<PaymentRequest> {
    return this.makeRequest<PaymentRequest>(
      `/payment-requests/${paymentId}/capture`,
      {
        method: "POST",
      },
    );
  }

  // Payment Method Management
  async savePaymentMethod(
    data: {
      paymentToken: string;
      customer: string;
      usage: "off_session" | "on_session";
    },
    accountId?: string
  ): Promise<GettrxResponse<any>> {
    const headers: Record<string, string> = {};
    if (accountId) {
      headers.onBehalfOf = accountId;
    }
    
    return this.makeRequest<GettrxResponse<any>>("/setup-requests", {
      method: "POST",
      body: JSON.stringify(data),
      headers,
    });
  }

  async getPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    // Official GETTRX endpoint format: /customers/{customer_id}/payment_methods (underscores)
    return this.makeRequest<PaymentMethod[]>(
      `/customers/${customerId}/payment_methods`,
    );
  }

  async deletePaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    // Official GETTRX endpoint format: /customers/{customer_id}/payment_methods/{payment_method_id}
    await this.makeRequest(`/customers/${customerId}/payment_methods/${paymentMethodId}`, {
      method: "DELETE",
    });
  }

  // Recurring Payments (using saved payment methods)
  async processRecurringPayment(
    data: RecurringPaymentData,
  ): Promise<PaymentRequest> {
    const headers: Record<string, string> = {};
    if (data.merchantAccountId) {
      headers.onBehalfOf = data.merchantAccountId;
    }
    
    return this.makeRequest<PaymentRequest>("/payment-requests", {
      method: "POST",
      body: JSON.stringify({
        amount: Math.round(data.amount * 100),
        currency: "usd",
        customer: data.customerId,
        paymentMethod: data.paymentMethodId,
        description: data.description || `Subscription payment`,
        metadata: {
          organizationId: data.organizationId,
          campaignId: data.campaignId,
          donorId: data.donorId,
          recurringInterval: data.interval,
          platform: "pro-life-prosper",
          paymentType: "recurring",
        },
      }),
      headers,
    });
  }

  // Transfer Management
  async createTransfer(data: {
    amount: number;
    currency: string;
    destination: string;
    organizationId: number;
    description?: string;
  }): Promise<Transfer> {
    return this.makeRequest<Transfer>("/transfers", {
      method: "POST",
      body: JSON.stringify({
        amount: Math.round(data.amount * 100),
        currency: data.currency.toLowerCase(),
        destination: data.destination,
        description:
          data.description ||
          `Transfer for organization ${data.organizationId}`,
        metadata: {
          organizationId: data.organizationId,
          platform: "pro-life-prosper",
        },
      }),
    });
  }

  async getTransfer(transferId: string): Promise<Transfer> {
    return this.makeRequest<Transfer>(`/transfers/${transferId}`);
  }

  async cancelTransfer(transferId: string): Promise<Transfer> {
    return this.makeRequest<Transfer>(`/transfers/${transferId}/cancel`, {
      method: "POST",
    });
  }

  // Utility Methods
  async validatePaymentToken(paymentToken: string): Promise<boolean> {
    try {
      // Attempt to create a minimal payment request to validate token
      await this.makeRequest("/payment-requests/validate", {
        method: "POST",
        body: JSON.stringify({
          paymentToken,
          validateOnly: true,
        }),
      });
      return true;
    } catch (error) {
      console.error("Payment token validation failed:", error);
      return false;
    }
  }

  // Fee Calculation (based on gettrx typical rates - should be configured)
  calculateProcessingFee(
    amount: number,
    paymentMethod: "card" | "ach" = "card",
  ): number {
    if (paymentMethod === "card") {
      // Typical card processing: 2.9% + $0.30
      return Math.round((amount * 0.029 + 0.3) * 100) / 100;
    } else if (paymentMethod === "ach") {
      // Typical ACH processing: 1% + $0.30 (max $5)
      const fee = amount * 0.01 + 0.3;
      return Math.min(fee, 5.0);
    }
    return 0;
  }

  // Check merchant application status (legacy method)
  async checkMerchantApplicationStatus(
    applicationId: string,
  ): Promise<ApplicationDetailsResponse> {
    try {
      const response = await this.makeRequest<ApplicationDetailsResponse>(
        `/application/${applicationId}`,
        {
          method: "GET",
        },
        this.config.onboardingBaseUrl,
      );

      // Extract status from the correct path in the response
      const status = response.data?.status || (response.data as any)?.applicationSummary?.status || "unknown";
      
      console.log(
        `📋 Application ${applicationId} status: ${status}`,
      );
      return response;
    } catch (error) {
      console.error(
        `❌ Failed to check application status for ${applicationId}:`,
        error,
      );
      throw error;
    }
  }

  // Poll for merchant approval (checks every 30 seconds for up to 5 minutes)
  async pollForMerchantApproval(
    applicationId: string,
    maxAttempts: number = 10,
    intervalSeconds: number = 30,
  ): Promise<{
    isApproved: boolean;
    status: string;
    finalResponse?: ApplicationDetailsResponse;
  }> {
    console.log(`🔄 Starting polling for merchant approval: ${applicationId}`);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const statusResponse =
          await this.getMerchantApplicationStatus(applicationId);
        const status = (statusResponse.data?.status || (statusResponse.data as any)?.applicationSummary?.status)?.toLowerCase();
        const underwritingStatus =
          statusResponse.data?.underwritingStatus?.toLowerCase();

        console.log(
          `📊 Poll attempt ${attempt}/${maxAttempts}: status=${status}, underwriting=${underwritingStatus}`,
        );

        // Check for approval
        if (status === "approved" || underwritingStatus === "approved") {
          console.log(`✅ Merchant approved after ${attempt} polls!`);
          return {
            isApproved: true,
            status: "approved",
            finalResponse: statusResponse,
          };
        }

        // Check for rejection
        if (status === "declined" || underwritingStatus === "declined") {
          console.log(`❌ Merchant declined after ${attempt} polls`);
          return {
            isApproved: false,
            status: "declined",
            finalResponse: statusResponse,
          };
        }

        // If not final status and more attempts remain, wait before next poll
        if (attempt < maxAttempts) {
          console.log(`⏳ Waiting ${intervalSeconds}s before next poll...`);
          await new Promise((resolve) =>
            setTimeout(resolve, intervalSeconds * 1000),
          );
        }
      } catch (error) {
        console.warn(`⚠️ Poll attempt ${attempt} failed:`, error);
        if (attempt === maxAttempts) {
          throw error;
        }
      }
    }

    console.log(`⏰ Polling timeout reached. Merchant still in pending state.`);
    return {
      isApproved: false,
      status: "pending_approval",
    };
  }

  // Health Check
  async healthCheck(): Promise<{
    status: string;
    message: string;
    details?: any;
  }> {
    try {
      if (!this.config.apiKey) {
        return { status: "error", message: "API key not configured" };
      }

      // For GETTRX API, we'll make a test call to customers endpoint
      // Even if it returns a 400 (missing required params), it proves the API is reachable and our auth works
      try {
        await this.makeRequest("/customers", { method: "GET" });
        // If we get here, the API worked perfectly
        return {
          status: "ok",
          message: "GETTRX API connection successful",
          details: {
            endpoint: "/customers",
            baseUrl: this.config.baseUrl,
            environment: this.config.environment,
          },
        };
      } catch (error: any) {
        // Check if it's a 400 error due to missing parameters - this actually means auth worked!
        if (
          error.message &&
          error.message.includes("required account ID is missing")
        ) {
          return {
            status: "ok",
            message:
              "GETTRX API connection successful - Authentication verified",
            details: {
              endpoint: "/customers",
              note: "API responded with expected parameter validation (auth working)",
              baseUrl: this.config.baseUrl,
              environment: this.config.environment,
            },
          };
        }

        // For any other error, it's a real problem
        throw error;
      }
    } catch (error) {
      console.error("GETTRX Health Check failed:", error);
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
        details: {
          baseUrl: this.config.baseUrl,
          environment: this.config.environment,
          hasApiKey: !!this.config.apiKey,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }
}

// Export singleton instance
export const gettrxService = new GettrxService();

// Export types for use in other modules
export type {
  PaymentToken,
  Customer,
  PaymentMethod,
  PaymentRequest,
  Transfer,
  RecurringPaymentData,
  GettrxConfig,
};
