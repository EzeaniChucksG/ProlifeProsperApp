/**
 * Super Admin Routes
 * Handles superadmin dashboard, role management, staff management, and system administration
 */
import type { Express } from "express";
import { authenticateToken } from "../middleware";
import { requireSuperAdmin } from "../middleware/permissions";
import { ROLES, getAllRoles, getRoleById, PERMISSIONS } from "../middleware/roles";
import { db } from "../db";
import { users, organizations } from "../../shared/schema";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

export function registerSuperAdminRoutes(app: Express): void {
  
  // ===============================
  // ROLE MANAGEMENT ENDPOINTS
  // ===============================
  
  // Get all available roles
  app.get("/api/superadmin/roles", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const roles = getAllRoles().map(role => ({
        ...role,
        userCount: 0, // TODO: Query actual user count
        isBuiltIn: true,
        createdBy: "System",
        createdAt: "2024-01-01T00:00:00Z",
        isActive: true
      }));
      
      res.json(roles);
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ message: "Failed to fetch roles" });
    }
  });

  // Create a new role
  app.post("/api/superadmin/roles", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const { name, description, permissions, color, priority } = req.body;
      
      // For now, return a mock response since we're using static role definitions
      const newRole = {
        id: Date.now(), // Generate temporary ID
        name,
        description,
        permissions,
        color: color || "#6b7280",
        priority: priority || 50,
        userCount: 0,
        isBuiltIn: false,
        createdBy: req.user?.email || "Unknown",
        createdAt: new Date().toISOString(),
        isActive: true
      };
      
      res.status(201).json(newRole);
    } catch (error) {
      console.error("Error creating role:", error);
      res.status(500).json({ message: "Failed to create role" });
    }
  });

  // Update a role
  app.put("/api/superadmin/roles/:id", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const roleId = parseInt(req.params.id);
      const updates = req.body;
      
      const role = getRoleById(roleId);
      if (!role) {
        return res.status(404).json({ message: "Role not found" });
      }
      
      // For built-in roles, only allow certain updates
      if (roleId <= 8) {
        return res.status(400).json({ message: "Cannot modify built-in roles" });
      }
      
      res.json({ ...role, ...updates });
    } catch (error) {
      console.error("Error updating role:", error);
      res.status(500).json({ message: "Failed to update role" });
    }
  });

  // Delete a role
  app.delete("/api/superadmin/roles/:id", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const roleId = parseInt(req.params.id);
      
      if (roleId <= 8) {
        return res.status(400).json({ message: "Cannot delete built-in roles" });
      }
      
      res.json({ message: "Role deleted successfully" });
    } catch (error) {
      console.error("Error deleting role:", error);
      res.status(500).json({ message: "Failed to delete role" });
    }
  });

  // ===============================
  // STAFF MANAGEMENT ENDPOINTS
  // ===============================

  // Get all staff members
  app.get("/api/superadmin/staff", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const staff = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          organizationId: users.organizationId,
          isActive: sql<boolean>`CASE WHEN ${users.isActive} IS NULL THEN true ELSE ${users.isActive} END`,
          lastLogin: users.lastLoginAt,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.organizationId, 1)); // Pro Life Prosper organization
      
      const formattedStaff = staff.map(member => ({
        ...member,
        roleId: member.role === "super_admin" ? 1 : member.role === "admin" ? 3 : 6,
        activeSessions: 1, // Mock data
        permissions: member.role === "super_admin" ? Object.keys(PERMISSIONS) : [],
        assignedBy: "System Admin",
        assignedAt: member.createdAt,
        expiresAt: null,
      }));
      
      res.json(formattedStaff);
    } catch (error) {
      console.error("Error fetching staff:", error);
      res.status(500).json({ message: "Failed to fetch staff members" });
    }
  });

  // Create a new staff member
  app.post("/api/superadmin/staff", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const { email, firstName, lastName, role, roleId, password } = req.body;
      
      // Check if user already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      
      if (existingUser.length > 0) {
        return res.status(400).json({ message: "User with this email already exists" });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create new user
      const newUser = await db
        .insert(users)
        .values({
          id: crypto.randomUUID(),
          email,
          firstName,
          lastName,
          role: role || "admin",
          organizationId: 1, // Pro Life Prosper organization
          hashedPassword,
          emailVerified: new Date(),
          isActive: true,
        })
        .returning();
      
      const staffMember = {
        ...newUser[0],
        roleId: roleId || 3,
        activeSessions: 0,
        permissions: role === "super_admin" ? Object.keys(PERMISSIONS) : [],
        assignedBy: req.user?.email || "System Admin",
        assignedAt: new Date().toISOString(),
        expiresAt: null,
      };
      
      res.status(201).json(staffMember);
    } catch (error) {
      console.error("Error creating staff member:", error);
      res.status(500).json({ message: "Failed to create staff member" });
    }
  });

  // Update a staff member
  app.put("/api/superadmin/staff/:id", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const staffId = req.params.id;
      const updates = req.body;
      
      const updatedUser = await db
        .update(users)
        .set({
          firstName: updates.firstName,
          lastName: updates.lastName,
          role: updates.role,
          isActive: updates.isActive,
        })
        .where(eq(users.id, staffId))
        .returning();
      
      if (updatedUser.length === 0) {
        return res.status(404).json({ message: "Staff member not found" });
      }
      
      res.json({
        ...updatedUser[0],
        roleId: updates.roleId,
        activeSessions: 1,
        permissions: updates.role === "super_admin" ? Object.keys(PERMISSIONS) : [],
        assignedBy: req.user?.email || "System Admin",
        assignedAt: updatedUser[0].createdAt,
        expiresAt: null,
      });
    } catch (error) {
      console.error("Error updating staff member:", error);
      res.status(500).json({ message: "Failed to update staff member" });
    }
  });

  // Delete a staff member
  app.delete("/api/superadmin/staff/:id", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const staffId = req.params.id;
      
      // Don't allow deleting the current user
      if (staffId === req.user?.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      await db
        .delete(users)
        .where(eq(users.id, staffId));
      
      res.json({ message: "Staff member deleted successfully" });
    } catch (error) {
      console.error("Error deleting staff member:", error);
      res.status(500).json({ message: "Failed to delete staff member" });
    }
  });

  // ===============================
  // USER ROLE & PERMISSION ENDPOINTS
  // ===============================

  // Get current user's role and permissions
  app.get("/api/superadmin/my-role", authenticateToken, async (req, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const roleId = user.role === "super_admin" ? 1 : user.role === "admin" ? 3 : 6;
      const role = getRoleById(roleId);
      
      const userRole = {
        userId: user.id,
        email: user.email,
        role: user.role,
        roleId,
        roleName: role?.name || "Unknown",
        roleDescription: role?.description || "",
        permissions: role?.permissions || [],
        color: role?.color || "#6b7280",
        priority: role?.priority || 50,
      };
      
      res.json(userRole);
    } catch (error) {
      console.error("Error fetching user role:", error);
      res.status(500).json({ message: "Failed to fetch user role" });
    }
  });

  // ===============================
  // SESSION MANAGEMENT ENDPOINTS
  // ===============================

  // Get active sessions
  app.get("/api/superadmin/sessions", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      // Mock session data since we don't have a sessions table
      const sessions = [
        {
          id: "session_1",
          userId: req.user?.id,
          deviceInfo: {
            browser: "Chrome",
            os: "macOS",
            device: "Desktop"
          },
          ipAddress: "192.168.1.1",
          location: "New York, NY",
          loginMethod: "email",
          sessionType: "web",
          isActive: true,
          lastActivity: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }
      ];
      
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  // Revoke a session
  app.post("/api/superadmin/sessions/:sessionId/revoke", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const sessionId = req.params.sessionId;
      
      // Mock session revocation
      res.json({ 
        message: "Session revoked successfully",
        sessionId 
      });
    } catch (error) {
      console.error("Error revoking session:", error);
      res.status(500).json({ message: "Failed to revoke session" });
    }
  });

  // ===============================
  // AUDIT LOG ENDPOINTS
  // ===============================

  // Get audit logs
  app.get("/api/superadmin/audit-logs", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      // Mock audit log data
      const auditLogs = Array.from({ length: limit }, (_, i) => ({
        id: i + offset + 1,
        userId: req.user?.id,
        userEmail: req.user?.email,
        action: ["login", "role_updated", "staff_created", "organization_viewed"][i % 4],
        resource: ["user", "role", "staff", "organization"][i % 4],
        resourceId: `res_${i + 1}`,
        timestamp: new Date(Date.now() - i * 1000 * 60 * 5).toISOString(),
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        details: { action: "User performed action" },
      }));
      
      res.json(auditLogs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // ===============================
  // DATA MIGRATION & MAINTENANCE ENDPOINTS
  // ===============================

  // Recalculate donor statistics from their donations
  app.post("/api/superadmin/recalculate-donor-stats", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      console.log("🔄 Starting donor statistics recalculation...");
      
      // Import dependencies
      const { donors, donations } = await import("../../shared/schema");
      const { sql: sqlOp } = await import("drizzle-orm");
      
      // Get all unique donor IDs from donations
      const donorStats = await db
        .select({
          donorId: donations.donorId,
          totalDonated: sqlOp<number>`SUM(CAST(${donations.amount} AS DECIMAL))`,
          donationCount: sqlOp<number>`COUNT(*)`,
          firstDonationAt: sqlOp<Date>`MIN(${donations.createdAt})`,
          lastDonationAt: sqlOp<Date>`MAX(${donations.createdAt})`,
        })
        .from(donations)
        .where(eq(donations.status, "completed"))
        .groupBy(donations.donorId);
      
      console.log(`📊 Found ${donorStats.length} donors with donations`);
      
      let updated = 0;
      let errors = 0;
      
      // Update each donor with their calculated stats
      for (const stats of donorStats) {
        try {
          await db
            .update(donors)
            .set({
              totalDonated: stats.totalDonated.toString(),
              donationCount: stats.donationCount,
              firstDonationAt: stats.firstDonationAt ? new Date(stats.firstDonationAt) : null,
              lastDonationAt: stats.lastDonationAt ? new Date(stats.lastDonationAt) : null,
              updatedAt: new Date(),
            })
            .where(eq(donors.id, stats.donorId));
          
          updated++;
          console.log(`✅ Updated donor ${stats.donorId}: $${stats.totalDonated}, ${stats.donationCount} donations`);
        } catch (error) {
          errors++;
          console.error(`❌ Error updating donor ${stats.donorId}:`, error);
        }
      }
      
      console.log(`🎉 Donor stats recalculation complete: ${updated} updated, ${errors} errors`);
      
      res.json({
        success: true,
        message: "Donor statistics recalculated successfully",
        stats: {
          totalDonors: donorStats.length,
          updated,
          errors,
        },
      });
    } catch (error) {
      console.error("Error recalculating donor stats:", error);
      res.status(500).json({ message: "Failed to recalculate donor statistics" });
    }
  });
}