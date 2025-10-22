/**
 * Donor Portal Routes
 * API endpoints for donor dashboard, profile, history, and settings
 */
import type { Express } from "express";

export function registerDonorRoutes(app: Express) {
  // Donor Profile
  app.get("/api/donor/profile", (req, res) => {
    res.json({
      id: "donor-123",
      firstName: "Sarah",
      lastName: "Johnson",
      email: "sarah.johnson@email.com",
      phone: "(555) 234-5678",
      address: "456 Elm Street",
      city: "Portland",
      state: "OR",
      zipCode: "97201",
      profilePhotoUrl: null,
      joinedDate: "2023-06-15T00:00:00Z",
      totalDonations: 28,
      totalAmount: 3250.00,
      lastDonation: "2025-09-25T14:30:00Z",
      communicationPreference: "email",
      anonymousDonor: false,
      achievements: [
        { name: "First Gift", emoji: "🎁", rarity: "common" },
        { name: "Monthly Supporter", emoji: "🌟", rarity: "uncommon" },
        { name: "Life Defender", emoji: "❤️", rarity: "rare" },
        { name: "Big Impact Maker", emoji: "💪", rarity: "uncommon" },
        { name: "Champion of Life", emoji: "🏆", rarity: "epic" }
      ]
    });
  });

  // Donor Dashboard Stats
  app.get("/api/donor/dashboard", (req, res) => {
    res.json({
      stats: {
        totalDonated: 3250.00,
        donationCount: 28,
        recurringDonations: 2,
        organizationsSupported: 4,
        currentMonthDonations: 450.00,
        lastDonationDate: "2025-09-25T14:30:00Z",
        recurringGifts: 2,
        savedCampaigns: 5,
        impactScore: 850,
        streak: 6
      },
      recentDonations: [
        {
          id: 1,
          date: "2025-09-25T14:30:00Z",
          amount: 100.00,
          campaign: "Emergency Relief Fund",
          organization: "Hope Community Center",
          status: "completed",
          recurring: false,
          receiptUrl: "#"
        },
        {
          id: 2,
          date: "2025-09-15T10:15:00Z",
          amount: 50.00,
          campaign: "Monthly General Support",
          organization: "Life Choices Pregnancy Center",
          status: "completed",
          recurring: true,
          receiptUrl: "#"
        },
        {
          id: 3,
          date: "2025-09-01T09:00:00Z",
          amount: 150.00,
          campaign: "Back to School Drive",
          organization: "Hope Community Center",
          status: "completed",
          recurring: false,
          receiptUrl: "#"
        }
      ],
      upcomingRecurring: [
        {
          id: 1,
          nextDate: "2025-10-01T00:00:00Z",
          amount: 50.00,
          campaign: "Monthly General Support",
          organization: "Life Choices Pregnancy Center",
          frequency: "monthly",
          status: "active"
        },
        {
          id: 2,
          nextDate: "2025-10-15T00:00:00Z",
          amount: 25.00,
          campaign: "Sponsor a Child",
          organization: "New Life Orphanage",
          frequency: "monthly",
          status: "active"
        }
      ],
      impactStories: [
        {
          id: 1,
          title: "15 Families Fed This Month",
          description: "Your donations helped provide groceries to 15 families in need",
          imageUrl: null,
          date: "2025-09-20T00:00:00Z"
        },
        {
          id: 2,
          title: "3 Lives Saved",
          description: "Thanks to supporters like you, 3 mothers chose life this month",
          imageUrl: null,
          date: "2025-09-15T00:00:00Z"
        }
      ]
    });
  });

  // Donation History
  app.get("/api/donor/donations", (req, res) => {
    res.json({
      donations: [
        {
          id: 1,
          date: "2025-09-25T14:30:00Z",
          amount: 100.00,
          fee: 3.20,
          total: 103.20,
          campaign: "Emergency Relief Fund",
          campaignId: 5,
          organizationName: "Hope Community Center",
          organizationId: 3,
          paymentMethod: "Credit Card (****4242)",
          status: "completed",
          recurring: false,
          receiptUrl: "#",
          dedication: null
        },
        {
          id: 2,
          date: "2025-09-15T10:15:00Z",
          amount: 50.00,
          fee: 1.75,
          total: 51.75,
          campaign: "Monthly General Support",
          campaignId: 12,
          organizationName: "Life Choices Pregnancy Center",
          organizationId: 7,
          paymentMethod: "Bank Account (****9876)",
          status: "completed",
          recurring: true,
          receiptUrl: "#",
          dedication: null
        },
        {
          id: 3,
          date: "2025-09-01T09:00:00Z",
          amount: 150.00,
          fee: 4.65,
          total: 154.65,
          campaign: "Back to School Drive",
          campaignId: 8,
          organizationName: "Hope Community Center",
          organizationId: 3,
          paymentMethod: "Credit Card (****4242)",
          status: "completed",
          recurring: false,
          receiptUrl: "#",
          dedication: "In memory of John Smith"
        },
        {
          id: 4,
          date: "2025-08-25T16:45:00Z",
          amount: 75.00,
          fee: 2.48,
          total: 77.48,
          campaign: "Medical Equipment Fund",
          campaignId: 15,
          organizationName: "Life Line Medical Center",
          organizationId: 9,
          paymentMethod: "Apple Pay",
          status: "completed",
          recurring: false,
          receiptUrl: "#",
          dedication: null
        },
        {
          id: 5,
          date: "2025-08-15T10:15:00Z",
          amount: 50.00,
          fee: 1.75,
          total: 51.75,
          campaign: "Monthly General Support",
          campaignId: 12,
          organizationName: "Life Choices Pregnancy Center",
          organizationId: 7,
          paymentMethod: "Bank Account (****9876)",
          status: "completed",
          recurring: true,
          receiptUrl: "#",
          dedication: null
        },
        {
          id: 6,
          date: "2025-08-01T11:30:00Z",
          amount: 200.00,
          fee: 6.10,
          total: 206.10,
          campaign: "Building Fund",
          campaignId: 20,
          organizationName: "Faith Community Church",
          organizationId: 11,
          paymentMethod: "Credit Card (****4242)",
          status: "completed",
          recurring: false,
          receiptUrl: "#",
          dedication: "In honor of Pastor Mike"
        }
      ],
      totals: {
        allTime: 3250.00,
        thisYear: 2100.00,
        thisMonth: 300.00
      }
    });
  });

  // Recurring Gifts
  app.get("/api/donor/recurring", (req, res) => {
    res.json({
      recurringGifts: [
        {
          id: 1,
          createdDate: "2024-03-15T00:00:00Z",
          amount: 50.00,
          frequency: "monthly",
          nextDate: "2025-10-01T00:00:00Z",
          campaign: "Monthly General Support",
          campaignId: 12,
          organizationName: "Life Choices Pregnancy Center",
          organizationId: 7,
          paymentMethod: "Bank Account (****9876)",
          status: "active",
          totalDonations: 18,
          totalAmount: 900.00
        },
        {
          id: 2,
          createdDate: "2024-07-01T00:00:00Z",
          amount: 25.00,
          frequency: "monthly",
          nextDate: "2025-10-15T00:00:00Z",
          campaign: "Sponsor a Child - Maria",
          campaignId: 25,
          organizationName: "New Life Orphanage",
          organizationId: 14,
          paymentMethod: "Credit Card (****4242)",
          status: "active",
          totalDonations: 15,
          totalAmount: 375.00
        }
      ],
      stats: {
        totalRecurring: 75.00,
        activeGifts: 2,
        totalSaved: 1275.00,
        averageGift: 37.50
      }
    });
  });

  // Saved Campaigns
  app.get("/api/donor/saved-campaigns", (req, res) => {
    res.json({
      savedCampaigns: [
        {
          id: 1,
          campaignId: 30,
          campaignName: "Christmas Toy Drive",
          organizationName: "Hope Community Center",
          organizationId: 3,
          description: "Provide Christmas gifts for children in need",
          goal: 10000.00,
          raised: 6500.00,
          imageUrl: null,
          savedDate: "2025-09-10T00:00:00Z",
          endDate: "2025-12-20T00:00:00Z"
        },
        {
          id: 2,
          campaignId: 35,
          campaignName: "Ultrasound Machine Fund",
          organizationName: "Life Choices Pregnancy Center",
          organizationId: 7,
          description: "Help us purchase a new ultrasound machine to save lives",
          goal: 25000.00,
          raised: 18750.00,
          imageUrl: null,
          savedDate: "2025-08-22T00:00:00Z",
          endDate: "2025-11-30T00:00:00Z"
        },
        {
          id: 3,
          campaignId: 40,
          campaignName: "Mission Trip to Kenya",
          organizationName: "Global Outreach Ministries",
          organizationId: 18,
          description: "Send a team to help orphans in Nairobi",
          goal: 15000.00,
          raised: 12000.00,
          imageUrl: null,
          savedDate: "2025-09-05T00:00:00Z",
          endDate: "2026-02-15T00:00:00Z"
        },
        {
          id: 4,
          campaignId: 45,
          campaignName: "Hurricane Relief 2025",
          organizationName: "Disaster Response Team",
          organizationId: 22,
          description: "Emergency aid for hurricane victims in Florida",
          goal: 50000.00,
          raised: 42000.00,
          imageUrl: null,
          savedDate: "2025-09-18T00:00:00Z",
          endDate: "2025-10-31T00:00:00Z"
        },
        {
          id: 5,
          campaignId: 50,
          campaignName: "Youth Sports Program",
          organizationName: "Community Youth Center",
          organizationId: 25,
          description: "Provide sports equipment and coaching for at-risk youth",
          goal: 8000.00,
          raised: 5200.00,
          imageUrl: null,
          savedDate: "2025-08-30T00:00:00Z",
          endDate: "2025-12-31T00:00:00Z"
        }
      ]
    });
  });

  // Payment Methods
  app.get("/api/donor/payment-methods", (req, res) => {
    res.json({
      paymentMethods: [
        {
          id: 1,
          type: "credit_card",
          brand: "Visa",
          last4: "4242",
          expiryMonth: 12,
          expiryYear: 2026,
          isDefault: true,
          createdDate: "2024-01-15T00:00:00Z",
          usageCount: 18
        },
        {
          id: 2,
          type: "bank_account",
          bankName: "Chase Bank",
          accountType: "checking",
          last4: "9876",
          isDefault: false,
          createdDate: "2024-03-10T00:00:00Z",
          usageCount: 10
        },
        {
          id: 3,
          type: "credit_card",
          brand: "Mastercard",
          last4: "5555",
          expiryMonth: 8,
          expiryYear: 2027,
          isDefault: false,
          createdDate: "2024-06-20T00:00:00Z",
          usageCount: 3
        }
      ]
    });
  });

  // Impact Overview
  app.get("/api/donor/impact", (req, res) => {
    res.json({
      totalImpact: {
        livesImpacted: 145,
        familiesHelped: 38,
        mealsProvided: 420,
        childrenSponsored: 2
      },
      impactByCategory: [
        {
          category: "Life-Saving Services",
          amount: 1200.00,
          percentage: 37,
          livesImpacted: 8
        },
        {
          category: "Family Support",
          amount: 950.00,
          percentage: 29,
          familiesHelped: 25
        },
        {
          category: "Food Assistance",
          amount: 650.00,
          percentage: 20,
          mealsProvided: 420
        },
        {
          category: "Child Sponsorship",
          amount: 450.00,
          percentage: 14,
          childrenHelped: 2
        }
      ],
      monthlyImpact: [
        { month: "Mar", amount: 150, impact: 12 },
        { month: "Apr", amount: 200, impact: 18 },
        { month: "May", amount: 175, impact: 15 },
        { month: "Jun", amount: 250, impact: 22 },
        { month: "Jul", amount: 300, impact: 28 },
        { month: "Aug", amount: 275, impact: 25 },
        { month: "Sep", amount: 300, impact: 30 }
      ],
      recentImpact: [
        {
          id: 1,
          date: "2025-09-20T00:00:00Z",
          title: "Maria Chose Life",
          description: "Your donation helped provide an ultrasound that saved a baby's life",
          organization: "Life Choices Pregnancy Center",
          imageUrl: null
        },
        {
          id: 2,
          date: "2025-09-15T00:00:00Z",
          title: "15 Families Fed",
          description: "Food assistance provided to families in crisis",
          organization: "Hope Community Center",
          imageUrl: null
        },
        {
          id: 3,
          date: "2025-09-10T00:00:00Z",
          title: "School Supplies Delivered",
          description: "30 children received backpacks and school supplies",
          organization: "Hope Community Center",
          imageUrl: null
        },
        {
          id: 4,
          date: "2025-09-05T00:00:00Z",
          title: "Medical Care Provided",
          description: "Free medical clinic served 45 patients this month",
          organization: "Life Line Medical Center",
          imageUrl: null
        }
      ]
    });
  });

  // Donor Preferences
  app.get("/api/donor/preferences", (req, res) => {
    res.json({
      preferredAmount: 50,
      donationFrequency: "monthly",
      feeCoverage: true,
      impactUpdates: true,
      taxDocuments: true,
      communicationPreference: "email",
      anonymousDonor: false
    });
  });

  // Update Profile
  app.put("/api/donor/profile", (req, res) => {
    // In a real app, this would update the database
    res.json({
      success: true,
      message: "Profile updated successfully"
    });
  });

  // Update Preferences
  app.put("/api/donor/preferences", (req, res) => {
    res.json({
      success: true,
      message: "Preferences updated successfully"
    });
  });

  // Cancel Recurring Gift
  app.delete("/api/donor/recurring/:id", (req, res) => {
    res.json({
      success: true,
      message: "Recurring gift cancelled successfully"
    });
  });

  // Add Payment Method
  app.post("/api/donor/payment-methods", (req, res) => {
    res.json({
      success: true,
      message: "Payment method added successfully",
      id: 4
    });
  });

  // Remove Payment Method
  app.delete("/api/donor/payment-methods/:id", (req, res) => {
    res.json({
      success: true,
      message: "Payment method removed successfully"
    });
  });

  // Save Campaign
  app.post("/api/donor/saved-campaigns", (req, res) => {
    res.json({
      success: true,
      message: "Campaign saved successfully"
    });
  });

  // Remove Saved Campaign
  app.delete("/api/donor/saved-campaigns/:id", (req, res) => {
    res.json({
      success: true,
      message: "Campaign removed from saved list"
    });
  });
}
