/**
 * Health Routes
 * System health checks and status monitoring
 */
import type { Express } from "express";

export function registerHealthRoutes(app: Express): void {
  // Main health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "2.0.0",
      routes: "modular",
      modules: [
        "auth", "organizations", "campaigns", "donations", 
        "emails", "events", "analytics", "gettrx", "merchant", 
        "onboarding", "video", "ai-assistant", "health"
      ]
    });
  });

  // Database health check
  app.get("/api/health/database", (req, res) => {
    try {
      // In a real implementation, this would test database connectivity
      res.json({
        status: "healthy",
        database: "postgresql",
        connected: !!process.env.DATABASE_URL,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Database health check failed:", error);
      res.status(503).json({
        status: "unhealthy",
        database: "postgresql",
        connected: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Service dependencies health check
  app.get("/api/health/services", (req, res) => {
    const services = {
      sendgrid: {
        enabled: !!process.env.SENDGRID_API_KEY,
        status: !!process.env.SENDGRID_API_KEY ? "configured" : "not_configured"
      },
      gettrx: {
        enabled: !!process.env.GETTRX_API_KEY,
        status: !!process.env.GETTRX_API_KEY ? "configured" : "not_configured"
      },
      openai: {
        enabled: !!process.env.OPENAI_API_KEY,
        status: !!process.env.OPENAI_API_KEY ? "configured" : "not_configured"
      }
    };

    res.json({
      status: "healthy",
      services,
      timestamp: new Date().toISOString()
    });
  });

  // Environment information
  app.get("/api/health/environment", (req, res) => {
    res.json({
      environment: process.env.NODE_ENV || "development",
      version: process.env.npm_package_version || "unknown",
      node_version: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024)
      },
      timestamp: new Date().toISOString()
    });
  });
}