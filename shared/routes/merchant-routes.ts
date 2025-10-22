/**
 * GETTRX Merchant Onboarding API Routes
 * 
 * Handles merchant application lifecycle:
 * - Initialize merchant application
 * - Check application status
 * - Generate acceptance tokens
 * - Mark acceptance collected
 * - Get merchant account information
 */

import { Router, Express } from 'express';
import { merchantOnboardingService } from '../services/merchant-onboarding';
import { authService } from '../auth/auth-service';

const router = Router();

/**
 * Initialize merchant onboarding for an organization
 */
router.post('/initialize', async (req, res) => {
  // Authenticate user
  const user = await authService.getCurrentUser(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized' 
    });
  }
  try {
    const { organizationId } = user;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID is required'
      });
    }
    
    const organizationData = req.body;

    const result = await merchantOnboardingService.initializeMerchantOnboarding(
      organizationId,
      organizationData
    );

    if (result.success) {
      res.json(result);
    } else {
      // Check if this is a validation error response
      if (result.status === 'validation_error' && (result as any).validationErrors) {
        res.status(400).json({
          success: false,
          errorType: 'validation',
          message: result.message,
          validationErrors: (result as any).validationErrors,
          redirectTo: '/nonprofit/profile'
        });
      } else {
        res.status(400).json(result);
      }
    }
  } catch (error) {
    console.error('Error initializing merchant onboarding:', error);
    
    // Check if this is a GETTRX validation error
    if (error instanceof Error && error.message.includes('GETTRX API Error')) {
      // Parse GETTRX validation errors from the error message
      const gettrxErrorMatch = error.message.match(/GETTRX API Error: (\d+) - (.+)/);
      if (gettrxErrorMatch && gettrxErrorMatch[1] === '400') {
        try {
          // Extract validation errors from the error stack or additional details
          const validationErrors = parseGettrxValidationErrors(error);
          
          res.status(400).json({
            success: false,
            errorType: 'validation',
            message: 'Please correct the following information to continue with payment setup',
            validationErrors: validationErrors,
            redirectTo: '/nonprofit/profile'
          });
          return;
        } catch (parseError) {
          console.error('Failed to parse GETTRX validation errors:', parseError);
        }
      }
    }
    
    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Failed to initialize merchant onboarding'
    });
  }

// Helper function to parse GETTRX validation errors
function parseGettrxValidationErrors(error: Error): Array<{param: string, msg: string, location: string, fieldName: string, navigationUrl: string}> {
  // This is a temporary parser - ideally the merchant onboarding service should return structured errors
  const commonErrors = [
    {
      param: 'coreBusinessInfo.legalBusinessName',
      msg: 'Legal business name is required',
      location: 'body',
      fieldName: 'Organization Name',
      navigationUrl: '/nonprofit/profile'
    },
    {
      param: 'coreBusinessInfo.businessPhone', 
      msg: 'Business phone must be in format (xxx)-xxx-xxxx',
      location: 'body',
      fieldName: 'Organization Phone',
      navigationUrl: '/nonprofit/profile'
    },
    {
      param: 'coreBusinessInfo.customerServicePhone',
      msg: 'Customer service phone must be in format (xxx)-xxx-xxxx', 
      location: 'body',
      fieldName: 'Customer Service Phone',
      navigationUrl: '/nonprofit/profile'
    },
    {
      param: 'businessPrincipals[0].homePhone',
      msg: 'Principal home phone must be in format (xxx)-xxx-xxxx',
      location: 'body', 
      fieldName: 'Principal Contact Phone',
      navigationUrl: '/nonprofit/profile'
    }
  ];
  
  // For now, return the common errors that we know are failing
  // TODO: Enhance this to parse actual GETTRX error response
  return commonErrors;
}
});

/**
 * Get merchant application status with real-time GETTRX sync
 */
router.get('/status', async (req, res) => {
  // Authenticate user
  const user = await authService.getCurrentUser(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { organizationId } = user;
    
    if (!organizationId) {
      return res.status(400).json({
        error: 'Organization ID is required'
      });
    }

    // Use real-time sync to get actual GETTRX status
    const status = await merchantOnboardingService.getMerchantApplicationStatusWithSync(organizationId);
    res.json(status);
  } catch (error) {
    console.error('Error getting merchant status:', error);
    res.status(500).json({
      error: 'Failed to get merchant application status'
    });
  }
});

/**
 * Manually sync merchant application status with GETTRX API
 */
router.post('/sync-status', async (req, res) => {
  // Authenticate user
  const user = await authService.getCurrentUser(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized' 
    });
  }
  try {
    const { organizationId } = user;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID is required'
      });
    }

    const syncResult = await merchantOnboardingService.syncMerchantStatus(organizationId);
    
    if (syncResult.success) {
      res.json(syncResult);
    } else {
      res.status(400).json(syncResult);
    }
  } catch (error) {
    console.error('Error syncing merchant status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync merchant application status'
    });
  }
});

