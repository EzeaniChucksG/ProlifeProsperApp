/**
 * GETTRX Merchant Onboarding Service
 * 
 * Handles complete merchant application lifecycle:
 * - Sandbox and production merchant creation
 * - Application status tracking
 * - Acceptance token management
 * - Account ID assignment and storage
 */

import { GettrxService } from './gettrx';
import { db } from '../db';
import { 
  organizations,
  gettrxMerchantApplications, 
  gettrxAcceptanceTokens,
  type SelectGettrxMerchantApplication,
  type InsertGettrxMerchantApplication,
  type SelectGettrxAcceptanceToken,
  type InsertGettrxAcceptanceToken
} from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export class MerchantOnboardingService {
  private gettrxService: GettrxService;

  constructor() {
    this.gettrxService = new GettrxService();
  }

  /**
   * Map GETTRX validation errors to user-friendly format
   */
  private mapGettrxErrorsToValidationErrors(gettrxErrors: Array<{param: string, msg: string, location: string}>): Array<{
    param: string;
    msg: string;
    location: string;
    fieldName: string;
    navigationUrl: string;
  }> {
    // Map GETTRX field names to user-friendly names and navigation URLs
    const fieldMappings: Record<string, {fieldName: string, navigationUrl: string}> = {
      'coreBusinessInfo.legalBusinessName': {
        fieldName: 'Organization Legal Name',
        navigationUrl: '/nonprofit/profile'
      },
      'coreBusinessInfo.businessPhone': {
        fieldName: 'Organization Phone Number',
        navigationUrl: '/nonprofit/profile'
      },
      'coreBusinessInfo.customerServicePhone': {
        fieldName: 'Customer Service Phone',
        navigationUrl: '/nonprofit/profile'
      },
      'businessPrincipals[0].homePhone': {
        fieldName: 'Principal Contact Phone',
        navigationUrl: '/nonprofit/profile'
      },
      'coreBusinessInfo.businessAddress': {
        fieldName: 'Business Address',
        navigationUrl: '/nonprofit/profile'
      },
      'coreBusinessInfo.ein': {
        fieldName: 'EIN (Tax ID)',
        navigationUrl: '/nonprofit/profile'
      },
      'bankingInformation.bankName': {
        fieldName: 'Bank Information',
        navigationUrl: '/nonprofit/profile'
      },
      'bankingInformation.routingNumber': {
        fieldName: 'Bank Routing Number',
        navigationUrl: '/nonprofit/profile'
      },
      'bankingInformation.accountNumber': {
        fieldName: 'Bank Account Number',
        navigationUrl: '/nonprofit/profile'
      }
    };

    return gettrxErrors.map(error => {
      const mapping = fieldMappings[error.param];
      return {
        param: error.param,
        msg: error.msg,
        location: error.location,
        fieldName: mapping?.fieldName || error.param,
        navigationUrl: (mapping?.navigationUrl || '/nonprofit/profile') + '?from=payment-setup'
      };
    });
  }

  /**
   * Initialize merchant onboarding for a new organization
   * Sandbox: Uses pre-approved merchant account
   * Production: Creates new merchant application
   */
  async initializeMerchantOnboarding(
    organizationId: number,
    organizationData?: {
      name?: string;
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
    }
  ): Promise<{
    success: boolean;
    merchantAccountId?: string;
    applicationId?: string;
    status: string;
    message: string;
  }> {
    try {
      // Check if organization already has a merchant application
      const existingApplication = await db
        .select()
        .from(gettrxMerchantApplications)
        .where(eq(gettrxMerchantApplications.organizationId, organizationId))
        .limit(1);

      if (existingApplication.length > 0) {
        const app = existingApplication[0];
        return {
          success: true,
          merchantAccountId: app.gettrxAccountId || undefined,
          applicationId: app.gettrxApplicationId,
          status: app.status,
          message: `Merchant application already exists with status: ${app.status}`,
        };
      }

      // Fetch complete organization data from database
      const [organization] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);

      if (!organization) {
        throw new Error(`Organization with ID ${organizationId} not found`);
      }

      console.log('Creating sandbox merchant application for organization::', organizationId);
      
      // Use actual organization data, with fallbacks for missing fields
      const completeOrgData = {
        name: organization.legalBusinessName || organization.name,
        website: organization.website || undefined,
        phone: organization.businessPhone || organization.phone || undefined,
        address: organization.address || undefined,
        city: organization.city || undefined,
        state: organization.state || undefined,
        zipCode: organization.zipCode || undefined,
        ein: organization.ein || undefined,
        ownerFirstName: organizationData?.ownerFirstName,
        ownerLastName: organizationData?.ownerLastName,
        ownerEmail: organizationData?.ownerEmail || organization.email || undefined,
      };

      // Build merchant application data
      const applicationData = this.gettrxService.buildSandboxMerchantApplication(
        organization.legalBusinessName || organization.name,
        completeOrgData
      );

      // Create merchant application via GETTRX API
      const response = await this.gettrxService.createMerchantApplication(
        organizationId,
        applicationData
      );

      if (!response.success) {
        throw new Error(`Failed to create merchant application: ${response.message}`);
      }

      // Store application in database
      const dbApplication: InsertGettrxMerchantApplication = {
        organizationId,
        gettrxApplicationId: response.data.applicationId,
        gettrxAccountId: response.data.accountId,
        templateId: applicationData.templateId,
        externalReferenceId: applicationData.externalReferenceId,
        status: 'pending',
        submissionStatus: 'draft',
        legalBusinessName: applicationData.coreBusinessInfo.legalBusinessName,
        businessNameDBA: applicationData.coreBusinessInfo.businessNameDBA,
        businessWebsite: applicationData.coreBusinessInfo.businessWebsite,
        businessPhone: applicationData.coreBusinessInfo.businessPhone,
        customerServicePhone: applicationData.coreBusinessInfo.customerServicePhone,
        ein: applicationData.coreBusinessInfo.ein,
        businessRegistrationType: applicationData.coreBusinessInfo.businessRegistrationType,
        businessRegistrationState: applicationData.coreBusinessInfo.businessRegistrationState,
        businessStartYear: applicationData.coreBusinessInfo.businessStartYear,
        businessStartMonth: applicationData.coreBusinessInfo.businessStartMonth,
        businessAddress: applicationData.coreBusinessInfo.businessAddress,
        businessCity: applicationData.coreBusinessInfo.businessCity,
        businessState: applicationData.coreBusinessInfo.businessState,
        businessZipcode: applicationData.coreBusinessInfo.businessZipcode,
        billingAddress: applicationData.coreBusinessInfo.billingAddress,
        billingCity: applicationData.coreBusinessInfo.billingCity,
        billingState: applicationData.coreBusinessInfo.billingState,
        billingZipcode: applicationData.coreBusinessInfo.billingZipcode,
        estimatedMonthlySales: applicationData.processingEstimates.estimatedMonthlySales,
        avgAmountPerSale: applicationData.processingEstimates.avgAmountPerSale,
        highSaleAmount: applicationData.processingEstimates.highSaleAmount,
        productOrServiceDescription: applicationData.coreBusinessInfo.productOrServicesSoldDescription,
        currentProcessorName: applicationData.coreBusinessInfo.currentProcessorName,
        bankName: applicationData.bankingInformation.bankName,
        routingNumber: applicationData.bankingInformation.routingNumber,
        accountNumber: applicationData.bankingInformation.accountNumber,
        onlinePaymentsPercentage: applicationData.paymentMethods.onlinePaymentsPercentage,
        inStorePaymentsPercentage: applicationData.paymentMethods.inStorePaymentsPercentage,
        keyedInPaymentsPercentage: applicationData.paymentMethods.keyedInPaymentsPercentage,
        businessPrincipals: applicationData.businessPrincipals,
        signers: response.data.signers,
        processingEquipment: applicationData.processingEquipment,
        motoQuestionnaire: applicationData.motoQuestionnaire,
        securityInfo: applicationData.securityInfo,
        hasPortalAccess: applicationData.hasPortalAccess,
        autoSubmitEnabled: true, // Enable auto-submit for sandbox
        acceptanceCollected: false,
        primarySignerAcceptanceCollected: false,
        allSignersAcceptanceCollected: false,
        submissionAttempts: 0,
      };

      const [savedApplication] = await db
        .insert(gettrxMerchantApplications)
        .values(dbApplication)
        .returning();

      // Update organization with merchant account ID
      await db
        .update(organizations)
        .set({ merchantAccountId: response.data.accountId })
        .where(eq(organizations.id, organizationId));

      // Note: Removed auto-approval logic to use real GETTRX status

      return {
        success: true,
        merchantAccountId: response.data.accountId,
        applicationId: response.data.applicationId,
        status: 'pending',
        message: 'Merchant application created successfully',
      };
    } catch (error) {
      console.error('Failed to initialize merchant onboarding:', error);
      
      // Check if this is a GETTRX validation error with structured error details
      if (error instanceof Error && error.message.includes('GETTRX API Error: 400')) {
        // Get the actual validation errors from GETTRX service
        const gettrxErrorDetails = this.gettrxService.getLastErrorDetails();
        if (gettrxErrorDetails && gettrxErrorDetails.errors) {
          const validationErrors = this.mapGettrxErrorsToValidationErrors(gettrxErrorDetails.errors);
          return {
            success: false,
            status: 'validation_error',
            message: 'Please correct the following information to continue with payment setup',
            validationErrors: validationErrors,
            errorType: 'validation'
          } as any;
        }
      }
      
      return {
        success: false,
        status: 'error',
        message: `Failed to initialize merchant onboarding: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get merchant application status for an organization
   */
  async getMerchantApplicationStatus(organizationId: number): Promise<{
    hasApplication: boolean;
    application?: SelectGettrxMerchantApplication;
    requiresAcceptance: boolean;
    isActive: boolean;
  }> {
    const application = await db
      .select()
      .from(gettrxMerchantApplications)
      .where(eq(gettrxMerchantApplications.organizationId, organizationId))
      .limit(1);

    if (application.length === 0) {
      return {
        hasApplication: false,
        requiresAcceptance: false,
        isActive: false,
      };
    }

    const app = application[0];
    return {
      hasApplication: true,
      application: app,
      requiresAcceptance: !app.allSignersAcceptanceCollected && app.status !== 'approved',
      isActive: app.status === 'approved' && !!app.gettrxAccountId,
    };
  }

  /**
   * Generate acceptance token for signature collection
   */
  async generateAcceptanceToken(
    organizationId: number,
    signerId: string
  ): Promise<{
    success: boolean;
    token?: string;
    expiresAt?: Date;
    message: string;
  }> {
    try {
      const application = await db
        .select()
        .from(gettrxMerchantApplications)
        .where(eq(gettrxMerchantApplications.organizationId, organizationId))
        .limit(1);

      if (application.length === 0) {
        return {
          success: false,
          message: 'No merchant application found for organization',
        };
      }

      const app = application[0];
      if (!app.gettrxAccountId) {
        return {
          success: false,
          message: 'Merchant account ID not available',
        };
      }

      // Get acceptance token from GETTRX API
      const tokenResponse = await this.gettrxService.getAcceptanceToken(
        app.gettrxApplicationId,
        signerId,
        app.gettrxAccountId
      );

      if (!tokenResponse.success) {
        return {
          success: false,
          message: `Failed to generate acceptance token: ${tokenResponse.message}`,
        };
      }

      // Store token in database
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
      const tokenData: InsertGettrxAcceptanceToken = {
        applicationId: app.id,
        signerId,
        signerType: 'primary_signer', // Default to primary signer
        acceptanceToken: tokenResponse.data.token,
        expiresAt: expiresAt,
        isCollected: false,
      };

      await db.insert(gettrxAcceptanceTokens).values(tokenData);

      return {
        success: true,
        token: tokenResponse.data.token,
        expiresAt,
        message: 'Acceptance token generated successfully',
      };
    } catch (error) {
      console.error('Failed to generate acceptance token:', error);
      return {
        success: false,
        message: `Failed to generate acceptance token: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Mark acceptance as collected for a signer
   */
  async markAcceptanceCollected(
    organizationId: number,
    signerId: string,
    acceptanceData: {
      ipAddress: string;
      userAgent: string;
    }
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const application = await db
        .select()
        .from(gettrxMerchantApplications)
        .where(eq(gettrxMerchantApplications.organizationId, organizationId))
        .limit(1);

      if (application.length === 0) {
        return {
          success: false,
          message: 'No merchant application found',
        };
      }

      const app = application[0];

      // Update acceptance token
      await db
        .update(gettrxAcceptanceTokens)
        .set({
          isCollected: true,
          collectedAt: new Date(),
          collectionIpAddress: acceptanceData.ipAddress,
        })
        .where(
          and(
            eq(gettrxAcceptanceTokens.applicationId, app.id),
            eq(gettrxAcceptanceTokens.signerId, signerId)
          )
        );

      // Update application acceptance status
      const updateData: Partial<InsertGettrxMerchantApplication> = {
        acceptanceCollected: true,
        acceptanceCollectedAt: new Date(),
        primarySignerAcceptanceCollected: true,
        allSignersAcceptanceCollected: true, // Assume single principal for now
      };

      // Note: Removed auto-approval logic to use real GETTRX status

      await db
        .update(gettrxMerchantApplications)
        .set(updateData)
        .where(eq(gettrxMerchantApplications.id, app.id));

      return {
        success: true,
        message: 'Acceptance collected successfully',
      };
    } catch (error) {
      console.error('Failed to mark acceptance as collected:', error);
      return {
        success: false,
        message: `Failed to mark acceptance as collected: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get the merchant account ID for an organization
   */
  async getMerchantAccountId(organizationId: number): Promise<string | null> {
    const organization = await db
      .select({ merchantAccountId: organizations.merchantAccountId })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    return organization[0]?.merchantAccountId || null;
  }

  /**
   * Synchronize merchant application status with GETTRX API
   */
  async syncMerchantStatus(organizationId: number): Promise<{
    success: boolean;
    status: string;
    message: string;
    gettrxStatus?: any;
  }> {
    try {
      // Get the application from database
      const application = await db
        .select()
        .from(gettrxMerchantApplications)
        .where(eq(gettrxMerchantApplications.organizationId, organizationId))
        .limit(1);

      if (application.length === 0) {
        return {
          success: false,
          status: 'no_application',
          message: 'No merchant application found for organization',
        };
      }

      const app = application[0];
      if (!app.gettrxApplicationId || !app.gettrxAccountId) {
        return {
          success: false,
          status: 'missing_ids',
          message: 'Merchant application or account ID not available',
        };
      }

      // Get actual status from GETTRX API
      const statusResponse = await this.gettrxService.getMerchantApplicationStatus(
        app.gettrxApplicationId
      );

      if (!statusResponse.success) {
        return {
          success: false,
          status: 'api_error',
          message: `Failed to fetch status from GETTRX: ${statusResponse.message}`,
        };
      }

      const gettrxStatus = statusResponse.data;
      
      // Use GETTRX application status directly for consistency  
      const actualStatus = (gettrxStatus as any).applicationSummary?.status || gettrxStatus.status || 'pending';
      
      // Update local database with real GETTRX status
      const updateData: Partial<InsertGettrxMerchantApplication> = {
        status: actualStatus,
        underwritingStatus: gettrxStatus.underwritingStatus,
        submissionStatus: gettrxStatus.submissionStatus,
      };

      // Update timestamps based on status
      if (actualStatus === 'approved' && !app.approvedAt) {
        updateData.approvedAt = new Date();
      }
      if (actualStatus === 'activated' && !app.activatedAt) {
        updateData.activatedAt = new Date();
      }

      await db
        .update(gettrxMerchantApplications)
        .set(updateData)
        .where(eq(gettrxMerchantApplications.id, app.id));

      return {
        success: true,
        status: actualStatus,
        message: `Status synchronized: ${actualStatus}`,
        gettrxStatus: gettrxStatus,
      };
    } catch (error) {
      console.error('Failed to sync merchant status:', error);
      return {
        success: false,
        status: 'error',
        message: `Failed to sync status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get merchant application status with real-time GETTRX sync
   */
  async getMerchantApplicationStatusWithSync(organizationId: number): Promise<{
    hasApplication: boolean;
    application?: SelectGettrxMerchantApplication;
    requiresAcceptance: boolean;
    isActive: boolean;
    syncStatus?: {
      success: boolean;
      message: string;
      gettrxStatus?: any;
    };
  }> {
    const localStatus = await this.getMerchantApplicationStatus(organizationId);
    
    if (!localStatus.hasApplication) {
      return localStatus;
    }

    // Sync with GETTRX to get real-time status
    const syncResult = await this.syncMerchantStatus(organizationId);
    
    // Get updated local status after sync
    const updatedStatus = await this.getMerchantApplicationStatus(organizationId);
    
    return {
      ...updatedStatus,
      syncStatus: syncResult,
    };
  }

  /**
   * Submit merchant application to underwriting with atomicity and idempotency protection
   */
  async submitApplicationToUnderwriting(
    organizationId: number,
    applicationId: string,
    bypassReadinessChecks?: boolean
  ): Promise<{
    success: boolean;
    status: string;
    message: string;
    errorCode?: string;
  }> {
    return await db.transaction(async (tx) => {
      // Get fresh application status with real-time GETTRX sync
      const currentStatus = await this.getMerchantApplicationStatusWithSync(organizationId);
      
      if (!currentStatus.hasApplication || !currentStatus.application) {
        return {
          success: false,
          status: 'no_application',
          message: 'No merchant application found for organization',
          errorCode: 'NO_APPLICATION'
        };
      }

      const app = currentStatus.application;

      // Idempotency protection - check if already submitted
      if (app.status === 'submitted' || app.submissionStatus === 'submitted') {
        return {
          success: false,
          status: 'already_submitted',
          message: 'Application has already been submitted to underwriting',
          errorCode: 'ALREADY_SUBMITTED'
        };
      }

      // Check if already approved/activated (shouldn't resubmit)
      if (app.status === 'approved' || app.status === 'activated') {
        return {
          success: false,
          status: 'already_approved',
          message: 'Application is already approved and does not need resubmission',
          errorCode: 'ALREADY_APPROVED'
        };
      }

      // Re-check acceptance requirements unless bypassed
      if (!bypassReadinessChecks && !app.allSignersAcceptanceCollected) {
        return {
          success: false,
          status: 'not_signed',
          message: 'Merchant agreement must be signed before submitting to underwriting',
          errorCode: 'NOT_SIGNED'
        };
      }

      console.log(`📋 Submitting application ${applicationId} to underwriting for organization ${organizationId}`);

      // Submit application via GETTRX service with proper response validation
      const submitResult = await this.gettrxService.submitApplication(applicationId, bypassReadinessChecks);

      console.log(`📋 GETTRX submission response:`, JSON.stringify(submitResult, null, 2));

      // Only update database if GETTRX API call was successful
      if (!submitResult.success) {
        // Map GETTRX error status codes to appropriate error codes
        let errorCode = 'SUBMISSION_FAILED';
        let message = submitResult.message;

        if (submitResult.status === 400) {
          errorCode = 'NOT_READY';
          message = 'Application is not ready for submission. Please ensure all requirements are met.';
        } else if (submitResult.status === 409) {
          errorCode = 'ALREADY_SUBMITTED';
          message = 'Application has already been submitted to underwriting.';
        } else if (submitResult.status === 404) {
          errorCode = 'APPLICATION_NOT_FOUND';
          message = 'Application not found in GETTRX system.';
        }

        // Increment failure count in transaction
        await tx
          .update(gettrxMerchantApplications)
          .set({
            submissionAttempts: (app.submissionAttempts || 0) + 1,
            lastError: message
          })
          .where(eq(gettrxMerchantApplications.id, app.id));

        return {
          success: false,
          status: 'submission_failed',
          message,
          errorCode
        };
      }

      // GETTRX API succeeded - update database status atomically
      const updateData: Partial<InsertGettrxMerchantApplication> = {
        submissionStatus: 'submitted',
        status: 'submitted',
        submittedAt: new Date(),
        submissionAttempts: (app.submissionAttempts || 0) + 1,
        lastError: null // Clear any previous error
      };

      await tx
        .update(gettrxMerchantApplications)
        .set(updateData)
        .where(eq(gettrxMerchantApplications.id, app.id));

      // Update organization merchant status atomically
      await tx
        .update(organizations)
        .set({ 
          merchantStatus: 'submitted'
        })
        .where(eq(organizations.id, organizationId));

      return {
        success: true,
        status: 'submitted',
        message: 'Application successfully submitted to underwriting'
      };
    }).catch(async (error) => {
      console.error('Transaction failed during application submission:', error);

      // Try to increment failure count outside transaction as fallback
      try {
        const application = await db
          .select()
          .from(gettrxMerchantApplications)
          .where(eq(gettrxMerchantApplications.organizationId, organizationId))
          .limit(1);

        if (application.length > 0) {
          const app = application[0];
          await db
            .update(gettrxMerchantApplications)
            .set({
              submissionAttempts: (app.submissionAttempts || 0) + 1,
              lastError: error instanceof Error ? error.message : 'Transaction failed'
            })
            .where(eq(gettrxMerchantApplications.id, app.id));
        }
      } catch (updateError) {
        console.error('Failed to update submission attempts after transaction failure:', updateError);
      }

      return {
        success: false,
        status: 'error',
        message: `Failed to submit application: ${error instanceof Error ? error.message : 'Transaction failed'}`,
        errorCode: 'INTERNAL_ERROR'
      };
    });
  }
}

export const merchantOnboardingService = new MerchantOnboardingService();