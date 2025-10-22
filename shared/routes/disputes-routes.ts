/**
 * Disputes Routes
 * Handles payment disputes and chargebacks management
 */
import type { Express } from "express";
import { storage } from "../storage/index";
import { insertDisputeSchema, insertDisputeDocumentSchema } from "@shared/schema";
import { z } from "zod";
import { authenticateToken } from "../middleware";
import multer from "multer";
import path from "path";
import fs from "fs";

export function registerDisputesRoutes(app: Express): void {
  // Get all disputes for an organization
  app.get("/api/organizations/:orgId/disputes", authenticateToken, async (req, res) => {
    try {
      const orgId = parseInt(req.params.orgId);
      const user = req.user as { organizationId: number };

      if (user.organizationId !== orgId && req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const disputes = await storage.getDisputesByOrganization(orgId);
      res.json(disputes);
    } catch (error) {
      console.error("Error fetching disputes:", error);
      res.status(500).json({ message: "Failed to fetch disputes" });
    }
  });

  // Get dispute statistics for an organization
  app.get("/api/organizations/:orgId/disputes/stats", authenticateToken, async (req, res) => {
    try {
      const orgId = parseInt(req.params.orgId);
      const user = req.user as { organizationId: number };

      if (user.organizationId !== orgId && req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const stats = await storage.getDisputeStats(orgId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dispute stats:", error);
      res.status(500).json({ message: "Failed to fetch dispute statistics" });
    }
  });

  // Get single dispute by ID
  app.get("/api/disputes/:id", authenticateToken, async (req, res) => {
    try {
      const disputeId = parseInt(req.params.id);
      const dispute = await storage.getDispute(disputeId);
      
      if (!dispute) {
        return res.status(404).json({ message: "Dispute not found" });
      }

      // Verify user has access to this dispute's organization
      const user = req.user as { organizationId: number };
      if (dispute.organizationId !== user.organizationId && req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(dispute);
    } catch (error) {
      console.error("Error fetching dispute:", error);
      res.status(500).json({ message: "Failed to fetch dispute" });
    }
  });

  // Create new dispute (typically from webhook or manual entry)
  app.post("/api/organizations/:orgId/disputes", authenticateToken, async (req, res) => {
    try {
      const orgId = parseInt(req.params.orgId);
      const user = req.user as { organizationId: number };
      const disputeData = req.body;

      if (user.organizationId !== orgId && req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      // Validate dispute data
      const validatedData = insertDisputeSchema.parse({
        ...disputeData,
        organizationId: orgId
      });

      const newDispute = await storage.createDispute(validatedData);
      res.status(201).json(newDispute);
    } catch (error) {
      console.error("Error creating dispute:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error",
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create dispute" });
    }
  });

  // Update dispute (e.g., change status, add response)
  app.patch("/api/disputes/:id", authenticateToken, async (req, res) => {
    try {
      const disputeId = parseInt(req.params.id);
      const user = req.user as { organizationId: number };
      const updates = req.body;

      // Verify user owns the dispute
      const existingDispute = await storage.getDispute(disputeId);
      if (!existingDispute) {
        return res.status(404).json({ message: "Dispute not found" });
      }

      if (existingDispute.organizationId !== user.organizationId && req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedDispute = await storage.updateDispute(disputeId, updates);
      res.json(updatedDispute);
    } catch (error) {
      console.error("Error updating dispute:", error);
      res.status(500).json({ message: "Failed to update dispute" });
    }
  });

  // Delete dispute (for testing or removing duplicate records)
  app.delete("/api/disputes/:id", authenticateToken, async (req, res) => {
    try {
      const disputeId = parseInt(req.params.id);
      const user = req.user as { organizationId: number };

      // Verify user owns the dispute
      const existingDispute = await storage.getDispute(disputeId);
      if (!existingDispute) {
        return res.status(404).json({ message: "Dispute not found" });
      }

      if (existingDispute.organizationId !== user.organizationId && req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteDispute(disputeId);
      res.json({ message: "Dispute deleted successfully" });
    } catch (error) {
      console.error("Error deleting dispute:", error);
      res.status(500).json({ message: "Failed to delete dispute" });
    }
  });

  // Configure multer for file uploads
  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'uploads', 'dispute-documents');
        // Ensure directory exists
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `dispute-${uniqueSuffix}-${file.originalname}`);
      }
    }),
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      
      if (mimetype && extname) {
        return cb(null, true);
      }
      cb(new Error('Invalid file type. Only images, PDFs, and documents are allowed.'));
    }
  });

  // Upload document for dispute
  app.post("/api/disputes/:id/documents", authenticateToken, upload.single('file'), async (req, res) => {
    try {
      const disputeId = parseInt(req.params.id);
      const user = req.user as { id: string; organizationId: number };
      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Verify user owns the dispute
      const dispute = await storage.getDispute(disputeId);
      if (!dispute) {
        // Clean up uploaded file
        fs.unlinkSync(file.path);
        return res.status(404).json({ message: "Dispute not found" });
      }

      if (dispute.organizationId !== user.organizationId && req.user.role !== 'super_admin') {
        // Clean up uploaded file
        fs.unlinkSync(file.path);
        return res.status(403).json({ message: "Access denied" });
      }

      // Create document record
      const documentData = {
        disputeId,
        organizationId: dispute.organizationId,
        fileName: file.originalname,
        fileUrl: `/uploads/dispute-documents/${file.filename}`,
        fileSize: file.size,
        fileType: path.extname(file.originalname).substring(1),
        mimeType: file.mimetype,
        documentType: req.body.documentType || 'other',
        description: req.body.description || null,
        uploadedBy: user.id
      };

      const validatedData = insertDisputeDocumentSchema.parse(documentData);
      const newDocument = await storage.createDisputeDocument(validatedData);

      res.status(201).json(newDocument);
    } catch (error) {
      console.error("Error uploading dispute document:", error);
      // Clean up file if error occurred
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error("Error cleaning up file:", unlinkError);
        }
      }
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error",
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  // Get all documents for a dispute
  app.get("/api/disputes/:id/documents", authenticateToken, async (req, res) => {
    try {
      const disputeId = parseInt(req.params.id);
      const user = req.user as { organizationId: number };

      // Verify user owns the dispute
      const dispute = await storage.getDispute(disputeId);
      if (!dispute) {
        return res.status(404).json({ message: "Dispute not found" });
      }

      if (dispute.organizationId !== user.organizationId && req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const documents = await storage.getDisputeDocuments(disputeId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching dispute documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  // Delete dispute document
  app.delete("/api/disputes/documents/:docId", authenticateToken, async (req, res) => {
    try {
      const docId = parseInt(req.params.docId);
      const user = req.user as { organizationId: number };

      // Get document
      const document = await storage.getDisputeDocument(docId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Verify user owns the document's organization
      if (document.organizationId !== user.organizationId && req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      // Delete file from disk
      const filePath = path.join(process.cwd(), document.fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Delete database record
      await storage.deleteDisputeDocument(docId);

      res.json({ message: "Document deleted successfully" });
    } catch (error) {
      console.error("Error deleting dispute document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });
}
