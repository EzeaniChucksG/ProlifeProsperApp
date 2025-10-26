import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { storage } from "../storage/index";

// Simple JWT-based authentication system
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export interface AuthUser {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  organizationId?: number | null;
  role: string;
  onboardingStep?: number | null;
  onboardingCompleted?: boolean | null;
}

export const authService = {
  async signIn(email: string, password: string): Promise<{ user: AuthUser; token: string } | null> {
    try {
      const user = await storage.getUserByEmail(email);
      if (!user || !user.hashedPassword) {
        return null;
      }

      const isValidPassword = await bcrypt.compare(password, user.hashedPassword);
      if (!isValidPassword) {
        return null;
      }

      const authUser: AuthUser = {
        id: String(user.id),
        email: user.email,
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        profileImageUrl: user.profileImageUrl || null,
        organizationId: user.organizationId || null,
        role: user.role || "admin",
        onboardingStep: user.onboardingStep || null,
        onboardingCompleted: user.onboardingCompleted || null,
      };

      const token = jwt.sign(authUser, JWT_SECRET, { expiresIn: "7d" });
      return { user: authUser, token };
    } catch (error) {
      console.error("SignIn error:", error);
      return null;
    }
  },

  async register(userData: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    organizationId?: number;
    onboardingStep?: number;
    onboardingCompleted?: boolean;
    role?: string;
  }): Promise<AuthUser | null> {
    try {
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        throw new Error("An account with this email already exists. Please try signing in instead.");
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);

      // Determine role and organization for admin/staff users
      const userRole = userData.role || "admin";
      let organizationId = userData.organizationId;

      // If user is admin or staff and no organization specified, assign to default admin org
      if ((userRole === "super_admin" || userRole === "staff_member") && !organizationId) {
        const defaultAdminOrg = await storage.getDefaultAdminOrganization();
        if (defaultAdminOrg) {
          organizationId = defaultAdminOrg.id;
        }
      }

      // Create user (ID will be auto-generated)
      const user = await storage.createUser({
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        hashedPassword,
        role: userRole,
        organizationId,
        onboardingStep: userData.onboardingStep || 1,
        onboardingCompleted: userData.onboardingCompleted || false,
      });

      return {
        id: String(user.id),
        email: user.email,
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        profileImageUrl: user.profileImageUrl || null,
        organizationId: user.organizationId || null,
        role: user.role || "admin",
        onboardingStep: user.onboardingStep || null,
        onboardingCompleted: user.onboardingCompleted || null,
      };
    } catch (error) {
      console.error("Registration error:", error);
      throw error; // Re-throw to preserve specific error messages
    }
  },

  async verifyToken(token: string): Promise<AuthUser | null> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
      return decoded;
    } catch (error) {
      console.error("Token verification failed:", error);
      return null;
    }
  },

  async getCurrentUser(authHeader?: string): Promise<AuthUser | null> {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("No valid auth header provided");
      return null;
    }

    const token = authHeader.substring(7);
    const tokenData = await this.verifyToken(token);
    
    if (!tokenData) {
      console.log("Token verification failed");
      return null;
    }

    // Fetch fresh user data from database to ensure we have the latest information
    const user = await storage.getUser(tokenData.id);
    if (!user || !user.isActive) {
      console.log("User not found or inactive:", { userId: tokenData.id, userExists: !!user, isActive: user?.isActive });
      return null;
    }

    return {
      id: String(user.id),
      email: user.email,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      profileImageUrl: user.profileImageUrl || null,
      organizationId: user.organizationId || null,
      role: user.role || "admin",
      onboardingStep: user.onboardingStep || null,
      onboardingCompleted: user.onboardingCompleted || null,
    };
  },

  async generateTokenForUser(user: any): Promise<string> {
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
      organizationId: user.organizationId,
      role: user.role || "admin",
    };

    return jwt.sign(authUser, JWT_SECRET, { expiresIn: "7d" });
  },

  // Additional helper methods for auth routes
  async verifyPassword(password: string, hashedPassword: string | null): Promise<boolean> {
    if (!hashedPassword) {
      return false;
    }
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      console.error("Password verification error:", error);
      return false;
    }
  },

  async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, 12);
    } catch (error) {
      console.error("Password hashing error:", error);
      throw new Error("Failed to hash password");
    }
  },

  async generateToken(user: any): Promise<string> {
    const authUser: AuthUser = {
      id: String(user.id),
      email: user.email,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      profileImageUrl: user.profileImageUrl || null,
      organizationId: user.organizationId || null,
      role: user.role || "admin",
      onboardingStep: user.onboardingStep || null,
      onboardingCompleted: user.onboardingCompleted || null,
    };

    return jwt.sign(authUser, JWT_SECRET, { expiresIn: "7d" });
  },
};