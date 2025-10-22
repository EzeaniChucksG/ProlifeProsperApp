/**
 * Custom Form Builder API Routes
 * Handles form creation, management, and submissions
 */
import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage/index";
import { 
  insertCustomFormTemplateSchema,
  insertCustomFormFieldSchema,
  insertFormFieldOptionSchema,
  insertCustomFormSubmissionSchema 
} from "@shared/schema";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// ============================================================================
// FORM TEMPLATE ROUTES
// ============================================================================

// Get all form templates for an organization
router.get(
  "/organizations/:organizationId/custom-forms",
  authenticateToken,
  async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const { search, category } = req.query;
      
      let forms;
      if (search) {
        forms = await storage.searchCustomForms(organizationId, search as string);
      } else {
        forms = await storage.getCustomFormsByOrganization(organizationId);
      }

      if (category && category !== 'all') {
        forms = forms.filter(form => form.category === category);
      }
      
      res.json(forms);
    } catch (error) {
      console.error("Error fetching custom forms:", error);
      res.status(500).json({ error: "Failed to fetch custom forms" });
    }
  }
);

// Get a specific form template with all fields and options
router.get(
  "/custom-forms/:formId",
  authenticateToken,
  async (req, res) => {
    try {
      const formId = parseInt(req.params.formId);
      const formDefinition = await storage.getCompleteFormDefinition(formId);
      
      if (!formDefinition) {
        return res.status(404).json({ error: "Form not found" });
      }
      
      res.json(formDefinition);
    } catch (error) {
      console.error("Error fetching form definition:", error);
      res.status(500).json({ error: "Failed to fetch form definition" });
    }
  }
);

// Create new form template
router.post(
  "/organizations/:organizationId/custom-forms",
  authenticateToken,
  async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const userId = (req.user as any)?.email || 'Unknown User';
      
      const formData = insertCustomFormTemplateSchema.parse({
        ...req.body,
        organizationId,
        createdBy: userId,
        updatedBy: userId
      });
      
      const newForm = await storage.createCustomFormTemplate(formData);
      
      res.status(201).json(newForm);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid form data", details: error.errors });
      } else {
        console.error("Error creating custom form:", error);
        res.status(500).json({ error: "Failed to create custom form" });
      }
    }
  }
);

// Update form template
router.put(
  "/custom-forms/:formId",
  authenticateToken,
  async (req, res) => {
    try {
      const formId = parseInt(req.params.formId);
      const userId = (req.user as any)?.email || 'Unknown User';
      
      const updateSchema = insertCustomFormTemplateSchema.partial();
      const updateData = updateSchema.parse({
        ...req.body,
        updatedBy: userId
      });
      
      const updatedForm = await storage.updateCustomFormTemplate(formId, updateData);
      
      res.json(updatedForm);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid update data", details: error.errors });
      } else {
        console.error("Error updating custom form:", error);
        res.status(500).json({ error: "Failed to update custom form" });
      }
    }
  }
);

// Delete form template
router.delete(
  "/custom-forms/:formId",
  authenticateToken,
  async (req, res) => {
    try {
      const formId = parseInt(req.params.formId);
      
      await storage.deleteCustomFormTemplate(formId);
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting custom form:", error);
      res.status(500).json({ error: "Failed to delete custom form" });
    }
  }
);

// Clone form template
router.post(
  "/custom-forms/:formId/clone",
  authenticateToken,
  async (req, res) => {
    try {
      const formId = parseInt(req.params.formId);
      const { name, organizationId } = req.body;
      const createdBy = (req.user as any)?.email || 'Unknown User';
      
      if (!name || !organizationId) {
        return res.status(400).json({ error: "Name and organization ID are required" });
      }
      
      const clonedForm = await storage.cloneCustomFormTemplate(formId, name, organizationId, createdBy);
      
      res.status(201).json(clonedForm);
    } catch (error) {
      console.error("Error cloning custom form:", error);
      res.status(500).json({ error: "Failed to clone custom form" });
    }
  }
);

// ============================================================================
// FORM FIELD ROUTES
// ============================================================================

// Get fields for a form
router.get(
  "/custom-forms/:formId/fields",
  authenticateToken,
  async (req, res) => {
    try {
      const formId = parseInt(req.params.formId);
      const fields = await storage.getCustomFormFields(formId);
      
      // Get options for each field
      const fieldsWithOptions = await Promise.all(
        fields.map(async (field) => ({
          ...field,
          options: await storage.getFormFieldOptions(field.id)
        }))
      );
      
      res.json(fieldsWithOptions);
    } catch (error) {
      console.error("Error fetching form fields:", error);
      res.status(500).json({ error: "Failed to fetch form fields" });
    }
  }
);

