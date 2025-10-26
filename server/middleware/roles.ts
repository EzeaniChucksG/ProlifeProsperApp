/**
 * Role and Permission Definitions
 * Moved from server/permissions.ts for better organization
 */

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
  color: string;
  priority: number;
}

// Core Permissions
export const PERMISSIONS: Record<string, Permission> = {
  // Platform Management
  "platform.manage": {
    id: "platform.manage",
    name: "Manage Platform",
    description: "Full platform administration access",
    category: "platform",
  },
  "platform.view": {
    id: "platform.view",
    name: "View Platform Stats",
    description: "View platform-wide statistics",
    category: "platform",
  },

  // Organization Management
  "organizations.manage": {
    id: "organizations.manage",
    name: "Manage Organizations",
    description: "Create, edit, delete organizations",
    category: "organizations",
  },
  "organizations.view": {
    id: "organizations.view",
    name: "View Organizations",
    description: "View organization data",
    category: "organizations",
  },

  // User Management
  "users.manage": {
    id: "users.manage",
    name: "Manage Users",
    description: "Create, edit, delete users",
    category: "users",
  },
  "users.view": {
    id: "users.view",
    name: "View Users",
    description: "View user data",
    category: "users",
  },

  // Support & Tickets
  "support.manage": {
    id: "support.manage",
    name: "Manage Support",
    description: "Handle support tickets and messages",
    category: "support",
  },
  "support.view": {
    id: "support.view",
    name: "View Support",
    description: "View support tickets",
    category: "support",
  },

  // Financial & Donations
  "donations.manage": {
    id: "donations.manage",
    name: "Manage Donations",
    description: "Process and manage donations",
    category: "financial",
  },
  "donations.view": {
    id: "donations.view",
    name: "View Donations",
    description: "View donation data",
    category: "financial",
  },
  "financials.manage": {
    id: "financials.manage",
    name: "Manage Financials",
    description: "Access financial reports and analytics",
    category: "financial",
  },

  // Campaign Management
  "campaigns.manage": {
    id: "campaigns.manage",
    name: "Manage Campaigns",
    description: "Create and manage fundraising campaigns",
    category: "campaigns",
  },
  "campaigns.view": {
    id: "campaigns.view",
    name: "View Campaigns",
    description: "View campaign data",
    category: "campaigns",
  },

  // Analytics & Reports
  "analytics.view": {
    id: "analytics.view",
    name: "View Analytics",
    description: "Access analytics and reports",
    category: "analytics",
  },
  "analytics.export": {
    id: "analytics.export",
    name: "Export Analytics",
    description: "Export analytics data",
    category: "analytics",
  },
};

// Role Definitions
export const ROLES: Record<number, Role> = {
  1: {
    id: 1,
    name: "Super Admin",
    description: "Full platform access - Pro-Life Prosper team only",
    permissions: Object.keys(PERMISSIONS), // All permissions
    color: "#dc2626", // Red
    priority: 100,
  },
  2: {
    id: 2,
    name: "Platform Support",
    description: "Support team with limited admin access",
    permissions: [
      "platform.view",
      "organizations.view",
      "users.view",
      "support.manage",
      "support.view",
      "donations.view",
      "campaigns.view",
      "analytics.view",
    ],
    color: "#ea580c", // Orange
    priority: 90,
  },
  3: {
    id: 3,
    name: "Organization Admin",
    description: "Full access to their own organization",
    permissions: [
      "organizations.view",
      "users.manage",
      "users.view",
      "donations.manage",
      "donations.view",
      "campaigns.manage",
      "campaigns.view",
      "financials.manage",
      "analytics.view",
      "analytics.export",
    ],
    color: "#059669", // Green
    priority: 80,
  },
  4: {
    id: 4,
    name: "Campaign Manager",
    description: "Manage campaigns and view donations",
    permissions: [
      "campaigns.manage",
      "campaigns.view",
      "donations.view",
      "analytics.view",
    ],
    color: "#0284c7", // Blue
    priority: 70,
  },
  5: {
    id: 5,
    name: "Fundraiser",
    description: "Create and manage fundraising campaigns",
    permissions: [
      "campaigns.manage",
      "campaigns.view",
      "donations.view",
    ],
    color: "#7c3aed", // Purple
    priority: 60,
  },
  6: {
    id: 6,
    name: "Viewer",
    description: "Read-only access to organization data",
    permissions: [
      "organizations.view",
      "campaigns.view",
      "donations.view",
    ],
    color: "#6b7280", // Gray
    priority: 50,
  },
  7: {
    id: 7,
    name: "Agent",
    description: "Sales agent with limited organization access and lead management",
    permissions: [
      "organizations.view",
      "campaigns.view",
      "donations.view",
      "support.view",
      "analytics.view",
    ],
    color: "#3b82f6", // Blue
    priority: 40,
  },
  8: {
    id: 8,
    name: "Affiliate",
    description: "External affiliate partner with restricted visibility",
    permissions: [
      "organizations.view", // Limited to assigned organizations
      "campaigns.view",
      "analytics.view",
    ],
    color: "#8b5cf6", // Purple
    priority: 30,
  },
};

// Helper function to get all available roles
export function getAllRoles(): Role[] {
  return Object.values(ROLES);
}

// Helper function to get role by ID
export function getRoleById(roleId: number): Role | undefined {
  return ROLES[roleId];
}

// Helper function to get permissions by category
export function getPermissionsByCategory(category: string): Permission[] {
  return Object.values(PERMISSIONS).filter(p => p.category === category);
}

// Helper function to check if role exists
export function isValidRole(roleId: number): boolean {
  return roleId in ROLES;
}

// Role hierarchy checking
export function canManageRole(managerRoleId: number, targetRoleId: number): boolean {
  const managerRole = ROLES[managerRoleId];
  const targetRole = ROLES[targetRoleId];

  if (!managerRole || !targetRole) return false;

  // Super admin can manage everyone
  if (managerRoleId === 1) return true;

  // Can only manage roles with lower priority
  return managerRole.priority > targetRole.priority;
}