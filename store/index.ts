import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import campaignsReducer from './slices/campaignsSlice';
import donationsReducer from './slices/donationsSlice';
import organizationsReducer from './slices/organizationsSlice';
import adminReducer from './slices/adminSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    campaigns: campaignsReducer,
    donations: donationsReducer,
    organizations: organizationsReducer,
    admin: adminReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['auth/login/fulfilled', 'auth/register/fulfilled'],
        ignoredPaths: ['auth.user'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
