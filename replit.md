# ProLifeProsper Donor Mobile App

## Overview
Donor-facing mobile application built with Expo/React Native for ProLifeProsper, a nonprofit donation platform. Enables donors to browse campaigns, make one-time or recurring donations, view donation history, and manage saved organizations.

**Project Status:** Phase 1 MVP Complete + Phase 2 Admin App Started (October 22, 2025)
**Backend API:** https://3fdd1b5d-bf9f-479f-a189-ae81cc75d815-00-3rf10jd7rr2hm.kirk.replit.dev/api (development)

## Recent Changes (October 22, 2025)

### Phase 2: Organization Admin App (IN PROGRESS)
1. **Admin Authentication** ✅
   - Dedicated admin login screen
   - Mock authentication for demo
   - Separate admin user state management
   - Access link from donor profile screen

2. **Live Dashboard** ✅
   - Real-time donation stats (today, week, month)
   - Quick stats cards with visual metrics
   - Recent donations feed
   - Active campaigns tracking
   - Total donors count
   - Quick action buttons (Terminal, QR, Receipt, Chat)
   - Pull-to-refresh functionality

3. **Terminal Mode** ✅
   - Full numeric keypad for amount entry
   - Accept in-person donations at events
   - Optional donor information collection
   - Payment processing simulation
   - Receipt sending capability

4. **Mobile Analytics** ✅
   - Overview stats (total raised, donors, avg donation, recurring)
   - Top campaign performance tracking
   - Donation method breakdown
   - Donor insights (top donor, peak giving times)
   - Timeframe selector (week/month/year)

5. **Admin Settings & Tools** ✅
   - Organization profile management
   - Quick access to campaigns, donors, events
   - Payment method management
   - Push notification tools
   - Security settings
   - Help & support

6. **Mock Data Integration** ✅
   - Created comprehensive dummy data from schema
   - Populated organizations, campaigns, donations
   - API fallback to mock data when calls fail
   - Real calculations for impact stats

## Recent Changes (October 22, 2025) - Donor App

### Phase 1 MVP - Donor App Features Completed ✅
1. **Authentication System**
   - Login/Register screens with mock authentication for demo
   - Persistent auth state using AsyncStorage
   - Navigation guards protecting authenticated routes
   - Real JWT-based auth code ready (commented out until CORS fixed)

2. **Home Screen**
   - Quick Donate with preset amounts ($10, $25, $50, $100) and custom input
   - Impact Dashboard showing total giving, donations, lives saved, organizations
   - Saved organizations display (max 3)
   - Featured campaigns (max 3)
   - QR code scanner button

3. **Campaigns Screen**
   - Browse all campaigns with search functionality
   - Progress tracking (raised vs goal)
   - Campaign cards with donate buttons
   - Navigation to campaign detail screen

4. **Campaign Detail Screen**
   - Full campaign information display
   - Hero image placeholder
   - Progress visualization
   - Donate button with campaign context

5. **Donation Flow**
   - Amount selection (preset + custom)
   - One-time vs recurring donations
   - Frequency selection (monthly, quarterly, annually)
   - Payment method selection (Card, Apple Pay, Google Pay)
   - Platform-specific payment buttons (iOS shows Apple Pay, Android shows Google Pay)
   - Campaign and organization context preservation
   - Success/error feedback
   - API integration with error handling

6. **Donations/My Giving Screen**
   - Donation history with filtering (all, one-time, recurring)
   - Impact stats dashboard (total given, campaigns supported)
   - Recurring donation management

7. **Profile Screen**
   - User information display
   - Functional navigation menu (settings, payment methods, saved orgs, receipts, notifications)
   - Logout functionality

8. **QR Code Scanner** ✨ NEW
   - Full camera-based QR code scanning
   - Permission handling with user-friendly messages
   - Instant navigation to campaigns or organizations from scanned codes
   - Expected format: `prolifeprosper://campaign/{id}` or `prolifeprosper://org/{id}`
   - Robust path parsing with regex-based slash removal

9. **Payment Methods Screen** ✨ NEW
   - Manage saved payment methods
   - Credit/debit card management
   - Bank account (ACH) management
   - Digital wallet management (Apple Pay, Google Pay, PayPal, Venmo)
   - Default payment method selection
   - Add/remove payment methods

10. **Push Notifications Settings** ✨ NEW
    - Comprehensive notification preferences
    - Channel selection (Push, Email, SMS)
    - Granular controls for notification types:
      - Donation receipts
      - Campaign updates
      - Monthly impact reports
      - Thank you messages
      - Goal milestones
      - Emergency alerts
    - Settings persist to AsyncStorage

11. **Impact Dashboard** ✨ NEW
    - Total giving amount displayed
    - Number of donations tracked
    - Lives saved metric (mission-focused)
    - Organizations supported count
    - Prominent display on Home screen

## Project Architecture

### Tech Stack
- **Framework:** Expo 52 with Expo Router for file-based routing
- **Language:** TypeScript with strict type checking
- **Navigation:** Expo Router (tab navigation + stack navigation)
- **State Management:** React Context (AuthContext)
- **Storage:** AsyncStorage for persistent data
- **API Client:** Custom API service with JWT bearer token auth

