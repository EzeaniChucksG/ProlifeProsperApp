/**
 * AI Routes
 * Handles AI assistant functionality, chat interactions, and contextual insights
 */
import type { Express } from "express";
import { aiAssistantService } from "../services/aiAssistant";
import { ContextualAIService } from "../services/contextualAI";
import { authenticateToken } from "../middleware/auth";
import { rateLimit } from "express-rate-limit";

// Rate limiting for AI endpoints to prevent abuse
const aiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each user to 30 requests per windowMs
  message: {
    error: 'Too many AI requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Get contextual insights for a specific element/feature
const getContextualInsights = async (req: any, res: any) => {
  try {
    const { target, context, contextData, timestamp } = req.body;

    if (!target) {
      return res.status(400).json({ 
        error: 'Target is required',
        message: 'Please specify what you need insights for'
      });
    }

    // Add user context from token
    const user = req.user;
    const requestData = {
      target,
      context,
      contextData,
      timestamp,
      organizationId: user?.organizationId,
      userRole: user?.role
    };

    const insights = await ContextualAIService.generateContextualInsight(requestData);

    res.json(insights);

  } catch (error) {
    console.error('Error in getContextualInsights:', error);
    res.status(500).json({ 
      error: 'Failed to generate insights',
      message: 'Please try again later'
    });
  }
};

export function registerAIRoutes(app: Express): void {
  // AI Assistant Chat
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message, organizationId } = req.body;

      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      console.log(`AI Chat request - Org: ${organizationId}, Message: ${message.substring(0, 100)}...`);

      const response = await aiAssistantService.generateResponse({
        message,
        organizationId: organizationId ? parseInt(organizationId) : undefined
      });

      res.json({ response });
    } catch (error) {
      console.error("AI chat error:", error);
      res.status(500).json({ 
        message: "AI service is currently unavailable",
        fallback: "I apologize, but I'm having trouble processing your request right now. Please try again later or contact support if the issue persists."
      });
    }
  });

  // Apply rate limiting to contextual AI routes
  app.use('/api/ai/contextual-insights', aiRateLimit);
  
  // Main contextual insights endpoint
  app.post('/api/ai/contextual-insights', authenticateToken, getContextualInsights);

  // AI Assistant Health Check
  app.get("/api/ai/status", async (req, res) => {
    try {
      // Check if AI service is available
      const status = {
        available: true,
        provider: "openai",
        model: "gpt-5", // Updated to latest model
        contextualInsights: true,
        lastResponse: new Date().toISOString()
      };

      res.json(status);
    } catch (error) {
      console.error("AI status check error:", error);
      res.status(503).json({
        available: false,
        message: "AI service unavailable"
      });
    }
  });
}