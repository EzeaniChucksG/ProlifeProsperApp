/**
 * Client Intake & e-Consent Storage Module
 * Handles CRUD operations for client intake records with HIPAA compliance
 */
import { db } from "../db";
import { clientIntakeRecords } from "@shared/schema";
import type { ClientIntakeRecord, InsertClientIntakeRecord } from "@shared/schema";
import { eq, and, desc, ilike, or } from "drizzle-orm";

export class IntakeStorage {
  async getIntakeRecordsByOrganization(organizationId: number): Promise<ClientIntakeRecord[]> {
    return await db
      .select()
      .from(clientIntakeRecords)
      .where(eq(clientIntakeRecords.organizationId, organizationId))
      .orderBy(desc(clientIntakeRecords.submittedAt));
  }

  async getIntakeRecord(id: number): Promise<ClientIntakeRecord | undefined> {
    const result = await db
      .select()
      .from(clientIntakeRecords)
      .where(eq(clientIntakeRecords.id, id))
      .limit(1);
    
    return result[0];
  }

  async createIntakeRecord(record: InsertClientIntakeRecord): Promise<ClientIntakeRecord> {
    // Ensure sensitive data is handled securely
    const secureRecord = {
      ...record,
      ipAddress: this.maskIpAddress(record.ipAddress || ''),
      submittedAt: new Date()
    };

    const result = await db
      .insert(clientIntakeRecords)
      .values(secureRecord)
      .returning();
    
    return result[0];
  }

  async updateIntakeRecord(
    id: number, 
    updates: Partial<ClientIntakeRecord>
  ): Promise<ClientIntakeRecord> {
    const result = await db
      .update(clientIntakeRecords)
      .set(updates)
      .where(eq(clientIntakeRecords.id, id))
      .returning();
    
    return result[0];
  }

  async markIntakeRecordProcessed(
    id: number,
    processedBy: string
  ): Promise<ClientIntakeRecord> {
    return this.updateIntakeRecord(id, {
      status: 'processed',
      processedAt: new Date(),
      processedBy
    });
  }

  async getIntakeRecordsByStatus(
    organizationId: number, 
    status: string
  ): Promise<ClientIntakeRecord[]> {
    return await db
      .select()
      .from(clientIntakeRecords)
      .where(and(
        eq(clientIntakeRecords.organizationId, organizationId),
        eq(clientIntakeRecords.status, status)
      ))
      .orderBy(desc(clientIntakeRecords.submittedAt));
  }

  async searchIntakeRecords(
    organizationId: number,
    searchTerm: string
  ): Promise<ClientIntakeRecord[]> {
    // For HIPAA compliance, only search by non-sensitive fields
    // This is a simplified search - in production, implement proper encryption/tokenization
    return await db
      .select()
      .from(clientIntakeRecords)
      .where(and(
        eq(clientIntakeRecords.organizationId, organizationId),
        // Note: In production, implement encrypted search or use tokens
      ))
      .orderBy(desc(clientIntakeRecords.submittedAt))
      .limit(50);
  }

  async getIntakeStatistics(organizationId: number): Promise<{
    total: number;
    pending: number;
    processed: number;
    thisMonth: number;
  }> {
    const allRecords = await this.getIntakeRecordsByOrganization(organizationId);
    const now = new Date();
    const thisMonth = allRecords.filter(record => {
      if (!record.submittedAt) return false;
      const recordDate = new Date(record.submittedAt);
      return recordDate.getMonth() === now.getMonth() && 
             recordDate.getFullYear() === now.getFullYear();
    });

    return {
      total: allRecords.length,
      pending: allRecords.filter(r => r.status === 'pending').length,
      processed: allRecords.filter(r => r.status === 'processed').length,
      thisMonth: thisMonth.length
    };
  }

  private maskIpAddress(ip: string): string {
    // Mask IP address for privacy compliance
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.xxx.xxx`;
    }
    return 'masked';
  }
}