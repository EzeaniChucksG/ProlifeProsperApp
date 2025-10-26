/**
 * Main Routes Registration
 * Coordinates all modular route files and handles core server setup
 */
import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { setupSocialAuth } from "./auth/social-auth";
import { aiAssistantService } from "./services/aiAssistant";

// Import all modular route registration functions
import { registerAuthRoutes } from "./routes/auth-routes";
import { registerOrganizationRoutes } from "./routes/organization-routes";
import { registerCampaignRoutes } from "./routes/campaign-routes";
import { registerDonationPageRoutes } from "./routes/donation-page-routes";
import { registerDonationRoutes } from "./routes/donation-routes";
import { registerDonationProductRoutes } from "./routes/donation-product-routes";
import { registerProductRoutes } from "./routes/product-routes";
import { registerEmailRoutes } from "./routes/email-routes";
import { registerEventRoutes } from "./routes/event-routes";
import { registerAnalyticsRoutes } from "./routes/analytics-routes";
import { registerMiscRoutes } from "./routes/misc-routes";
import { registerDebugRoutes } from "./routes/debug-routes";
import { registerVideoRoutes } from "./routes/video-routes";
import { registerAIRoutes } from "./routes/ai-routes";
import { registerHealthRoutes } from "./routes/health-routes";
import { registerGettrxRoutes } from "./routes/gettrx-routes";
import { registerGettrxPaymentRoutes } from "./routes/gettrx-payment-routes";
import { registerBTCPayRoutes } from "./routes/btcpay-routes";
import { registerReceiptRoutes } from "./routes/receipt-routes";
import { registerMerchantRoutes } from "./routes/merchant-routes";
import { registerMerchantStatementsRoutes } from "./routes/merchant-statements-routes";
import { registerDisputesRoutes } from "./routes/disputes-routes";
import { registerOnboardingRoutes } from "./routes/onboarding-routes";
import { registerDomainRoutes } from "./routes/domain-routes";
import { registerPaymentMethodsRoutes } from "./routes/payment-methods-routes";
import subscriptionRoutes from "./routes/subscription-routes";
import tippingRoutes from "./routes/tipping-routes";
import sponsorshipRoutes from "./routes/sponsorship-routes";
import intakeRoutes from "./routes/intake-routes";
import customFormsRoutes from "./routes/custom-forms-routes";
import { registerAssociationRoutes } from "./routes/association-routes";
import { registerFinancialStatementRoutes } from "./routes/financial-statement-routes";
import { registerSuperAdminRoutes } from "./routes/superadmin-routes";
import { registerTeamRoutes } from "./routes/team-routes";
import { registerDonorRoutes } from "./routes/donor-routes";
import { registerTerminalRoutes } from "./routes/terminal-routes";
import { announcementCanvasRoutes } from "./routes/announcement-canvas-routes";
import { registerDonorCommunicationRoutes } from "./routes/donor-communication-routes";
import tutorialRoutes from "./routes/tutorial-routes";
import userOrganizationRoutes from "./routes/user-organization-routes";

export async function registerRoutes(app: Express): Promise<Server> {
  console.log("🚀 Registering application routes...");

  // ======================
  // CORE MIDDLEWARE SETUP
  // ======================
  
  // Setup session middleware for social auth
  app.use(
    session({
      secret:
        process.env.SESSION_SECRET ||
        "your-session-secret-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false }, // Set to true in production with HTTPS
    }),
  );

  // Setup social authentication
  await setupSocialAuth(app);

  // ======================
  // REGISTER ALL ROUTE MODULES
  // ======================

  try {
    console.log("📝 Registering authentication routes...");
    registerAuthRoutes(app);

    console.log("🏢 Registering organization routes...");
    registerOrganizationRoutes(app);

    console.log("👥 Registering team management routes...");
    registerTeamRoutes(app);

    console.log("📢 Registering campaign routes...");
    registerCampaignRoutes(app);

    console.log("📄 Registering donation page routes...");
    registerDonationPageRoutes(app);

    console.log("💰 Registering donation routes...");
    registerDonationRoutes(app);

    console.log("🎁 Registering donation product routes...");
    registerDonationProductRoutes(app);

    console.log("📚 Registering product routes (sellable items)...");
    registerProductRoutes(app);

    console.log("📧 Registering email routes...");
    registerEmailRoutes(app);

    console.log("🎫 Registering event routes...");
    registerEventRoutes(app);

    console.log("📊 Registering analytics routes...");
    registerAnalyticsRoutes(app);

    console.log("🛠️ Registering miscellaneous routes...");
    registerMiscRoutes(app);

    console.log("🐛 Registering debug routes...");
    registerDebugRoutes(app);

    console.log("🎬 Registering video routes...");
    registerVideoRoutes(app);

    console.log("🤖 Registering AI routes...");
    registerAIRoutes(app);

    console.log("🏥 Registering health routes...");
    registerHealthRoutes(app);

    console.log("💳 Registering GETTRX routes...");
    registerGettrxRoutes(app);

    console.log("💸 Registering GETTRX payment routes...");
    registerGettrxPaymentRoutes(app);

    console.log("₿ Registering BTCPay Server cryptocurrency routes...");
    registerBTCPayRoutes(app);

    console.log("🧾 Registering receipt routes...");
    registerReceiptRoutes(app);

    console.log("🏪 Registering merchant routes...");
    registerMerchantRoutes(app);

    console.log("📊 Registering merchant statements routes...");
    registerMerchantStatementsRoutes(app);

    console.log("⚖️ Registering disputes/chargebacks routes...");
    registerDisputesRoutes(app);

    console.log("📋 Registering onboarding routes...");
    registerOnboardingRoutes(app);

    console.log("🌐 Registering domain management routes...");
    registerDomainRoutes(app);

    console.log("💳 Registering payment methods routes...");
    registerPaymentMethodsRoutes(app);

    console.log("💳 Registering subscription management routes...");
    app.use("/api/subscriptions", subscriptionRoutes);

    console.log("💡 Registering platform tipping routes...");
    app.use("/api", tippingRoutes);

    console.log("🎪 Registering sponsorship routes...");
    app.use("/api", sponsorshipRoutes);

    console.log("📋 Registering client intake routes...");
    app.use("/api", intakeRoutes);

    console.log("📝 Registering custom forms routes...");
    app.use("/api", customFormsRoutes);

    console.log("🏰 Registering association/diocese routes...");
    registerAssociationRoutes(app);

    console.log("💰 Registering financial statement routes...");
    registerFinancialStatementRoutes(app);

    console.log("👑 Registering superadmin routes...");
    registerSuperAdminRoutes(app);

    console.log("❤️ Registering donor portal routes...");
    registerDonorRoutes(app);

    console.log("💬 Registering donor communication routes...");
    registerDonorCommunicationRoutes(app);

    console.log("📱 Registering terminal mode routes...");
    registerTerminalRoutes(app);

    console.log("🎨 Registering announcement canvas routes...");
    app.use("/api/announcements", announcementCanvasRoutes);

    console.log("🎓 Registering tutorial/onboarding tour routes...");
    app.use("/api", tutorialRoutes);

    console.log("👥 Registering user organization routes...");
    app.use("/api", userOrganizationRoutes);

    console.log("✅ All routes registered successfully!");

  } catch (error) {
    console.error("❌ Error registering routes:", error);
    throw error;
  }


  // ======================
  // CREATE HTTP SERVER
  // ======================
  
  const server = createServer(app);
  console.log("🌐 HTTP server created successfully");

  return server;
}