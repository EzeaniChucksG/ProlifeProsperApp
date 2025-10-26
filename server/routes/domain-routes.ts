import type { Express, Request, Response } from "express";
import { db } from "../db";
import { organizations } from "@shared/schema";
import { eq } from "drizzle-orm";
import { DNSVerificationService } from "../services/dns-verification";
import { SSLProvisioningService } from "../services/ssl-provisioning";
import { z } from "zod";

const setupDomainSchema = z.object({
  customDomain: z.string().min(3).max(255),
});

const verifyDomainSchema = z.object({
  organizationId: z.number(),
});

export function registerDomainRoutes(app: Express) {
  // Generate verification token and save custom domain
  app.post("/api/domains/setup", async (req: Request, res: Response) => {
    try {
      const { customDomain } = setupDomainSchema.parse(req.body);
      const user = req.user;

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!user?.organizationId) {
        return res.status(400).json({ error: "No organization found" });
      }

      // Check organization subscription tier
      const org = await db.query.organizations.findFirst({
        where: eq(organizations.id, user.organizationId),
      });

      if (!org) {
        return res.status(404).json({ error: "Organization not found" });
      }

      if (org.subscriptionTier === 'basic') {
        return res.status(403).json({ 
          error: "Custom domains require Pro or Elite subscription",
          upgradeUrl: "/settings/subscription" 
        });
      }

      // Generate verification token
      const verificationToken = DNSVerificationService.generateVerificationToken();

      // Update organization with custom domain and token
      await db
        .update(organizations)
        .set({
          customDomain,
          customDomainSSLStatus: 'pending',
          settings: {
            ...(org.settings || {}),
            domainVerificationToken: verificationToken,
          },
        })
        .where(eq(organizations.id, user.organizationId));

      // Get DNS instructions
      const instructions = DNSVerificationService.getDNSInstructions(
        customDomain,
        verificationToken
      );

      res.json({
        success: true,
        verificationToken,
        instructions,
        message: "Custom domain configured. Please add the DNS records to verify ownership.",
      });
    } catch (error: any) {
      console.error("Domain setup error:", error);
      res.status(400).json({ 
        error: error.message || "Failed to setup custom domain" 
      });
    }
  });

  // Verify domain ownership and routing
  app.post("/api/domains/verify", async (req: Request, res: Response) => {
    try {
      const { organizationId } = verifyDomainSchema.parse(req.body);
      const user = req.user;

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Get organization
      const org = await db.query.organizations.findFirst({
        where: eq(organizations.id, organizationId),
      });

      if (!org) {
        return res.status(404).json({ error: "Organization not found" });
      }

      if (!org.customDomain) {
        return res.status(400).json({ error: "No custom domain configured" });
      }

      // Get verification token from settings
      const settings = org.settings as any;
      const verificationToken = settings?.domainVerificationToken;

      if (!verificationToken) {
        return res.status(400).json({ 
          error: "No verification token found. Please setup domain first." 
        });
      }

      // Verify domain
      const verification = await DNSVerificationService.verifyDomain(
        org.customDomain,
        verificationToken
      );

      // Update organization based on verification results
      if (verification.overallSuccess) {
        await db
          .update(organizations)
          .set({
            customDomainSSLStatus: 'verified', // Ready for SSL provisioning
          })
          .where(eq(organizations.id, organizationId));

        // Automatically provision SSL certificate after successful verification
        try {
          const sslResult = await SSLProvisioningService.provisionCertificate(
            organizationId,
            org.customDomain
          );

          res.json({
            success: true,
            ownershipVerified: true,
            routingVerified: true,
            txtResult: verification.txtResult,
            routingResult: verification.routingResult,
            ssl: sslResult,
            message: "Domain verified and SSL certificate provisioned successfully!",
          });
        } catch (sslError: any) {
          // Domain verified but SSL failed - still a partial success
          res.json({
            success: true,
            ownershipVerified: true,
            routingVerified: true,
            txtResult: verification.txtResult,
            routingResult: verification.routingResult,
            ssl: { status: 'failed', error: sslError.message },
            message: "Domain verified successfully, but SSL provisioning failed. Please retry or configure manually.",
          });
        }
      } else {
        res.json({
          success: false,
          ownershipVerified: verification.ownershipVerified,
          routingVerified: verification.routingVerified,
          txtResult: verification.txtResult,
          routingResult: verification.routingResult,
          message: "Domain verification failed. Please check DNS records.",
        });
      }
    } catch (error: any) {
      console.error("Domain verification error:", error);
      res.status(400).json({ 
        error: error.message || "Failed to verify domain" 
      });
    }
  });

  // Get current domain status
  app.get("/api/domains/status/:organizationId", async (req: Request, res: Response) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const user = req.user;

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const org = await db.query.organizations.findFirst({
        where: eq(organizations.id, organizationId),
      });

      if (!org) {
        return res.status(404).json({ error: "Organization not found" });
      }

      const settings = org.settings as any;

      res.json({
        customDomain: org.customDomain,
        sslStatus: org.customDomainSSLStatus,
        subscriptionTier: org.subscriptionTier,
        verificationToken: settings?.domainVerificationToken,
        whitelabelEnabled: org.whitelabelEnabled,
      });
    } catch (error: any) {
      console.error("Domain status error:", error);
      res.status(400).json({ 
        error: error.message || "Failed to get domain status" 
      });
    }
  });

  // Remove custom domain
  app.delete("/api/domains/:organizationId", async (req: Request, res: Response) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const user = req.user;

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Fetch current org to get settings
      const currentOrg = await db.query.organizations.findFirst({
        where: eq(organizations.id, organizationId),
      });

      await db
        .update(organizations)
        .set({
          customDomain: null,
          customDomainSSLStatus: 'pending',
          settings: {
            ...(currentOrg?.settings || {}),
            domainVerificationToken: null,
          },
        })
        .where(eq(organizations.id, organizationId));

      res.json({
        success: true,
        message: "Custom domain removed successfully",
      });
    } catch (error: any) {
      console.error("Domain removal error:", error);
      res.status(400).json({ 
        error: error.message || "Failed to remove custom domain" 
      });
    }
  });

  // Manually trigger SSL provisioning
  app.post("/api/domains/provision-ssl", async (req: Request, res: Response) => {
    try {
      const { organizationId } = verifyDomainSchema.parse(req.body);
      const user = req.user;

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const org = await db.query.organizations.findFirst({
        where: eq(organizations.id, organizationId),
      });

      if (!org || !org.customDomain) {
        return res.status(400).json({ error: "No custom domain configured" });
      }

      const sslResult = await SSLProvisioningService.provisionCertificate(
        organizationId,
        org.customDomain
      );

      res.json({
        success: true,
        ssl: sslResult,
        message: "SSL certificate provisioned successfully",
      });
    } catch (error: any) {
      console.error("SSL provisioning error:", error);
      res.status(400).json({
        error: error.message || "Failed to provision SSL certificate",
      });
    }
  });

  // Get SSL certificate information
  app.get("/api/domains/ssl-info/:domain", async (req: Request, res: Response) => {
    try {
      const domain = req.params.domain;
      const user = req.user;

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const certInfo = await SSLProvisioningService.getCertificateInfo(domain);

      res.json({
        success: true,
        certificate: certInfo,
      });
    } catch (error: any) {
      console.error("SSL info error:", error);
      res.status(400).json({
        error: error.message || "Failed to get SSL certificate info",
      });
    }
  });

  // Get manual SSL setup instructions
  app.get("/api/domains/ssl-instructions/:domain", async (req: Request, res: Response) => {
    try {
      const domain = req.params.domain;

      const instructions = SSLProvisioningService.getManualSSLInstructions(domain);

      res.json({
        success: true,
        instructions,
      });
    } catch (error: any) {
      console.error("SSL instructions error:", error);
      res.status(400).json({
        error: error.message || "Failed to get SSL instructions",
      });
    }
  });

  console.log("✅ Domain management routes registered");
}
