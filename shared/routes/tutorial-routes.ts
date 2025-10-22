import { Router, Request, Response } from "express";
import { db } from "../db";
import { users } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// Mark tour as completed
router.post("/users/:userId/tour-complete", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    // Verify user exists and has permission
    if (req.user?.id !== userId && req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await db
      .update(users)
      .set({ 
        tourCompleted: true,
        tourProgress: { completed: true, completedAt: new Date().toISOString() }
      })
      .where(eq(users.id, userId));

    res.json({ success: true, message: "Tour marked as completed" });
  } catch (error) {
    console.error("Error completing tour:", error);
    res.status(500).json({ error: "Failed to complete tour" });
  }
});

// Update tour progress
router.post("/users/:userId/tour-progress", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const progressSchema = z.object({
      currentStep: z.number(),
      completedSteps: z.array(z.string()),
      lastUpdated: z.string().optional(),
    });

    const progress = progressSchema.parse(req.body);
    
    // Verify user exists and has permission
    if (req.user?.id !== userId && req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await db
      .update(users)
      .set({ 
        tourProgress: {
          ...progress,
          lastUpdated: new Date().toISOString()
        }
      })
      .where(eq(users.id, userId));

    res.json({ success: true, message: "Tour progress updated" });
  } catch (error) {
    console.error("Error updating tour progress:", error);
    res.status(500).json({ error: "Failed to update tour progress" });
  }
});

// Mark feature tutorial as completed
router.post("/users/:userId/feature-tutorial/:featureName", async (req: Request, res: Response) => {
  try {
    const { userId, featureName } = req.params;
    
    // Verify user exists and has permission
    if (req.user?.id !== userId && req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Get current feature tutorials
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const currentTutorials = (user.featureTutorials as Record<string, any>) || {};
    
    await db
      .update(users)
      .set({ 
        featureTutorials: {
          ...currentTutorials,
          [featureName]: {
            completed: true,
            completedAt: new Date().toISOString()
          }
        }
      })
      .where(eq(users.id, userId));

    res.json({ success: true, message: `Feature tutorial '${featureName}' marked as completed` });
  } catch (error) {
    console.error("Error completing feature tutorial:", error);
    res.status(500).json({ error: "Failed to complete feature tutorial" });
  }
});

// Reset tour progress (allow users to restart)
router.post("/users/:userId/tour-reset", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    // Verify user exists and has permission
    if (req.user?.id !== userId && req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await db
      .update(users)
      .set({ 
        tourCompleted: false,
        tourProgress: null
      })
      .where(eq(users.id, userId));

    res.json({ success: true, message: "Tour reset successfully" });
  } catch (error) {
    console.error("Error resetting tour:", error);
    res.status(500).json({ error: "Failed to reset tour" });
  }
});

// Get tutorial status
router.get("/users/:userId/tutorial-status", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    // Verify user exists and has permission
    if (req.user?.id !== userId && req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const [user] = await db
      .select({
        tourCompleted: users.tourCompleted,
        tourProgress: users.tourProgress,
        featureTutorials: users.featureTutorials,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error fetching tutorial status:", error);
    res.status(500).json({ error: "Failed to fetch tutorial status" });
  }
});

export default router;
