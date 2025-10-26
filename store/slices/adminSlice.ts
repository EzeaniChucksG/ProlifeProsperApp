import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '@/services/apiClient';

interface DashboardStats {
  todayDonations: number;
  weekDonations: number;
  monthDonations: number;
  activeCampaigns: number;
  totalDonors: number;
  recentDonations: any[];
}

interface AnalyticsStats {
  totalRaised: number;
  totalDonors: number;
  avgDonation: number;
  recurringDonors: number;
  topCampaigns: any[];
  donationMethods: any[];
  topDonor: any;
  peakGivingTime: string;
}

interface AdminState {
  dashboardStats: DashboardStats | null;
  analyticsStats: AnalyticsStats | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AdminState = {
  dashboardStats: null,
  analyticsStats: null,
  isLoading: false,
  error: null,
};

export const fetchDashboardStats = createAsyncThunk(
  'admin/fetchDashboardStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get<DashboardStats>('/admin/dashboard/stats');
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch dashboard stats');
    }
  }
);

export const fetchAnalyticsStats = createAsyncThunk(
  'admin/fetchAnalyticsStats',
  async (timeframe: 'week' | 'month' | 'year', { rejectWithValue }) => {
    try {
      const response = await apiClient.get<AnalyticsStats>(
        `/admin/analytics/stats?timeframe=${timeframe}`
      );
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch analytics stats');
    }
  }
);

export const createTerminalDonation = createAsyncThunk(
  'admin/createTerminalDonation',
  async (
    donation: {
      amount: number;
      donorName?: string;
      donorEmail?: string;
      donorPhone?: string;
      paymentMethod: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiClient.post('/admin/terminal/donation', donation);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create terminal donation');
    }
  }
);

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch dashboard stats
      .addCase(fetchDashboardStats.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action: PayloadAction<DashboardStats>) => {
        state.isLoading = false;
        state.dashboardStats = action.payload;
        state.error = null;
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch analytics stats
      .addCase(fetchAnalyticsStats.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAnalyticsStats.fulfilled, (state, action: PayloadAction<AnalyticsStats>) => {
        state.isLoading = false;
        state.analyticsStats = action.payload;
        state.error = null;
      })
      .addCase(fetchAnalyticsStats.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create terminal donation
      .addCase(createTerminalDonation.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createTerminalDonation.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(createTerminalDonation.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = adminSlice.actions;
export default adminSlice.reducer;
