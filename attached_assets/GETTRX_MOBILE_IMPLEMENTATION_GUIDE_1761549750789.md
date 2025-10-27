# GETTRX Payment Integration Guide for React Native Mobile App

## Overview
This guide provides complete instructions for implementing GETTRX payment processing in the React Native mobile app. The mobile app will integrate with the existing Pro-Life Prosper backend API endpoints that are already handling GETTRX payments successfully.

**IMPORTANT**: The backend is fully functional and processing real payments through GETTRX in both sandbox and production. Your mobile app will call these existing endpoints - no backend changes needed.

---

## Architecture Overview

```
Mobile App (React Native)
    ↓
   [1] Fetch Payment Config from Backend
    ↓
   [2] Initialize GETTRX SDK with Config
    ↓
   [3] Tokenize Card Client-Side (PCI Compliant)
    ↓
   [4] Send Token + Payment Data to Backend
    ↓
Backend API (Already Implemented)
    ↓
GETTRX API (Sandbox/Production)
```

---

## Required Environment Variables

### Mobile App (.env file)
```bash
# GETTRX Public Key (safe for mobile/frontend)
VITE_GETTRX_PUBLIC_KEY=pk_dev_xxxxxxxxxxxxxxxx  # For sandbox
# VITE_GETTRX_PUBLIC_KEY=pk_live_xxxxxxxxxxxxxxxx  # For production

# API Base URL (your backend)
API_BASE_URL=https://your-backend.replit.app
```

### Backend (Already Configured - FYI Only)
```bash
GETTRX_SECRET_KEY=sk_dev_xxxxxxxxx  # Sandbox secret key
# GETTRX_SECRET_KEY=sk_live_xxxxxxxxx  # Production secret key

NODE_ENV=development  # or "production" for live
```

---

## Backend API Endpoints (Already Implemented)

### 1. Get Payment Configuration
**Endpoint**: `GET /api/gettrx/payment-config/:organizationId`
**Auth**: None (public)
**Purpose**: Fetch publishable key and merchant account ID for organization

**Example Request**:
```javascript
GET /api/gettrx/payment-config/7
```

**Example Response**:
```json
{
  "success": true,
  "config": {
    "publishableKey": "pk_dev_xxxxxxxxxxxx",
    "accountId": "acm_673cad763c541000016e6497",
    "environment": "sandbox"
  }
}
```

---

### 2. Process Payment
**Endpoint**: `POST /api/gettrx/process-payment`
**Auth**: None (public, but rate-limited)
**Purpose**: Process a donation payment with tokenized card

**Example Request**:
```javascript
{
  "paymentToken": "pm_token_xxxxxxxxxxxxx",  // From GETTRX SDK
  "amount": 100.00,
  "organizationId": 7,
  "campaignId": 17,  // Optional
  "donorInfo": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "(555) 123-4567",  // Optional
    "address": "123 Main St",  // Optional
    "city": "New York",  // Optional
    "state": "NY",  // Optional
    "zipCode": "10001"  // Optional
  },
  "anonymous": false,
  "savePaymentMethod": false,  // true for recurring or saved cards
  "setupFutureUsage": "off_session",  // Include if savePaymentMethod is true
  "donationType": "one-time",  // or "recurring"
  "recurringInterval": "monthly"  // Required if donationType is "recurring" (monthly/quarterly/annually)
}
```

**Example Response**:
```json
{
  "success": true,
  "payment": {
    "id": "pi_xxxxxxxxxxxxx",
    "status": "succeeded",
    "amount": 100.00,
    "currency": "usd"
  },
  "donation": {
    "id": 123,
    "amount": "100.00",
    "status": "completed",
    "organizationId": 7,
    "donorId": 45
  },
  "savedPaymentMethod": {
    "id": 789,
    "last_four": "4242",
    "brand": "visa"
  },
  "message": "Payment processed successfully"
}
```

**Error Response**:
```json
{
  "success": false,
  "message": "Merchant account not approved"
}
```

---

## Step-by-Step Implementation

### Step 1: Install GETTRX SDK for React Native

```bash
# If GETTRX provides a React Native SDK, install it
npm install @gettrx/react-native-sdk

# Or use WebView to load their web SDK (fallback option)
npm install react-native-webview
```

**Note**: If GETTRX doesn't have a native mobile SDK, you have two options:
1. **WebView Approach**: Use `react-native-webview` to load the web SDK
2. **Bridge Approach**: Create a custom native bridge to their iOS/Android SDKs

### Step 2: Create Payment Configuration Hook

```typescript
// hooks/useGettrxConfig.ts
import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@env';

interface PaymentConfig {
  publishableKey: string;
  accountId: string;
  environment: 'sandbox' | 'live';
}

export function useGettrxConfig(organizationId: number) {
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchConfig() {
      try {
        setLoading(true);
        const response = await fetch(
          `${API_BASE_URL}/api/gettrx/payment-config/${organizationId}`
        );
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to get payment config');
        }

        const data = await response.json();
        setConfig(data.config);
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching payment config:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchConfig();
  }, [organizationId]);

  return { config, loading, error };
}
```

### Step 3: Create Payment Form Component

