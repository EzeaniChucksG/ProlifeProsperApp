/**
 * Middleware Index
 * Centralized export of all middleware functions
 */

// Authentication middleware
export { authenticateToken, authenticateTokenOptional } from './auth';

// Permission-based middleware
export { 
  requirePermission, 
  requireAnyPermission, 
  requireSuperAdmin,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions
} from './permissions';

// Role and permission definitions
export { 
  ROLES, 
  PERMISSIONS,
  getAllRoles,
  getRoleById,
  getPermissionsByCategory,
  isValidRole,
  canManageRole,
  type Role,
  type Permission
} from './roles';

// Organization access control middleware
export { 
  requireOrganizationAccess, 
  requireSameOrganization, 
  requirePlatformAccess,
  canAccessOrganization,
  getEffectiveOrganizationId,
  getOrganizationFilter
} from './access-control';