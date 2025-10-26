/**
 * Church Announcement Canvas Routes
 * 
 * Handles template management, design CRUD, and export functionality
 */

import { Router } from "express";
import { db } from "../db";
import { announcementTemplates, announcementDesigns } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { announcementTemplates as seedTemplates } from "../data/announcement-templates";

const router = Router();

// Seed announcement templates (admin only - run once)
router.post("/seed-templates", async (req, res) => {
  try {
    const { force } = req.body;
    
    // Check if templates already exist
    const existing = await db.select().from(announcementTemplates).limit(1);
    
    if (existing.length > 0 && !force) {
      return res.json({ 
        success: true, 
        message: "Templates already seeded" 
      });
    }

    // Delete existing templates if force re-seed
    if (force) {
      await db.delete(announcementTemplates);
    }

    // Insert all templates
    const inserted = await db.insert(announcementTemplates).values(seedTemplates).returning();

    res.json({
      success: true,
      message: `Successfully seeded ${inserted.length} announcement templates`,
      count: inserted.length,
    });
  } catch (error: any) {
    console.error("Error seeding templates:", error);
    res.status(500).json({
      success: false,
      message: "Failed to seed templates",
      error: error?.message || "Unknown error",
    });
  }
});

// Get all announcement templates
router.get("/templates", async (req, res) => {
  try {
    const { category } = req.query;

    let templates;
    if (category && category !== "all") {
      templates = await db
        .select()
        .from(announcementTemplates)
        .where(
          and(
            eq(announcementTemplates.isPublic, true),
            eq(announcementTemplates.category, category as string)
          )
        );
    } else {
      templates = await db
        .select()
        .from(announcementTemplates)
        .where(eq(announcementTemplates.isPublic, true));
    }

    res.json({
      success: true,
      templates,
    });
  } catch (error: any) {
    console.error("Error fetching templates:", error);
    res.status(500).json({
      success: false,
      message: "Failed to seed templates",
      error: error?.message || "Unknown error",
    });
  }
});

// Get a single template by ID
router.get("/templates/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [template] = await db
      .select()
      .from(announcementTemplates)
      .where(eq(announcementTemplates.id, parseInt(id)));

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    // Increment usage count
    await db
      .update(announcementTemplates)
      .set({
        usageCount: (template.usageCount || 0) + 1,
      })
      .where(eq(announcementTemplates.id, parseInt(id)));

    res.json({
      success: true,
      template,
    });
  } catch (error: any) {
    console.error("Error fetching template:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch template",
      error: error?.message || "Unknown error",
    });
  }
});

// Get all designs for an organization
router.get("/designs/:organizationId", async (req, res) => {
  try {
    const { organizationId } = req.params;

    const designs = await db
      .select()
      .from(announcementDesigns)
      .where(eq(announcementDesigns.organizationId, parseInt(organizationId)))
      .orderBy(desc(announcementDesigns.updatedAt));

    res.json({
      success: true,
      designs,
    });
  } catch (error: any) {
    console.error("Error fetching designs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch designs",
      error: error?.message || "Unknown error",
    });
  }
});

// Get a single design by ID
router.get("/designs/:organizationId/:designId", async (req, res) => {
  try {
    const { organizationId, designId } = req.params;

    const [design] = await db
      .select()
      .from(announcementDesigns)
      .where(
        and(
          eq(announcementDesigns.id, parseInt(designId)),
          eq(announcementDesigns.organizationId, parseInt(organizationId))
        )
      );

    if (!design) {
      return res.status(404).json({
        success: false,
        message: "Design not found",
      });
    }

    res.json({
      success: true,
      design,
    });
  } catch (error: any) {
    console.error("Error fetching design:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch design",
      error: error?.message || "Unknown error",
    });
  }
});

// Create a new design
router.post("/designs", async (req, res) => {
  try {
    const { organizationId, userId, title, templateId, canvasData, width, height } = req.body;

    if (!organizationId || !userId || !title || !canvasData) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const [newDesign] = await db
      .insert(announcementDesigns)
      .values({
        organizationId,
        userId,
        title,
        templateId: templateId || null,
        canvasData,
        width: width || 1920,
        height: height || 1080,
      })
      .returning();

    res.json({
      success: true,
      message: "Design created successfully",
      design: newDesign,
    });
  } catch (error: any) {
    console.error("Error creating design:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create design",
      error: error?.message || "Unknown error",
    });
  }
});

// Update a design
router.put("/designs/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, canvasData, thumbnailUrl, exportFormat, isPublished } = req.body;

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (title !== undefined) updateData.title = title;
    if (canvasData !== undefined) updateData.canvasData = canvasData;
    if (thumbnailUrl !== undefined) updateData.thumbnailUrl = thumbnailUrl;
    if (exportFormat !== undefined) updateData.exportFormat = exportFormat;
    if (isPublished !== undefined) updateData.isPublished = isPublished;

    const [updatedDesign] = await db
      .update(announcementDesigns)
      .set(updateData)
      .where(eq(announcementDesigns.id, parseInt(id)))
      .returning();

    if (!updatedDesign) {
      return res.status(404).json({
        success: false,
        message: "Design not found",
      });
    }

    res.json({
      success: true,
      message: "Design updated successfully",
      design: updatedDesign,
    });
  } catch (error: any) {
    console.error("Error updating design:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update design",
      error: error?.message || "Unknown error",
    });
  }
});

// Delete a design
router.delete("/designs/:organizationId/:designId", async (req, res) => {
  try {
    const { organizationId, designId } = req.params;

    const [deletedDesign] = await db
      .delete(announcementDesigns)
      .where(
        and(
          eq(announcementDesigns.id, parseInt(designId)),
          eq(announcementDesigns.organizationId, parseInt(organizationId))
        )
      )
      .returning();

    if (!deletedDesign) {
      return res.status(404).json({
        success: false,
        message: "Design not found",
      });
    }

    res.json({
      success: true,
      message: "Design deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting design:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete design",
      error: error?.message || "Unknown error",
    });
  }
});

export { router as announcementCanvasRoutes };
