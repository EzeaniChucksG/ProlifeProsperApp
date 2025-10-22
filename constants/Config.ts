// Backend API URL configuration
// When running in Replit, use the backend Replit URL
// For local development, use localhost
const API_BASE_URL = 'https://3fdd1b5d-bf9f-479f-a189-ae81cc75d815-00-3rf10jd7rr2hm.kirk.replit.dev:5000/api';

// Uncomment this line when running both frontend and backend locally:
// const API_BASE_URL = 'http://localhost:5000/api';

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
