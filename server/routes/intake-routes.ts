/**
 * Client Intake & e-Consent API Routes
 * Handles HIPAA-compliant client intake records and processing
 */
import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage/index";
import { insertClientIntakeRecordSchema } from "@shared/schema";
import { authenticateToken } from "../middleware/auth";
// import { requireRoles } from "../middleware/roles";

const router = Router();

// Get intake records for an organization
router.get(
  "/organizations/:organizationId/intake-records",
  authenticateToken,
  // requireRoles(['admin', 'super_admin']),
  async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const { status } = req.query;
      
      let records;
      if (status) {
        records = await storage.getIntakeRecordsByStatus(organizationId, status as string);
      } else {
        records = await storage.getIntakeRecordsByOrganization(organizationId);
      }
      
      // Remove sensitive data from response for privacy
      const sanitizedRecords = records.map(record => ({
        ...record,
        // Mask sensitive information in list view
        digitalSignature: record.digitalSignature ? "[SIGNATURE_PRESENT]" : null,
        ipAddress: record.ipAddress ? "[MASKED]" : null
      }));
      
      res.json(sanitizedRecords);
    } catch (error) {
      console.error("Error fetching intake records (no PII logged)");
      res.status(500).json({ error: "Failed to fetch intake records" });
    }
  }
);

// Get specific intake record (full details for authorized staff)
router.get(
  "/intake-records/:recordId",
  authenticateToken,
  // requireRoles(['admin', 'super_admin']),
  async (req, res) => {
    try {
      const recordId = parseInt(req.params.recordId);
      const record = await storage.getIntakeRecord(recordId);
      
      if (!record) {
        return res.status(404).json({ error: "Intake record not found" });
      }
      
      // Log access for audit trail (without PII)
      console.log(`Intake record accessed: ID ${recordId} by user ${(req.user as any)?.id}`);
      
      res.json(record);
    } catch (error) {
      console.error("Error fetching intake record (no PII logged)");
      res.status(500).json({ error: "Failed to fetch intake record" });
    }
  }
);

// Create new intake record
router.post(
  "/organizations/:organizationId/intake-records",
  authenticateToken, // Note: May need to allow public access for client intake
  async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      
      // Validate request body with strict schema
      const intakeData = insertClientIntakeRecordSchema.parse({
        ...req.body,
        organizationId,
        ipAddress: req.ip, // Capture IP for audit trail
        signatureDate: new Date().toISOString().split('T')[0] // Current date
      });
      
      // Additional validation for required consent fields
      if (!intakeData.hipaaAcknowledgment) {
        return res.status(400).json({ 
          error: "HIPAA acknowledgment is required" 
        });
      }
      
      if (!intakeData.digitalSignature) {
        return res.status(400).json({ 
          error: "Digital signature is required" 
        });
      }
      
      const newRecord = await storage.createIntakeRecord(intakeData);
      
      // Log successful intake submission (without PII)
      console.log(`New intake record created: ID ${newRecord.id} for org ${organizationId}`);
      
      // Return minimal response to client
      res.status(201).json({
        id: newRecord.id,
        status: newRecord.status,
        submittedAt: newRecord.submittedAt,
        message: "Intake record submitted successfully"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: "Invalid intake data", 
          details: error.errors 
        });
      } else {
        console.error("Error creating intake record (no PII logged)");
        res.status(500).json({ error: "Failed to submit intake record" });
      }
    }
  }
);

// Update intake record (for staff processing)
router.put(
  "/intake-records/:recordId",
  authenticateToken,
  // requireRoles(['admin', 'super_admin']),
  async (req, res) => {
    try {
      const recordId = parseInt(req.params.recordId);
      
      // Validate request body
      const updateSchema = insertClientIntakeRecordSchema.partial();
      const updateData = updateSchema.parse(req.body);
      
      const updatedRecord = await storage.updateIntakeRecord(recordId, updateData);
      
      // Log record update (without PII)
      console.log(`Intake record updated: ID ${recordId} by user ${(req.user as any)?.id}`);
      
      res.json(updatedRecord);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid update data", details: error.errors });
      } else {
        console.error("Error updating intake record (no PII logged)");
        res.status(500).json({ error: "Failed to update intake record" });
      }
    }
  }
);

// Mark intake record as processed
router.post(
  "/intake-records/:recordId/process",
  authenticateToken,
  // requireRoles(['admin', 'super_admin']),
  async (req, res) => {
    try {
      const recordId = parseInt(req.params.recordId);
      const processedBy = (req.user as any)?.email || 'Unknown Staff';
      
      const processedRecord = await storage.markIntakeRecordProcessed(recordId, processedBy);
      
      // Log processing action (without PII)
      console.log(`Intake record processed: ID ${recordId} by ${processedBy}`);
      
      res.json(processedRecord);
    } catch (error) {
      console.error("Error processing intake record (no PII logged)");
      res.status(500).json({ error: "Failed to process intake record" });
    }
  }
);

// Search intake records
router.get(
  "/organizations/:organizationId/intake-records/search",
  authenticateToken,
  // requireRoles(['admin', 'super_admin']),
  async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const { q: searchTerm } = req.query;
      
      if (!searchTerm || typeof searchTerm !== 'string') {
        return res.status(400).json({ error: "Search term is required" });
      }
      
      const records = await storage.searchIntakeRecords(organizationId, searchTerm);
      
      // Sanitize results for privacy
      const sanitizedRecords = records.map(record => ({
        ...record,
        digitalSignature: record.digitalSignature ? "[SIGNATURE_PRESENT]" : null,
        ipAddress: "[MASKED]"
      }));
      
      res.json(sanitizedRecords);
    } catch (error) {
      console.error("Error searching intake records (no PII logged)");
      res.status(500).json({ error: "Failed to search intake records" });
    }
  }
);

// Get intake statistics
router.get(
  "/organizations/:organizationId/intake-statistics",
  authenticateToken,
  // requireRoles(['admin', 'super_admin']),
  async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const stats = await storage.getIntakeStatistics(organizationId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching intake statistics:", error);
      res.status(500).json({ error: "Failed to fetch intake statistics" });
    }
  }
);

export default router;