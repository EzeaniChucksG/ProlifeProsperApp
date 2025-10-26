import { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { organizations, donationPages } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export interface MultiTenantRequest extends Request {
  tenant?: {
    organization: typeof organizations.$inferSelect;
    donationPage?: typeof donationPages.$inferSelect;
    routingMode: 'custom-domain' | 'slug-based' | 'standard';
  };
}

export async function multiTenantRouter(
  req: MultiTenantRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const host = req.headers.host || '';
    // staging.prolifegive.com is our production domain
    // Replit URLs (*.replit.dev, *.replit.app) are development
    const mainDomain = process.env.MAIN_DOMAIN || 'staging.prolifegive.com';
    const path = req.path;

    // Remove port from host if present
    const hostWithoutPort = host.split(':')[0];

    // Check if this is a custom domain request
    // Skip custom domain routing for main domain and Replit dev URLs
    if (hostWithoutPort !== mainDomain && 
        !hostWithoutPort.includes('replit.dev') && 
        !hostWithoutPort.includes('replit.app')) {
      // Custom domain routing (Premium tier)
      const org = await db.query.organizations.findFirst({
        where: eq(organizations.customDomain, hostWithoutPort),
      });

      if (org) {
        // Parse donation page slug from path
        const pathParts = path.split('/').filter(p => p);
        const pageSlug = pathParts[0]; // e.g., /donation-page -> 'donation-page'

        if (pageSlug) {
          const donationPage = await db.query.donationPages.findFirst({
            where: and(
              eq(donationPages.organizationId, org.id),
              eq(donationPages.slug, pageSlug)
            ),
          });

          req.tenant = {
            organization: org,
            donationPage: donationPage,
            routingMode: 'custom-domain',
          };
        } else {
          req.tenant = {
            organization: org,
            routingMode: 'custom-domain',
          };
        }
      }
    }
    // Check if this is a slug-based URL (Basic tier)
    else if (path.startsWith('/') && !path.startsWith('/api') && !path.startsWith('/@')) {
      const pathParts = path.split('/').filter(p => p);
      
      if (pathParts.length >= 2) {
        const orgSlug = pathParts[0];
        const pageSlug = pathParts[1];

        // Look up organization by slug
        const org = await db.query.organizations.findFirst({
          where: eq(organizations.slug, orgSlug),
        });

        if (org) {
          // Look up donation page
          const donationPage = await db.query.donationPages.findFirst({
            where: and(
              eq(donationPages.organizationId, org.id),
              eq(donationPages.slug, pageSlug)
            ),
          });

          if (donationPage) {
            req.tenant = {
              organization: org,
              donationPage: donationPage,
              routingMode: 'slug-based',
            };
          }
        }
      }
    }

    next();
  } catch (error) {
    console.error('Multi-tenant routing error:', error);
    next();
  }
}

// Middleware to enforce tier-based access to custom domains
export function enforceTierAccess(
  req: MultiTenantRequest,
  res: Response,
  next: NextFunction
) {
  if (req.tenant?.routingMode === 'custom-domain') {
    const org = req.tenant.organization;
    
    // Check if organization has premium tier access
    if (org.subscriptionTier === 'basic') {
      return res.status(403).json({
        error: 'Custom domain access requires Pro or Elite subscription tier',
        upgradeUrl: '/settings/subscription',
      });
    }

    // Check if custom domain is properly configured and SSL is active
    if (org.customDomainSSLStatus !== 'active') {
      return res.status(503).json({
        error: 'Custom domain SSL certificate is not active',
        status: org.customDomainSSLStatus,
      });
    }
  }

  next();
}
