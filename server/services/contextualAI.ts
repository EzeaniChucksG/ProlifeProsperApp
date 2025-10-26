import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
let openai: OpenAI | null = null;

// Initialize OpenAI only if API key is available
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

interface ContextualInsightRequest {
  target: string;
  context?: string;
  contextData?: Record<string, any>;
  timestamp: string;
  organizationId?: number;
  userRole?: string;
}

interface AIInsightResponse {
  explanation: string;
  tips: string[];
  bestPractices: string[];
  relatedFeatures: string[];
  complexity: "beginner" | "intermediate" | "advanced";
  category: string;
}

export class ContextualAIService {
  private static readonly SYSTEM_PROMPT = `You are an expert nonprofit management consultant and software guide for Pro-Life Prosper, a comprehensive donation management platform. Your role is to provide contextual, helpful explanations and insights about nonprofit management features and best practices.

Platform Context:
- Pro-Life Prosper serves 500+ nonprofits and churches
- Multi-tenant platform with Catholic and Protestant church features
- Features include donation management, campaign tracking, volunteer management, analytics, and more
- Target users are nonprofit staff, church administrators, and pro-life organizations

Guidelines:
1. Provide clear, jargon-free explanations suitable for nonprofit staff
2. Include practical tips and best practices
3. Suggest related features that might be helpful
4. Consider the user's organization type and role when giving advice
5. Focus on impact and mission achievement
6. Be encouraging and supportive of their important work
7. Keep responses concise but comprehensive

Response Format:
Always respond with valid JSON in this exact format:
{
  "explanation": "Clear explanation of the feature/concept",
  "tips": ["Practical tip 1", "Practical tip 2", "Practical tip 3"],
  "bestPractices": ["Best practice 1", "Best practice 2"],
  "relatedFeatures": ["Feature 1", "Feature 2", "Feature 3"],
  "complexity": "beginner|intermediate|advanced",
  "category": "descriptive category name"
}`;

  static async generateContextualInsight(request: ContextualInsightRequest): Promise<AIInsightResponse> {
    try {
      // Check if OpenAI is available
      if (!openai) {
        console.warn("OpenAI API not configured, returning fallback response");
        return this.getFallbackResponse(request.target);
      }

      const userPrompt = this.buildUserPrompt(request);

      const response = await openai.chat.completions.create({
        model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: this.SYSTEM_PROMPT
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 1000
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      // Validate and clean the response
      return this.validateAndCleanResponse(result);

    } catch (error) {
      console.error("Error generating contextual insight:", error);
      
      // Return fallback response
      return this.getFallbackResponse(request.target);
    }
  }

  private static buildUserPrompt(request: ContextualInsightRequest): string {
    let prompt = `Provide contextual insights for: "${request.target}"`;

    if (request.context) {
      prompt += `\nPage/Section Context: ${request.context}`;
    }

    if (request.contextData) {
      // Include relevant context data without sensitive information
      const sanitizedData = this.sanitizeContextData(request.contextData);
      if (Object.keys(sanitizedData).length > 0) {
        prompt += `\nRelevant Data: ${JSON.stringify(sanitizedData)}`;
      }
    }

    if (request.userRole) {
      prompt += `\nUser Role: ${request.userRole}`;
    }

    prompt += `\n\nProvide helpful insights including explanation, practical tips, best practices, related features, complexity level, and category.`;

    return prompt;
  }

  private static sanitizeContextData(data: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    const allowedKeys = [
      'donationCount', 'campaignCount', 'volunteerCount', 'organizationType',
      'churchManagementEnabled', 'achPaymentsEnabled', 'currentStep',
      'completedSteps', 'merchantStatus', 'faithStream'
    ];

    for (const [key, value] of Object.entries(data)) {
      if (allowedKeys.includes(key) && value !== undefined && value !== null) {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private static validateAndCleanResponse(response: any): AIInsightResponse {
    // Ensure required fields exist with defaults
    const cleaned: AIInsightResponse = {
      explanation: response.explanation || "This feature helps you manage your nonprofit operations more effectively.",
      tips: Array.isArray(response.tips) ? response.tips.slice(0, 5) : [],
      bestPractices: Array.isArray(response.bestPractices) ? response.bestPractices.slice(0, 3) : [],
      relatedFeatures: Array.isArray(response.relatedFeatures) ? response.relatedFeatures.slice(0, 4) : [],
      complexity: ["beginner", "intermediate", "advanced"].includes(response.complexity) 
        ? response.complexity 
        : "beginner",
      category: response.category || "General"
    };

    return cleaned;
  }

  private static getFallbackResponse(target: string): AIInsightResponse {
    const fallbacks: Record<string, AIInsightResponse> = {
      "donation": {
        explanation: "Donations are the lifeblood of your nonprofit. This section helps you track, manage, and analyze all incoming contributions.",
        tips: ["Set up automated receipts", "Track donor preferences", "Monitor donation trends"],
        bestPractices: ["Thank donors within 24 hours", "Segment donors by giving level", "Provide clear impact statements"],
        relatedFeatures: ["Donor Management", "Campaigns", "Analytics"],
        complexity: "beginner",
        category: "Fundraising"
      },
      "campaign": {
        explanation: "Campaigns help you organize focused fundraising efforts for specific goals or projects.",
        tips: ["Set realistic but ambitious goals", "Use compelling storytelling", "Include progress updates"],
        bestPractices: ["Share impact stories", "Provide multiple giving options", "Send regular updates"],
        relatedFeatures: ["Donations", "Analytics", "Email Templates"],
        complexity: "intermediate",
        category: "Fundraising"
      },
      "analytics": {
        explanation: "Analytics provide insights into your fundraising performance and donor behavior.",
        tips: ["Review metrics weekly", "Look for trends over time", "Use data to improve strategies"],
        bestPractices: ["Focus on key metrics", "Share insights with your team", "Make data-driven decisions"],
        relatedFeatures: ["Donations", "Campaigns", "Donor Management"],
        complexity: "intermediate",
        category: "Reporting"
      }
    };

    // Find closest match or use default
    const targetLower = target.toLowerCase();
    for (const [key, fallback] of Object.entries(fallbacks)) {
      if (targetLower.includes(key)) {
        return fallback;
      }
    }

    // Default fallback
    return {
      explanation: "This feature helps you manage and optimize your nonprofit operations.",
      tips: ["Explore all available options", "Customize settings to fit your needs", "Check back regularly for updates"],
      bestPractices: ["Keep information up to date", "Train your team on new features", "Monitor performance regularly"],
      relatedFeatures: ["Dashboard", "Settings", "Help Center"],
      complexity: "beginner",
      category: "General"
    };
  }

  // Get insights for specific nonprofit features
  static async getFeatureInsights(feature: string, organizationData?: any): Promise<AIInsightResponse> {
    return this.generateContextualInsight({
      target: feature,
      context: "Feature overview",
      contextData: organizationData,
      timestamp: new Date().toISOString()
    });
  }

  // Get insights based on user action/page
  static async getPageInsights(page: string, actionContext?: string, userData?: any): Promise<AIInsightResponse> {
    return this.generateContextualInsight({
      target: `${page} page`,
      context: actionContext,
      contextData: userData,
      timestamp: new Date().toISOString()
    });
  }
}

export default ContextualAIService;