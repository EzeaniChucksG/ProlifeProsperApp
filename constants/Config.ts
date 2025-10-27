// Backend API URL configuration
// This function is called at runtime to determine the correct API URL
const getApiBaseUrl = (): string => {
  // Priority 1: Use explicit environment variable if set
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) {
    console.log('🔗 Using EXPO_PUBLIC_API_URL:', process.env.EXPO_PUBLIC_API_URL);
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  // Priority 2: In browser (Expo web), construct from current location
  if (typeof window !== 'undefined' && typeof window.location !== 'undefined') {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    
    console.log('🌍 Detected hostname:', hostname);
    
    // For Replit environment (check for replit or janeway in hostname)
    if (hostname.includes('replit') || hostname.includes('janeway')) {
      const apiUrl = `${protocol}//${hostname}:3000/api`;
      console.log('🔗 Using Replit API URL:', apiUrl);
      return apiUrl;
    }
    
    // For localhost/127.0.0.1 but check if REPLIT_DEV_DOMAIN is available
    if ((hostname === 'localhost' || hostname === '127.0.0.1') && 
        typeof process !== 'undefined' && process.env?.REPLIT_DEV_DOMAIN) {
      const apiUrl = `https://${process.env.REPLIT_DEV_DOMAIN}:3000/api`;
      console.log('🔗 Using env-based Replit API URL:', apiUrl);
      return apiUrl;
    }
    
    // For local development (browser)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      console.log('🔗 Using localhost API URL');
      return 'http://localhost:3000/api';
    }
  }
  
  // Priority 3: For native React Native or SSR - use Replit domain from environment
  if (typeof process !== 'undefined' && process.env?.REPLIT_DEV_DOMAIN) {
    const apiUrl = `https://${process.env.REPLIT_DEV_DOMAIN}:3000/api`;
    console.log('🔗 Using native env-based API URL:', apiUrl);
    return apiUrl;
  }
  
  // Final fallback for local development
  console.log('🔗 Using fallback localhost API URL');
  return 'http://localhost:3000/api';
};

// Export as a getter function to ensure it's evaluated at runtime
export const Config = {
  get API_BASE_URL() {
    return getApiBaseUrl();
  },
  
  // GETTRX Configuration (loaded from backend)
  GETTRX_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_GETTRX_PUBLISHABLE_KEY,
  
  // App Configuration
  APP_NAME: 'ProLifeProsper',
  DEFAULT_ORGANIZATION_ID: 1,
  
  // AsyncStorage Keys
  STORAGE_KEYS: {
    AUTH_TOKEN: '@prolifeprosper:auth_token',
    USER_DATA: '@prolifeprosper:user_data',
    SAVED_ORGS: '@prolifeprosper:saved_orgs',
  },
};
