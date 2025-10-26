/**
 * Team Management Routes
 * Handles team member management, roles, and permissions
 */
import type { Express, Request, Response } from "express";
import { storage } from "../storage/index";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { authenticateToken, requireOrganizationAccess } from "../middleware";
import { requirePermission } from "../middleware/permissions";

// Schema for team member invitation
const inviteTeamMemberSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  role: z.string().min(1),
  customPermissions: z.any().optional(),
});

// Schema for updating member role
const updateMemberRoleSchema = z.object({
  role: z.string().min(1),
  customPermissions: z.any().optional(),
});

export function registerTeamRoutes(app: Express): void {
  // Get organization team members
  app.get(
    "/api/organizations/:orgId/team",
    authenticateToken,
    requireOrganizationAccess,
    requirePermission("users.view"),
    async (req: Request, res: Response) => {
      try {
        const orgId = parseInt(req.params.orgId);
        const user = req.user;

        if (!user) {
          return res.status(401).json({ message: "Authentication required" });
        }

        // Ensure user can only access their own organization (unless super admin)
        if (user.organizationId !== orgId && user.role !== 'super_admin') {
          return res.status(403).json({ message: "Access denied" });
        }

        const members = await storage.getOrganizationMembers(orgId);
        
        // Filter out sensitive information
        const safeMembers = members.map(member => ({
          id: member.id,
          email: member.email,
          firstName: member.firstName,
          lastName: member.lastName,
          role: member.role,
          customPermissions: member.customPermissions,
          isActive: member.isActive,
          lastLoginAt: member.lastLoginAt,
          createdAt: member.createdAt,
          profileImageUrl: member.profileImageUrl,
          title: member.title,
        }));

        res.json(safeMembers);
      } catch (error) {
        console.error("Error fetching team members:", error);
        res.status(500).json({ message: "Failed to fetch team members" });
      }
    }
  );

  // Invite team member
  app.post(
    "/api/organizations/:orgId/team/invite",
    authenticateToken,
    requireOrganizationAccess,
    requirePermission("users.manage"),
    async (req: Request, res: Response) => {
      try {
        const orgId = parseInt(req.params.orgId);
        const user = req.user;

        if (!user) {
          return res.status(401).json({ message: "Authentication required" });
        }

        // Ensure user can only manage their own organization (unless super admin)
        if (user.organizationId !== orgId && user.role !== 'super_admin') {
          return res.status(403).json({ message: "Access denied" });
        }

        const memberData = inviteTeamMemberSchema.parse(req.body);

        // Check if user already exists
        const existingUser = await storage.getUserByEmail(memberData.email);
        if (existingUser) {
          return res.status(409).json({ message: "User with this email already exists" });
        }

        const newMember = await storage.inviteTeamMember({
          ...memberData,
          organizationId: orgId,
        });

        // TODO: Send invitation email to the new member

        // Return safe member data
        const safeMember = {
          id: newMember.id,
          email: newMember.email,
          firstName: newMember.firstName,
          lastName: newMember.lastName,
          role: newMember.role,
          customPermissions: newMember.customPermissions,
          isActive: newMember.isActive,
          createdAt: newMember.createdAt,
        };

        res.status(201).json(safeMember);
      } catch (error) {
        console.error("Error inviting team member:", error);
        if (error instanceof z.ZodError) {
          return res.status(400).json({ 
            message: "Invalid input", 
            errors: error.errors 
          });
        }
        res.status(500).json({ message: "Failed to invite team member" });
      }
    }
  );

  // Update team member role
  app.patch(
    "/api/organizations/:orgId/team/:userId/role",
    authenticateToken,
    requireOrganizationAccess,
    requirePermission("users.manage"),
    async (req: Request, res: Response) => {
      try {
        const orgId = parseInt(req.params.orgId);
        const userId = req.params.userId;
        const user = req.user;

        if (!user) {
          return res.status(401).json({ message: "Authentication required" });
        }

        // Ensure user can only manage their own organization (unless super admin)
        if (user.organizationId !== orgId && user.role !== 'super_admin') {
          return res.status(403).json({ message: "Access denied" });
        }

        const roleData = updateMemberRoleSchema.parse(req.body);

        // Prevent self-role modification (except for super admin)
        if (user.id === userId && user.role !== 'super_admin') {
          return res.status(403).json({ message: "Cannot modify your own role" });
        }

        const updatedMember = await storage.updateMemberRole(
          userId,
          orgId,
          roleData.role,
          roleData.customPermissions
        );

        // Return safe member data
        const safeMember = {
          id: updatedMember.id,
          email: updatedMember.email,
          firstName: updatedMember.firstName,
          lastName: updatedMember.lastName,
          role: updatedMember.role,
          customPermissions: updatedMember.customPermissions,
          isActive: updatedMember.isActive,
          updatedAt: updatedMember.updatedAt,
        };

        res.json(safeMember);
      } catch (error) {
        console.error("Error updating member role:", error);
        if (error instanceof z.ZodError) {
          return res.status(400).json({ 
            message: "Invalid input", 
            errors: error.errors 
          });
        }
        res.status(500).json({ message: "Failed to update member role" });
      }
    }
  );

  // Remove team member (deactivate)
  app.delete(
    "/api/organizations/:orgId/team/:userId",
    authenticateToken,
    requireOrganizationAccess,
    requirePermission("users.manage"),
    async (req: Request, res: Response) => {
      try {
        const orgId = parseInt(req.params.orgId);
        const userId = req.params.userId;
        const user = req.user;

        if (!user) {
          return res.status(401).json({ message: "Authentication required" });
        }

        // Ensure user can only manage their own organization (unless super admin)
        if (user.organizationId !== orgId && user.role !== 'super_admin') {
          return res.status(403).json({ message: "Access denied" });
        }

        // Prevent self-removal (except for super admin)
        if (user.id === userId && user.role !== 'super_admin') {
          return res.status(403).json({ message: "Cannot remove yourself" });
        }

        await storage.removeMember(userId, orgId);

        res.json({ message: "Team member removed successfully" });
      } catch (error) {
        console.error("Error removing team member:", error);
        res.status(500).json({ message: "Failed to remove team member" });
      }
    }
  );

  // Reactivate team member
  app.patch(
    "/api/organizations/:orgId/team/:userId/reactivate",
    authenticateToken,
    requireOrganizationAccess,
    requirePermission("users.manage"),
    async (req: Request, res: Response) => {
      try {
        const orgId = parseInt(req.params.orgId);
        const userId = req.params.userId;
        const user = req.user;

        if (!user) {
          return res.status(401).json({ message: "Authentication required" });
        }

        // Ensure user can only manage their own organization (unless super admin)
        if (user.organizationId !== orgId && user.role !== 'super_admin') {
          return res.status(403).json({ message: "Access denied" });
        }

        const reactivatedMember = await storage.reactivateMember(userId, orgId);

        // Return safe member data
        const safeMember = {
          id: reactivatedMember.id,
          email: reactivatedMember.email,
          firstName: reactivatedMember.firstName,
          lastName: reactivatedMember.lastName,
          role: reactivatedMember.role,
          customPermissions: reactivatedMember.customPermissions,
          isActive: reactivatedMember.isActive,
          updatedAt: reactivatedMember.updatedAt,
        };

        res.json(safeMember);
      } catch (error) {
        console.error("Error reactivating team member:", error);
        res.status(500).json({ message: "Failed to reactivate team member" });
      }
    }
  );

  // Get available roles and permissions
  app.get(
    "/api/organizations/:orgId/team/roles",
    authenticateToken,
    requireOrganizationAccess,
    async (req: Request, res: Response) => {
      try {
        const user = req.user;

        if (!user) {
          return res.status(401).json({ message: "Authentication required" });
        }

        // Return predefined roles and their permissions
        const roles = [
          {
            name: "administrator",
            displayName: "Administrator",
            description: "Full access to all features and settings",
            permissions: {
              campaigns: { manage: true, view: true },
              donations: { process: true, view: true, refund: true },
              donors: { manage: true, view: true, export: true },
              analytics: { view: true, export: true },
              team: { manage: true, view: true },
              settings: { manage: true, view: true },
            }
          },
          {
            name: "campaign_manager",
            displayName: "Campaign Manager",
            description: "Manage campaigns, view donors and analytics",
            permissions: {
              campaigns: { manage: true, view: true },
              donations: { view: true },
              donors: { view: true, edit: true },
              analytics: { view: true, export: true },
              team: { view: true },
            }
          },
          {
            name: "donation_processor",
            displayName: "Donation Processor",
            description: "Process donations and manage donor information",
            permissions: {
              campaigns: { view: true },
              donations: { process: true, view: true },
              donors: { view: true, edit: true },
              analytics: { view: true },
            }
          },
          {
            name: "viewer",
            displayName: "Viewer",
            description: "View-only access to dashboard and reports",
            permissions: {
              campaigns: { view: true },
              donations: { view: true },
              donors: { view: true },
              analytics: { view: true },
              team: { view: true },
            }
          }
        ];

        res.json(roles);
      } catch (error) {
        console.error("Error fetching roles:", error);
        res.status(500).json({ message: "Failed to fetch roles" });
      }
    }
  );
}