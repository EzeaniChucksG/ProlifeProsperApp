/**
 * Donation Product Routes
 * Handles donation product CRUD operations and QR code generation
 */
import type { Express } from "express";
import { storage } from "../storage/index";
import { insertDonationProductSchema, insertLeadCaptureSchema } from "@shared/schema";
import { authenticateToken } from "../middleware";
import rateLimit from "express-rate-limit";

export function registerDonationProductRoutes(app: Express): void {
  // Get all donation products for an organization
  app.get("/api/donation-products", authenticateToken, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(403).json({ message: "Organization required" });
      }

      const products = await storage.getDonationProductsByOrganization(organizationId);
      res.json(products);
    } catch (error) {
      console.error("Error fetching donation products:", error);
      res.status(500).json({ message: "Failed to fetch donation products" });
    }
  });

  // Get a single donation product by ID
  app.get("/api/donation-products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      const product = await storage.getDonationProduct(id);
      if (!product) {
        return res.status(404).json({ message: "Donation product not found" });
      }

      res.json(product);
    } catch (error) {
      console.error("Error fetching donation product:", error);
      res.status(500).json({ message: "Failed to fetch donation product" });
    }
  });

  // Get donation product by slug (public endpoint for donation pages)
  app.get("/api/donation-products/slug/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      
      const result = await storage.getDonationProductBySlugWithOrganization(slug);
      if (!result) {
        return res.status(404).json({ message: "Donation product not found" });
      }

      res.json(result);
    } catch (error) {
      console.error("Error fetching donation product by slug:", error);
      res.status(500).json({ message: "Failed to fetch donation product" });
    }
  });

  // Create a new donation product
  app.post("/api/donation-products", authenticateToken, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(403).json({ message: "Organization required" });
      }

      // Validate the request body
      const validation = insertDonationProductSchema.safeParse({
        ...req.body,
        organizationId
      });

      if (!validation.success) {
        return res.status(400).json({
          message: "Invalid donation product data",
          errors: validation.error.issues
        });
      }

      const product = await storage.createDonationProduct(validation.data);
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating donation product:", error);
      res.status(500).json({ message: "Failed to create donation product" });
    }
  });

  // Update a donation product
  app.put("/api/donation-products/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(403).json({ message: "Organization required" });
      }

      // Check if product exists and belongs to organization
      const existingProduct = await storage.getDonationProduct(id);
      if (!existingProduct) {
        return res.status(404).json({ message: "Donation product not found" });
      }

      if (existingProduct.organizationId !== organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Validate the request body using the same schema as create (with partial support)
      const validation = insertDonationProductSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          message: "Invalid donation product data",
          errors: validation.error.issues
        });
      }

      const product = await storage.updateDonationProduct(id, validation.data);
      res.json(product);
    } catch (error) {
      console.error("Error updating donation product:", error);
      res.status(500).json({ message: "Failed to update donation product" });
    }
  });

  // Delete (deactivate) a donation product
  app.delete("/api/donation-products/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(403).json({ message: "Organization required" });
      }

      // Check if product exists and belongs to organization
      const existingProduct = await storage.getDonationProduct(id);
      if (!existingProduct) {
        return res.status(404).json({ message: "Donation product not found" });
      }

      if (existingProduct.organizationId !== organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteDonationProduct(id);
      res.json({ message: "Donation product deleted successfully" });
    } catch (error) {
      console.error("Error deleting donation product:", error);
      res.status(500).json({ message: "Failed to delete donation product" });
    }
  });

  // Generate QR code for a donation product
  app.post("/api/donation-products/:id/qr-code", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(403).json({ message: "Organization required" });
      }

      // Check if product exists and belongs to organization
      const existingProduct = await storage.getDonationProduct(id);
      if (!existingProduct) {
        return res.status(404).json({ message: "Donation product not found" });
      }

      if (existingProduct.organizationId !== organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const qrCodeUrl = await storage.generateDonationProductQRCode(id);
      res.json({ qrCodeUrl });
    } catch (error) {
      console.error("Error generating QR code:", error);
      res.status(500).json({ message: "Failed to generate QR code" });
    }
  });

  // Get Open Graph metadata for sharing (public endpoint)
  app.get("/api/donation-products/og/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      
      const product = await storage.getDonationProductBySlug(slug);
      if (!product) {
        return res.status(404).json({ message: "Donation product not found" });
      }

      // Generate Open Graph metadata
      const ogData = {
        title: product.ogTitle || product.name,
        description: product.ogDescription || product.description || `Support ${product.name}`,
        image: product.imageUrl,
        url: `/give/${product.slug}`,
        type: "website",
        siteName: "DonationHub"
      };

      res.json(ogData);
    } catch (error) {
      console.error("Error fetching OG metadata:", error);
      res.status(500).json({ message: "Failed to fetch metadata" });
    }
  });

  // Rate limiter for lead capture (prevent spam)
  const leadCaptureRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // limit each IP to 3 requests per windowMs
    message: { message: "Too many lead capture attempts. Please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Create lead capture (email collection) - public endpoint
  app.post("/api/donation-products/:id/lead", leadCaptureRateLimit, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      if (isNaN(productId)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      // Get the donation product to verify it exists and get organization ID
      const product = await storage.getDonationProduct(productId);
      if (!product) {
        return res.status(404).json({ message: "Donation product not found" });
      }

      // Check if lead capture is enabled for this product
      if (!product.leadCaptureEnabled) {
        return res.status(403).json({ message: "Lead capture not enabled for this product" });
      }

      // Basic honeypot spam protection (hidden field that bots might fill)
      if (req.body.honeypot && req.body.honeypot.length > 0) {
        return res.status(200).json({ message: "Thank you for your interest!" }); // Pretend success to fool bots
      }

      // Validate the lead capture data
      const validation = insertLeadCaptureSchema.safeParse({
        donationProductId: productId,
        organizationId: product.organizationId,
        email: req.body.email?.toLowerCase().trim(),
        firstName: req.body.firstName?.trim(),
        lastName: req.body.lastName?.trim(),
        phone: req.body.phone?.trim(),
        source: req.body.source || 'donation_page',
        consentGiven: req.body.consentGiven ?? true,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.connection.remoteAddress,
      });

      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid data provided",
          errors: validation.error.issues 
        });
      }

      // Check for duplicate email for this product (basic deduplication)
      const existingCaptures = await storage.getLeadCapturesByProduct(productId);
      const isDuplicate = existingCaptures.some(capture => 
        capture.email === validation.data.email
      );

      if (isDuplicate) {
        return res.status(200).json({ 
          message: "Thank you! We already have your contact information.", 
          alreadyRegistered: true 
        });
      }

      // Create the lead capture
      const leadCapture = await storage.createLeadCapture(validation.data);

      // TODO: Add to SendGrid list if configured
      // if (product.leadCaptureListId && process.env.SENDGRID_API_KEY) {
      //   await addToSendGridList(product.leadCaptureListId, validation.data);
      // }

      res.status(201).json({ 
        message: "Thank you for your interest! We'll be in touch soon.",
        leadCaptureId: leadCapture.id 
      });
    } catch (error) {
      console.error("Error creating lead capture:", error);
      res.status(500).json({ message: "Failed to capture lead information" });
    }
  });
}