// Backend API URL configuration  
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    
    // For Replit environment, backend is on port 3000
    if (hostname.includes('replit') || hostname.includes('janeway')) {
      // Backend is accessible on same domain but port 3000
      return `${protocol}//${hostname}:3000/api`;
    }
    
    // For local development
    return 'http://localhost:3000/api';
  }
  
  return 'http://localhost:3000/api';
};

const API_BASE_URL = getApiBaseUrl();

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
