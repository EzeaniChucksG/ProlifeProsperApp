import { Router } from "express";
import { db } from "../db";
import { userOrganizations, users, organizations } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.get("/user/organizations", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const currentUser = await db
      .select({ activeOrganizationId: users.activeOrganizationId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const activeOrgId = currentUser[0]?.activeOrganizationId;

    const userOrgs = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        mid: organizations.merchantAccountId,
        role: userOrganizations.role,
        accessType: userOrganizations.accessType,
      })
      .from(userOrganizations)
      .innerJoin(organizations, eq(userOrganizations.organizationId, organizations.id))
      .where(and(
        eq(userOrganizations.userId, userId),
        eq(userOrganizations.isActive, true)
      ));

    const orgsWithActiveFlag = userOrgs.map(org => ({
      ...org,
      isActive: org.id === activeOrgId
    }));

    res.json(orgsWithActiveFlag);
  } catch (error) {
    console.error("Error fetching user organizations:", error);
    res.status(500).json({ message: "Failed to fetch organizations" });
  }
});

router.post("/user/switch-organization", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { organizationId } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!organizationId) {
      return res.status(400).json({ message: "Organization ID is required" });
    }

    const hasAccess = await db
      .select()
      .from(userOrganizations)
      .where(and(
        eq(userOrganizations.userId, userId),
        eq(userOrganizations.organizationId, organizationId),
        eq(userOrganizations.isActive, true)
      ))
      .limit(1);

    if (hasAccess.length === 0) {
      return res.status(403).json({ message: "Access denied to this organization" });
    }

    await db
      .update(users)
      .set({ activeOrganizationId: organizationId })
      .where(eq(users.id, userId));

    const updatedUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    res.json({ 
      success: true, 
      activeOrganizationId: organizationId,
      user: updatedUser[0]
    });
  } catch (error) {
    console.error("Error switching organization:", error);
    res.status(500).json({ message: "Failed to switch organization" });
  }
});

router.post("/user/organizations/:organizationId/grant-access", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { organizationId } = req.params;
    const { targetUserId, role = "admin", accessType = "full" } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const currentUserAccess = await db
      .select()
      .from(userOrganizations)
      .where(and(
        eq(userOrganizations.userId, userId),
        eq(userOrganizations.organizationId, parseInt(organizationId)),
        eq(userOrganizations.role, "admin"),
        eq(userOrganizations.isActive, true)
      ))
      .limit(1);

    if (currentUserAccess.length === 0) {
      return res.status(403).json({ message: "Only active admins can grant access" });
    }

    const existingAccess = await db
      .select()
      .from(userOrganizations)
      .where(and(
        eq(userOrganizations.userId, targetUserId),
        eq(userOrganizations.organizationId, parseInt(organizationId))
      ))
      .limit(1);

    if (existingAccess.length > 0) {
      await db
        .update(userOrganizations)
        .set({ role, accessType, isActive: true })
        .where(and(
          eq(userOrganizations.userId, targetUserId),
          eq(userOrganizations.organizationId, parseInt(organizationId))
        ));

      return res.json({ 
        success: true, 
        message: "Access updated successfully" 
      });
    }

    await db.insert(userOrganizations).values({
      userId: targetUserId,
      organizationId: parseInt(organizationId),
      role,
      accessType,
      isActive: true
    });

    res.json({ 
      success: true, 
      message: "Access granted successfully" 
    });
  } catch (error) {
    console.error("Error granting organization access:", error);
    res.status(500).json({ message: "Failed to grant access" });
  }
});

router.delete("/user/organizations/:organizationId/revoke-access", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { organizationId } = req.params;
    const { targetUserId } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const currentUserAccess = await db
      .select()
      .from(userOrganizations)
      .where(and(
        eq(userOrganizations.userId, userId),
        eq(userOrganizations.organizationId, parseInt(organizationId)),
        eq(userOrganizations.role, "admin"),
        eq(userOrganizations.isActive, true)
      ))
      .limit(1);

    if (currentUserAccess.length === 0) {
      return res.status(403).json({ message: "Only active admins can revoke access" });
    }

    await db
      .update(userOrganizations)
      .set({ isActive: false })
      .where(and(
        eq(userOrganizations.userId, targetUserId),
        eq(userOrganizations.organizationId, parseInt(organizationId))
      ));

    res.json({ 
      success: true, 
      message: "Access revoked successfully" 
    });
  } catch (error) {
    console.error("Error revoking organization access:", error);
    res.status(500).json({ message: "Failed to revoke access" });
  }
});

export default router;
