// Local-only AI Assistant - NO external API calls for data security
// All responses are predefined and stored locally

interface ChatRequest {
  message: string;
  context?: string;
  pageType?: string;
  currentData?: any;
  organizationId?: number;
  previousMessages?: Array<{ text: string; isUser: boolean }>;
}

interface ChatResponse {
  message: string;
  emoji: string;
}

export class AIAssistantService {
  private responses: Record<string, Array<ChatResponse>> = {
    // Dashboard responses
    dashboard: [
      { message: "Welcome to your nonprofit dashboard! I can help you navigate through donation management, campaign tracking, and donor analytics. What would you like to explore?", emoji: "🏠" },
      { message: "I see you're on the main dashboard. This is your command center for managing all aspects of your organization. Need help finding a specific feature?", emoji: "📊" },
      { message: "Your dashboard shows key metrics and recent activity. Would you like help understanding any of these numbers or setting up new campaigns?", emoji: "📈" },
      { message: "Great to see you managing your nonprofit operations! I can assist with donations, campaigns, donor management, or platform navigation.", emoji: "✨" },
    ],
    
    // Payment responses
    payments: [
      { message: "Welcome to the Payout Hub! I can help you set up ACH payments, manage recipients, and understand the payment process. What do you need assistance with?", emoji: "💳" },
      { message: "Setting up payments is easy! You can add recipients, schedule one-time or recurring payments, and track everything securely. Need help with any specific step?", emoji: "🏦" },
      { message: "ACH payments are a secure way to transfer funds to vendors, staff, and contractors. I can guide you through recipient setup or payment scheduling.", emoji: "🔒" },
      { message: "I see you're working on payments! The system supports recurring schedules, department categorization, and comprehensive tracking. How can I help?", emoji: "⚡" },
    ],
    
    // Campaign responses
    campaigns: [
      { message: "Campaign management is exciting! I can help you create effective fundraising campaigns, set realistic goals, and track performance. What's your focus?", emoji: "🎯" },
      { message: "Great campaigns start with clear goals and compelling stories. I can guide you through campaign setup, donor targeting, and performance optimization.", emoji: "🚀" },
      { message: "Your fundraising campaigns are the heart of your mission! I can help with strategy, goal setting, or understanding campaign analytics.", emoji: "💝" },
      { message: "Building successful campaigns takes planning and creativity. I'm here to help with setup, optimization, or tracking progress toward your goals.", emoji: "🌟" },
    ],
    
    // Analytics responses
    analytics: [
      { message: "Analytics help you understand your impact! I can explain donation patterns, donor behavior, and campaign performance. What metrics interest you most?", emoji: "📊" },
      { message: "Data tells your success story! I can help interpret donation trends, donor retention rates, and campaign effectiveness. What would you like to explore?", emoji: "📈" },
      { message: "Understanding your analytics is key to growth! I can help you read donation patterns, identify opportunities, and optimize your strategy.", emoji: "🔍" },
      { message: "Your analytics show the real impact of your work! I can help you understand donor behavior, campaign success, and growth opportunities.", emoji: "💡" },
    ],
    
    // Donor responses
    donors: [
      { message: "Donor relationships are the foundation of your success! I can help with engagement strategies, communication best practices, and retention techniques.", emoji: "💝" },
      { message: "Building lasting donor relationships takes care and attention. I can guide you through donor segmentation, personalized communication, and appreciation strategies.", emoji: "🤝" },
      { message: "Your donors are your partners in mission! I can help you understand donor behavior, improve engagement, and build stronger relationships.", emoji: "👥" },
      { message: "Donor management is about building community! I can assist with communication strategies, segmentation, and creating meaningful connections.", emoji: "💖" },
    ],
    
    // Settings responses
    settings: [
      { message: "Platform settings help customize your experience! I can guide you through account setup, security configurations, and team management.", emoji: "⚙️" },
      { message: "Proper setup ensures smooth operations! I can help with security settings, integrations, team permissions, and platform customization.", emoji: "🛠️" },
      { message: "Getting your settings right is important! I can assist with account configuration, security features, and team management options.", emoji: "🔧" },
      { message: "Your platform settings control how everything works! I can help optimize security, manage team access, and configure features.", emoji: "✨" },
    ],
    
    // General help responses
    general: [
      { message: "I'm here to help with any questions about your nonprofit management platform! What would you like to know?", emoji: "🤖" },
      { message: "Managing a nonprofit involves many moving parts. I can help with donations, campaigns, analytics, or any platform features. What interests you?", emoji: "🌟" },
      { message: "Your mission is important, and I'm here to help you succeed! Ask me about any aspect of the platform or nonprofit management.", emoji: "💪" },
      { message: "Every question helps you grow your impact! I can assist with platform features, best practices, or strategic guidance. How can I help?", emoji: "🚀" },
    ]
  };

