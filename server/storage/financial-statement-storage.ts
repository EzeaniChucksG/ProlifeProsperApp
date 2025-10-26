/**
 * Financial Statement Storage
 * Handles nonprofit financial statements, chart of accounts, journal entries, and audit reports
 */
import { eq, and, sql, desc, gte, lte, between } from "drizzle-orm";
import { db } from "../db";
import {
  chartOfAccounts,
  accountingPeriods,
  journalEntries,
  journalEntryLineItems,
  financialStatementTemplates,
  generatedFinancialStatements,
  donations,
  organizations,
  users,
  type SelectChartOfAccount,
  type InsertChartOfAccount,
  type SelectAccountingPeriod,
  type InsertAccountingPeriod,
  type SelectJournalEntry,
  type InsertJournalEntry,
  type SelectJournalEntryLineItem,
  type InsertJournalEntryLineItem,
  type SelectFinancialStatementTemplate,
  type InsertFinancialStatementTemplate,
  type SelectGeneratedFinancialStatement,
  type InsertGeneratedFinancialStatement,
  type JournalEntryWithLineItems,
  type AccountingPeriodWithStatements,
  type FinancialStatementData,
} from "@shared/schema";

export class FinancialStatementStorage {
  
  // ========================================
  // CHART OF ACCOUNTS METHODS
  // ========================================
  
  async getChartOfAccounts(organizationId: number): Promise<SelectChartOfAccount[]> {
    return await db
      .select()
      .from(chartOfAccounts)
      .where(and(
        eq(chartOfAccounts.organizationId, organizationId),
        eq(chartOfAccounts.isActive, true)
      ))
      .orderBy(chartOfAccounts.accountNumber);
  }

  async getChartOfAccount(id: number, organizationId: number): Promise<SelectChartOfAccount | undefined> {
    const results = await db
      .select()
      .from(chartOfAccounts)
      .where(and(
        eq(chartOfAccounts.id, id),
        eq(chartOfAccounts.organizationId, organizationId)
      ))
      .limit(1);
    return results[0];
  }

