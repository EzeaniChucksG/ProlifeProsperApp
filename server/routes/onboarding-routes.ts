/**
 * Pro Life Prosper - 8-Step Onboarding API Routes
 * 
 * Comprehensive onboarding workflow with clear separation of concerns:
 * Step 1: Organization Setup (basic info, legal details)
 * Step 2: Branding & Design (logo, colors, visual identity) 
 * Step 3: Campaign Creation (first fundraising campaign)
 * Step 4: GETTRX Merchant Setup (payment processing)
 * Step 5: Communication Templates (emails, receipts)
 * Step 6: Donation Page Configuration (forms, UX)
 * Step 7: Integrations & APIs (third-party connections)
 * Step 8: Testing & Launch (final validation)
 */

import { Router, Express } from 'express';
import { authService } from '../auth/auth-service';
import { storage } from '../storage/index';
import { merchantOnboardingService } from '../services/merchant-onboarding';

const router = Router();

// Define the 8-step onboarding workflow
const ONBOARDING_STEPS = {
  1: {
    key: 'organization_setup',
    title: 'Organization Setup',
    description: 'Complete basic organization information and legal details',
    category: 'Foundation',
    requiredFields: ['name', 'ein', 'address', 'phone', 'email'],
    route: '/nonprofit/profile',
    estimatedTime: 10,
  },
  2: {
    key: 'branding_design',
    title: 'Branding & Design',
    description: 'Customize your organization branding, colors, and visual identity',
    category: 'Design',
    requiredFields: ['logoUrl', 'primaryColor', 'secondaryColor'],
    route: '/nonprofit/settings?tab=branding',
    estimatedTime: 15,
  },
  3: {
    key: 'campaign_creation',
    title: 'Create First Campaign',
    description: 'Set up your first fundraising campaign with goals and messaging',
    category: 'Content',
    requiredFields: ['campaign_name', 'campaign_goal', 'campaign_description'],
    route: '/nonprofit/campaigns?action=create',
    estimatedTime: 20,
  },
  4: {
    key: 'payment_processing',
    title: 'GETTRX Merchant Setup',
    description: 'Complete merchant account application for payment processing',
    category: 'Payments',
    requiredFields: ['merchant_application'],
    route: '/nonprofit/merchant-setup',
    estimatedTime: 25,
  },
  5: {
    key: 'communication_templates',
    title: 'Communication Templates',
    description: 'Configure donor receipts, thank you messages, and email templates',
    category: 'Communications',
    requiredFields: ['receipt_template', 'thank_you_template'],
    route: '/nonprofit/email-templates',
    estimatedTime: 15,
  },
  6: {
    key: 'donation_page_setup',
    title: 'Donation Page Configuration',
    description: 'Customize donation forms, payment methods, and user experience',
    category: 'User Experience',
    requiredFields: ['donation_form_config', 'payment_methods'],
    route: '/nonprofit/donation-page',
    estimatedTime: 20,
  },
  7: {
    key: 'integrations_apis',
    title: 'Integrations & APIs',
    description: 'Set up third-party integrations and API access for advanced features',
    category: 'Integration',
    requiredFields: ['api_configuration'],
    route: '/nonprofit/settings?tab=integrations',
    estimatedTime: 15,
  },
  8: {
    key: 'testing_launch',
    title: 'Testing & Launch',
    description: 'Test all functionality and officially launch your platform',
    category: 'Launch',
    requiredFields: ['test_donation_completed', 'launch_confirmation'],
    route: '/nonprofit/testing',
    estimatedTime: 30,
  },
};

// Feature restrictions based on onboarding completion
const FEATURE_RESTRICTIONS = {
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

/**
 * Initialize onboarding for an organization
 */
router.post('/initialize', async (req, res) => {
  // Authenticate user
  const user = await authService.getCurrentUser(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { organizationId } = user;
    const { organizationType = 'nonprofit' } = req.body;

    // Check if onboarding already exists
    const existingSteps = await storage.getOnboardingSteps(organizationId);
    
    if (existingSteps.length > 0) {
      return res.json({
        success: true,
        message: 'Onboarding already initialized',
        steps: existingSteps,
      });
    }

    // Initialize organization onboarding using existing storage method
    const onboardingResult = await storage.initializeOrganizationOnboarding(organizationId);
    const steps = await storage.getOnboardingSteps(organizationId);

    res.json({
      success: true,
      message: 'Onboarding initialized successfully',
      steps,
      totalSteps: 8,
      currentStep: 1,
    });
  } catch (error) {
    console.error('Failed to initialize onboarding:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize onboarding',
      error: error.message,
    });
  }
});

