/**
 * Pro Life Prosper - Comprehensive 8-Step Onboarding Workflow System
 * 
 * This service manages the complete onboarding experience for nonprofit organizations,
 * ensuring proper separation of concerns between steps and tracking progress at the database level.
 * 
 * Features:
 * - 8-step guided workflow with clear separation of concerns
 * - Database-tracked progress and validation
 * - Feature restriction management based on completion status
 * - GETTRX merchant onboarding integration (step 4)
 * - Template-based configuration for different organization types
 */

import { storage } from '../storage/index';
import { merchantOnboardingService } from './merchant-onboarding';
import { 
  SelectOnboardingStepProgress,
  InsertOnboardingStepProgress,
  OrganizationOnboarding
} from '@shared/schema';

// Define the 8-step onboarding workflow with clear separation of concerns
export const ONBOARDING_STEPS = {
  1: {
    key: 'organization_setup',
    title: 'Organization Setup',
    description: 'Complete basic organization information and legal details',
    category: 'Foundation',
    requiredFields: ['name', 'ein', 'address', 'phone', 'email'],
    features: ['basic_profile'],
    route: '/nonprofit/profile',
    estimatedTime: 10, // minutes
  },
  2: {
    key: 'branding_design',
    title: 'Branding & Design',
    description: 'Customize your organization branding, colors, and visual identity',
    category: 'Design',
    requiredFields: ['logoUrl', 'primaryColor', 'secondaryColor'],
    features: ['custom_branding', 'logo_upload'],
    route: '/nonprofit/settings?tab=branding',
    estimatedTime: 15,
  },
  3: {
    key: 'campaign_creation',
    title: 'Create First Campaign',
    description: 'Set up your first fundraising campaign with goals and messaging',
    category: 'Content',
    requiredFields: ['campaign_name', 'campaign_goal', 'campaign_description'],
    features: ['campaign_management'],
    route: '/nonprofit/campaigns?action=create',
    estimatedTime: 20,
  },
  4: {
    key: 'payment_processing',
    title: 'GETTRX Merchant Setup',
    description: 'Complete merchant account application for payment processing',
    category: 'Payments',
    requiredFields: ['merchant_application'],
    features: ['payment_processing', 'donation_acceptance'],
    route: '/nonprofit/merchant-setup',
    estimatedTime: 25,
  },
  5: {
    key: 'communication_templates',
    title: 'Communication Templates',
    description: 'Configure donor receipts, thank you messages, and email templates',
    category: 'Communications',
    requiredFields: ['receipt_template', 'thank_you_template'],
    features: ['automated_communications', 'donor_receipts'],
    route: '/nonprofit/email-templates',
    estimatedTime: 15,
  },
  6: {
    key: 'donation_page_setup',
    title: 'Donation Page Configuration',
    description: 'Customize donation forms, payment methods, and user experience',
    category: 'User Experience',
    requiredFields: ['donation_form_config', 'payment_methods'],
    features: ['custom_donation_forms', 'payment_options'],
    route: '/nonprofit/donation-page',
    estimatedTime: 20,
  },
  7: {
    key: 'integrations_apis',
    title: 'Integrations & APIs',
    description: 'Set up third-party integrations and API access for advanced features',
    category: 'Integration',
    requiredFields: ['api_configuration'],
    features: ['third_party_integrations', 'api_access'],
    route: '/nonprofit/settings?tab=integrations',
    estimatedTime: 15,
  },
  8: {
    key: 'testing_launch',
    title: 'Testing & Launch',
    description: 'Test all functionality and officially launch your platform',
    category: 'Launch',
    requiredFields: ['test_donation_completed', 'launch_confirmation'],
    features: ['live_donations', 'full_platform_access'],
    route: '/nonprofit/testing',
    estimatedTime: 30,
  },
} as const;

// Feature restrictions based on onboarding completion
export const FEATURE_RESTRICTIONS = {
  // Features completely unavailable until specific steps are completed
  restricted_until_step: {
    3: ['campaign_management', 'fundraising_tools'],
    4: ['payment_processing', 'donation_acceptance', 'live_donations'],
    5: ['automated_communications', 'donor_receipts'],
    6: ['custom_donation_forms', 'public_donation_pages'],
    7: ['third_party_integrations', 'advanced_analytics'],
    8: ['full_platform_access', 'live_mode'],
  },
  
  // Features with limited functionality until completion
  partially_available_until_step: {
    2: ['basic_branding'], // Limited branding options
    4: ['test_payments'], // Only test payments allowed
    6: ['basic_donation_forms'], // Default forms only
    8: ['limited_analytics'], // Basic analytics only
  },
};

