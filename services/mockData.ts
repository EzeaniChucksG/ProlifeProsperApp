/**
 * Mock Data Service
 * Provides realistic dummy data based on shared/schema.ts
 * Used when API calls fail or for testing/demo purposes
 */

import type { Organization, Campaign, Donation } from '@/types/api';

export const mockOrganizations: Organization[] = [
  {
    id: 1,
    name: "Life Choice Pregnancy Center",
    slug: "life-choice-pc",
    email: "info@lifechoicepc.org",
    phone: "(555) 234-5678",
    address: "123 Hope Street",
    city: "Austin",
    state: "TX",
    zipCode: "78701",
    logoUrl: null,
    primaryColor: "#0d72b9",
    secondaryColor: "#26b578",
    isActive: true,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2025-10-20"),
  },
  {
    id: 2,
    name: "Grace Community Church",
    slug: "grace-community",
    email: "giving@gracechurch.org",
    phone: "(555) 876-5432",
    address: "456 Faith Avenue",
    city: "Dallas",
    state: "TX",
    zipCode: "75201",
    logoUrl: null,
    primaryColor: "#8B4513",
    secondaryColor: "#DAA520",
    isActive: true,
    createdAt: new Date("2023-06-10"),
    updatedAt: new Date("2025-10-18"),
  },
  {
    id: 3,
    name: "Hope for Tomorrow Ministry",
    slug: "hope-tomorrow",
    email: "contact@hopetomorrow.org",
    phone: "(555) 345-6789",
    address: "789 Blessing Blvd",
    city: "Houston",
    state: "TX",
    zipCode: "77001",
    logoUrl: null,
    primaryColor: "#4A90E2",
    secondaryColor: "#50C878",
    isActive: true,
    createdAt: new Date("2024-03-20"),
    updatedAt: new Date("2025-10-21"),
  },
  {
    id: 4,
    name: "New Beginnings Pregnancy Support",
    slug: "new-beginnings",
    email: "support@newbeginnings.org",
    phone: "(555) 567-8901",
    address: "321 Care Lane",
    city: "San Antonio",
    state: "TX",
    zipCode: "78205",
    logoUrl: null,
    primaryColor: "#E07856",
    secondaryColor: "#26b578",
    isActive: true,
    createdAt: new Date("2023-11-05"),
    updatedAt: new Date("2025-10-19"),
  },
];

export const mockCampaigns: Campaign[] = [
  {
    id: 1,
    organizationId: 1,
    name: "Baby Essentials Drive",
    description: "Help us provide diapers, formula, and baby clothes to mothers in need. Every donation directly supports families choosing life.",
    slug: "baby-essentials-2025",
    goal: "15000.00",
    raised: "8750.50",
    startDate: new Date("2025-01-01"),
    endDate: new Date("2025-12-31"),
    mainImageUrl: null,
    isActive: true,
    isDefault: false,
    createdAt: new Date("2024-12-15"),
    updatedAt: new Date("2025-10-22"),
  },
  {
    id: 2,
    organizationId: 1,
    name: "Ultrasound Equipment Fund",
    description: "We need a new 3D ultrasound machine to show mothers the beauty of life. Your gift saves lives by letting moms see their babies.",
    slug: "ultrasound-fund",
    goal: "35000.00",
    raised: "22300.00",
    startDate: new Date("2025-06-01"),
    endDate: new Date("2025-12-31"),
    mainImageUrl: null,
    isActive: true,
    isDefault: false,
    createdAt: new Date("2025-05-20"),
    updatedAt: new Date("2025-10-21"),
  },
  {
    id: 3,
    organizationId: 2,
    name: "Building Fund 2025",
    description: "Join us in expanding our worship center to reach more families in our growing community. Together we can build something beautiful for God's glory.",
    slug: "building-fund-2025",
    goal: "500000.00",
    raised: "327500.00",
    startDate: new Date("2025-01-01"),
    endDate: new Date("2026-12-31"),
    mainImageUrl: null,
    isActive: true,
    isDefault: false,
    createdAt: new Date("2024-11-01"),
    updatedAt: new Date("2025-10-22"),
  },
  {
    id: 4,
    organizationId: 2,
    name: "Mission Trip to Kenya",
    description: "Support our youth mission team traveling to Kenya this summer to serve orphans and build a community center.",
    slug: "kenya-mission-2025",
    goal: "25000.00",
    raised: "18900.00",
    startDate: new Date("2025-02-01"),
    endDate: new Date("2025-07-15"),
    mainImageUrl: null,
    isActive: true,
    isDefault: false,
    createdAt: new Date("2025-01-15"),
    updatedAt: new Date("2025-10-20"),
  },
  {
    id: 5,
    organizationId: 3,
    name: "Christmas Blessing Boxes",
    description: "Provide Christmas joy to 500 families in poverty with food, gifts, and the hope of Jesus. Make this Christmas special for children in need.",
    slug: "christmas-blessing-2025",
    goal: "50000.00",
    raised: "12450.00",
    startDate: new Date("2025-10-01"),
    endDate: new Date("2025-12-24"),
    mainImageUrl: null,
    isActive: true,
    isDefault: false,
    createdAt: new Date("2025-09-15"),
    updatedAt: new Date("2025-10-22"),
  },
  {
    id: 6,
    organizationId: 4,
    name: "Parenting Classes Fund",
    description: "Fund our free parenting and prenatal care classes that empower mothers with knowledge and support throughout pregnancy and beyond.",
    slug: "parenting-classes",
    goal: "10000.00",
    raised: "6780.00",
    startDate: new Date("2025-01-01"),
    endDate: new Date("2025-12-31"),
    mainImageUrl: null,
    isActive: true,
    isDefault: false,
    createdAt: new Date("2024-12-01"),
    updatedAt: new Date("2025-10-19"),
  },
];

