// Core types extracted from schema for mobile app use

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  phone: string | null;
  organizationId: number | null;
  role: string;
  isActive: boolean;
  createdAt: Date;
}

export interface Organization {
  id: number;
  name: string;
  slug: string;
  email: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
}

export interface Campaign {
  id: number;
  organizationId: number;
  name: string;
  description: string | null;
  slug: string;
  goal: string | null;
  raised: string;
  startDate: Date | null;
  endDate: Date | null;
  logoUrl: string | null;
  bannerImageUrl: string | null;
  mainImageUrl: string | null;
  mainVideoUrl: string | null;
  isActive: boolean;
  backgroundColor: string;
  accentColor: string;
}

export interface Donation {
  id: number;
  organizationId: number;
  donorId: number;
  campaignId: number | null;
  amount: string;
  currency: string;
  status: string;
  paymentMethod: string;
  isRecurring: boolean;
  recurringFrequency: string | null;
  donatedAt: Date;
  receiptUrl: string | null;
  contextType: string | null;
  contextId: number | null;
}

export interface Donor {
  id: number;
  organizationId: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  totalDonated: string;
  donationCount: number;
  firstDonationAt: Date | null;
  lastDonationAt: Date | null;
  isAnonymous: boolean;
}

export interface Event {
  id: number;
  organizationId: number;
  title: string;
  description: string | null;
  startDate: Date;
  endDate: Date | null;
  location: string | null;
  imageUrl: string | null;
  maxAttendees: number | null;
  currentAttendees: number;
  registrationRequired: boolean;
  registrationFee: string | null;
  qrCodeUrl: string | null;
}

// API Request/Response types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface DonationRequest {
  amount: number;
  currency?: string;
  donorEmail: string;
  donorFirstName?: string;
  donorLastName?: string;
  donorPhone?: string;
  organizationId: number;
  campaignId?: number;
  contextType?: string;
  contextId?: number;
  paymentMethod?: string;
  recurringFrequency?: string;
  isAnonymous?: boolean;
  metadata?: Record<string, any>;
}

export interface ApiError {
  message: string;
  errors?: any[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Combined types for UI display
export interface CampaignWithOrganization extends Campaign {
  organization?: Organization;
  progressPercentage?: number;
}

export interface DonationWithDetails extends Donation {
  campaign?: Campaign;
  organization?: Organization;
}