/**
 * Get comprehensive onboarding status
 */
router.get('/status', async (req, res) => {
  // Authenticate user
  const user = await authService.getCurrentUser(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { organizationId } = user;
    
    // Get all onboarding steps
    const steps = await storage.getOnboardingSteps(organizationId);
    
    if (steps.length === 0) {
      return res.json({
        initialized: false,
        steps: [],
        currentStep: 1,
        overallProgress: 0,
        featureRestrictions: {
          restrictedFeatures: ['payment_processing', 'live_donations', 'campaign_management'],
          partiallyAvailableFeatures: ['basic_branding', 'test_payments'],
        },
      });
    }

    // Calculate progress
    const completedSteps = steps.filter(s => s.isCompleted);
    const overallProgress = Math.round((completedSteps.length / 8) * 100);
    const currentStep = steps.find(s => !s.isCompleted)?.stepNumber || 8;

    // Calculate feature restrictions
    const highestCompletedStep = Math.max(...completedSteps.map(s => s.stepNumber), 0);
    const restrictedFeatures = [];
    const partiallyAvailableFeatures = [];

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

    // Enhance steps with configuration
    const enhancedSteps = steps.map(step => ({
      ...step,
      config: ONBOARDING_STEPS[step.stepNumber],
    }));

    res.json({
      initialized: true,
      steps: enhancedSteps,
      currentStep,
      overallProgress,
      totalSteps: 8,
      completedSteps: completedSteps.length,
      nextSteps: enhancedSteps
        .filter(s => !s.isCompleted && s.stepNumber > currentStep)
        .slice(0, 3),
      featureRestrictions: {
        restrictedFeatures,
        partiallyAvailableFeatures,
        onboardingProgress: overallProgress,
      },
    });
  } catch (error) {
    console.error('Failed to get onboarding status:', error);
    res.status(500).json({
      error: 'Failed to retrieve onboarding status',
      message: error.message,
    });
  }
});

/**
 * Complete a specific onboarding step
 */
router.post('/complete-step/:stepNumber', async (req, res) => {
  // Authenticate user
  const user = await authService.getCurrentUser(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { organizationId } = user;
    const stepNumber = parseInt(req.params.stepNumber);
    const { stepData, skipValidation = false } = req.body;

    if (stepNumber < 1 || stepNumber > 8) {
      return res.status(400).json({
        success: false,
        message: 'Invalid step number. Must be between 1 and 8.',
      });
    }

    // Validate step requirements unless skipped
    if (!skipValidation) {
      const validation = await validateStepRequirements(organizationId, stepNumber);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Step requirements not met',
          missingRequirements: validation.missingRequirements,
          validationErrors: validation.validationErrors,
        });
      }
    }

    // Get and update the specific step
    const steps = await storage.getOnboardingSteps(organizationId);
    const targetStep = steps.find(s => s.stepNumber === stepNumber);
    
    if (!targetStep) {
      return res.status(404).json({
        success: false,
        message: 'Onboarding step not found',
      });
    }

    // Complete the step using existing storage method
    const updatedStep = await storage.completeOnboardingStep(organizationId, stepNumber, user.id, stepData);

    // Special handling for GETTRX merchant onboarding (step 4)
    if (stepNumber === 4 && stepData?.merchantAccountId) {
      await storage.updateOrganizationMerchantAccount(
        organizationId, 
        stepData.merchantAccountId
      );
    }

    // Get updated status and determine next step
    const allSteps = await storage.getOnboardingSteps(organizationId);
    const completedSteps = allSteps.filter(s => s.isCompleted);
    const overallProgress = Math.round((completedSteps.length / 8) * 100);
    const nextStep = allSteps.find(s => !s.isCompleted);
    
    // CRITICAL: Update the user's onboardingStep to the next incomplete step
    // This ensures the frontend progress tracking works correctly
    if (nextStep) {
      await storage.updateUserOnboardingStep(user.id, nextStep.stepNumber);
    } else {
      // All steps completed - mark onboarding as finished
      await storage.updateUserOnboardingStep(user.id, 9); // Beyond last step indicates completion
    }

    res.json({
      success: true,
      message: `Step ${stepNumber} completed successfully`,
      step: updatedStep,
      overallProgress,
      completedSteps: completedSteps.length,
      nextStep: nextStep ? {
        ...nextStep,
        config: ONBOARDING_STEPS[nextStep.stepNumber],
      } : null,
      unlockedFeatures: ONBOARDING_STEPS[stepNumber]?.requiredFields || [],
    });
  } catch (error) {
    console.error('Failed to complete onboarding step:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete onboarding step',
      error: error.message,
    });
  }
});

