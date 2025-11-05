import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import ws from 'ws';
import * as schema from '../shared/schema';
import { eq } from 'drizzle-orm';
import { registerGettrxPaymentRoutes } from './routes/gettrx-payment-routes';

neonConfig.webSocketConstructor = ws;

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Database setup
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());

// Helper: Generate JWT
function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}

// Helper: Verify JWT
function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

// Auth Middleware
function authMiddleware(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  
  if (!payload) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  req.userId = payload.userId;
  next();
}

// ======================
// AUTH ROUTES
// ======================

app.post('/api/auth/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [user] = await db.insert(schema.users).values({
      firstName: firstName || '',
      lastName: lastName || '',
      email,
      hashedPassword,
      role: 'donor',
    }).returning();

    const token = generateToken(user.id);

    res.json({ 
      user: { 
        id: user.id, 
        firstName: user.firstName, 
        lastName: user.lastName, 
        email: user.email 
      }, 
      token 
    });
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({ message: error.message || 'Registration failed' });
  }
});

app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });

    if (!user || !user.hashedPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.hashedPassword);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user.id);

    res.json({ 
      user: { 
        id: user.id, 
        firstName: user.firstName, 
        lastName: user.lastName, 
        email: user.email,
        role: user.role,
        organizationId: user.organizationId
      }, 
      token 
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message || 'Login failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });

    if (!user || !user.hashedPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.hashedPassword);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user.id);

    res.json({ 
      user: { 
        id: user.id, 
        firstName: user.firstName, 
        lastName: user.lastName, 
        email: user.email 
      }, 
      token 
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message || 'Login failed' });
  }
});

// ======================
// CAMPAIGN ROUTES
// ======================

app.get('/api/campaigns', async (req, res) => {
  try {
    const campaigns = await db.query.campaigns.findMany({
      where: eq(schema.campaigns.isActive, true),
      limit: 50,
    });
    res.json(campaigns);
  } catch (error: any) {
    console.error('Fetch campaigns error:', error);
    res.status(500).json({ message: 'Failed to fetch campaigns' });
  }
});

app.get('/api/campaigns/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const campaign = await db.query.campaigns.findFirst({
      where: eq(schema.campaigns.id, id),
    });

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    res.json(campaign);
  } catch (error: any) {
    console.error('Fetch campaign error:', error);
    res.status(500).json({ message: 'Failed to fetch campaign' });
  }
});

// ======================
// ORGANIZATION ROUTES
// ======================

app.get('/api/organizations', async (req, res) => {
  try {
    const organizations = await db.query.organizations.findMany({
      limit: 50,
    });
    res.json(organizations);
  } catch (error: any) {
    console.error('Fetch organizations error:', error);
    res.status(500).json({ message: 'Failed to fetch organizations' });
  }
});

app.get('/api/organizations/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const organization = await db.query.organizations.findFirst({
      where: eq(schema.organizations.id, id),
    });

    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    res.json(organization);
  } catch (error: any) {
    console.error('Fetch organization error:', error);
    res.status(500).json({ message: 'Failed to fetch organization' });
  }
});

// ======================
// DONATION ROUTES
// ======================

app.get('/api/donations', authMiddleware, async (req, res) => {
  try {
    const donations = await db.query.donations.findMany({
      where: eq(schema.donations.userId, req.userId),
      limit: 100,
      orderBy: (donations, { desc }) => [desc(donations.createdAt)],
    });
    res.json(donations);
  } catch (error: any) {
    console.error('Fetch donations error:', error);
    res.status(500).json({ message: 'Failed to fetch donations' });
  }
});

app.post('/api/donations', authMiddleware, async (req, res) => {
  try {
    const { amount, campaignId, organizationId, frequency, paymentMethod } = req.body;

    const [donation] = await db.insert(schema.donations).values({
      userId: req.userId,
      amount,
      campaignId: campaignId || null,
      organizationId,
      frequency,
      paymentMethod,
      status: 'completed',
    }).returning();

    res.json(donation);
  } catch (error: any) {
    console.error('Create donation error:', error);
    res.status(500).json({ message: 'Failed to create donation' });
  }
});

app.get('/api/donations/stats', authMiddleware, async (req, res) => {
  try {
    const donations = await db.query.donations.findMany({
      where: eq(schema.donations.userId, req.userId),
    });

    const totalAmount = donations.reduce((sum, d) => sum + parseFloat(d.amount), 0);
    const donationCount = donations.length;
    const campaignsSupported = new Set(donations.filter(d => d.campaignId).map(d => d.campaignId)).size;
    const livesSaved = Math.floor(totalAmount / 25);

    res.json({
      totalAmount,
      donationCount,
      campaignsSupported,
      livesSaved,
    });
  } catch (error: any) {
    console.error('Fetch donation stats error:', error);
    res.status(500).json({ message: 'Failed to fetch donation stats' });
  }
});

// ======================
// ADMIN ROUTES
// ======================

app.post('/api/auth/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });

    if (!user || !user.hashedPassword || user.role === 'donor') {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    const isValid = await bcrypt.compare(password, user.hashedPassword);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    const token = generateToken(user.id);

    res.json({ 
      user: { 
        id: user.id, 
        firstName: user.firstName, 
        lastName: user.lastName, 
        email: user.email 
      }, 
      token 
    });
  } catch (error: any) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Admin login failed' });
  }
});

// Register GETTRX payment routes
registerGettrxPaymentRoutes(app);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 ProLifeProsper Mobile Server running on http://0.0.0.0:${PORT}`);
  console.log(`📡 API Base: http://0.0.0.0:${PORT}/api`);
  console.log(`💚 Health Check: http://0.0.0.0:${PORT}/health\n`);
});
