/**
 * Express type extensions
 * Augments the Express Request interface to include our custom properties
 */

export {}; // Make this file a module

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      firstName?: string | null;
      lastName?: string | null;
      profileImageUrl?: string | null;
      organizationId?: number | null;
      role: string;
      onboardingStep?: number | null;
      onboardingCompleted?: boolean | null;
    }
    
    interface Request {
      user?: User;
    }
  }
}