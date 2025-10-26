import { db } from "../db";
import {
  bishopBlastMessages,
  bishopBlastRecipients, 
  bishopBlastLogs,
  associations,
  associationMembers,
  associationOrganizations,
  churchMembers,
  organizations,
  users,
  type BishopBlastMessage,
  type BishopBlastRecipient,
  type BishopBlastLog,
  type InsertBishopBlastMessage,
  type InsertBishopBlastRecipient,
  type InsertBishopBlastLog,
} from "@shared/schema";
import { eq, and, inArray, desc, sql, ne, gte, lte } from "drizzle-orm";

export class BishopBlastStorage {
  // ============================
  // BISHOP BLAST MESSAGES
  // ============================

  async createMessage(message: InsertBishopBlastMessage): Promise<BishopBlastMessage> {
    const [created] = await db
      .insert(bishopBlastMessages)
      .values({
        ...message,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return created;
  }

  async getMessagesByAssociation(associationId: number): Promise<BishopBlastMessage[]> {
    return db
      .select()
      .from(bishopBlastMessages)
      .where(eq(bishopBlastMessages.associationId, associationId))
      .orderBy(desc(bishopBlastMessages.createdAt));
  }

  async getMessageById(id: number): Promise<BishopBlastMessage | undefined> {
    const [message] = await db
      .select()
      .from(bishopBlastMessages)
      .where(eq(bishopBlastMessages.id, id))
      .limit(1);
    return message;
  }

  async updateMessage(id: number, updates: Partial<BishopBlastMessage>): Promise<BishopBlastMessage> {
    const [updated] = await db
      .update(bishopBlastMessages)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(bishopBlastMessages.id, id))
      .returning();
    return updated;
  }

  async deleteMessage(id: number): Promise<void> {
    await db
      .delete(bishopBlastMessages)
      .where(eq(bishopBlastMessages.id, id));
  }

  // ============================
  // BISHOP BLAST RECIPIENTS
  // ============================

  async createRecipients(recipients: InsertBishopBlastRecipient[]): Promise<BishopBlastRecipient[]> {
    if (recipients.length === 0) return [];
    
    return db
      .insert(bishopBlastRecipients)
      .values(recipients.map(r => ({
        ...r,
        createdAt: new Date(),
        updatedAt: new Date(),
      })))
      .returning();
  }

  async getRecipientsByMessage(messageId: number, limit = 100): Promise<BishopBlastRecipient[]> {
    return db
      .select()
      .from(bishopBlastRecipients)
      .where(eq(bishopBlastRecipients.messageId, messageId))
      .limit(limit)
      .orderBy(desc(bishopBlastRecipients.createdAt));
  }

  async getRecipientsByAssociation(associationId: number, limit = 100): Promise<BishopBlastRecipient[]> {
    return db
      .select()
      .from(bishopBlastRecipients)
      .where(eq(bishopBlastRecipients.associationId, associationId))
      .limit(limit)
      .orderBy(desc(bishopBlastRecipients.createdAt));
  }

  async updateRecipient(id: number, updates: Partial<BishopBlastRecipient>): Promise<BishopBlastRecipient> {
    const [updated] = await db
      .update(bishopBlastRecipients)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(bishopBlastRecipients.id, id))
      .returning();
    return updated;
  }

  async updateRecipientDeliveryStatus(
    recipientId: number, 
    channel: 'email' | 'sms', 
    status: string,
    metadata?: any
  ): Promise<BishopBlastRecipient> {
    const now = new Date();
    const updates: any = { updatedAt: now };

    if (channel === 'email') {
      updates.emailStatus = status;
      if (status === 'sent') updates.emailSentAt = now;
      if (status === 'delivered') updates.emailDeliveredAt = now;
      if (status === 'opened') updates.emailOpenedAt = now;
      if (status === 'clicked') updates.emailClickedAt = now;
      if (metadata?.messageId) updates.emailMessageId = metadata.messageId;
      if (metadata?.error) updates.emailError = metadata.error;
    } else {
      updates.smsStatus = status;
      if (status === 'sent') updates.smsSentAt = now;
      if (status === 'delivered') updates.smsDeliveredAt = now;
      if (metadata?.messageId) updates.smsMessageId = metadata.messageId;
      if (metadata?.error) updates.smsError = metadata.error;
    }

    const [updated] = await db
      .update(bishopBlastRecipients)
      .set(updates)
      .where(eq(bishopBlastRecipients.id, recipientId))
      .returning();
    return updated;
  }