/**
 * Validate step requirements
 */
async function validateStepRequirements(organizationId: number, stepNumber: number) {
  try {
    const stepConfig = ONBOARDING_STEPS[stepNumber];
    if (!stepConfig) {
      return {
        isValid: false,
        missingRequirements: [],
        validationErrors: [{ field: 'step', message: 'Invalid step number' }],
      };
    }

    const missingRequirements = [];
    const validationErrors = [];

    // Step-specific validation logic
    switch (stepNumber) {
      case 1: // Organization Setup
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
        const templates = await storage.getEmailTemplatesByOrganization(organizationId);
        if (templates.length === 0) missingRequirements.push('Email templates configured');
        break;

      case 6: // Donation Page Setup
        const orgDonation = await storage.getOrganizationById(organizationId);
        if (!orgDonation?.settings || !orgDonation.settings.donationPageConfigured) {
          missingRequirements.push('Donation page configuration');
        }
        break;

      case 7: // Integrations & APIs
        const integrations = await storage.getIntegrationConfigurations(organizationId);
        if (integrations.length === 0) missingRequirements.push('At least one integration');
        break;

      case 8: // Testing & Launch
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
 * Skip a step (admin only)
 */
router.post('/skip-step/:stepNumber', async (req, res) => {
  // Authenticate user
  const user = await authService.getCurrentUser(req.headers.authorization);
  if (!user || user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { organizationId } = req.body;
    const stepNumber = parseInt(req.params.stepNumber);
    const { reason } = req.body;

    const steps = await storage.getOnboardingSteps(organizationId);
    const targetStep = steps.find(s => s.stepNumber === stepNumber);
    
    if (!targetStep) {
      return res.status(404).json({
        success: false,
        message: 'Onboarding step not found',
      });
    }

    const updatedStep = await storage.updateOnboardingStep(targetStep.id, {
      isCompleted: true,
      completedAt: new Date(),
      completedByUserId: user.id,
      data: {
        ...targetStep.data,
        skipped: true,
        skipReason: reason,
        skippedBy: user.email,
      },
    });

    res.json({
      success: true,
      message: `Step ${stepNumber} skipped successfully`,
      step: updatedStep,
    });
  } catch (error) {
    console.error('Failed to skip onboarding step:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to skip onboarding step',
      error: error.message,
    });
  }
});

/**
 * Reset onboarding (admin only)
 */
router.post('/reset', async (req, res) => {
  // Authenticate user
  const user = await authService.getCurrentUser(req.headers.authorization);
  if (!user || user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { organizationId } = req.body;

    const steps = await storage.getOnboardingSteps(organizationId);
    
    // Reset all steps
    for (const step of steps) {
      await storage.updateOnboardingStep(step.id, {
        isCompleted: false,
        completedAt: null,
        completedByUserId: null,
        data: {
          ...step.data,
          skipped: false,
          skipReason: null,
          completionData: null,
        },
      });
    }

    res.json({
      success: true,
      message: 'Onboarding reset successfully',
    });
  } catch (error) {
    console.error('Failed to reset onboarding:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset onboarding',
      error: error.message,
    });
  }
});

export function registerOnboardingRoutes(app: Express) {
  app.use('/api/onboarding', router);
}