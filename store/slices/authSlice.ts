import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '@/services/apiClient';
import { storage } from '@/services/storage';
import type { User } from '@/types/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isAdmin: boolean;
  adminToken: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isAdmin: false,
  adminToken: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post<{ user: User; token: string }>(
        '/auth/login',
        { email, password },
        false
      );
      
      await storage.setAuthToken(response.token);
      await storage.setUserData(response.user);
      
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (
    { firstName, lastName, email, password }: { firstName: string; lastName: string; email: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiClient.post<{ user: User; token: string }>(
        '/auth/register',
        { firstName, lastName, email, password },
        false
      );
      
      await storage.setAuthToken(response.token);
      await storage.setUserData(response.user);
      
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Registration failed');
    }
  }
);

export const adminLogin = createAsyncThunk(
  'auth/adminLogin',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post<{ user: User; token: string }>(
        '/auth/admin/login',
        { email, password },
        false
      );
      
      await storage.setItem('admin_token', response.token);
      await storage.setItem('admin_user', JSON.stringify(response.user));
      
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Admin login failed');
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await storage.clearAll();
  return null;
});

export const adminLogout = createAsyncThunk('auth/adminLogout', async () => {
  await storage.removeItem('admin_token');
  await storage.removeItem('admin_user');
  return null;
});

export const loadStoredAuth = createAsyncThunk('auth/loadStoredAuth', async () => {
  const token = await storage.getAuthToken();
  const user = await storage.getUserData();
  const adminToken = await storage.getItem('admin_token');
  const adminUserStr = await storage.getItem('admin_user');
  
  const adminUser = adminUserStr ? JSON.parse(adminUserStr) : null;
  
  return { token, user, adminToken, adminUser };
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<{ user: User; token: string }>) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Register
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action: PayloadAction<{ user: User; token: string }>) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Admin Login
      .addCase(adminLogin.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(adminLogin.fulfilled, (state, action: PayloadAction<{ user: User; token: string }>) => {
        state.isLoading = false;
        state.isAdmin = true;
        state.adminToken = action.payload.token;
        state.error = null;
      })
      .addCase(adminLogin.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      // Admin Logout
      .addCase(adminLogout.fulfilled, (state) => {
        state.isAdmin = false;
        state.adminToken = null;
      })
      // Load stored auth
      .addCase(loadStoredAuth.fulfilled, (state, action) => {
        if (action.payload.token && action.payload.user) {
          state.token = action.payload.token;
          state.user = action.payload.user;
          state.isAuthenticated = true;
        }
        if (action.payload.adminToken && action.payload.adminUser) {
          state.adminToken = action.payload.adminToken;
          state.isAdmin = true;
        }
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
