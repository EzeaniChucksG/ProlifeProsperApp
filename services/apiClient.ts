import { Config } from '@/constants/Config';
import { storage } from './storage';

export interface ApiError {
  message: string;
  status?: number;
}

class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = Config.API_BASE_URL;
  }

  private async getAuthHeader(): Promise<Record<string, string>> {
    const token = await storage.getAuthToken();
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  }

  async get<T>(endpoint: string, requiresAuth = true): Promise<T> {
    const headers = requiresAuth ? await this.getAuthHeader() : {};
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw { message: error.message || 'Request failed', status: response.status };
    }

    return response.json();
  }

  async post<T>(endpoint: string, data: any, requiresAuth = true): Promise<T> {
    const headers = requiresAuth ? await this.getAuthHeader() : {};
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw { message: error.message || 'Request failed', status: response.status };
    }

    return response.json();
  }

  async put<T>(endpoint: string, data: any, requiresAuth = true): Promise<T> {
    const headers = requiresAuth ? await this.getAuthHeader() : {};
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw { message: error.message || 'Request failed', status: response.status };
    }

    return response.json();
  }

  async delete<T>(endpoint: string, requiresAuth = true): Promise<T> {
    const headers = requiresAuth ? await this.getAuthHeader() : {};
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw { message: error.message || 'Request failed', status: response.status };
    }

    return response.json();
  }
}

export const apiClient = new ApiClient();