export class OnboardingService {
  /**
   * Initialize onboarding for a new organization
   */
  async initializeOnboarding(organizationId: number, organizationType: string = 'nonprofit'): Promise<OrganizationOnboarding> {
    try {
      // Get appropriate template for organization type
      const template = await storage.getOnboardingWorkflowTemplateByType(organizationType);
      
      // Initialize all 8 steps in organization_onboarding table
      const steps = Object.entries(ONBOARDING_STEPS).map(([stepNumber, stepConfig]) => ({
        organizationId,
        stepNumber: parseInt(stepNumber),
        stepName: stepConfig.title,
        stepKey: stepConfig.key,
        isCompleted: false,
        progress: 0,
        validationStatus: 'pending' as const,
        currentStep: 1,
        totalSteps: 8,
        overallProgress: 0,
        status: 'not_started' as const,
        data: {
          category: stepConfig.category,
          requiredFields: stepConfig.requiredFields,
          features: stepConfig.features,
          route: stepConfig.route,
          estimatedTime: stepConfig.estimatedTime,
          description: stepConfig.description,
        },
      }));
      
      // Create all step records using the enhanced onboarding system
      let initializedStep: OrganizationOnboarding | null = null;
      for (const step of steps) {
        const created = await storage.initializeOrganizationOnboarding(organizationId);
        if (!initializedStep) initializedStep = created;
      }
      
      // Set initial feature restrictions
      await this.updateFeatureRestrictions(organizationId);
      
      return initializedStep!;
    } catch (error) {
      console.error('Failed to initialize onboarding:', error);
      throw new Error('Failed to initialize onboarding workflow');
    }
  }
  
  /**
   * Get comprehensive onboarding status for an organization
   */
  async getOnboardingStatus(organizationId: number): Promise<{
    onboarding: SelectOrganizationOnboarding | null;
    steps: SelectOnboardingStep[];
    currentStepDetails: any;
    nextSteps: any[];
    overallProgress: number;
    featureRestrictions: any;
  }> {
    try {
      const [onboarding, steps, featureRestrictions] = await Promise.all([
        storage.getOrganizationOnboarding(organizationId),
        storage.getOnboardingStepsByOrganization(organizationId),
        storage.getOrganizationFeatureRestrictions(organizationId),
      ]);
      
      if (!onboarding) {
        return {
          onboarding: null,
          steps: [],
          currentStepDetails: null,
          nextSteps: [],
          overallProgress: 0,
          featureRestrictions,
        };
      }
      
      const currentStepDetails = steps.find(s => s.stepNumber === onboarding.currentStep);
      const nextSteps = steps
        .filter(s => s.stepNumber > onboarding.currentStep && !s.isCompleted)
        .slice(0, 3) // Next 3 steps
        .map(step => ({
          ...step,
          config: ONBOARDING_STEPS[step.stepNumber as keyof typeof ONBOARDING_STEPS],
        }));
      
      const completedSteps = steps.filter(s => s.isCompleted).length;
      const overallProgress = Math.round((completedSteps / 8) * 100);
      
      return {
        onboarding,
        steps,
        currentStepDetails: currentStepDetails ? {
          ...currentStepDetails,
          config: ONBOARDING_STEPS[currentStepDetails.stepNumber as keyof typeof ONBOARDING_STEPS],
        } : null,
        nextSteps,
        overallProgress,
        featureRestrictions,
      };
    } catch (error) {
      console.error('Failed to get onboarding status:', error);
      throw new Error('Failed to retrieve onboarding status');
    }
  }
  