/**
 * Generate acceptance token for signature collection
 */
router.post('/acceptance-token', async (req, res) => {
  // Authenticate user
  const user = await authService.getCurrentUser(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized' 
    });
  }
  try {
    const { organizationId } = user;
    const { signerId } = req.body;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID is required'
      });
    }

    if (!signerId) {
      return res.status(400).json({
        success: false,
        message: 'Signer ID is required'
      });
    }

    const result = await merchantOnboardingService.generateAcceptanceToken(
      organizationId,
      signerId
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error generating acceptance token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate acceptance token'
    });
  }
});

/**
 * Mark acceptance as collected
 */
router.post('/mark-acceptance', async (req, res) => {
  // Authenticate user
  const user = await authService.getCurrentUser(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized' 
    });
  }
  try {
    const { organizationId } = user;
    const { signerId, ipAddress, userAgent } = req.body;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID is required'
      });
    }

    if (!signerId) {
      return res.status(400).json({
        success: false,
        message: 'Signer ID is required'
      });
    }

    const result = await merchantOnboardingService.markAcceptanceCollected(
      organizationId,
      signerId,
      {
        ipAddress: ipAddress || req.ip,
        userAgent: userAgent || req.get('User-Agent') || 'Unknown'
      }
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error marking acceptance collected:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark acceptance collected'
    });
  }
});

/**
 * Get merchant account ID for organization
 */
router.get('/account-id', async (req, res) => {
  // Authenticate user
  const user = await authService.getCurrentUser(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { organizationId } = user;

    if (!organizationId) {
      return res.status(400).json({
        error: 'Organization ID is required'
      });
    }

    const merchantAccountId = await merchantOnboardingService.getMerchantAccountId(organizationId);

    res.json({
      merchantAccountId,
      isConfigured: !!merchantAccountId
    });
  } catch (error) {
    console.error('Error getting merchant account ID:', error);
    res.status(500).json({
      error: 'Failed to get merchant account ID'
    });
  }
});

/**
 * Submit merchant application to underwriting with optional bypass
 */
router.post('/submit-to-underwriting', async (req, res) => {
  // Authenticate user
  const user = await authService.getCurrentUser(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized' 
    });
  }

  try {
    const { organizationId } = user;
    const { bypassReadinessChecks } = req.body;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID is required'
      });
    }

    // Use real-time status sync to get fresh application state
    const currentStatus = await merchantOnboardingService.getMerchantApplicationStatusWithSync(organizationId);

    if (!currentStatus.hasApplication || !currentStatus.application) {
      return res.status(400).json({
        success: false,
        message: 'No merchant application found. Please complete merchant onboarding first.',
        errorCode: 'NO_APPLICATION'
      });
    }

    const application = currentStatus.application;

    console.log(`📋 Submitting application ${application.gettrxApplicationId} to underwriting for organization ${organizationId}${bypassReadinessChecks ? ' (bypassing readiness checks)' : ''}`);

    // Submit to GETTRX underwriting via the improved service with atomicity protection
    const submitResult = await merchantOnboardingService.submitApplicationToUnderwriting(
      organizationId,
      application.gettrxApplicationId,
      bypassReadinessChecks
    );

    if (submitResult.success) {
      console.log(`✅ Application ${application.gettrxApplicationId} successfully submitted to underwriting`);
      res.json({
        success: true,
        message: 'Application successfully submitted to underwriting',
        applicationId: application.gettrxApplicationId,
        status: submitResult.status
      });
    } else {
      // Map different error types to appropriate HTTP status codes
      let statusCode = 400;
      
      if (submitResult.errorCode === 'INTERNAL_ERROR') {
        statusCode = 500;
      } else if (submitResult.errorCode === 'APPLICATION_NOT_FOUND') {
        statusCode = 404;
      } else if (submitResult.errorCode === 'ALREADY_SUBMITTED' || submitResult.errorCode === 'ALREADY_APPROVED') {
        statusCode = 409; // Conflict
      }

      console.error(`❌ Failed to submit application ${application.gettrxApplicationId}:`, submitResult.message);
      res.status(statusCode).json({
        success: false,
        message: submitResult.message,
        errorCode: submitResult.errorCode || 'SUBMISSION_FAILED'
      });
    }

  } catch (error) {
    console.error('Error submitting merchant application to underwriting:', error);
    
    // Service now handles all GETTRX errors properly, so this is just for unexpected errors
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred during submission',
      errorCode: 'UNEXPECTED_ERROR'
    });
  }
});

export function registerMerchantRoutes(app: Express) {
  app.use('/api/merchant', router);
}