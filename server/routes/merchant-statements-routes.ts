import { Router } from 'express';
import { db } from '../db';
import { merchantStatements, paymentAccounts, donations, organizations } from '../../shared/schema';
import { eq, and, sql, desc, inArray, gte, lte, like } from 'drizzle-orm';
import { authService } from '../auth/auth-service';
import { format, startOfMonth, endOfMonth } from 'date-fns';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const user = await authService.getCurrentUser(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { 
      dateRange, 
      mid, 
      bin, 
      agentCode, 
      search,
      page = '1',
      limit = '50'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    let conditions: any[] = [];

    if (user.role !== 'super_admin') {
      conditions.push(eq(merchantStatements.organizationId, user.organizationId!));
    }

    if (mid) {
      conditions.push(eq(merchantStatements.merchantAccountId, mid as string));
    }

    if (bin) {
      conditions.push(eq(merchantStatements.bin, bin as string));
    }

    if (agentCode) {
      conditions.push(eq(merchantStatements.agentCode, agentCode as string));
    }

    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      let startDate: Date;
      
      switch (dateRange) {
        case 'last_month':
          startDate = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1));
          break;
        case 'last_3_months':
          startDate = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 3));
          break;
        case 'last_6_months':
          startDate = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 6));
          break;
        case 'last_year':
          startDate = startOfMonth(new Date(now.getFullYear() - 1, now.getMonth()));
          break;
        default:
          startDate = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1));
      }
      
      conditions.push(gte(merchantStatements.statementPeriodStart, startDate));
    }

    if (search) {
      conditions.push(like(merchantStatements.dbaName, `%${search}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const statements = await db
      .select({
        id: merchantStatements.id,
        organizationId: merchantStatements.organizationId,
        merchantAccountId: merchantStatements.merchantAccountId,
        dbaName: merchantStatements.dbaName,
        bin: merchantStatements.bin,
        agentCode: merchantStatements.agentCode,
        statementMonth: merchantStatements.statementMonth,
        statementYear: merchantStatements.statementYear,
        statementPeriodStart: merchantStatements.statementPeriodStart,
        statementPeriodEnd: merchantStatements.statementPeriodEnd,
        salesCount: merchantStatements.salesCount,
        salesVolume: merchantStatements.salesVolume,
        creditsCount: merchantStatements.creditsCount,
        creditsVolume: merchantStatements.creditsVolume,
        netVolume: merchantStatements.netVolume,
        totalFees: merchantStatements.totalFees,
        netSettlement: merchantStatements.netSettlement,
        status: merchantStatements.status,
        pdfUrl: merchantStatements.pdfUrl,
        csvUrl: merchantStatements.csvUrl,
        createdAt: merchantStatements.createdAt,
      })
      .from(merchantStatements)
      .where(whereClause)
      .orderBy(desc(merchantStatements.statementPeriodStart))
      .limit(limitNum)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(merchantStatements)
      .where(whereClause);

    res.json({
      statements,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching merchant statements:', error);
    res.status(500).json({ error: 'Failed to fetch merchant statements' });
  }
});

router.get('/metadata', async (req, res) => {
  try {
    const user = await authService.getCurrentUser(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let conditions: any[] = [];
    
    if (user.role !== 'super_admin') {
      conditions.push(eq(merchantStatements.organizationId, user.organizationId!));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const mids = await db
      .selectDistinct({ value: merchantStatements.merchantAccountId })
      .from(merchantStatements)
      .where(whereClause);

    const agentCodes = await db
      .selectDistinct({ value: merchantStatements.agentCode })
      .from(merchantStatements)
      .where(and(whereClause, sql`${merchantStatements.agentCode} IS NOT NULL`));

    res.json({
      mids: mids.map(m => m.value).filter(Boolean),
      agentCodes: agentCodes.map(a => a.value).filter(Boolean),
    });
  } catch (error) {
    console.error('Error fetching merchant metadata:', error);
    res.status(500).json({ error: 'Failed to fetch merchant metadata' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const user = await authService.getCurrentUser(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const [statement] = await db
      .select()
      .from(merchantStatements)
      .where(eq(merchantStatements.id, parseInt(id)));

    if (!statement) {
      return res.status(404).json({ error: 'Statement not found' });
    }

    if (user.role !== 'super_admin' && statement.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(statement);
  } catch (error) {
    console.error('Error fetching statement:', error);
    res.status(500).json({ error: 'Failed to fetch statement' });
  }
});

router.post('/generate', async (req, res) => {
  try {
    const user = await authService.getCurrentUser(req.headers.authorization);
    if (!user || !user.organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { month, year } = req.body;

    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required' });
    }

    const periodStart = startOfMonth(new Date(year, month - 1));
    const periodEnd = endOfMonth(periodStart);

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, user.organizationId),
    });

    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const paymentAccount = await db.query.paymentAccounts.findFirst({
      where: and(
        eq(paymentAccounts.organizationId, user.organizationId),
        eq(paymentAccounts.isDefault, true)
      ),
    });

    if (!paymentAccount) {
      return res.status(404).json({ error: 'No payment account found' });
    }

    const sales = await db
      .select({
        count: sql<number>`count(*)`,
        volume: sql<number>`COALESCE(SUM(${donations.amount}), 0)`,
        fees: sql<number>`COALESCE(SUM(${donations.feeAmount}), 0)`,
      })
      .from(donations)
      .where(
        and(
          eq(donations.organizationId, user.organizationId),
          eq(donations.paymentAccountId, paymentAccount.id),
          eq(donations.status, 'completed'),
          gte(donations.createdAt, periodStart),
          lte(donations.createdAt, periodEnd)
        )
      );

    const credits = await db
      .select({
        count: sql<number>`count(*)`,
        volume: sql<number>`COALESCE(SUM(ABS(${donations.amount})), 0)`,
      })
      .from(donations)
      .where(
        and(
          eq(donations.organizationId, user.organizationId),
          eq(donations.paymentAccountId, paymentAccount.id),
          eq(donations.status, 'refunded'),
          gte(donations.createdAt, periodStart),
          lte(donations.createdAt, periodEnd)
        )
      );

    const salesCount = Number(sales[0]?.count || 0);
    const salesVolume = Number(sales[0]?.volume || 0);
    const totalFees = Number(sales[0]?.fees || 0);
    const creditsCount = Number(credits[0]?.count || 0);
    const creditsVolume = Number(credits[0]?.volume || 0);
    const netVolume = salesVolume - creditsVolume;
    const netSettlement = netVolume - totalFees;

    const statementMonth = format(periodStart, 'MMMM yyyy');

    const existingStatement = await db
      .select()
      .from(merchantStatements)
      .where(
        and(
          eq(merchantStatements.organizationId, user.organizationId),
          eq(merchantStatements.merchantAccountId, paymentAccount.merchantAccountId),
          eq(merchantStatements.statementMonth, statementMonth)
        )
      );

    let statement;

    if (existingStatement.length > 0) {
      [statement] = await db
        .update(merchantStatements)
        .set({
          salesCount,
          salesVolume: salesVolume.toString(),
          creditsCount,
          creditsVolume: creditsVolume.toString(),
          netVolume: netVolume.toString(),
          totalFees: totalFees.toString(),
          netSettlement: netSettlement.toString(),
          updatedAt: new Date(),
        })
        .where(eq(merchantStatements.id, existingStatement[0].id))
        .returning();
    } else {
      [statement] = await db
        .insert(merchantStatements)
        .values({
          organizationId: user.organizationId,
          paymentAccountId: paymentAccount.id,
          merchantAccountId: paymentAccount.merchantAccountId,
          dbaName: org.name,
          statementMonth,
          statementYear: year,
          statementPeriodStart: periodStart,
          statementPeriodEnd: periodEnd,
          salesCount,
          salesVolume: salesVolume.toString(),
          creditsCount,
          creditsVolume: creditsVolume.toString(),
          netVolume: netVolume.toString(),
          totalFees: totalFees.toString(),
          netSettlement: netSettlement.toString(),
          status: 'finalized',
        })
        .returning();
    }

    res.json({ success: true, statement });
  } catch (error) {
    console.error('Error generating merchant statement:', error);
    res.status(500).json({ error: 'Failed to generate merchant statement' });
  }
});

router.get('/:id/download', async (req, res) => {
  try {
    const user = await authService.getCurrentUser(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { format: downloadFormat = 'csv' } = req.query;

    const [statement] = await db
      .select()
      .from(merchantStatements)
      .where(eq(merchantStatements.id, parseInt(id)));

    if (!statement) {
      return res.status(404).json({ error: 'Statement not found' });
    }

    if (user.role !== 'super_admin' && statement.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (downloadFormat === 'csv') {
      const csvContent = `DBA Name,MID,Date,Sales,Sales Volume,Credits,Credits Volume\n${statement.dbaName},${statement.merchantAccountId},${statement.statementMonth},${statement.salesCount},${statement.salesVolume},${statement.creditsCount},${statement.creditsVolume}`;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="statement-${statement.merchantAccountId}-${statement.statementMonth}.csv"`);
      res.send(csvContent);
    } else {
      res.status(400).json({ error: 'Unsupported format' });
    }
  } catch (error) {
    console.error('Error downloading statement:', error);
    res.status(500).json({ error: 'Failed to download statement' });
  }
});

export function registerMerchantStatementsRoutes(app: any) {
  app.use('/api/merchant-statements', router);
  console.log('📊 Merchant statements routes registered');
}
