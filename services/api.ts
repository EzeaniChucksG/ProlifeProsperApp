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
    return this.request<Campaign[]>(endpoint);
  }

  async getCampaign(id: number): Promise<Campaign> {
    return this.request<Campaign>(`/campaigns/${id}`);
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
    return this.request<Donation[]>(endpoint);
  }

  async getDonation(id: number): Promise<Donation> {
    return this.request<Donation>(`/donations/${id}`);
  }

  // Organization endpoints
  async getOrganization(id: number): Promise<Organization> {
    return this.request<Organization>(`/organizations/${id}`);
  }

  async getOrganizations(): Promise<Organization[]> {
    return this.request<Organization[]>('/organizations');
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
