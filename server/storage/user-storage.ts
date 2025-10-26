/**
 * User Storage - Handles user-related database operations
 */
import {
  users,
  type User,
  type InsertUser,
} from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export class UserStorage {
  async getUser(id: string | number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, String(id)));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // Username doesn't exist in our schema, search by email instead
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    // Generate UUID for the user ID
    const userWithId = {
      id: randomUUID(),
      ...user,
    };
    const [newUser] = await db.insert(users).values([userWithId]).returning();
    return newUser;
  }

  async upsertUser(
    user: Partial<User> & { id: string; email: string; firstName: string },
  ): Promise<User> {
    // Check if user exists
    const existingUser = await this.getUser(user.id);
    
    if (existingUser) {
      // Update existing user
      const [updatedUser] = await db
        .update(users)
        .set({
          ...user,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id))
        .returning();
      return updatedUser;
    } else {
      // Create new user
      return await this.createUser({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName || '',
        profileImageUrl: user.profileImageUrl || null,
        organizationId: user.organizationId || null,
        role: user.role || 'user',
        onboardingStep: user.onboardingStep || 1,
        onboardingCompleted: user.onboardingCompleted || false,
      });
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateAllUsersOnboardingStep(
    organizationId: number,
    currentStep: number,
    isCompleted: boolean,
  ): Promise<void> {
    await db
      .update(users)
      .set({
        onboardingStep: currentStep,
        onboardingCompleted: isCompleted,
        updatedAt: new Date(),
      })
      .where(eq(users.organizationId, organizationId));
  }

  // Team Member Management Methods
  async getOrganizationMembers(organizationId: number): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.organizationId, organizationId));
  }

  async inviteTeamMember(memberData: {
    email: string;
    firstName: string;
    lastName?: string;
    role: string;
    organizationId: number;
    customPermissions?: any;
  }): Promise<User> {
    const userWithId = {
      id: randomUUID(),
      ...memberData,
      lastName: memberData.lastName || '',
      isActive: true,
    };
    const [newUser] = await db.insert(users).values([userWithId]).returning();
    return newUser;
  }

  async updateMemberRole(
    userId: string,
    organizationId: number,
    role: string,
    customPermissions?: any
  ): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({
        role,
        customPermissions,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async removeMember(userId: string, organizationId: number): Promise<void> {
    await db
      .update(users)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async reactivateMember(userId: string, organizationId: number): Promise<User> {
    const [reactivatedUser] = await db
      .update(users)
      .set({
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return reactivatedUser;
  }
}