  /**
   * Complete a specific onboarding step
   */
  async completeStep(
    organizationId: number, 
    stepNumber: number, 
    userId: string, 
    stepData?: any
  ): Promise<{
    step: SelectOnboardingStep;
    unlockedFeatures: string[];
    nextStep: any;
  }> {
    try {
      // Complete the step
      const step = await storage.completeOnboardingStep(
        organizationId, 
        stepNumber, 
        userId, 
        stepData
      );
      
      // Update overall onboarding progress
      const steps = await storage.getOnboardingStepsByOrganization(organizationId);
      const completedSteps = steps.filter(s => s.isCompleted).length;
      const overallProgress = Math.round((completedSteps / 8) * 100);
      
      // Determine next current step
      const nextIncompleteStep = steps.find(s => !s.isCompleted);
      const newCurrentStep = nextIncompleteStep ? nextIncompleteStep.stepNumber : 8;
      
      // Update organization onboarding record
      await storage.updateOrganizationOnboarding(organizationId, {
        currentStep: newCurrentStep,
        overallProgress,
        lastActivityAt: new Date(),
        status: completedSteps === 8 ? 'completed' : 'in_progress',
        completedAt: completedSteps === 8 ? new Date() : undefined,
      });
      
      // Ensure all users in the organization have consistent onboarding step information
      await this.syncUserOnboardingSteps(organizationId, newCurrentStep, completedSteps === 8);
      
      // Update feature restrictions
      await this.updateFeatureRestrictions(organizationId);
      
      // Determine unlocked features
      const stepConfig = ONBOARDING_STEPS[stepNumber as keyof typeof ONBOARDING_STEPS];
      const unlockedFeatures = stepConfig?.features || [];
      
      // Get next step details
      const nextStep = nextIncompleteStep ? {
        ...nextIncompleteStep,
        config: ONBOARDING_STEPS[nextIncompleteStep.stepNumber as keyof typeof ONBOARDING_STEPS],
      } : null;
      
      // Special handling for GETTRX merchant onboarding (step 4)
      if (stepNumber === 4 && stepData?.merchantAccountId) {
        await storage.updateOrganizationMerchantAccount(
          organizationId, 
          stepData.merchantAccountId
        );
      }
      
      return {
        step,
        unlockedFeatures,
        nextStep,
      };
    } catch (error) {
      console.error('Failed to complete onboarding step:', error);
      throw new Error('Failed to complete onboarding step');
    }
  }
  
  /**
   * Sync all users in an organization to have consistent onboarding step information
   */
  async syncUserOnboardingSteps(organizationId: number, currentStep: number, isCompleted: boolean): Promise<void> {
    try {
      await storage.updateAllUsersOnboardingStep(organizationId, currentStep, isCompleted);
      console.log(`🔄 Synced onboarding step ${currentStep} (completed: ${isCompleted}) for all users in organization ${organizationId}`);
    } catch (error) {
      console.error('Failed to sync user onboarding steps:', error);
      // Don't throw error as this is a consistency operation, not critical for step completion
    }
  }

  /**
   * Validate step requirements before completion
   */
  async validateStepRequirements(
    organizationId: number, 
    stepNumber: number
  ): Promise<{
    isValid: boolean;
    missingRequirements: string[];
    validationErrors: any[];
  }> {
    try {
      const stepConfig = ONBOARDING_STEPS[stepNumber as keyof typeof ONBOARDING_STEPS];
      if (!stepConfig) {
        return {
          isValid: false,
          missingRequirements: [],
          validationErrors: [{ field: 'step', message: 'Invalid step number' }],
        };
      }
      
      const missingRequirements: string[] = [];
      const validationErrors: any[] = [];
      
      // Step-specific validation logic
      switch (stepNumber) {
        case 1: // Organization Setup
          // Validate organization has required fields
          const org = await storage.getOrganizationById(organizationId);
          if (!org?.name) missingRequirements.push('Organization name');
          if (!org?.ein) missingRequirements.push('EIN/Tax ID');
          if (!org?.address) missingRequirements.push('Business address');
          break;
          
        case 2: // Branding & Design
          const orgBranding = await storage.getOrganizationById(organizationId);
          if (!orgBranding?.logoUrl) missingRequirements.push('Organization logo');
          if (!orgBranding?.primaryColor) missingRequirements.push('Primary brand color');
          break;
          
        case 3: // Campaign Creation
          const campaigns = await storage.getCampaignsByOrganization(organizationId);
          if (campaigns.length === 0) missingRequirements.push('At least one campaign');
          break;
          
        case 4: // GETTRX Merchant Setup
          const merchantApp = await storage.getGettrxMerchantApplicationByOrganization(organizationId);
          if (!merchantApp || merchantApp.status !== 'approved') {
            missingRequirements.push('Approved merchant account');
          }
          break;
          
        case 5: // Communication Templates
          // Check for configured email templates
          const templates = await storage.getEmailTemplatesByOrganization(organizationId);
          if (templates.length === 0) missingRequirements.push('Email templates configured');
          break;
          
        case 6: // Donation Page Setup
          // Validate donation page configuration
          const orgDonation = await storage.getOrganizationById(organizationId);
          if (!orgDonation?.settings || !orgDonation.settings.donationPageConfigured) {
            missingRequirements.push('Donation page configuration');
          }
          break;
          
        case 7: // Integrations & APIs
          // Check for any configured integrations
          const integrations = await storage.getIntegrationConfigurations(organizationId);
          if (integrations.length === 0) missingRequirements.push('At least one integration');
          break;
          
        case 8: // Testing & Launch
          // Validate test donation was completed
          const testDonations = await storage.getDonationsByOrganization(organizationId);
          const hasTestDonation = testDonations.some(d => d.isTest === true);
          if (!hasTestDonation) missingRequirements.push('Test donation completed');
          break;
      }
      
      return {
        isValid: missingRequirements.length === 0 && validationErrors.length === 0,
        missingRequirements,
        validationErrors,
      };
    } catch (error) {
      console.error('Failed to validate step requirements:', error);
      return {
        isValid: false,
        missingRequirements: [],
        validationErrors: [{ field: 'validation', message: 'Validation failed' }],
      };
    }
  }
  
