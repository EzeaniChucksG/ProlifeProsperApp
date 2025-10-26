/**
 * Permission-based Authorization Middleware
 * Handles role-based access control
 */
import { ROLES } from './roles';

// Permission checking functions
export function hasPermission(
  userRole: number,
  requiredPermission: string,
): boolean {
  const role = ROLES[userRole];
  if (!role) return false;
  return role.permissions.includes(requiredPermission);
}

export function hasAnyPermission(
  userRole: number,
  requiredPermissions: string[],
): boolean {
  return requiredPermissions.some((permission) =>
    hasPermission(userRole, permission),
  );
}

export function hasAllPermissions(
  userRole: number,
  requiredPermissions: string[],
): boolean {
  return requiredPermissions.every((permission) =>
    hasPermission(userRole, permission),
  );
}

/**
 * Middleware: Require specific permission
 */
export function requirePermission(permission: string | string[]) {
  return (req: any, res: any, next: any) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Super admin bypass (role_id = 1 or role = "super_admin")
    if (user.roleId === 1 || user.role === "super_admin") {
      return next();
    }

    // Handle both string and array of permissions
    const permissions = Array.isArray(permission) ? permission : [permission];
    
    // Check if user has all required permissions
    if (!hasAllPermissions(user.roleId, permissions)) {
      return res.status(403).json({
        message: "Insufficient permissions",
        required: permissions,
        userRole: user.roleId,
      });
    }

    next();
  };
}

/**
 * Middleware: Require any of the specified permissions
 */
export function requireAnyPermission(permissions: string[]) {
  return (req: any, res: any, next: any) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Super admin bypass
    if (user.roleId === 1 || user.role === "super_admin") {
      return next();
    }

    if (!hasAnyPermission(user.roleId, permissions)) {
      return res.status(403).json({
        message: "Insufficient permissions",
        required: permissions,
        userRole: user.roleId,
      });
    }

    next();
  };
}

/**
 * Middleware: Require super admin role
 */
export const requireSuperAdmin = (req: any, res: any, next: any) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (user.role !== "super_admin") {
    return res.status(403).json({ 
      message: "Super admin access required",
      userRole: user.role 
    });
  }

  next();
};