  // ============================
  // BISHOP BLAST LOGS
  // ============================

  async createLog(log: InsertBishopBlastLog): Promise<BishopBlastLog> {
    const [created] = await db
      .insert(bishopBlastLogs)
      .values({
        ...log,
        timestamp: new Date(),
        createdAt: new Date(),
      })
      .returning();
    return created;
  }

  async getLogsByAssociation(associationId: number, limit = 100): Promise<BishopBlastLog[]> {
    return db
      .select()
      .from(bishopBlastLogs)
      .where(eq(bishopBlastLogs.associationId, associationId))
      .orderBy(desc(bishopBlastLogs.timestamp))
      .limit(limit);
  }

  async getLogsByMessage(messageId: number, limit = 100): Promise<BishopBlastLog[]> {
    return db
      .select()
      .from(bishopBlastLogs)
      .where(eq(bishopBlastLogs.messageId, messageId))
      .orderBy(desc(bishopBlastLogs.timestamp))
      .limit(limit);
  }

  // ============================
  // DIOCESE-WIDE RECIPIENT GATHERING
  // ============================

  /**
   * Get all potential recipients within a diocese (association)
   * This includes pastors and parishioners from all member parishes
   */
  async getAssociationRecipients(
    associationId: number,
    recipientType: string = 'all_parishioners'
  ): Promise<Array<{
    recipientId: number;
    recipientName: string;
    recipientEmail: string;
    recipientPhone: string | null;
    recipientType: string;
    parishId: number;
    parishName: string;
  }>> {
    // First, get all organizations (parishes) in this association
    const associationOrgs = await db
      .select({
        organizationId: associationOrganizations.organizationId,
        orgName: organizations.name,
      })
      .from(associationOrganizations)
      .leftJoin(organizations, eq(associationOrganizations.organizationId, organizations.id))
      .where(
        and(
          eq(associationOrganizations.associationId, associationId),
          eq(associationOrganizations.membershipStatus, 'active')
        )
      );

    if (associationOrgs.length === 0) return [];

    const orgIds = associationOrgs.map(org => org.organizationId);
    
    // Build where conditions array to preserve all filters
    const whereConditions = [
      inArray(churchMembers.organizationId, orgIds),
      eq(churchMembers.isActive, true),
      ne(churchMembers.email, '') // Must have email
    ];

    // Add recipient type filtering to conditions array
    if (recipientType === 'pastors_only') {
      whereConditions.push(eq(churchMembers.membershipType, 'pastor'));
    }
    // For 'all_parishioners', no additional filtering needed

    // Now get church members from all these organizations with combined conditions
    const query = db
      .select({
        recipientId: churchMembers.id,
        recipientName: sql<string>`COALESCE(${churchMembers.firstName} || ' ' || ${churchMembers.lastName}, ${churchMembers.email})`,
        recipientEmail: churchMembers.email,
        recipientPhone: churchMembers.phone,
        recipientType: churchMembers.membershipType,
        parishId: churchMembers.organizationId,
        parishName: organizations.name,
      })
      .from(churchMembers)
      .leftJoin(organizations, eq(churchMembers.organizationId, organizations.id))
      .where(and(...whereConditions));

    return query;
  }

  // ============================
  // ANALYTICS AND REPORTING
  // ============================

