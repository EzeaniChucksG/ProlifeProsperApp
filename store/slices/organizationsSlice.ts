import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '@/services/apiClient';
import { storage } from '@/services/storage';
import type { Organization } from '@/types/api';

interface OrganizationsState {
  organizations: Organization[];
  currentOrganization: Organization | null;
  savedOrganizations: Organization[];
  isLoading: boolean;
  error: string | null;
}

const initialState: OrganizationsState = {
  organizations: [],
  currentOrganization: null,
  savedOrganizations: [],
  isLoading: false,
  error: null,
};

export const fetchOrganizations = createAsyncThunk(
  'organizations/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get<Organization[]>('/organizations', false);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch organizations');
    }
  }
);

export const fetchOrganizationById = createAsyncThunk(
  'organizations/fetchById',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await apiClient.get<Organization>(`/organizations/${id}`, false);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch organization');
    }
  }
);

export const fetchSavedOrganizations = createAsyncThunk(
  'organizations/fetchSaved',
  async (_, { rejectWithValue }) => {
    try {
      const savedIds = await storage.getSavedOrganizations();
      if (savedIds.length === 0) {
        return [];
      }
      
      const promises = savedIds.map(id => 
        apiClient.get<Organization>(`/organizations/${id}`, false)
      );
      const response = await Promise.all(promises);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch saved organizations');
    }
  }
);

export const saveOrganization = createAsyncThunk(
  'organizations/save',
  async (organizationId: number, { dispatch }) => {
    await storage.saveOrganization(organizationId);
    dispatch(fetchSavedOrganizations());
    return organizationId;
  }
);

export const unsaveOrganization = createAsyncThunk(
  'organizations/unsave',
  async (organizationId: number, { dispatch }) => {
    await storage.unsaveOrganization(organizationId);
    dispatch(fetchSavedOrganizations());
    return organizationId;
  }
);

const organizationsSlice = createSlice({
  name: 'organizations',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentOrganization: (state) => {
      state.currentOrganization = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all organizations
      .addCase(fetchOrganizations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOrganizations.fulfilled, (state, action: PayloadAction<Organization[]>) => {
        state.isLoading = false;
        state.organizations = action.payload;
        state.error = null;
      })
      .addCase(fetchOrganizations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch organization by ID
      .addCase(fetchOrganizationById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOrganizationById.fulfilled, (state, action: PayloadAction<Organization>) => {
        state.isLoading = false;
        state.currentOrganization = action.payload;
        state.error = null;
      })
      .addCase(fetchOrganizationById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch saved organizations
      .addCase(fetchSavedOrganizations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSavedOrganizations.fulfilled, (state, action: PayloadAction<Organization[]>) => {
        state.isLoading = false;
        state.savedOrganizations = action.payload;
        state.error = null;
      })
      .addCase(fetchSavedOrganizations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearCurrentOrganization } = organizationsSlice.actions;
export default organizationsSlice.reducer;
