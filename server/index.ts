import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { multiTenantRouter, enforceTierAccess } from "./middleware/multi-tenant";
import subscriptionCron from "./services/subscription-cron";
import recurringDonationsCron from "./services/recurring-donations-cron";

const app = express();

// CORS configuration - Allow mobile app and other Replit projects to access API
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      console.log('✅ CORS: No origin header (allowed)');
      return callback(null, true);
    }
    
    // List of allowed origins - regex patterns accept URLs with or without ports
    const allowedOrigins = [
      // Explicit mobile app origin
      'https://2902b991-7412-4aa9-abf7-1d3b5c85a5eb-00-31pnjsyfk507s.janeway.replit.dev',
      // Localhost
      'http://localhost:3000',
      'http://localhost:5000',
      'http://localhost:8081', // Expo dev server
      'http://127.0.0.1:5000',
      // Wildcard Replit URLs (with optional port)
      /^https?:\/\/.*\.replit\.dev(:\d+)?$/, // All Replit dev URLs
      /^https?:\/\/.*\.replit\.app(:\d+)?$/, // All Replit app URLs
      /^https?:\/\/.*\.replit\.com(:\d+)?$/, // All Replit URLs
    ];
    
    // Check if origin matches any allowed pattern
    const isAllowed = allowedOrigins.some(pattern => {
      if (typeof pattern === 'string') {
        return origin === pattern;
      }
      // It's a regex pattern
      return pattern.test(origin);
    });
    
    if (isAllowed) {
      console.log(`✅ CORS allowed: ${origin}`);
      callback(null, true);
    } else {
      console.log(`⚠️  CORS BLOCKED: ${origin}`);
      callback(null, false); // Block but don't error
    }
  },
  credentials: true, // Allow cookies and authorization headers
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // Cache preflight requests for 24 hours
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

app.use(cors(corsOptions));

// Configure security headers with GETTRX iframe support - global settings for non-donation pages
app.use((req, res, next) => {
  // Skip helmet for /give routes - they get their own configuration below
  if (req.path.startsWith('/give')) {
    return next();
  }
  
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'", 
          "'unsafe-inline'", // Required for Vite HMR
          "https://js-dev.gettrx.com", // GETTRX SDK in iframe
          "https://replit.com" // Replit dev banner
        ],
        connectSrc: [
          "'self'", 
          "https://api-dev.gettrx.com", // GETTRX API calls from iframe
        ],
        frameSrc: [
          "'self'", 
          "https://js-dev.gettrx.com", // GETTRX SDK iframes
          "https://js.gettrx.com", // Production GETTRX SDK iframes
          "https://*.gettrx.com", // Any GETTRX subdomain iframes
          "https://www.youtube.com", // YouTube video embedding
          "https://youtube.com", // YouTube video embedding
          "https://player.vimeo.com", // Vimeo video embedding
          "https://vimeo.com" // Vimeo video embedding
        ],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        fontSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false, // Keep disabled for compatibility
  })(req, res, next);
});

// Allow iframe embedding for donation pages - override headers before response
app.use('/give', (req, res, next) => {
  // Override res.setHeader to intercept and remove X-Frame-Options
  const originalSetHeader = res.setHeader.bind(res);
  res.setHeader = function(name: string, value: any) {
    // Block X-Frame-Options header for /give routes
    if (name.toLowerCase() === 'x-frame-options') {
      return res;
    }
    return originalSetHeader(name, value);
  };
  
  // Set embedding-friendly headers immediately
  const frameAncestors = [
    "'self'",
    "https://*.replit.app", 
    "https://*.replit.dev",
    "https://*.replit.com"
  ];
  
  // Allow embedding from any site in development (including localhost)
  if (app.get('env') === 'development') {
    frameAncestors.push("https:", "http:", "localhost:*", "127.0.0.1:*", "*");
  }
  
  // Set CSP that allows embedding
  originalSetHeader('Content-Security-Policy',
    `default-src 'self'; ` +
    `script-src 'self' 'unsafe-inline' https://js-dev.gettrx.com https://replit.com; ` +
    `connect-src 'self' https://api-dev.gettrx.com; ` +
    `frame-src 'self' https://js-dev.gettrx.com https://js.gettrx.com https://*.gettrx.com https://www.youtube.com https://youtube.com https://player.vimeo.com https://vimeo.com; ` +
    `style-src 'self' 'unsafe-inline'; ` +
    `img-src 'self' data: blob: https:; ` +
    `font-src 'self' data: https:; ` +
    `frame-ancestors ${frameAncestors.join(' ')}; ` +
    `base-uri 'self'; ` +
    `form-action 'self'; ` +
    `object-src 'none'`
  );
  
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Multi-tenant routing middleware
app.use(multiTenantRouter);
app.use(enforceTierAccess);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  const origin = req.get('origin') || req.get('referer') || 'direct';
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // Determine source
      let source = '🌐 web';
      if (origin.includes('replit.dev') && origin.includes(':5000')) {
        source = '🌐 web';
      } else if (origin.includes('replit.dev') || origin.includes('replit.app')) {
        source = '📱 mobile';
      }
      
      let logLine = `${source} ${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Use PORT from environment (Replit deployment) or default to 5000
  const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
  
  // Register routes and create server
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Bind to port - this serves both the API and the client
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
      
      // Start subscription renewal cron service (charges organizations for Pro-Life Prosper services)
      subscriptionCron.start();
      
      // Start recurring donations cron service (processes donor recurring donations)
      recurringDonationsCron.start();
    },
  );
})();
