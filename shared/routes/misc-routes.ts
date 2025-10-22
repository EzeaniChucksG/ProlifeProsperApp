/**
 * Miscellaneous Routes
 * Handles news feeds, content, kiosk management, and other utility routes
 */
import type { Express } from "express";
import { storage } from "../storage/index";
import { authenticateToken } from "../middleware";
import Parser from "rss-parser";

// Initialize RSS parser
const parser = new Parser({
  customFields: {
    item: ["category", "media:content", "media:thumbnail"],
  },
});

// Real RSS feed sources
const RSS_FEEDS = {
  lifenews: "https://www.lifenews.com/feed/",
  liveaction: "https://www.liveaction.org/feed/",
  studentsforlife: "https://studentsforlife.org/feed/",
  dailywire: "https://www.dailywire.com/feeds/rss.xml",
  thehill: "https://thehill.com/feed/",
};

export function registerMiscRoutes(app: Express): void {
  // Demo setup for organizations
  app.post("/api/demo/setup/:orgId", async (req, res) => {
    try {
      const orgId = parseInt(req.params.orgId);

      // Mock demo setup - in reality this would create sample data
      res.json({
        success: true,
        message: "Demo data created successfully",
        organizationId: orgId,
        samplesCreated: {
          campaigns: 3,
          donations: 25,
          donors: 15,
          events: 2
        }
      });
    } catch (error) {
      console.error("Error setting up demo:", error);
      res.status(500).json({ message: "Failed to setup demo data" });
    }
  });

  // Text-to-Give Management
  app.get("/api/organizations/:orgId/text-to-give/campaigns", authenticateToken, async (req, res) => {
    try {
      const orgId = parseInt(req.params.orgId);

      // Mock text-to-give campaigns
      const campaigns = [
        {
          id: 1,
          keyword: "DONATE",
          amount: 50,
          organizationId: orgId,
          isActive: true,
          donationCount: 85,
          totalRaised: "4250.00"
        },
        {
          id: 2,
          keyword: "HELP",
          amount: 25,
          organizationId: orgId,
          isActive: true,
          donationCount: 42,
          totalRaised: "1050.00"
        }
      ];

      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching text-to-give campaigns:", error);
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  app.post("/api/organizations/:orgId/text-to-give/campaigns", authenticateToken, async (req, res) => {
    try {
      const orgId = parseInt(req.params.orgId);
      const campaignData = req.body;

      // Mock campaign creation
      const newCampaign = {
        id: Date.now(),
        organizationId: orgId,
        ...campaignData,
        donationCount: 0,
        totalRaised: "0.00",
        createdAt: new Date()
      };

      res.status(201).json(newCampaign);
    } catch (error) {
      console.error("Error creating text-to-give campaign:", error);
      res.status(500).json({ message: "Failed to create campaign" });
    }
  });

  app.get("/api/organizations/:orgId/text-to-give/donations", authenticateToken, async (req, res) => {
    try {
      const orgId = parseInt(req.params.orgId);

      // Mock text-to-give donations
      const donations = [
        {
          id: 1,
          keyword: "DONATE",
          amount: "50.00",
          phoneNumber: "+1234567890",
          donorName: "Anonymous",
          createdAt: new Date()
        }
      ];

      res.json(donations);
    } catch (error) {
      console.error("Error fetching text-to-give donations:", error);
      res.status(500).json({ message: "Failed to fetch donations" });
    }
  });

  app.get("/api/organizations/:orgId/text-to-give/settings", authenticateToken, async (req, res) => {
    try {
      const orgId = parseInt(req.params.orgId);

      // Mock settings
      const settings = {
        enabled: true,
        phoneNumber: "+15551234567",
        defaultMessage: "Thank you for your donation!",
        provider: "twilio",
        autoReply: true
      };

      res.json(settings);
    } catch (error) {
      console.error("Error fetching text-to-give settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.patch("/api/organizations/:orgId/text-to-give/settings", authenticateToken, async (req, res) => {
    try {
      const orgId = parseInt(req.params.orgId);
      const updates = req.body;

      // Mock settings update
      res.json({
        success: true,
        message: "Settings updated successfully",
        settings: updates
      });
    } catch (error) {
      console.error("Error updating text-to-give settings:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // Kiosk Management
  app.get("/api/organizations/:orgId/kiosk/stations", async (req, res) => {
    try {
      const orgId = parseInt(req.params.orgId);

      // Mock kiosk stations
      const stations = [
        {
          id: 1,
          name: "Main Lobby Station",
          location: "Main Lobby",
          organizationId: orgId,
          status: "online",
          lastHeartbeat: new Date(),
          totalDonations: 145,
          totalVolume: "14500.00"
        },
        {
          id: 2,
          name: "Chapel Station",
          location: "Chapel",
          organizationId: orgId,
          status: "offline",
          lastHeartbeat: new Date(Date.now() - 3600000), // 1 hour ago
          totalDonations: 67,
          totalVolume: "6700.00"
        }
      ];

      res.json(stations);
    } catch (error) {
      console.error("Error fetching kiosk stations:", error);
      res.status(500).json({ message: "Failed to fetch kiosk stations" });
    }
  });

  app.post("/api/organizations/:orgId/kiosk/stations", async (req, res) => {
    try {
      const orgId = parseInt(req.params.orgId);
      const stationData = req.body;

      // Mock station creation
      const newStation = {
        id: Date.now(),
        organizationId: orgId,
        ...stationData,
        status: "offline",
        totalDonations: 0,
        totalVolume: "0.00",
        createdAt: new Date()
      };

      res.status(201).json(newStation);
    } catch (error) {
      console.error("Error creating kiosk station:", error);
      res.status(500).json({ message: "Failed to create kiosk station" });
    }
  });

  app.patch("/api/organizations/:orgId/kiosk/stations/:stationId", async (req, res) => {
    try {
      const orgId = parseInt(req.params.orgId);
      const stationId = parseInt(req.params.stationId);
      const updates = req.body;

      // Mock station update
      res.json({
        id: stationId,
        organizationId: orgId,
        ...updates,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error("Error updating kiosk station:", error);
      res.status(500).json({ message: "Failed to update kiosk station" });
    }
  });

  app.get("/api/organizations/:orgId/kiosk/donations", async (req, res) => {
    try {
      const orgId = parseInt(req.params.orgId);

      // Mock kiosk donations
      const donations = [
        {
          id: 1,
          stationId: 1,
          amount: "100.00",
          paymentMethod: "card",
          anonymous: false,
          donorEmail: "donor@example.com",
          createdAt: new Date()
        }
      ];

      res.json(donations);
    } catch (error) {
      console.error("Error fetching kiosk donations:", error);
      res.status(500).json({ message: "Failed to fetch kiosk donations" });
    }
  });

  app.get("/api/organizations/:orgId/kiosk/sessions", async (req, res) => {
    try {
      const orgId = parseInt(req.params.orgId);

      // Mock kiosk sessions
      const sessions = [
        {
          id: 1,
          stationId: 1,
          startTime: new Date(Date.now() - 1800000), // 30 minutes ago
          endTime: new Date(Date.now() - 1200000), // 20 minutes ago
          duration: 600, // seconds
          donationsCompleted: 1,
          totalAmount: "100.00"
        }
      ];

      res.json(sessions);
    } catch (error) {
      console.error("Error fetching kiosk sessions:", error);
      res.status(500).json({ message: "Failed to fetch kiosk sessions" });
    }
  });

  // Communication Management
  app.get("/api/organizations/:orgId/communication/segments", async (req, res) => {
    try {
      const orgId = parseInt(req.params.orgId);

      // Mock segments
      const segments = [
        {
          id: 1,
          name: "Major Donors",
          description: "Donors who have given $1000+ in the last year",
          size: 85,
          organizationId: orgId
        },
        {
          id: 2,
          name: "Regular Donors",
          description: "Monthly recurring donors",
          size: 245,
          organizationId: orgId
        }
      ];

      res.json(segments);
    } catch (error) {
      console.error("Error fetching communication segments:", error);
      res.status(500).json({ message: "Failed to fetch segments" });
    }
  });

  app.post("/api/organizations/:orgId/communication/segments", async (req, res) => {
    try {
      const orgId = parseInt(req.params.orgId);
      const segmentData = req.body;

      // Mock segment creation
      const newSegment = {
        id: Date.now(),
        organizationId: orgId,
        ...segmentData,
        size: 0,
        createdAt: new Date()
      };

      res.status(201).json(newSegment);
    } catch (error) {
      console.error("Error creating communication segment:", error);
      res.status(500).json({ message: "Failed to create segment" });
    }
  });

  app.get("/api/organizations/:orgId/communication/workflows", async (req, res) => {
    try {
      const orgId = parseInt(req.params.orgId);

      // Mock workflows
      const workflows = [
        {
          id: 1,
          name: "Welcome Series",
          type: "email",
          status: "active",
          triggerEvent: "new_donor",
          organizationId: orgId
        }
      ];

      res.json(workflows);
    } catch (error) {
      console.error("Error fetching communication workflows:", error);
      res.status(500).json({ message: "Failed to fetch workflows" });
    }
  });

  app.get("/api/organizations/:orgId/communication/logs", async (req, res) => {
    try {
      const orgId = parseInt(req.params.orgId);

      // Mock communication logs
      const logs = [
        {
          id: 1,
          type: "email",
          recipient: "donor@example.com",
          subject: "Thank you for your donation",
          status: "delivered",
          sentAt: new Date()
        }
      ];

      res.json(logs);
    } catch (error) {
      console.error("Error fetching communication logs:", error);
      res.status(500).json({ message: "Failed to fetch communication logs" });
    }
  });

  // Kiosk Hardware
  app.get("/api/kiosk/hardware-packages", async (req, res) => {
    try {
      const packages = [
        {
          id: 1,
          name: "Basic Kiosk Package",
          price: 2499,
          features: ["Touchscreen", "Card Reader", "Receipt Printer"],
          description: "Perfect for small organizations"
        },
        {
          id: 2,
          name: "Professional Kiosk Package",
          price: 3999,
          features: ["Large Touchscreen", "Multi-format Card Reader", "Receipt Printer", "Cash Acceptor"],
          description: "Full-featured solution for larger organizations"
        }
      ];

      res.json(packages);
    } catch (error) {
      console.error("Error fetching hardware packages:", error);
      res.status(500).json({ message: "Failed to fetch hardware packages" });
    }
  });

  app.post("/api/kiosk/quote-request", async (req, res) => {
    try {
      const quoteData = req.body;

      // Mock quote request
      res.json({
        success: true,
        message: "Quote request submitted successfully",
        quoteId: `quote_${Date.now()}`,
        estimatedResponse: "24 hours"
      });
    } catch (error) {
      console.error("Error submitting quote request:", error);
      res.status(500).json({ message: "Failed to submit quote request" });
    }
  });

  // News and Content
  app.get("/api/nonprofit/news-articles/all", async (req, res) => {
    try {
      const allArticles = [];

      // Fetch from multiple RSS feeds
      for (const [source, feedUrl] of Object.entries(RSS_FEEDS)) {
        try {
          const feed = await parser.parseURL(feedUrl);
          const articles = feed.items.slice(0, 5).map(item => ({
            id: `${source}_${item.guid || item.link}`,
            title: item.title,
            summary: item.contentSnippet?.substring(0, 200) + "..." || "",
            url: item.link,
            publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
            source: source.charAt(0).toUpperCase() + source.slice(1),
            category: item.category || "News",
            imageUrl: item["media:thumbnail"]?.url || item["media:content"]?.url || null
          }));
          allArticles.push(...articles);
        } catch (feedError) {
          console.warn(`Failed to fetch RSS feed for ${source}:`, feedError.message);
        }
      }

      // Sort by publication date (newest first)
      allArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

      res.json(allArticles.slice(0, 20)); // Return top 20 articles
    } catch (error) {
      console.error("Error fetching news articles:", error);
      res.status(500).json({ 
        message: "Failed to fetch news articles",
        articles: [] // Return empty array as fallback
      });
    }
  });

  app.get("/api/nonprofit/trending-topics", async (req, res) => {
    try {
      // Mock trending topics
      const trendingTopics = [
        { topic: "Pro-Life Legislation", count: 45, trend: "up" },
        { topic: "Pregnancy Support", count: 32, trend: "up" },
        { topic: "Family Values", count: 28, trend: "stable" },
        { topic: "Religious Freedom", count: 22, trend: "down" },
        { topic: "Healthcare Policy", count: 18, trend: "up" }
      ];

      res.json(trendingTopics);
    } catch (error) {
      console.error("Error fetching trending topics:", error);
      res.status(500).json({ message: "Failed to fetch trending topics" });
    }
  });

  app.get("/api/nonprofit/news-feeds", async (req, res) => {
    try {
      const newsFeeds = Object.entries(RSS_FEEDS).map(([source, url]) => ({
        source: source.charAt(0).toUpperCase() + source.slice(1),
        url,
        description: `Latest news from ${source}`,
        isActive: true
      }));

      res.json(newsFeeds);
    } catch (error) {
      console.error("Error fetching news feeds:", error);
      res.status(500).json({ message: "Failed to fetch news feeds" });
    }
  });
}