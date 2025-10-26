/**
 * Financial Statement Routes
 * Handles nonprofit financial statements, chart of accounts, journal entries, and audit reports
 */
import type { Express } from "express";
import { storage } from "../storage/index";
import { 
  insertChartOfAccountSchema, 
  insertAccountingPeriodSchema,
  insertJournalEntrySchema,
  insertJournalEntryLineItemSchema,
  insertFinancialStatementTemplateSchema,
  type FinancialStatementData 
} from "@shared/schema";
import { z } from "zod";
import { authenticateToken } from "../middleware";

export function registerFinancialStatementRoutes(app: Express): void {
  
  // ========================================
  // CHART OF ACCOUNTS ROUTES
  // ========================================
  
  // Get chart of accounts for organization
  app.get("/api/financial/chart-of-accounts", authenticateToken, async (req, res) => {
    try {
      const user = req.user;
      if (!user?.organizationId) {
        return res.status(401).json({ message: "Organization ID required" });
      }

      const accounts = await storage.getChartOfAccounts(user.organizationId);
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching chart of accounts:", error);
      res.status(500).json({ message: "Failed to fetch chart of accounts" });
    }
  });

  // Create new account
  app.post("/api/financial/chart-of-accounts", authenticateToken, async (req, res) => {
    try {
      const user = req.user;
      if (!user?.organizationId) {
        return res.status(401).json({ message: "Organization ID required" });
      }

      const validatedData = insertChartOfAccountSchema.parse({
        ...req.body,
        organizationId: user.organizationId
      });

      const account = await storage.createChartOfAccount(validatedData);
      res.status(201).json(account);
    } catch (error) {
      console.error("Error creating chart of account:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  // Update account
  app.put("/api/financial/chart-of-accounts/:id", authenticateToken, async (req, res) => {
    try {
      const user = req.user;
      if (!user?.organizationId) {
        return res.status(401).json({ message: "Organization ID required" });
      }

      const accountId = parseInt(req.params.id);
      const validatedData = insertChartOfAccountSchema.partial().parse(req.body);

      const account = await storage.updateChartOfAccount(accountId, user.organizationId, validatedData);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }

      res.json(account);
    } catch (error) {
      console.error("Error updating chart of account:", error);
      res.status(500).json({ message: "Failed to update account" });
    }
  });

  // ========================================
  // ACCOUNTING PERIODS ROUTES
  // ========================================
  
  // Get accounting periods for organization
  app.get("/api/financial/accounting-periods", authenticateToken, async (req, res) => {
    try {
      const user = req.user;
      if (!user?.organizationId) {
        return res.status(401).json({ message: "Organization ID required" });
      }

      const { fiscalYear, status } = req.query;
      
      const periods = await storage.getAccountingPeriods(
        user.organizationId,
        fiscalYear ? parseInt(fiscalYear as string) : undefined,
        status as string
      );
      
      res.json(periods);
    } catch (error) {
      console.error("Error fetching accounting periods:", error);
      res.status(500).json({ message: "Failed to fetch accounting periods" });
    }
  });

  // Create new accounting period
  app.post("/api/financial/accounting-periods", authenticateToken, async (req, res) => {
    try {
      const user = req.user;
      if (!user?.organizationId) {
        return res.status(401).json({ message: "Organization ID required" });
      }

      const validatedData = insertAccountingPeriodSchema.parse({
        ...req.body,
        organizationId: user.organizationId
      });

      const period = await storage.createAccountingPeriod(validatedData);
      res.status(201).json(period);
    } catch (error) {
      console.error("Error creating accounting period:", error);
      res.status(500).json({ message: "Failed to create accounting period" });
    }
  });

  // Close accounting period
  app.post("/api/financial/accounting-periods/:id/close", authenticateToken, async (req, res) => {
    try {
      const user = req.user;
      if (!user?.organizationId || !user?.id) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const periodId = parseInt(req.params.id);
      
      const period = await storage.closeAccountingPeriod(periodId, user.organizationId, user.id);
      if (!period) {
        return res.status(404).json({ message: "Accounting period not found" });
      }

      res.json(period);
    } catch (error) {
      console.error("Error closing accounting period:", error);
      res.status(500).json({ message: "Failed to close accounting period" });
    }
  });

  // ========================================
  // JOURNAL ENTRIES ROUTES
  // ========================================
  
  // Get journal entries for period
  app.get("/api/financial/journal-entries", authenticateToken, async (req, res) => {
    try {
      const user = req.user;
      if (!user?.organizationId) {
        return res.status(401).json({ message: "Organization ID required" });
      }

      const { periodId, status, sourceType } = req.query;
      
      const entries = await storage.getJournalEntries(
        user.organizationId,
        periodId ? parseInt(periodId as string) : undefined,
        status as string,
        sourceType as string
      );
      
      res.json(entries);
    } catch (error) {
      console.error("Error fetching journal entries:", error);
      res.status(500).json({ message: "Failed to fetch journal entries" });
    }
  });

  // Create new journal entry
  app.post("/api/financial/journal-entries", authenticateToken, async (req, res) => {
    try {
      const user = req.user;
      if (!user?.organizationId || !user?.id) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { lineItems, ...entryData } = req.body;

      // Validate journal entry
      const validatedEntry = insertJournalEntrySchema.parse({
        ...entryData,
        organizationId: user.organizationId,
        createdBy: user.id
      });

      // Validate line items
      const validatedLineItems = lineItems.map((item: any) => 
        insertJournalEntryLineItemSchema.parse({
          ...item,
          organizationId: user.organizationId
        })
      );

      // Verify debits equal credits
      const totalDebits = validatedLineItems.reduce((sum: number, item: any) => sum + parseFloat(item.debitAmount || 0), 0);
      const totalCredits = validatedLineItems.reduce((sum: number, item: any) => sum + parseFloat(item.creditAmount || 0), 0);

      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        return res.status(400).json({ 
          message: "Journal entry must balance - total debits must equal total credits",
          totalDebits,
          totalCredits
        });
      }

      const entry = await storage.createJournalEntry(validatedEntry, validatedLineItems);
      res.status(201).json(entry);
    } catch (error) {
      console.error("Error creating journal entry:", error);
      res.status(500).json({ message: "Failed to create journal entry" });
    }
  });

  // Post journal entry (mark as posted and immutable)
  app.post("/api/financial/journal-entries/:id/post", authenticateToken, async (req, res) => {
    try {
      const user = req.user;
      if (!user?.organizationId || !user?.id) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const entryId = parseInt(req.params.id);
      
      const entry = await storage.postJournalEntry(entryId, user.organizationId, user.id);
      if (!entry) {
        return res.status(404).json({ message: "Journal entry not found" });
      }

      res.json(entry);
    } catch (error) {
      console.error("Error posting journal entry:", error);
      res.status(500).json({ message: "Failed to post journal entry" });
    }
  });

  // ========================================
  // FINANCIAL STATEMENTS ROUTES
  // ========================================
  
  // Generate Statement of Activity
  app.get("/api/financial/statement-of-activity", authenticateToken, async (req, res) => {
    try {
      const user = req.user;
      if (!user?.organizationId) {
        return res.status(401).json({ message: "Organization ID required" });
      }

      const { periodId, startDate, endDate } = req.query;
      
      const statement = await storage.generateStatementOfActivity(
        user.organizationId,
        periodId ? parseInt(periodId as string) : undefined,
        startDate as string,
        endDate as string
      );
      
      res.json(statement);
    } catch (error) {
      console.error("Error generating Statement of Activity:", error);
      res.status(500).json({ message: "Failed to generate Statement of Activity" });
    }
  });

  // Generate Statement of Financial Position
  app.get("/api/financial/statement-of-position", authenticateToken, async (req, res) => {
    try {
      const user = req.user;
      if (!user?.organizationId) {
        return res.status(401).json({ message: "Organization ID required" });
      }

      const { asOfDate } = req.query;
      
      const statement = await storage.generateStatementOfPosition(
        user.organizationId,
        asOfDate as string || new Date().toISOString()
      );
      
      res.json(statement);
    } catch (error) {
      console.error("Error generating Statement of Financial Position:", error);
      res.status(500).json({ message: "Failed to generate Statement of Financial Position" });
    }
  });

  // Save generated financial statement
  app.post("/api/financial/statements", authenticateToken, async (req, res) => {
    try {
      const user = req.user;
      if (!user?.organizationId || !user?.id) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const validatedData = insertFinancialStatementTemplateSchema.parse({
        ...req.body,
        organizationId: user.organizationId,
        generatedBy: user.id
      });

      const statement = await storage.saveGeneratedFinancialStatement(validatedData);
      res.status(201).json(statement);
    } catch (error) {
      console.error("Error saving financial statement:", error);
      res.status(500).json({ message: "Failed to save financial statement" });
    }
  });

  // Get historical financial statements
  app.get("/api/financial/statements", authenticateToken, async (req, res) => {
    try {
      const user = req.user;
      if (!user?.organizationId) {
        return res.status(401).json({ message: "Organization ID required" });
      }

      const { statementType, fiscalYear } = req.query;
      
      const statements = await storage.getGeneratedFinancialStatements(
        user.organizationId,
        statementType as string,
        fiscalYear ? parseInt(fiscalYear as string) : undefined
      );
      
      res.json(statements);
    } catch (error) {
      console.error("Error fetching financial statements:", error);
      res.status(500).json({ message: "Failed to fetch financial statements" });
    }
  });

  // ========================================
  // INITIALIZATION & SETUP ROUTES
  // ========================================
  
  // Initialize default chart of accounts for new organization
  app.post("/api/financial/initialize-defaults", authenticateToken, async (req, res) => {
    try {
      const user = req.user;
      if (!user?.organizationId) {
        return res.status(401).json({ message: "Organization ID required" });
      }

      const { organizationType = "nonprofit" } = req.body;
      
      const accounts = await storage.initializeDefaultChartOfAccounts(user.organizationId, organizationType);
      res.json({ accounts, message: "Default chart of accounts initialized successfully" });
    } catch (error) {
      console.error("Error initializing default chart of accounts:", error);
      res.status(500).json({ message: "Failed to initialize default chart of accounts" });
    }
  });

  // Auto-post donations to journal entries
  app.post("/api/financial/auto-post-donations", authenticateToken, async (req, res) => {
    try {
      const user = req.user;
      if (!user?.organizationId || !user?.id) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { startDate, endDate, periodId } = req.body;
      
      const result = await storage.autoPostDonationsToJournal(
        user.organizationId,
        user.id,
        startDate,
        endDate,
        periodId
      );
      
      res.json(result);
    } catch (error) {
      console.error("Error auto-posting donations:", error);
      res.status(500).json({ message: "Failed to auto-post donations" });
    }
  });
}