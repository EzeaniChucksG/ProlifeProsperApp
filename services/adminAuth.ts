import { storage } from './storage';

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId: number;
  organizationName: string;
}

export async function getAdminUser(): Promise<AdminUser | null> {
  try {
    const userData = await storage.getItem('admin_user');
    if (!userData) return null;
    return JSON.parse(userData) as AdminUser;
  } catch (error) {
    console.error('Error getting admin user:', error);
    return null;
  }
}

export async function getAdminOrganizationId(): Promise<number> {
  const adminUser = await getAdminUser();
  if (!adminUser || !adminUser.organizationId) {
    throw new Error('Admin user not logged in or organization ID missing');
  }
  return adminUser.organizationId;
}

export async function getAdminToken(): Promise<string | null> {
  try {
    return await storage.getItem('admin_token');
  } catch (error) {
    console.error('Error getting admin token:', error);
    return null;
  }
}