```typescript
// components/PaymentForm.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Button, ActivityIndicator } from 'react-native';
import { useGettrxConfig } from '../hooks/useGettrxConfig';
// Import GETTRX SDK (adjust based on actual SDK)
import GettrxOne from '@gettrx/react-native-sdk';

interface PaymentFormProps {
  organizationId: number;
  amount: number;
  campaignId?: number;
  donorInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  donationType?: 'one-time' | 'recurring';
  recurringInterval?: 'monthly' | 'quarterly' | 'annually';
  onSuccess: (result: any) => void;
  onError: (error: any) => void;
}

export function PaymentForm({
  organizationId,
  amount,
  campaignId,
  donorInfo,
  donationType = 'one-time',
  recurringInterval,
  onSuccess,
  onError
}: PaymentFormProps) {
  const { config, loading: configLoading, error: configError } = useGettrxConfig(organizationId);
  const [processing, setProcessing] = useState(false);
  const [gettrxInstance, setGettrxInstance] = useState<any>(null);

  // Initialize GETTRX SDK when config is loaded
  useEffect(() => {
    if (config && !gettrxInstance) {
      try {
        // Initialize GETTRX One with organization's configuration
        const gettrx = new GettrxOne(config.publishableKey, {
          onBehalfOf: config.accountId
        });
        
        setGettrxInstance(gettrx);
        console.log('GETTRX SDK initialized');
      } catch (error) {
        console.error('Failed to initialize GETTRX SDK:', error);
        onError(error);
      }
    }
  }, [config, gettrxInstance]);

  const handlePayment = async () => {
    if (!gettrxInstance) {
      onError({ message: 'Payment system not initialized' });
      return;
    }

    try {
      setProcessing(true);

      // Step 1: Create payment token from card data (tokenized client-side for PCI compliance)
      // The SDK will display a card form and handle tokenization
      const tokenResult = await gettrxInstance.createToken({
        mode: donationType === 'recurring' ? 'subscription' : 'payment',
        currency: 'usd',
        amount: amount.toFixed(2),
        setupFutureUsage: donationType === 'recurring' ? 'off_session' : undefined
      });

      if (!tokenResult.token) {
        throw new Error(tokenResult.error?.message || 'Failed to create payment token');
      }

      console.log('Payment token created:', tokenResult.token);

      // Step 2: Send token + payment data to backend
      const response = await fetch(`${API_BASE_URL}/api/gettrx/process-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentToken: tokenResult.token,
          amount: amount,
          organizationId: organizationId,
          campaignId: campaignId,
          donorInfo: donorInfo,
          anonymous: false,
          savePaymentMethod: donationType === 'recurring',
          setupFutureUsage: donationType === 'recurring' ? 'off_session' : undefined,
          donationType: donationType,
          recurringInterval: recurringInterval
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Payment failed');
      }

      console.log('Payment successful:', result);
      onSuccess(result);

    } catch (error: any) {
      console.error('Payment error:', error);
      onError(error);
    } finally {
      setProcessing(false);
    }
  };

  if (configLoading) {
    return <ActivityIndicator size="large" />;
  }

  if (configError) {
    return <Text>Error: {configError}</Text>;
  }

  return (
    <View>
      {/* GETTRX SDK will inject card form here */}
      <View id="gettrx-payment-form" />
      
      <Button
        title={processing ? 'Processing...' : `Donate $${amount.toFixed(2)}`}
        onPress={handlePayment}
        disabled={processing || !gettrxInstance}
      />
    </View>
  );
}
```

### Step 4: Use Payment Form in Your Donation Screen

```typescript
// screens/DonationScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { PaymentForm } from '../components/PaymentForm';

export function DonationScreen() {
  const [donorInfo, setDonorInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });

  const handlePaymentSuccess = (result: any) => {
    console.log('Payment succeeded!', result);
    // Navigate to success screen, show confirmation, etc.
  };

  const handlePaymentError = (error: any) => {
    console.error('Payment failed:', error);
    // Show error message to user
    Alert.alert('Payment Failed', error.message);
  };

  return (
    <View>
      <Text>Donation Information</Text>
      
      <TextInput
        placeholder="First Name"
        value={donorInfo.firstName}
        onChangeText={(text) => setDonorInfo({ ...donorInfo, firstName: text })}
      />
      
      <TextInput
        placeholder="Last Name"
        value={donorInfo.lastName}
        onChangeText={(text) => setDonorInfo({ ...donorInfo, lastName: text })}
      />
      
      <TextInput
        placeholder="Email"
        value={donorInfo.email}
        onChangeText={(text) => setDonorInfo({ ...donorInfo, email: text })}
        keyboardType="email-address"
      />

      <PaymentForm
        organizationId={7}
        amount={100.00}
        campaignId={17}
        donorInfo={donorInfo}
        donationType="one-time"
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
      />
    </View>
  );
}
```

---

## WebView Fallback Implementation (If No Native SDK)

If GETTRX doesn't provide a React Native SDK, use WebView:

```typescript
// components/PaymentFormWebView.tsx
import React, { useRef } from 'react';
import { WebView } from 'react-native-webview';