  async createChartOfAccount(account: InsertChartOfAccount): Promise<SelectChartOfAccount> {
    const results = await db
      .insert(chartOfAccounts)
      .values({
        ...account,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return results[0];
  }

  async updateChartOfAccount(id: number, organizationId: number, updates: Partial<InsertChartOfAccount>): Promise<SelectChartOfAccount | undefined> {
    const results = await db
      .update(chartOfAccounts)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(
        eq(chartOfAccounts.id, id),
        eq(chartOfAccounts.organizationId, organizationId)
      ))
      .returning();
    return results[0];
  }

  async deleteChartOfAccount(id: number, organizationId: number): Promise<void> {
    await db
      .update(chartOfAccounts)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(and(
        eq(chartOfAccounts.id, id),
        eq(chartOfAccounts.organizationId, organizationId)
      ));
  }

  async initializeDefaultChartOfAccounts(organizationId: number, organizationType: string): Promise<SelectChartOfAccount[]> {
    // Default nonprofit chart of accounts
    const defaultAccounts = [
      // Assets
      { accountNumber: "1000", accountName: "Cash - Operating", accountType: "asset", accountCategory: "cash", statementType: "position", statementSection: "current_assets", statementOrder: 1, normalBalance: "debit" },
      { accountNumber: "1010", accountName: "Cash - Restricted", accountType: "asset", accountCategory: "cash", statementType: "position", statementSection: "current_assets", statementOrder: 2, normalBalance: "debit", netAssetType: "temporarily_restricted" },
      { accountNumber: "1100", accountName: "Accounts Receivable", accountType: "asset", accountCategory: "receivables", statementType: "position", statementSection: "current_assets", statementOrder: 3, normalBalance: "debit" },
      { accountNumber: "1200", accountName: "Pledges Receivable", accountType: "asset", accountCategory: "receivables", statementType: "position", statementSection: "current_assets", statementOrder: 4, normalBalance: "debit" },
      { accountNumber: "1500", accountName: "Property and Equipment", accountType: "asset", accountCategory: "fixed_assets", statementType: "position", statementSection: "fixed_assets", statementOrder: 5, normalBalance: "debit" },
      
      // Liabilities
      { accountNumber: "2000", accountName: "Accounts Payable", accountType: "liability", accountCategory: "current_liabilities", statementType: "position", statementSection: "current_liabilities", statementOrder: 1, normalBalance: "credit" },
      { accountNumber: "2100", accountName: "Accrued Expenses", accountType: "liability", accountCategory: "current_liabilities", statementType: "position", statementSection: "current_liabilities", statementOrder: 2, normalBalance: "credit" },
      { accountNumber: "2500", accountName: "Long-term Debt", accountType: "liability", accountCategory: "long_term_liabilities", statementType: "position", statementSection: "long_term_liabilities", statementOrder: 3, normalBalance: "credit" },
      
      // Net Assets
      { accountNumber: "3000", accountName: "Net Assets Without Donor Restrictions", accountType: "net_asset", accountCategory: "unrestricted", statementType: "position", statementSection: "net_assets", statementOrder: 1, normalBalance: "credit", netAssetType: "unrestricted" },
      { accountNumber: "3100", accountName: "Net Assets With Donor Restrictions", accountType: "net_asset", accountCategory: "restricted", statementType: "position", statementSection: "net_assets", statementOrder: 2, normalBalance: "credit", netAssetType: "temporarily_restricted" },
      
      // Revenue
      { accountNumber: "4000", accountName: "Donation Revenue - Unrestricted", accountType: "revenue", accountCategory: "contributions", statementType: "activity", statementSection: "revenue", statementOrder: 1, normalBalance: "credit", netAssetType: "unrestricted" },
      { accountNumber: "4100", accountName: "Donation Revenue - Restricted", accountType: "revenue", accountCategory: "contributions", statementType: "activity", statementSection: "revenue", statementOrder: 2, normalBalance: "credit", netAssetType: "temporarily_restricted" },
      { accountNumber: "4200", accountName: "Grant Revenue", accountType: "revenue", accountCategory: "grants", statementType: "activity", statementSection: "revenue", statementOrder: 3, normalBalance: "credit" },
      { accountNumber: "4300", accountName: "Program Service Revenue", accountType: "revenue", accountCategory: "program_revenue", statementType: "activity", statementSection: "revenue", statementOrder: 4, normalBalance: "credit" },
      { accountNumber: "4400", accountName: "Investment Income", accountType: "revenue", accountCategory: "investment", statementType: "activity", statementSection: "revenue", statementOrder: 5, normalBalance: "credit" },
      
      // Expenses
      { accountNumber: "5000", accountName: "Program Expenses", accountType: "expense", accountCategory: "program", statementType: "activity", statementSection: "program_expenses", statementOrder: 1, normalBalance: "debit" },
      { accountNumber: "5100", accountName: "Salaries and Benefits", accountType: "expense", accountCategory: "personnel", statementType: "activity", statementSection: "program_expenses", statementOrder: 2, normalBalance: "debit" },
      { accountNumber: "6000", accountName: "Management and General", accountType: "expense", accountCategory: "administrative", statementType: "activity", statementSection: "admin_expenses", statementOrder: 1, normalBalance: "debit" },
      { accountNumber: "6100", accountName: "Fundraising Expenses", accountType: "expense", accountCategory: "fundraising", statementType: "activity", statementSection: "fundraising_expenses", statementOrder: 1, normalBalance: "debit" },
      { accountNumber: "6200", accountName: "Processing Fees", accountType: "expense", accountCategory: "fees", statementType: "activity", statementSection: "admin_expenses", statementOrder: 2, normalBalance: "debit" },
    ];

    const accountsToCreate = defaultAccounts.map(account => ({
      ...account,
      organizationId,
      description: `Default ${account.accountName} account`,
    }));

    const results = await db
      .insert(chartOfAccounts)
      .values(accountsToCreate)
      .returning();

    return results;
  }

  // ========================================
  // ACCOUNTING PERIODS METHODS
  // ========================================
  
  async getAccountingPeriods(organizationId: number, fiscalYear?: number, status?: string): Promise<SelectAccountingPeriod[]> {
    let query = db
      .select()
      .from(accountingPeriods)
      .where(eq(accountingPeriods.organizationId, organizationId));

    if (fiscalYear) {
      query = query.where(eq(accountingPeriods.fiscalYear, fiscalYear));
    }

    if (status) {
      query = query.where(eq(accountingPeriods.status, status));
    }

    return await query.orderBy(desc(accountingPeriods.startDate));
  }

  async getAccountingPeriod(id: number, organizationId: number): Promise<SelectAccountingPeriod | undefined> {
    const results = await db
      .select()
      .from(accountingPeriods)
      .where(and(
        eq(accountingPeriods.id, id),
        eq(accountingPeriods.organizationId, organizationId)
      ))
      .limit(1);
    return results[0];
  }

  async createAccountingPeriod(period: InsertAccountingPeriod): Promise<SelectAccountingPeriod> {
    const results = await db
      .insert(accountingPeriods)
      .values({
        ...period,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return results[0];
  }

  async updateAccountingPeriod(id: number, organizationId: number, updates: Partial<InsertAccountingPeriod>): Promise<SelectAccountingPeriod | undefined> {
    const results = await db
      .update(accountingPeriods)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(
        eq(accountingPeriods.id, id),
        eq(accountingPeriods.organizationId, organizationId)
      ))
      .returning();
    return results[0];
  }

  async closeAccountingPeriod(id: number, organizationId: number, userId: string): Promise<SelectAccountingPeriod | undefined> {
    const results = await db
      .update(accountingPeriods)
      .set({
        status: "closed",
        closedAt: new Date(),
        closedBy: userId,
        updatedAt: new Date(),
      })
      .where(and(
        eq(accountingPeriods.id, id),
        eq(accountingPeriods.organizationId, organizationId),
        eq(accountingPeriods.status, "open")
      ))
      .returning();
    return results[0];
  }

  async getCurrentAccountingPeriod(organizationId: number): Promise<SelectAccountingPeriod | undefined> {
    const currentDate = new Date();
    const results = await db
      .select()
      .from(accountingPeriods)
      .where(and(
        eq(accountingPeriods.organizationId, organizationId),
        eq(accountingPeriods.status, "open"),
        lte(accountingPeriods.startDate, currentDate),
        gte(accountingPeriods.endDate, currentDate)
      ))
      .limit(1);
    return results[0];
  }

  // ========================================
  // JOURNAL ENTRIES METHODS
  // ========================================
  
  async getJournalEntries(organizationId: number, periodId?: number, status?: string, sourceType?: string): Promise<JournalEntryWithLineItems[]> {
    let query = db
      .select({
        entry: journalEntries,
        lineItem: journalEntryLineItems,
        account: chartOfAccounts,
      })
      .from(journalEntries)
      .leftJoin(journalEntryLineItems, eq(journalEntries.id, journalEntryLineItems.journalEntryId))
      .leftJoin(chartOfAccounts, eq(journalEntryLineItems.chartOfAccountId, chartOfAccounts.id))
      .where(eq(journalEntries.organizationId, organizationId));

    if (periodId) {
      query = query.where(eq(journalEntries.accountingPeriodId, periodId));
    }

    if (status) {
      query = query.where(eq(journalEntries.status, status));
    }

    if (sourceType) {
      query = query.where(eq(journalEntries.sourceType, sourceType));
    }

    const results = await query.orderBy(desc(journalEntries.entryDate));

    // Group line items by journal entry
    const entriesMap = new Map<number, JournalEntryWithLineItems>();
    
    for (const row of results) {
      if (!entriesMap.has(row.entry.id)) {
        entriesMap.set(row.entry.id, {
          ...row.entry,
          lineItems: []
        });
      }
      
      if (row.lineItem && row.account) {
        entriesMap.get(row.entry.id)!.lineItems!.push({
          ...row.lineItem,
          account: row.account
        });
      }
    }

    return Array.from(entriesMap.values());
  }

  async getJournalEntry(id: number, organizationId: number): Promise<JournalEntryWithLineItems | undefined> {
    const results = await this.getJournalEntries(organizationId);
    return results.find(entry => entry.id === id);
  }

  async createJournalEntry(entry: InsertJournalEntry, lineItems: InsertJournalEntryLineItem[]): Promise<JournalEntryWithLineItems> {
    // Generate entry number
    const year = new Date(entry.entryDate).getFullYear();
    const entryCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(journalEntries)
      .where(and(
        eq(journalEntries.organizationId, entry.organizationId),
        sql`EXTRACT(YEAR FROM ${journalEntries.entryDate}) = ${year}`
      ));
    
    const entryNumber = `JE-${year}-${String(entryCount[0].count + 1).padStart(3, '0')}`;

    const createdEntry = await db.transaction(async (tx) => {
      // Create journal entry
      const [newEntry] = await tx
        .insert(journalEntries)
        .values({
          ...entry,
          entryNumber,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Create line items
      const lineItemsWithNumbers = lineItems.map((item, index) => ({
        ...item,
        journalEntryId: newEntry.id,
        lineNumber: index + 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const newLineItems = await tx
        .insert(journalEntryLineItems)
        .values(lineItemsWithNumbers)
        .returning();

      return {
        ...newEntry,
        lineItems: newLineItems
      };
    });

    return createdEntry;
  }

  async updateJournalEntry(id: number, organizationId: number, updates: Partial<InsertJournalEntry>): Promise<JournalEntryWithLineItems | undefined> {
    const results = await db
      .update(journalEntries)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(
        eq(journalEntries.id, id),
        eq(journalEntries.organizationId, organizationId),
        eq(journalEntries.status, "draft") // Only allow updates to draft entries
      ))
      .returning();

    if (results[0]) {
      return this.getJournalEntry(id, organizationId);
    }
    return undefined;
  }

  async postJournalEntry(id: number, organizationId: number, userId: string): Promise<JournalEntryWithLineItems | undefined> {
    const results = await db
      .update(journalEntries)
      .set({
        status: "posted",
        approvedBy: userId,
        approvedAt: new Date(),
        postedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(journalEntries.id, id),
        eq(journalEntries.organizationId, organizationId),
        eq(journalEntries.status, "draft")
      ))
      .returning();

    if (results[0]) {
      return this.getJournalEntry(id, organizationId);
    }
    return undefined;
  }

  async reverseJournalEntry(id: number, organizationId: number, userId: string, reason: string): Promise<JournalEntryWithLineItems> {
    const originalEntry = await this.getJournalEntry(id, organizationId);
    if (!originalEntry || originalEntry.status !== "posted") {
      throw new Error("Can only reverse posted journal entries");
    }

    // Create reversal entry with opposite debits/credits
    const reversalLineItems = originalEntry.lineItems!.map(item => ({
      organizationId,
      chartOfAccountId: item.chartOfAccountId,
      description: `Reversal: ${item.description}`,
      debitAmount: item.creditAmount, // Flip debit/credit
      creditAmount: item.debitAmount,
      departmentId: item.departmentId,
      campaignId: item.campaignId,
      netAssetType: item.netAssetType,
      memo: `Reversal of JE ${originalEntry.entryNumber}: ${reason}`,
    }));

    const reversalEntry = await this.createJournalEntry({
      organizationId,
      accountingPeriodId: originalEntry.accountingPeriodId,
      entryDate: new Date(),
      entryType: "adjusting",
      sourceType: "manual",
      sourceId: originalEntry.id.toString(),
      description: `Reversal of ${originalEntry.entryNumber}`,
      reference: originalEntry.entryNumber,
      memo: reason,
      totalDebitAmount: originalEntry.totalCreditAmount, // Flip amounts
      totalCreditAmount: originalEntry.totalDebitAmount,
      createdBy: userId,
    }, reversalLineItems);

    // Mark original entry as reversed
    await db
      .update(journalEntries)
      .set({
        isReversed: true,
        reversalEntryId: reversalEntry.id,
        updatedAt: new Date(),
      })
      .where(eq(journalEntries.id, id));

    return reversalEntry;
  }

  async autoPostDonationsToJournal(organizationId: number, userId: string, startDate?: string, endDate?: string, periodId?: number): Promise<{ entriesCreated: number; totalAmount: string; }> {
    // Get current accounting period if not specified
    let period: SelectAccountingPeriod | undefined;
    if (periodId) {
      period = await this.getAccountingPeriod(periodId, organizationId);
    } else {
      period = await this.getCurrentAccountingPeriod(organizationId);
    }

    if (!period) {
      throw new Error("No open accounting period found");
    }

    // Get donations to post
    let donationsQuery = db
      .select()
      .from(donations)
      .where(and(
        eq(donations.organizationId, organizationId),
        sql`${donations.id} NOT IN (
          SELECT CAST(source_id AS INTEGER) 
          FROM journal_entries 
          WHERE source_type = 'donation' 
          AND organization_id = ${organizationId}
          AND status = 'posted'
        )`
      ));

    if (startDate) {
      donationsQuery = donationsQuery.where(gte(donations.createdAt, new Date(startDate)));
    }
    if (endDate) {
      donationsQuery = donationsQuery.where(lte(donations.createdAt, new Date(endDate)));
    }

    const donationsToPost = await donationsQuery;

    // Get default accounts
    const accounts = await this.getChartOfAccounts(organizationId);
    const cashAccount = accounts.find(a => a.accountNumber === "1000");
    const donationRevenueAccount = accounts.find(a => a.accountNumber === "4000");
    const processingFeesAccount = accounts.find(a => a.accountNumber === "6200");

    if (!cashAccount || !donationRevenueAccount || !processingFeesAccount) {
      throw new Error("Required default accounts not found. Please initialize chart of accounts.");
    }

    let entriesCreated = 0;
    let totalAmount = 0;

    for (const donation of donationsToPost) {
      const donationAmount = parseFloat(donation.amount);
      const feeAmount = parseFloat(donation.feeAmount || "0");
      const netAmount = donationAmount - feeAmount;

      const lineItems: InsertJournalEntryLineItem[] = [
        // Debit Cash for net amount received
        {
          organizationId,
          chartOfAccountId: cashAccount.id,
          description: `Donation from ${donation.donorId ? 'Donor' : 'Anonymous'}`,
          debitAmount: netAmount.toFixed(2),
          creditAmount: "0",
          netAssetType: "unrestricted",
        },
        // Credit Donation Revenue for full donation amount
        {
          organizationId,
          chartOfAccountId: donationRevenueAccount.id,
          description: `Donation revenue`,
          debitAmount: "0",
          creditAmount: donationAmount.toFixed(2),
          netAssetType: "unrestricted",
        }
      ];

      // Add processing fee expense if applicable
      if (feeAmount > 0) {
        lineItems.push({
          organizationId,
          chartOfAccountId: processingFeesAccount.id,
          description: `Payment processing fees`,
          debitAmount: feeAmount.toFixed(2),
          creditAmount: "0",
          netAssetType: "unrestricted",
        });
      }

      // Create journal entry
      await this.createJournalEntry({
        organizationId,
        accountingPeriodId: period.id,
        entryDate: donation.createdAt || new Date(),
        entryType: "standard",
        sourceType: "donation",
        sourceId: donation.id.toString(),
        description: `Donation #${donation.id}`,
        reference: `Donation-${donation.id}`,
        totalDebitAmount: (netAmount + feeAmount).toFixed(2),
        totalCreditAmount: donationAmount.toFixed(2),
        createdBy: userId,
        status: "posted", // Auto-post donation entries
        approvedBy: userId,
        approvedAt: new Date(),
        postedAt: new Date(),
      }, lineItems);

      entriesCreated++;
      totalAmount += donationAmount;
    }

    return {
      entriesCreated,
      totalAmount: totalAmount.toFixed(2)
    };
  }

  // ========================================
  // FINANCIAL STATEMENT GENERATION METHODS
  // ========================================
  
  async generateStatementOfActivity(organizationId: number, periodId?: number, startDate?: string, endDate?: string): Promise<FinancialStatementData> {
    // Implementation for Statement of Activity generation
    // This would aggregate journal entries by account type and net asset classification
    
    const org = await db.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1);
    if (!org[0]) throw new Error("Organization not found");

    // Placeholder implementation - would need complex SQL queries to aggregate by account types
    return {
      statementType: 'activity',
      reportingPeriod: `Year Ended December 31, ${new Date().getFullYear()}`,
      organizationName: org[0].name,
      sections: {
        revenue: {
          title: "Revenue and Support",
          order: 1,
          lineItems: [],
          subtotal: 0
        },
        expenses: {
          title: "Expenses",
          order: 2,
          lineItems: [],
          subtotal: 0
        }
      },
      totals: {
        totalRevenue: 0,
        totalExpenses: 0,
        changeInNetAssets: 0
      }
    };
  }

  async generateStatementOfPosition(organizationId: number, asOfDate: string): Promise<FinancialStatementData> {
    // Implementation for Statement of Financial Position generation
    // This would calculate balances for all accounts as of the specified date
    
    const org = await db.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1);
    if (!org[0]) throw new Error("Organization not found");

    // Placeholder implementation - would need complex SQL queries to calculate account balances
    return {
      statementType: 'position',
      reportingPeriod: `As of ${asOfDate}`,
      organizationName: org[0].name,
      sections: {
        assets: {
          title: "Assets",
          order: 1,
          lineItems: [],
          subtotal: 0
        },
        liabilities: {
          title: "Liabilities",
          order: 2,
          lineItems: [],
          subtotal: 0
        },
        netAssets: {
          title: "Net Assets",
          order: 3,
          lineItems: [],
          subtotal: 0
        }
      },
      totals: {
        totalAssets: 0,
        totalLiabilities: 0,
        totalNetAssets: 0
      }
    };
  }

  async getTrialBalance(organizationId: number, asOfDate: string): Promise<{ accountName: string; accountNumber: string; debitBalance: number; creditBalance: number; }[]> {
    // Implementation for trial balance calculation
    // This would sum all posted journal entry line items by account
    return [];
  }

  // ========================================
  // FINANCIAL STATEMENT TEMPLATES & STORAGE
  // ========================================
  
  async getFinancialStatementTemplates(organizationId?: number, templateType?: string): Promise<SelectFinancialStatementTemplate[]> {
    let query = db.select().from(financialStatementTemplates);
    
    if (organizationId) {
      query = query.where(eq(financialStatementTemplates.organizationId, organizationId));
    }
    
    if (templateType) {
      query = query.where(eq(financialStatementTemplates.templateType, templateType));
    }

    return await query.orderBy(financialStatementTemplates.templateName);
  }

  async createFinancialStatementTemplate(template: InsertFinancialStatementTemplate): Promise<SelectFinancialStatementTemplate> {
    const results = await db
      .insert(financialStatementTemplates)
      .values({
        ...template,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return results[0];
  }

  async updateFinancialStatementTemplate(id: number, updates: Partial<InsertFinancialStatementTemplate>): Promise<SelectFinancialStatementTemplate | undefined> {
    const results = await db
      .update(financialStatementTemplates)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(financialStatementTemplates.id, id))
      .returning();
    return results[0];
  }

  // ========================================
  // GENERATED FINANCIAL STATEMENTS
  // ========================================
  
  async getGeneratedFinancialStatements(organizationId: number, statementType?: string, fiscalYear?: number): Promise<SelectGeneratedFinancialStatement[]> {
    let query = db
      .select()
      .from(generatedFinancialStatements)
      .where(eq(generatedFinancialStatements.organizationId, organizationId));

    if (statementType) {
      query = query.where(eq(generatedFinancialStatements.statementType, statementType));
    }

    return await query.orderBy(desc(generatedFinancialStatements.generatedAt));
  }

  async getGeneratedFinancialStatement(id: number, organizationId: number): Promise<SelectGeneratedFinancialStatement | undefined> {
    const results = await db
      .select()
      .from(generatedFinancialStatements)
      .where(and(
        eq(generatedFinancialStatements.id, id),
        eq(generatedFinancialStatements.organizationId, organizationId)
      ))
      .limit(1);
    return results[0];
  }

  async saveGeneratedFinancialStatement(statement: InsertGeneratedFinancialStatement): Promise<SelectGeneratedFinancialStatement> {
    const results = await db
      .insert(generatedFinancialStatements)
      .values({
        ...statement,
        generatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return results[0];
  }

  async deleteGeneratedFinancialStatement(id: number, organizationId: number): Promise<void> {
    await db
      .delete(generatedFinancialStatements)
      .where(and(
        eq(generatedFinancialStatements.id, id),
        eq(generatedFinancialStatements.organizationId, organizationId)
      ));
  }
}