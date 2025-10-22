export const Config = {
  API_BASE_URL: __DEV__ 
    ? 'http://localhost:5000/api'
    : 'https://your-production-url.com/api',
  
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
