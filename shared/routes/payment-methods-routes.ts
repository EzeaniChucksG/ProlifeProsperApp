/**
 * Payment Methods API Routes
 * 
 * Handles payment method management for organizations
 */

import type { Express, Request, Response } from "express";
import { paymentMethodsService } from "../services/payment-methods-service";
import { insertPaymentMethodSchema } from "../../shared/schema";

export function registerPaymentMethodsRoutes(app: Express) {
  /**
   * GET /api/payment-methods/:orgId
   * List all payment methods for an organization
   */
  app.get("/api/payment-methods/:orgId", async (req: Request, res: Response) => {
    try {
      const orgId = parseInt(req.params.orgId);
      
      if (isNaN(orgId)) {
        return res.status(400).json({ error: "Invalid organization ID" });
      }

      const methods = await paymentMethodsService.listPaymentMethods(orgId);
      
      return res.json({
        success: true,
        paymentMethods: methods,
        hasPaymentMethods: methods.length > 0,
        defaultPaymentMethod: methods.find(m => m.isDefault),
      });
    } catch (error: any) {
      console.error("Error listing payment methods:", error);
      return res.status(500).json({
        error: "Failed to list payment methods",
        details: error.message,
      });
    }
  });

  /**
   * POST /api/payment-methods/sync/:orgId
   * Sync payment methods from GETTRX to local database
   */
  app.post("/api/payment-methods/sync/:orgId", async (req: Request, res: Response) => {
    try {
      const orgId = parseInt(req.params.orgId);
      
      if (isNaN(orgId)) {
        return res.status(400).json({ error: "Invalid organization ID" });
      }

      const methods = await paymentMethodsService.syncPaymentMethods(orgId);
      
      return res.json({
        success: true,
        message: `Synced ${methods.length} payment methods`,
        paymentMethods: methods,
      });
    } catch (error: any) {
      console.error("Error syncing payment methods:", error);
      return res.status(500).json({
        error: "Failed to sync payment methods",
        details: error.message,
      });
    }
  });

  /**
   * POST /api/payment-methods
   * Add a new payment method
   */
  app.post("/api/payment-methods", async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validatedData = insertPaymentMethodSchema.parse(req.body);

      const method = await paymentMethodsService.addPaymentMethod({
        organizationId: validatedData.organizationId,
        paymentProvider: validatedData.paymentProvider,
        providerPaymentMethodId: validatedData.providerPaymentMethodId,
        paymentMethodType: validatedData.paymentMethodType,
        lastFour: validatedData.lastFour || undefined,
        cardBrand: validatedData.cardBrand || undefined,
        expiryMonth: validatedData.expiryMonth || undefined,
        expiryYear: validatedData.expiryYear || undefined,
        setAsDefault: req.body.setAsDefault || false,
      });

      return res.json({
        success: true,
        message: "Payment method added successfully",
        paymentMethod: method,
      });
    } catch (error: any) {
      console.error("Error adding payment method:", error);
      return res.status(400).json({
        error: "Failed to add payment method",
        details: error.message,
      });
    }
  });

  /**
   * PUT /api/payment-methods/:id/default
   * Set a payment method as default
   */
  app.put("/api/payment-methods/:id/default", async (req: Request, res: Response) => {
    try {
      const paymentMethodId = parseInt(req.params.id);
      const { organizationId } = req.body;

      if (isNaN(paymentMethodId) || !organizationId) {
        return res.status(400).json({ error: "Invalid request" });
      }

      const method = await paymentMethodsService.setDefaultPaymentMethod(
        organizationId,
        paymentMethodId
      );

      return res.json({
        success: true,
        message: "Default payment method updated",
        paymentMethod: method,
      });
    } catch (error: any) {
      console.error("Error setting default payment method:", error);
      return res.status(500).json({
        error: "Failed to set default payment method",
        details: error.message,
      });
    }
  });

  /**
   * PUT /api/payment-methods/:id/priority
   * Update payment method priority for fallback logic
   */
  app.put("/api/payment-methods/:id/priority", async (req: Request, res: Response) => {
    try {
      const paymentMethodId = parseInt(req.params.id);
      const { organizationId, priority } = req.body;

      if (isNaN(paymentMethodId) || !organizationId || priority === undefined) {
        return res.status(400).json({ error: "Invalid request" });
      }

      const method = await paymentMethodsService.updatePaymentMethodPriority(
        organizationId,
        paymentMethodId,
        priority
      );

      return res.json({
        success: true,
        message: "Payment method priority updated",
        paymentMethod: method,
      });
    } catch (error: any) {
      console.error("Error updating payment method priority:", error);
      return res.status(500).json({
        error: "Failed to update payment method priority",
        details: error.message,
      });
    }
  });

  /**
   * DELETE /api/payment-methods/:id
   * Delete a payment method
   */
  app.delete("/api/payment-methods/:id", async (req: Request, res: Response) => {
    try {
      const paymentMethodId = parseInt(req.params.id);
      const organizationId = parseInt(req.query.organizationId as string);

      if (isNaN(paymentMethodId) || isNaN(organizationId)) {
        return res.status(400).json({ error: "Invalid request" });
      }

      await paymentMethodsService.deletePaymentMethod(organizationId, paymentMethodId);

      return res.json({
        success: true,
        message: "Payment method deleted successfully",
      });
    } catch (error: any) {
      console.error("Error deleting payment method:", error);
      return res.status(500).json({
        error: "Failed to delete payment method",
        details: error.message,
      });
    }
  });

  /**
   * GET /api/payment-methods/:orgId/default
   * Get the default payment method for an organization
   */
  app.get("/api/payment-methods/:orgId/default", async (req: Request, res: Response) => {
    try {
      const orgId = parseInt(req.params.orgId);
      
      if (isNaN(orgId)) {
        return res.status(400).json({ error: "Invalid organization ID" });
      }

      const method = await paymentMethodsService.getDefaultPaymentMethod(orgId);
      
      return res.json({
        success: true,
        paymentMethod: method,
        hasDefaultMethod: !!method,
      });
    } catch (error: any) {
      console.error("Error getting default payment method:", error);
      return res.status(500).json({
        error: "Failed to get default payment method",
        details: error.message,
      });
    }
  });

  console.log("✅ Payment methods routes registered");
}