  private getRandomResponse(category: string): ChatResponse {
    const categoryResponses = this.responses[category] || this.responses.general;
    const randomIndex = Math.floor(Math.random() * categoryResponses.length);
    return categoryResponses[randomIndex];
  }

  private categorizeMessage(message: string, pageType?: string): string {
    const lowerMessage = message.toLowerCase();
    
    // Check for specific keywords first
    if (lowerMessage.includes('payment') || lowerMessage.includes('ach') || lowerMessage.includes('payout') || lowerMessage.includes('recipient')) {
      return 'payments';
    }
    if (lowerMessage.includes('campaign') || lowerMessage.includes('fundrais') || lowerMessage.includes('goal')) {
      return 'campaigns';
    }
    if (lowerMessage.includes('analytic') || lowerMessage.includes('report') || lowerMessage.includes('metric') || lowerMessage.includes('data')) {
      return 'analytics';
    }
    if (lowerMessage.includes('donor') || lowerMessage.includes('engagement') || lowerMessage.includes('retention')) {
      return 'donors';
    }
    if (lowerMessage.includes('setting') || lowerMessage.includes('config') || lowerMessage.includes('setup')) {
      return 'settings';
    }
    
    // Fall back to page type
    return pageType || 'general';
  }

  async generateResponse(request: ChatRequest): Promise<ChatResponse> {
    try {
      // Categorize the message to get appropriate response
      const category = this.categorizeMessage(request.message, request.pageType);
      
      // Get a random response from the category
      const response = this.getRandomResponse(category);
      
      // Add slight personalization based on context (without exposing sensitive data)
      if (request.context && request.context.includes('Dashboard')) {
        response.message = `${response.message} I see you're on your main dashboard - the perfect place to get an overview of everything!`;
      }
      
      return response;
    } catch (error) {
      console.error('AI Assistant error:', error);
      
      // Safe fallback response
      return {
        message: "I'm here to help you succeed with your nonprofit management! What would you like to know about the platform?",
        emoji: "🤖"
      };
    }
  }

  // Quick contextual suggestions based on page type
  getQuickSuggestions(pageType?: string): Array<{text: string; emoji: string}> {
    const suggestions: Record<string, Array<{text: string; emoji: string}>> = {
      payments: [
        { text: "How do I set up ACH payments?", emoji: "🏦" },
        { text: "Managing payment recipients", emoji: "👥" },
        { text: "Setting up recurring payments", emoji: "🔄" },
        { text: "Payment security best practices", emoji: "🔒" }
      ],
      campaigns: [
        { text: "Creating effective campaigns", emoji: "🚀" },
        { text: "Setting fundraising goals", emoji: "🎯" },
        { text: "Donor engagement strategies", emoji: "💝" },
        { text: "Campaign performance tips", emoji: "📈" }
      ],
      analytics: [
        { text: "Understanding donation trends", emoji: "📊" },
        { text: "Donor behavior insights", emoji: "🔍" },
        { text: "Campaign success metrics", emoji: "💰" },
        { text: "Growth opportunities", emoji: "📈" }
      ],
      donors: [
        { text: "Improving donor retention", emoji: "🤝" },
        { text: "Communication best practices", emoji: "📧" },
        { text: "Donor appreciation ideas", emoji: "🎉" },
        { text: "Building relationships", emoji: "💖" }
      ]
    };
    
    return suggestions[pageType || 'dashboard'] || [
      { text: "Getting started guide", emoji: "🚀" },
      { text: "Platform overview", emoji: "🏠" },
      { text: "Best practices tips", emoji: "💡" },
      { text: "Feature explanations", emoji: "✨" }
    ];
  }
}

export const aiAssistantService = new AIAssistantService();