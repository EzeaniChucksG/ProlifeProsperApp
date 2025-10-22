// Get the backend URL from environment variable or use default
const getApiBaseUrl = () => {
  // For production/Replit deployment, use environment variable
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  // For development, check if we're running in Replit
  // In Replit, localhost won't work - need to use the actual backend URL
  if (typeof window !== 'undefined' && window.location.hostname.includes('replit')) {
    return 'https://3fdd1b5d-bf9f-479f-a189-ae81cc75d815-00-3rf10jd7rr2hm.kirk.replit.dev:5000/api';
  }
  
  // Local development (when both apps run locally)
  return 'http://localhost:5000/api';
};

export const Config = {
  API_BASE_URL: getApiBaseUrl(),
  
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
