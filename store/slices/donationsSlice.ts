import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '@/services/apiClient';
import type { Donation } from '@/types/api';

interface DonationStats {
  totalAmount: number;
  donationCount: number;
  campaignsSupported: number;
  livesSaved: number;
}

interface DonationsState {
  donations: Donation[];
  stats: DonationStats | null;
  isLoading: boolean;
  error: string | null;
  createLoading: boolean;
  createError: string | null;
}

const initialState: DonationsState = {
  donations: [],
  stats: null,
  isLoading: false,
  error: null,
  createLoading: false,
  createError: null,
};

export const fetchDonations = createAsyncThunk(
  'donations/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get<Donation[]>('/donations');
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch donations');
    }
  }
);

export const fetchDonationStats = createAsyncThunk(
  'donations/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get<DonationStats>('/donations/stats');
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch donation stats');
    }
  }
);

export const createDonation = createAsyncThunk(
  'donations/create',
  async (
    donation: {
      amount: number;
      campaignId?: number;
      organizationId: number;
      frequency: string;
      paymentMethod: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiClient.post<Donation>('/donations', donation);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create donation');
    }
  }
);

const donationsSlice = createSlice({
  name: 'donations',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.createError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch donations
      .addCase(fetchDonations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDonations.fulfilled, (state, action: PayloadAction<Donation[]>) => {
        state.isLoading = false;
        state.donations = action.payload;
        state.error = null;
      })
      .addCase(fetchDonations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch donation stats
      .addCase(fetchDonationStats.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDonationStats.fulfilled, (state, action: PayloadAction<DonationStats>) => {
        state.isLoading = false;
        state.stats = action.payload;
        state.error = null;
      })
      .addCase(fetchDonationStats.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create donation
      .addCase(createDonation.pending, (state) => {
        state.createLoading = true;
        state.createError = null;
      })
      .addCase(createDonation.fulfilled, (state, action: PayloadAction<Donation>) => {
        state.createLoading = false;
        state.donations.unshift(action.payload);
        state.createError = null;
      })
      .addCase(createDonation.rejected, (state, action) => {
        state.createLoading = false;
        state.createError = action.payload as string;
      });
  },
});

export const { clearError } = donationsSlice.actions;
export default donationsSlice.reducer;