### Directory Structure
```
app/
├── (auth)/              # Donor authentication screens
├── (admin-auth)/        # Admin authentication screens
│   └── admin-login.tsx  # Organization admin login
├── (tabs)/              # Donor tab navigation
│   ├── index.tsx        # Home screen (Quick Donate + Impact Dashboard)
│   ├── campaigns.tsx    # Campaigns browsing
│   ├── donations.tsx    # Donation history
│   └── profile.tsx      # User profile (with admin login link)
├── (admin-tabs)/        # Admin tab navigation
│   ├── index.tsx        # Admin dashboard (live stats)
│   ├── terminal.tsx     # Terminal mode (event donations)
│   ├── analytics.tsx    # Mobile analytics
│   └── more.tsx         # Admin settings & tools
├── campaign/
│   └── [id].tsx         # Campaign detail screen
├── donate.tsx           # Donation flow screen
├── scan.tsx             # QR code scanner (donor feature)
├── payment-methods.tsx  # Payment method management
├── notifications.tsx    # Push notification settings
└── _layout.tsx          # Root layout

contexts/
└── AuthContext.tsx      # Global authentication state

services/
├── api.ts               # API client with mock data fallback
├── storage.ts           # AsyncStorage utilities
└── mockData.ts          # Dummy data from schema

types/
└── api.ts               # TypeScript types from backend schema

shared/
├── schema.ts            # Drizzle database schema (6,734 lines)
└── routes/              # Backend API route definitions
```

### Key Technical Decisions

1. **Shared Schema Approach**
   - Copied database schema and API routes from ProLifeProsper web project
   - Generates TypeScript types for type-safe API calls
   - Ensures frontend/backend alignment

2. **File-Based Routing**
   - Uses Expo Router for navigation
   - (auth) and (tabs) groups for layout organization
   - Dynamic routes for campaign details: `/campaign/[id]`

3. **Authentication Flow**
   - JWT tokens stored in AsyncStorage
   - Auth context provides global user state
   - Root layout guards authenticated routes

4. **Error Handling**
   - All API calls wrapped with try/catch
   - User-facing error alerts
   - Graceful degradation when backend unavailable

5. **Donation Context Preservation**
   - Navigation params pass campaign/org context
   - Donate screen reads and uses correct organizationId
   - UI displays appropriate context (campaign vs organization)

### Brand Colors
- Primary: #0d72b9 (Blue)
- Success: #26b578 (Green)
- Background: #f5f5f5 (Light gray)

## API Integration

### Base Configuration
- **Development:** https://3fdd1b5d-bf9f-479f-a189-ae81cc75d815-00-3rf10jd7rr2hm.kirk.replit.dev/api
- **Authentication:** Bearer token in Authorization header (currently mock auth for demo)
- **Storage:** AsyncStorage for auth tokens, user data, and notification preferences

### Key Endpoints Used
- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - New user registration
- `GET /api/campaigns` - Fetch all campaigns
- `GET /api/campaigns/:id` - Get campaign details
- `POST /api/donations` - Create new donation
- `GET /api/donations` - Get user's donation history
- `GET /api/organizations/:id` - Get organization details

## User Preferences

### Development Workflow
- Use context from schema and routes to build UI
- Don't make actual API calls until backend is ready
- Build complete, functional flows for MVP
- Follow architect review process before marking tasks complete

### Code Style
- TypeScript with strict typing
- Functional React components with hooks
- Clean, modular file structure
- No large monolithic files
- Error handling with user-friendly messages

## Next Steps

### Phase 2: Organization Admin App - Remaining Features
**Completed:**
- ✅ Admin authentication & dashboard
- ✅ Terminal mode for event donations
- ✅ Mobile analytics with insights
- ✅ Mock data integration

**In Progress:**
- 🔨 QR Code Generator (create donation QR codes)
- 🔨 Quick Receipt Sending (thank you emails/SMS)
- 🔨 Donor Chat (pregnancy center messaging feature)
- 🔨 Push notifications for admins

**Future Enhancements:**
- Campaign management (create, edit, delete)
- Donor relationship management
- Custom form builder for intake
- Event management
- Financial reporting

### Phase 1: Donor App - Completed ✅
- ✅ Core donor flow (browse, donate, history)
- ✅ QR code scanner for event donations
- ✅ Payment methods management
- ✅ Apple Pay / Google Pay integration
- ✅ Push notification preferences
- ✅ Impact dashboard

### Recommended Next Steps
- Complete remaining Phase 2 admin features
- Enable real authentication when backend CORS is configured
- On-device testing with physical devices (both donor & admin apps)
- Automated testing (smoke tests)
- Backend integration testing
- Separate admin app deployment (optional)

## Notes
- Mobile app uses AsyncStorage (not localStorage) for persistence
- All navigation properly wired between screens
- Organization context properly passed through donation flows
- Mock authentication enabled for UI/feature exploration (real auth ready when CORS configured)
- QR code scanner uses camera permissions and URL parsing for instant donations
- Platform-specific features (Apple Pay on iOS, Google Pay on Android)
- All Phase 1 features architect-reviewed and ready for device testing
