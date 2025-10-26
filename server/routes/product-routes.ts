/**
 * Product Routes - Sellable Items (Books, Courses, Packages, Digital/Physical Products)
 * Handles product CRUD operations for revenue-generating items
 */
import type { Express } from "express";
import { storage } from "../storage/index";
import { insertProductSchema } from "@shared/schema";
import { authenticateToken } from "../middleware";
import rateLimit from "express-rate-limit";

export function registerProductRoutes(app: Express): void {
  // Get all products for an organization
  app.get("/api/products", authenticateToken, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(403).json({ message: "Organization required" });
      }

      const products = await storage.getProductsByOrganization(organizationId);
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // Get a single product by ID
  app.get("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      const product = await storage.getProduct(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  // Get product by slug (public endpoint for product pages)
  app.get("/api/products/slug/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      
      const product = await storage.getProductBySlug(slug);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json(product);
    } catch (error) {
      console.error("Error fetching product by slug:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  // Create a new product
  app.post("/api/products", authenticateToken, async (req, res) => {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(403).json({ message: "Organization required" });
      }

      // Validate the request body
      const validation = insertProductSchema.safeParse({
        ...req.body,
        organizationId
      });

      if (!validation.success) {
        return res.status(400).json({
          message: "Invalid product data",
          errors: validation.error.issues
        });
      }

      const product = await storage.createProduct(validation.data);
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  // Update a product
  app.put("/api/products/:id", authenticateToken, async (req, res) => {
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
      const existingProduct = await storage.getProduct(id);
      if (!existingProduct) {
        return res.status(404).json({ message: "Product not found" });
      }

      if (existingProduct.organizationId !== organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const product = await storage.updateProduct(id, req.body);
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  // Delete (deactivate) a product
  app.delete("/api/products/:id", authenticateToken, async (req, res) => {
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
      const existingProduct = await storage.getProduct(id);
      if (!existingProduct) {
        return res.status(404).json({ message: "Product not found" });
      }

      if (existingProduct.organizationId !== organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteProduct(id);
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Rate limiting for product creation
  const createProductLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each organization to 10 product creations per windowMs
    message: {
      message: "Too many product creation attempts, please try again later."
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply rate limiting to product creation
  app.use("/api/products", createProductLimiter);
}