// Create new form field
router.post(
  "/custom-forms/:formId/fields",
  authenticateToken,
  async (req, res) => {
    try {
      const formId = parseInt(req.params.formId);
      
      const fieldData = insertCustomFormFieldSchema.parse({
        ...req.body,
        formId
      });
      
      const newField = await storage.createCustomFormField(fieldData);
      
      // If field has options, create them
      if (req.body.options && Array.isArray(req.body.options)) {
        const options = [];
        for (const option of req.body.options) {
          const newOption = await storage.createFormFieldOption({
            ...option,
            fieldId: newField.id
          });
          options.push(newOption);
        }
        (newField as any).options = options;
      }
      
      res.status(201).json(newField);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid field data", details: error.errors });
      } else {
        console.error("Error creating form field:", error);
        res.status(500).json({ error: "Failed to create form field" });
      }
    }
  }
);

// Update form field
router.put(
  "/custom-forms/fields/:fieldId",
  authenticateToken,
  async (req, res) => {
    try {
      const fieldId = parseInt(req.params.fieldId);
      
      const updateSchema = insertCustomFormFieldSchema.partial();
      const updateData = updateSchema.parse(req.body);
      
      const updatedField = await storage.updateCustomFormField(fieldId, updateData);
      
      res.json(updatedField);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid field data", details: error.errors });
      } else {
        console.error("Error updating form field:", error);
        res.status(500).json({ error: "Failed to update form field" });
      }
    }
  }
);

// Delete form field
router.delete(
  "/custom-forms/fields/:fieldId",
  authenticateToken,
  async (req, res) => {
    try {
      const fieldId = parseInt(req.params.fieldId);
      
      await storage.deleteCustomFormField(fieldId);
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting form field:", error);
      res.status(500).json({ error: "Failed to delete form field" });
    }
  }
);

// Reorder form fields
router.put(
  "/custom-forms/:formId/fields/reorder",
  authenticateToken,
  async (req, res) => {
    try {
      const formId = parseInt(req.params.formId);
      const { fieldOrders } = req.body;
      
      if (!Array.isArray(fieldOrders)) {
        return res.status(400).json({ error: "Field orders must be an array" });
      }
      
      await storage.reorderCustomFormFields(formId, fieldOrders);
      
      res.status(200).json({ message: "Fields reordered successfully" });
    } catch (error) {
      console.error("Error reordering form fields:", error);
      res.status(500).json({ error: "Failed to reorder form fields" });
    }
  }
);

// ============================================================================
// FORM SUBMISSION ROUTES
// ============================================================================

// Get submissions for a form
router.get(
  "/custom-forms/:formId/submissions",
  authenticateToken,
  async (req, res) => {
    try {
      const formId = parseInt(req.params.formId);
      const { status } = req.query;
      
      let submissions;
      if (status) {
        submissions = await storage.getCustomFormSubmissionsByStatus(formId, status as string);
      } else {
        submissions = await storage.getCustomFormSubmissionsByForm(formId);
      }
      
      // Sanitize sensitive data
      const sanitizedSubmissions = submissions.map(submission => ({
        ...submission,
        digitalSignature: submission.digitalSignature ? "[SIGNATURE_PRESENT]" : null,
        signatureIpAddress: "[MASKED]",
        ipAddress: "[MASKED]",
        userAgent: "[MASKED]"
      }));
      
      res.json(sanitizedSubmissions);
    } catch (error) {
      console.error("Error fetching form submissions:", error);
      res.status(500).json({ error: "Failed to fetch form submissions" });
    }
  }
);

// Submit a custom form (public endpoint for clients)
router.post(
  "/custom-forms/:formId/submit",
  async (req, res) => {
    try {
      const formId = parseInt(req.params.formId);
      
      // Get form definition to validate submission
      const formDefinition = await storage.getCompleteFormDefinition(formId);
      if (!formDefinition || !formDefinition.template.isActive) {
        return res.status(404).json({ error: "Form not found or inactive" });
      }
      
      const submissionData = insertCustomFormSubmissionSchema.parse({
        ...req.body,
        formId,
        organizationId: formDefinition.template.organizationId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'submitted',
        submittedAt: new Date()
      });
      
      const newSubmission = await storage.createCustomFormSubmission(submissionData);
      
      // Return minimal response
      res.status(201).json({
        id: newSubmission.id,
        status: newSubmission.status,
        submittedAt: newSubmission.submittedAt,
        message: "Form submitted successfully"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid submission data", details: error.errors });
      } else {
        console.error("Error submitting custom form:", error);
        res.status(500).json({ error: "Failed to submit form" });
      }
    }
  }
);

// Get form statistics
router.get(
  "/organizations/:organizationId/custom-forms/statistics",
  authenticateToken,
  async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const stats = await storage.getCustomFormStatistics(organizationId);
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching form statistics:", error);
      res.status(500).json({ error: "Failed to fetch form statistics" });
    }
  }
);

export default router;