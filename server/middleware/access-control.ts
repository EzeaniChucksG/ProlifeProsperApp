/**
 * Organization Access Control Middleware
 * Multi-tenant access control for organization-scoped resources
 */
import { AuthUser } from "../auth";

export interface OrganizationAccessResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Check if user can access a specific organization's data
 * Super admins can access any organization
 * Regular users can only access their own organization
 */
export function canAccessOrganization(user: AuthUser, requestedOrgId: number): OrganizationAccessResult {
  // Super admins and staff members have cross-organization access
  if (user.role === 'super_admin' || user.role === 'staff_member') {
    return { allowed: true };
  }
  
  // Regular users can only access their own organization
  if (user.organizationId === requestedOrgId) {
    return { allowed: true };
  }
  
  return { 
    allowed: false, 
    reason: `Access denied: User belongs to organization ${user.organizationId} but requested organization ${requestedOrgId}` 
  };
}

/**
 * Middleware: Ensure user can access the requested organization
 * Expects organization ID in req.params.orgId or req.params.organizationId
 */
export const requireOrganizationAccess = (req: any, res: any, next: any) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  // Extract organization ID from params
  const orgId = parseInt(req.params.orgId || req.params.organizationId);
  
  if (!orgId) {
    return res.status(400).json({ 
      message: "Organization ID required in request parameters" 
    });
  }

  const access = canAccessOrganization(user, orgId);
  
  if (!access.allowed) {
    return res.status(403).json({ 
      message: access.reason || "Access denied to organization data",
      organizationId: orgId,
      userOrganizationId: user.organizationId
    });
  }

  // Add validated org ID to request for downstream use
  req.validatedOrgId = orgId;
  next();
};

/**
 * Middleware: Ensure user belongs to the requested organization (stricter than access)
 * Only allows users from the same organization, no super admin bypass
 */
export const requireSameOrganization = (req: any, res: any, next: any) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const orgId = parseInt(req.params.orgId || req.params.organizationId);
  
  if (!orgId) {
    return res.status(400).json({ 
      message: "Organization ID required in request parameters" 
    });
  }

  if (user.organizationId !== orgId) {
    return res.status(403).json({ 
      message: "Access restricted to same organization only",
      organizationId: orgId,
      userOrganizationId: user.organizationId
    });
  }

  req.validatedOrgId = orgId;
  next();
};

/**
 * Middleware: Allow access only to platform-wide data (super admins only)
 */
export const requirePlatformAccess = (req: any, res: any, next: any) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (user.role !== 'super_admin') {
    return res.status(403).json({ 
      message: "Platform-wide access requires super admin privileges",
      userRole: user.role 
    });
  }

  next();
};

/**
 * Get user's effective organization ID for data access
 * Supports impersonation context for super admins
 */
export function getEffectiveOrganizationId(user: AuthUser, impersonationOrgId?: number): number | null {
  // If super admin is impersonating, use the impersonation org ID
  if (user.role === 'super_admin' && impersonationOrgId) {
    return impersonationOrgId;
  }
  
  // Otherwise use user's own organization ID
  return user.organizationId;
}

/**
 * Get organization filter for database queries
 * Returns null for super admins (no filter), specific org ID for regular users
 */
export function getOrganizationFilter(user: AuthUser, impersonationOrgId?: number): number | null {
  if (user.role === 'super_admin' && !impersonationOrgId) {
    // Super admin without impersonation sees all organizations
    return null;
  }
  
  return getEffectiveOrganizationId(user, impersonationOrgId);
}