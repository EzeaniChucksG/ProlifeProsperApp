import { Config } from '@/constants/Config';
import type { 
  LoginRequest, 
  LoginResponse, 
  RegisterRequest,
  User,
  Campaign,
  Donation,
  DonationRequest,
  Organization,
  Event,
  ApiError 
} from '@/types/api';
import { 
  mockOrganizations, 
  mockCampaigns, 
  mockDonations,
  getSavedOrganizations,
  getFeaturedCampaigns
} from './mockData';

class ApiClient {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const url = `${this.baseUrl}${endpoint}`;
    console.log(`API Request: ${options.method || 'GET'} ${url}`);
    console.log('Request headers:', headers);
    
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      console.log(`API Response: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const error: ApiError = await response.json().catch(() => ({
          message: 'An error occurred',
        }));
        console.error('API Error:', error);
        throw new Error(error.message || 'Request failed');
      }

      const data = await response.json();
      console.log('API Success:', data);
      return data;
    } catch (error: any) {
      console.error('Fetch error occurred:', {
        message: error.message,
        name: error.name,
        url: url,
      });
      // Re-throw with more context
      throw new Error(`Network request failed: ${error.message}`);
    }
  }

  // Generic HTTP methods for admin operations
  private async requestWithOptionalJson<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const url = `${this.baseUrl}${endpoint}`;
    console.log(`API Request: ${options.method || 'GET'} ${url}`);

    const response = await fetch(url, {
      ...options,
      headers,
    });

    console.log(`API Response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        message: 'An error occurred',
      }));
      console.error('API Error:', error);
      throw new Error(error.message || 'Request failed');
    }

    // Handle 204 No Content and other empty responses
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return {} as T;
    }

    // Check if response has JSON content
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    // For non-JSON responses, return empty object
    return {} as T;
  }

  async get<T = any>(endpoint: string): Promise<T> {
    return this.requestWithOptionalJson<T>(endpoint, { method: 'GET' });
  }

  async post<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.requestWithOptionalJson<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.requestWithOptionalJson<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.requestWithOptionalJson<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = any>(endpoint: string): Promise<T> {
    return this.requestWithOptionalJson<T>(endpoint, { method: 'DELETE' });
  }

  // Auth endpoints
  async login(data: LoginRequest): Promise<LoginResponse> {
    console.log('API: Attempting login to', `${this.baseUrl}/auth/signin`);
    console.log('API: Login payload:', { email: data.email, password: '***' });
    return this.request<LoginResponse>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async register(data: RegisterRequest): Promise<LoginResponse> {
    return this.request<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  // Campaign endpoints
  async getCampaigns(organizationId?: number): Promise<Campaign[]> {
    const endpoint = organizationId 
      ? `/organizations/${organizationId}/campaigns`
      : '/campaigns';
    try {
      return await this.request<Campaign[]>(endpoint);
    } catch (error) {
      console.log('API failed, using mock campaigns data');
      return organizationId 
        ? mockCampaigns.filter(c => c.organizationId === organizationId)
        : mockCampaigns;
    }
  }

  async getCampaign(id: number): Promise<Campaign> {
    try {
      return await this.request<Campaign>(`/campaigns/${id}`);
    } catch (error) {
      console.log('API failed, using mock campaign data');
      const campaign = mockCampaigns.find(c => c.id === id);
      if (!campaign) throw new Error(`Campaign ${id} not found`);
      return campaign;
    }
  }

  async getCampaignBySlug(slug: string): Promise<Campaign> {
    return this.request<Campaign>(`/campaigns/by-slug/${slug}`);
  }

  // Donation endpoints
  async createDonation(data: DonationRequest): Promise<Donation> {
    return this.request<Donation>('/donations/enhanced', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getDonations(donorId?: number): Promise<Donation[]> {
    const endpoint = donorId 
      ? `/donors/${donorId}/donations`
      : '/donations';
    try {
      return await this.request<Donation[]>(endpoint);
    } catch (error) {
      console.log('API failed, using mock donations data');
      return mockDonations;
    }
  }

  async getDonation(id: number): Promise<Donation> {
    return this.request<Donation>(`/donations/${id}`);
  }

  // Organization endpoints
  async getOrganization(id: number): Promise<Organization> {
    try {
      return await this.request<Organization>(`/organizations/${id}`);
    } catch (error) {
      console.log('API failed, using mock organization data');
      const org = mockOrganizations.find(o => o.id === id);
      if (!org) throw new Error(`Organization ${id} not found`);
      return org;
    }
  }

  async getOrganizations(): Promise<Organization[]> {
    try {
      return await this.request<Organization[]>('/organizations');
    } catch (error) {
      console.log('API failed, using mock organizations data');
      return mockOrganizations;
    }
  }

  // Event endpoints
  async getEvents(organizationId?: number): Promise<Event[]> {
    const endpoint = organizationId
      ? `/organizations/${organizationId}/events`
      : '/events';
    return this.request<Event[]>(endpoint);
  }

  async getEvent(id: number): Promise<Event> {
    return this.request<Event>(`/events/${id}`);
  }

  async registerForEvent(eventId: number, data: any): Promise<any> {
    return this.request(`/events/${eventId}/register`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiClient(Config.API_BASE_URL);
