import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { api } from '@/services/api';
import { storage } from '@/services/storage';
import type { User, LoginRequest, RegisterRequest } from '@/types/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [token, userData] = await Promise.all([
        storage.getAuthToken(),
        storage.getUserData(),
      ]);

      if (token && userData) {
        api.setAuthToken(token);
        setUser(userData);
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (data: LoginRequest) => {
    // TEMPORARY: Mock login for demo purposes (bypassing CORS issues)
    console.log('🎭 Using mock authentication for demo');
    
    const mockUser: User = {
      id: '1',
      email: data.email,
      firstName: 'Demo',
      lastName: 'User',
      profileImageUrl: null,
      phone: null,
      organizationId: null,
      role: 'donor',
      isActive: true,
      createdAt: new Date(),
    };
    
    const mockToken = 'mock-jwt-token-for-demo';
    
    api.setAuthToken(mockToken);
    await storage.setAuthToken(mockToken);
    await storage.setUserData(mockUser);
    setUser(mockUser);
    
    // TODO: Replace with real API call once CORS is configured:
    // const response = await api.login(data);
    // api.setAuthToken(response.token);
    // await storage.setAuthToken(response.token);
    // await storage.setUserData(response.user);
    // setUser(response.user);
  };

  const register = async (data: RegisterRequest) => {
    // TEMPORARY: Mock registration for demo purposes
    console.log('🎭 Using mock registration for demo');
    
    const mockUser: User = {
      id: '1',
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      profileImageUrl: null,
      phone: null,
      organizationId: null,
      role: 'donor',
      isActive: true,
      createdAt: new Date(),
    };
    
    const mockToken = 'mock-jwt-token-for-demo';
    
    api.setAuthToken(mockToken);
    await storage.setAuthToken(mockToken);
    await storage.setUserData(mockUser);
    setUser(mockUser);
    
    // TODO: Replace with real API call once CORS is configured:
    // const response = await api.register(data);
    // api.setAuthToken(response.token);
    // await storage.setAuthToken(response.token);
    // await storage.setUserData(response.user);
    // setUser(response.user);
  };

  const logout = async () => {
    api.setAuthToken(null);
    await storage.clearAll();
    setUser(null);
  };

  const refreshUser = async () => {
    if (!user) return;
    try {
      const updatedUser = await api.getCurrentUser();
      await storage.setUserData(updatedUser);
      setUser(updatedUser);
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