  /**
   * Update feature restrictions based on onboarding progress
   */
  private async updateFeatureRestrictions(organizationId: number): Promise<void> {
    try {
      const steps = await storage.getOnboardingStepsByOrganization(organizationId);
      const completedSteps = steps.filter(s => s.isCompleted);
      const highestCompletedStep = Math.max(...completedSteps.map(s => s.stepNumber), 0);
      
      const restrictedFeatures: string[] = [];
      const partiallyAvailableFeatures: string[] = [];
      
      // Apply restrictions based on incomplete steps
      Object.entries(FEATURE_RESTRICTIONS.restricted_until_step).forEach(([step, features]) => {
        if (highestCompletedStep < parseInt(step)) {
          restrictedFeatures.push(...features);
        }
      });
      
      Object.entries(FEATURE_RESTRICTIONS.partially_available_until_step).forEach(([step, features]) => {
        if (highestCompletedStep < parseInt(step)) {
          partiallyAvailableFeatures.push(...features);
        }
      });
      
      await storage.updateFeatureRestrictions(organizationId, {
        restrictedFeatures,
        partiallyAvailableFeatures,
      });
    } catch (error) {
      console.error('Failed to update feature restrictions:', error);
    }
  }
  
  /**
   * Skip a step (admin only)
   */
  async skipStep(
    organizationId: number, 
    stepNumber: number, 
    userId: string, 
    reason: string
  ): Promise<SelectOnboardingStep> {
    try {
      const step = await storage.completeOnboardingStep(
        organizationId, 
        stepNumber, 
        userId, 
        { skipped: true, skipReason: reason }
      );
      
      await this.updateFeatureRestrictions(organizationId);
      
      return step;
    } catch (error) {
      console.error('Failed to skip onboarding step:', error);
      throw new Error('Failed to skip onboarding step');
    }
  }
  
  /**
   * Reset onboarding progress (admin only)
   */
  async resetOnboarding(organizationId: number): Promise<void> {
    try {
      // Reset all steps to incomplete
      const steps = await storage.getOnboardingStepsByOrganization(organizationId);
      for (const step of steps) {
        await storage.updateOnboardingStep(step.id, {
          isCompleted: false,
          completedAt: null,
          completedByUserId: null,
          progress: 0,
          validationStatus: 'pending',
          stepData: {
            ...step.stepData,
            skipped: false,
          },
        });
      }
      
      // Reset organization onboarding
      await storage.updateOrganizationOnboarding(organizationId, {
        currentStep: 1,
        overallProgress: 0,
        status: 'not_started',
        completedAt: null,
        lastActivityAt: new Date(),
      });
      
      // Reset feature restrictions
      await this.updateFeatureRestrictions(organizationId);
    } catch (error) {
      console.error('Failed to reset onboarding:', error);
      throw new Error('Failed to reset onboarding');
    }
  }
}

export const onboardingService = new OnboardingService();