export function PaymentFormWebView({ config, amount, onToken }: any) {
  const webViewRef = useRef<WebView>(null);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <script src="https://cdn.gettrx.com/gettrx-one.js"></script>
      </head>
      <body>
        <div id="payment-form"></div>
        <script>
          const gettrx = new GettrxOne('${config.publishableKey}', {
            onBehalfOf: '${config.accountId}'
          });
          
          const webElements = gettrx.webElements({
            mode: 'payment',
            currency: 'usd',
            amount: '${amount.toFixed(2)}'
          });
          
          const paymentElement = webElements.create('payment');
          paymentElement.mount('#payment-form');
          
          // Expose method to create token
          window.createPaymentToken = async function() {
            const result = await gettrx.createToken();
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'TOKEN_CREATED',
              token: result.token,
              error: result.error
            }));
          };
        </script>
      </body>
    </html>
  `;

  const handleMessage = (event: any) => {
    const data = JSON.parse(event.nativeEvent.data);
    if (data.type === 'TOKEN_CREATED') {
      if (data.token) {
        onToken(data.token);
      } else {
        // Handle error
      }
    }
  };

  return (
    <WebView
      ref={webViewRef}
      source={{ html: htmlContent }}
      onMessage={handleMessage}
      javaScriptEnabled={true}
    />
  );
}
```

---

## Important Implementation Notes

### 1. PCI Compliance
- **NEVER** send raw card data to your backend
- Always tokenize cards client-side using GETTRX SDK
- Only send the `paymentToken` to backend

### 2. Error Handling
The backend already handles these scenarios:
- Invalid GETTRX customer ID (auto-recreates customer)
- Merchant account not approved
- Failed payments
- Network errors

Always check `result.success` and show `result.message` to users.

### 3. Recurring Donations
For recurring donations:
```javascript
{
  "donationType": "recurring",
  "recurringInterval": "monthly",  // or "quarterly", "annually"
  "savePaymentMethod": true,
  "setupFutureUsage": "off_session"
}
```

The backend automatically:
- Saves the payment method
- Creates recurring schedule
- Processes future payments

### 4. Environment Management
```javascript
// Automatically uses correct environment based on API keys
const environment = config.environment; // 'sandbox' or 'live'

// Sandbox: Uses test merchant accounts
// Production: Uses real merchant accounts
```

### 5. Testing

**Test Cards (Sandbox)**:
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Insufficient Funds: 4000 0000 0000 9995
Any future expiry date
Any 3-digit CVV
```

**Test Flow**:
1. Use sandbox API keys
2. Use test credit card numbers
3. Verify payment appears in backend
4. Check donation record is created

---

## Security Checklist

- [ ] Environment variables are not committed to git
- [ ] API keys are stored in .env file
- [ ] Publishable key is used on mobile (not secret key)
- [ ] Card data never sent to backend
- [ ] HTTPS/TLS for all API calls
- [ ] Input validation on donor information
- [ ] Error messages don't expose sensitive data

---

## Backend Flow (For Reference)

When you call `/api/gettrx/process-payment`, the backend:

1. **Validates** payment data using Zod schema
2. **Gets/Creates donor** in database
3. **Creates/Gets GETTRX customer** for donor
4. **Processes payment** via GETTRX API with token
5. **Saves payment method** if requested
6. **Creates donation record** in database
7. **Updates donor stats** (total donated, badges, etc.)
8. **Updates campaign raised amount** if applicable
9. **Creates recurring schedule** for recurring donations
10. **Returns** payment result + donation details

---

## Troubleshooting

### "Payment system not initialized"
- Ensure GETTRX SDK is loaded before calling `createToken()`
- Check that `config.publishableKey` is valid

### "Merchant account not approved"
- Organization doesn't have approved GETTRX merchant account
- Contact backend admin or complete merchant onboarding

### "Invalid payment token"
- Token might have expired (tokens are single-use)
- Regenerate token before each payment attempt

### "Failed to create customer"
- Check donor info is complete (name, email required)
- Verify organization has valid merchant account ID

---

## Additional Resources

- GETTRX API Docs: https://docs.gettrx.com
- Backend Implementation: `server/routes/gettrx-payment-routes.ts`
- Web Implementation: `client/src/components/payment/GettrxPaymentForm.tsx`

---

## Summary: What You Need to Do

1. **Install GETTRX SDK** for React Native (or use WebView)
2. **Create useGettrxConfig hook** to fetch payment config from backend
3. **Initialize GETTRX SDK** with publishable key + account ID
4. **Collect card data** using SDK's payment form
5. **Create payment token** client-side (SDK handles this)
6. **POST to `/api/gettrx/process-payment`** with token + donor info
7. **Handle success/error** responses

**The backend does everything else** - customer creation, payment processing, donation recording, recurring schedules, etc.

---

## Questions?

If you encounter issues:
1. Check backend logs for detailed error messages
2. Verify environment variables are set correctly
3. Test with sandbox credentials first
4. Ensure GETTRX SDK is properly loaded

The backend is production-ready and handling real payments. Your mobile app just needs to collect card data, tokenize it, and call the existing endpoints.
