# ProLifeProsper Donor Mobile App

## Overview
The ProLifeProsper Donor Mobile App is a donor-facing application built with Expo/React Native for the ProLifeProsper nonprofit donation platform. Its primary purpose is to enable donors to easily browse campaigns, make one-time or recurring donations, view their donation history, and manage saved organizations. The project also includes an administrative application to manage campaigns, donors, and organizational settings, aiming to streamline operations and enhance donor engagement.

## User Preferences
### Development Workflow
- Use real API calls for all data operations (no mock data)
- Build complete, functional flows for MVP
- Follow architect review process before marking tasks complete

### Code Style
- TypeScript with strict typing
- Functional React components with hooks
- Clean, modular file structure
- No large monolithic files
- Error handling with user-friendly messages

## System Architecture
The application is built using **Expo 52** with **Expo Router** for file-based routing and **TypeScript** for strict type checking. Navigation is managed through tab and stack navigators. State management is handled with **React Context** (AuthContext), and persistent data is stored using **AsyncStorage**. A custom API service with JWT bearer token authentication handles API interactions.

**UI/UX Decisions:**
- **Brand Colors:** Primary: `#0d72b9` (Blue), Success: `#26b578` (Green), Background: `#f5f5f5` (Light gray).
- **Donation Flow:** Supports one-time and recurring donations with frequency selection, payment method selection (Card, Apple Pay, Google Pay), and real-time processing.
- **Admin Interface:** Features a dedicated admin login, live dashboard with real-time stats, terminal mode for in-person donations, mobile analytics, and tools for campaign, donor, and organization management.

**Technical Implementations & Features:**
- **Authentication System:** Real API authentication via `/api/auth/signin` endpoint with JWT tokens, dual auth system (Redux for donors, AsyncStorage for admins), role-based routing (admin, super_admin, staff_member).
- **Admin App Real Data:** Dashboard fetches live stats from `/api/organizations/:orgId/stats`, campaigns from `/api/organizations/:orgId/campaigns`, donors from `/api/donors?organizationId=X`, and donations with proper field normalization (snake_case/camelCase).
- **Home Screen:** Quick Donate options, Impact Dashboard (total giving, donations, lives saved, organizations supported), saved organizations, featured campaigns, QR code scanner button.
- **Campaigns & Donations:** Browse campaigns with search, campaign detail screens, donation history with filtering, recurring donation management.
- **Payment Methods:** Management of saved credit/debit cards, bank accounts (ACH), and digital wallets (Apple Pay, Google Pay).
- **QR Code Scanner/Generator:** Camera-based QR scanning for deep links to campaigns/organizations; admin tool to generate scannable QR codes.
- **Push Notifications:** Comprehensive settings for donor preferences and admin alerts (donations, milestones, reports).
- **Backend Server:** Mobile backend server running on port 3000, bound to 0.0.0.0 for public accessibility, with endpoints for auth, campaigns, donations, and organization management.
- **Shared Schema Approach:** Database schema and API routes copied from the ProLifeProsper web project to generate TypeScript types, ensuring type-safe API calls and alignment between frontend and backend.
- **File-Based Routing:** Utilizes Expo Router with `(auth)`, `(tabs)`, `(admin-auth)`, and `(admin-tabs)` groups for layout organization, including dynamic routes like `/campaign/[id]`. Admin routes (`/admin/*`) bypass donor auth checks to prevent redirect loops.
- **Error Handling:** API calls include try/catch blocks for user-facing error alerts and graceful degradation.
- **Donation Context Preservation:** Navigation parameters pass campaign/organization context to the donate screen, ensuring correct `organizationId` usage and appropriate UI display.

## External Dependencies
- **Backend API:** https://3fdd1b5d-bf9f-479f-a189-ae81cc75d815-00-3rf10jd7rr2hm.kirk.replit.dev/api (development)
- **GETTRX Payment SDK:** Integrated for live donation processing via WebView, enabling PCI-compliant client-side tokenization.
    - `react-native-webview` is used for the GETTRX SDK integration.
- **AsyncStorage:** For persistent data storage in the mobile application.
- **SendGrid:** Used for sending email notifications and receipts, with updated email addresses to `@prolifegive.com`.