export const mockDonations: Donation[] = [
  {
    id: 1,
    organizationId: 1,
    campaignId: 1,
    amount: "50.00",
    feeAmount: "2.15",
    totalAmount: "52.15",
    paymentMethod: "card",
    status: "completed",
    isRecurring: false,
    donorCoversFees: true,
    donorEmail: "donor@example.com",
    donorFirstName: "John",
    donorLastName: "Doe",
    createdAt: new Date("2025-10-15"),
  },
  {
    id: 2,
    organizationId: 1,
    campaignId: 1,
    amount: "100.00",
    feeAmount: "0.00",
    totalAmount: "100.00",
    paymentMethod: "apple_pay",
    status: "completed",
    isRecurring: true,
    recurringInterval: "monthly",
    donorCoversFees: false,
    donorEmail: "donor@example.com",
    donorFirstName: "John",
    donorLastName: "Doe",
    createdAt: new Date("2025-09-15"),
  },
  {
    id: 3,
    organizationId: 2,
    campaignId: 3,
    amount: "500.00",
    feeAmount: "18.50",
    totalAmount: "518.50",
    paymentMethod: "card",
    status: "completed",
    isRecurring: false,
    donorCoversFees: true,
    donorEmail: "donor@example.com",
    donorFirstName: "John",
    donorLastName: "Doe",
    createdAt: new Date("2025-10-01"),
  },
  {
    id: 4,
    organizationId: 2,
    campaignId: 4,
    amount: "150.00",
    feeAmount: "5.50",
    totalAmount: "155.50",
    paymentMethod: "card",
    status: "completed",
    isRecurring: false,
    donorCoversFees: true,
    donorEmail: "donor@example.com",
    donorFirstName: "John",
    donorLastName: "Doe",
    createdAt: new Date("2025-08-20"),
  },
  {
    id: 5,
    organizationId: 3,
    campaignId: 5,
    amount: "25.00",
    feeAmount: "1.25",
    totalAmount: "26.25",
    paymentMethod: "google_pay",
    status: "completed",
    isRecurring: false,
    donorCoversFees: true,
    donorEmail: "donor@example.com",
    donorFirstName: "John",
    donorLastName: "Doe",
    createdAt: new Date("2025-10-20"),
  },
  {
    id: 6,
    organizationId: 4,
    campaignId: 6,
    amount: "75.00",
    feeAmount: "0.00",
    totalAmount: "75.00",
    paymentMethod: "card",
    status: "completed",
    isRecurring: true,
    recurringInterval: "monthly",
    donorCoversFees: false,
    donorEmail: "donor@example.com",
    donorFirstName: "John",
    donorLastName: "Doe",
    createdAt: new Date("2025-07-10"),
  },
  {
    id: 7,
    organizationId: 1,
    campaignId: 2,
    amount: "250.00",
    feeAmount: "9.25",
    totalAmount: "259.25",
    paymentMethod: "card",
    status: "completed",
    isRecurring: false,
    donorCoversFees: true,
    donorEmail: "donor@example.com",
    donorFirstName: "John",
    donorLastName: "Doe",
    createdAt: new Date("2025-10-10"),
  },
  {
    id: 8,
    organizationId: 2,
    campaignId: 3,
    amount: "100.00",
    feeAmount: "3.80",
    totalAmount: "103.80",
    paymentMethod: "apple_pay",
    status: "completed",
    isRecurring: false,
    donorCoversFees: true,
    donorEmail: "donor@example.com",
    donorFirstName: "John",
    donorLastName: "Doe",
    createdAt: new Date("2025-06-05"),
  },
];

/**
 * Calculate impact stats from donations
 */
export function calculateImpactStats() {
  const totalGiven = mockDonations.reduce(
    (sum, d) => sum + parseFloat(d.amount),
    0
  );

  const donationCount = mockDonations.length;

  // Estimate lives saved (rough estimate: 1 life per $500 donated to pregnancy centers)
  const pregnancyCenterDonations = mockDonations.filter(
    (d) => d.organizationId === 1 || d.organizationId === 4
  );
  const pcTotal = pregnancyCenterDonations.reduce(
    (sum, d) => sum + parseFloat(d.amount),
    0
  );
  const livesSaved = Math.floor(pcTotal / 500);

  // Unique organizations supported
  const organizationsSupported = new Set(
    mockDonations.map((d) => d.organizationId)
  ).size;

  return {
    totalGiven,
    donationCount,
    livesSaved: Math.max(livesSaved, 1), // At least 1 for demo
    organizationsSupported,
  };
}

/**
 * Get saved organizations (mock - first 3 orgs)
 */
export function getSavedOrganizations(): number[] {
  return [1, 2, 3];
}

/**
 * Get featured campaigns (mock - first 3 active campaigns)
 */
export function getFeaturedCampaigns(): Campaign[] {
  return mockCampaigns.slice(0, 3);
}