  async getAssociationMessageStats(associationId: number): Promise<{
    totalMessages: number;
    totalRecipients: number;
    messagesSent: number;
    emailDeliveryRate: number;
    smsDeliveryRate: number;
    openRate: number;
    clickRate: number;
  }> {
    // Get message counts
    const [messageStats] = await db
      .select({
        totalMessages: sql<number>`COUNT(*)`,
        messagesSent: sql<number>`COUNT(*) FILTER (WHERE status = 'sent')`,
      })
      .from(bishopBlastMessages)
      .where(eq(bishopBlastMessages.associationId, associationId));

    // Get recipient stats
    const [recipientStats] = await db
      .select({
        totalRecipients: sql<number>`COUNT(*)`,
        emailDelivered: sql<number>`COUNT(*) FILTER (WHERE email_status = 'delivered')`,
        emailSent: sql<number>`COUNT(*) FILTER (WHERE email_status IN ('sent', 'delivered', 'opened', 'clicked'))`,
        smsDelivered: sql<number>`COUNT(*) FILTER (WHERE sms_status = 'delivered')`,
        smsSent: sql<number>`COUNT(*) FILTER (WHERE sms_status IN ('sent', 'delivered'))`,
        emailOpened: sql<number>`COUNT(*) FILTER (WHERE email_status IN ('opened', 'clicked'))`,
        emailClicked: sql<number>`COUNT(*) FILTER (WHERE email_status = 'clicked')`,
      })
      .from(bishopBlastRecipients)
      .where(eq(bishopBlastRecipients.associationId, associationId));

    return {
      totalMessages: messageStats.totalMessages || 0,
      totalRecipients: recipientStats.totalRecipients || 0,
      messagesSent: messageStats.messagesSent || 0,
      emailDeliveryRate: recipientStats.emailSent > 0 ? 
        (recipientStats.emailDelivered / recipientStats.emailSent) * 100 : 0,
      smsDeliveryRate: recipientStats.smsSent > 0 ? 
        (recipientStats.smsDelivered / recipientStats.smsSent) * 100 : 0,
      openRate: recipientStats.emailDelivered > 0 ? 
        (recipientStats.emailOpened / recipientStats.emailDelivered) * 100 : 0,
      clickRate: recipientStats.emailOpened > 0 ? 
        (recipientStats.emailClicked / recipientStats.emailOpened) * 100 : 0,
    };
  }

  async getRecentActivity(associationId: number, days = 30): Promise<BishopBlastLog[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return db
      .select()
      .from(bishopBlastLogs)
      .where(
        and(
          eq(bishopBlastLogs.associationId, associationId),
          gte(bishopBlastLogs.timestamp, since)
        )
      )
      .orderBy(desc(bishopBlastLogs.timestamp))
      .limit(50);
  }

  // ============================
  // PERMISSION AND VALIDATION
  // ============================

  /**
   * Verify that a user has permission to send bishop blasts for an association
   * Checks both association ownership and membership with appropriate roles
   */
  async verifyBishopPermission(userId: string, associationId: number): Promise<boolean> {
    // First check if association exists
    const [association] = await db
      .select({ ownerUserId: associations.ownerUserId })
      .from(associations)
      .where(eq(associations.id, associationId))
      .limit(1);

    if (!association) return false;

    // Check if user is the association owner (primary bishop)
    if (association.ownerUserId === userId) return true;

    // Check if user is a member of the association with bishop/admin privileges
    const [membership] = await db
      .select({ 
        role: associationMembers.role,
        status: associationMembers.status 
      })
      .from(associationMembers)
      .where(
        and(
          eq(associationMembers.associationId, associationId),
          eq(associationMembers.userId, userId),
          eq(associationMembers.status, 'active')
        )
      )
      .limit(1);

    if (!membership) return false;

    // Allow bishop, auxiliary_bishop, admin, and communications roles to send blasts
    const authorizedRoles = ['bishop', 'auxiliary_bishop', 'admin', 'communications_director'];
    return authorizedRoles.includes(membership.role);
  }

  /**
   * Get associations that a user has bishop blast permissions for
   */
  async getUserAssociations(userId: string): Promise<Array<{
    id: number;
    name: string;
    slug: string;
    type: string;
  }>> {
    return db
      .select({
        id: associations.id,
        name: associations.name,
        slug: associations.slug,
        type: associations.type,
      })
      .from(associations)
      .where(
        and(
          eq(associations.ownerUserId, userId),
          eq(associations.isActive, true)
        )
      )
      .orderBy(associations.name);
  }
}

export const bishopBlastStorage = new BishopBlastStorage();