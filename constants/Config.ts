// Backend API URL configuration
// Using local server from /server folder
const API_BASE_URL = 'http://localhost:3000/api';

export const Config = {
  API_BASE_URL,
  
  APP_NAME: 'ProLife Prosper',
  
  STORAGE_KEYS: {
    AUTH_TOKEN: '@prolifeprosper:auth_token',
    USER_DATA: '@prolifeprosper:user_data',
    SAVED_ORGS: '@prolifeprosper:saved_organizations',
  },
  
  PAYMENT_METHODS: {
    CARD: 'card',
    APPLE_PAY: 'apple_pay',
    GOOGLE_PAY: 'google_pay',
    ACH: 'ach',
  },
  
  DONATION_FREQUENCIES: {
    ONE_TIME: 'one_time',
    MONTHLY: 'monthly',
    QUARTERLY: 'quarterly',
    ANNUALLY: 'annually',
  },
} as const;

// Log the API URL for debugging
console.log('🔗 API Base URL:', Config.API_BASE_URL);
