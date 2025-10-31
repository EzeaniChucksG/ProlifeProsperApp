import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  decimal,
  uuid,
  varchar,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Organizations (nonprofits/churches)
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  ein: text("ein"),
  website: text("website"),
  phone: text("phone"),
  email: text("email").notNull(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").default("#0d72b9"),
  secondaryColor: text("secondary_color").default("#26b578"),
  merchantStatus: text("merchant_status").default("pending"), // pending, created, submitted, underwriting, approved, rejected, failed
  merchantAccountId: text("merchant_account_id"),
  merchantApplicationId: text("merchant_application_id"),
  feeHandlingSetting: text("fee_handling_setting").default("pre_toggled"), // pre_toggled, manual_opt_in, disabled

  // Recurring donation prompt settings
  recurringPromptEnabled: boolean("recurring_prompt_enabled").default(true),
  recurringPromptPercentage: integer("recurring_prompt_percentage").default(50), // 50% of one-time amount
  recurringPromptMessage: text("recurring_prompt_message").default(
    "Would you consider giving a smaller amount monthly instead? Your ongoing support helps sustain this mission long-term.",
  ),

  // Custom domain settings
  customDomain: text("custom_domain"),
  customDomainSSLStatus: text("custom_domain_ssl_status").default("pending"), // pending, active, failed
  whitelabelEnabled: boolean("whitelabel_enabled").default(false),

  // Campaign display settings
  campaignDisplayMode: text("campaign_display_mode").default("dropdown"), // dropdown, pages

  // Church Management Settings
  churchManagementEnabled: boolean("church_management_enabled").default(false),

  // Association Management Settings
  associationManagementEnabled: boolean(
    "association_management_enabled",
  ).default(false),

  // ACH Payments Settings
  achPaymentsEnabled: boolean("ach_payments_enabled").default(false),

  // Terminal Mode Settings (mobile-friendly keypad for in-person donations)
  terminalModeEnabled: boolean("terminal_mode_enabled").default(false),

  // GETTRX required fields for merchant applications
  legalBusinessName: text("legal_business_name"),
  businessPhone: text("business_phone"),
  customerServicePhone: text("customer_service_phone"),
  
  // GETTRX Customer ID (for when organization makes payments, e.g., subscriptions)
  gettrxCustomerId: text("gettrx_customer_id"),

  // Organization type for classification and features
  organizationType: text("organization_type"), // pregnancy-center, church, ministry, nonprofit, etc.

  // Subscription tier for feature unlocking and custom domain access
  subscriptionTier: text("subscription_tier").default("basic"), // basic, pro, elite
  
  // Subscription management fields
  subscriptionStatus: text("subscription_status").default("inactive"), // inactive, active, past_due, canceled, trialing
  subscriptionStartDate: timestamp("subscription_start_date"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  billingCycleAnchor: timestamp("billing_cycle_anchor"), // Day of month billing occurs
  lastPaymentDate: timestamp("last_payment_date"),
  nextBillingDate: timestamp("next_billing_date"),
  paymentMethodId: text("payment_method_id"), // GETTRX stored payment method ID
  subscriptionPlanId: text("subscription_plan_id"), // pro_monthly, elite_monthly, etc.
  subscriptionAmount: decimal("subscription_amount", { precision: 10, scale: 2 }),
  failedPaymentAttempts: integer("failed_payment_attempts").default(0),
  gracePeriodEndsAt: timestamp("grace_period_ends_at"),

  // Organization settings (JSON for flexible configuration)
  settings: jsonb("settings"),

  // Integration Settings for SMS/Voice, Marketing, and CRM
  smsProvider: text("sms_provider"), // twilio, etc.
  smsConnectionStatus: text("sms_connection_status"), // connected, disconnected, error, pending
  smsMetadata: jsonb("sms_metadata"), // Provider-specific configuration and settings

  marketingProvider: text("marketing_provider"), // constant_contact, mailchimp, etc.
  marketingConnectionStatus: text("marketing_connection_status"), // connected, disconnected, error, pending
  marketingMetadata: jsonb("marketing_metadata"), // Provider-specific configuration and settings

  crmProvider: text("crm_provider"), // salesforce, hubspot, etc.
  crmConnectionStatus: text("crm_connection_status"), // connected, disconnected, error, pending
  crmMetadata: jsonb("crm_metadata"), // Provider-specific configuration and settings

  // BTCPay Server Integration Settings
  btcpayEnabled: boolean("btcpay_enabled").default(false), // Whether cryptocurrency payments are enabled
  btcpayServerUrl: text("btcpay_server_url"), // URL of the BTCPay Server instance
  btcpayStoreId: text("btcpay_store_id"), // BTCPay Store ID for this organization
  btcpayApiKey: text("btcpay_api_key"), // API key for BTCPay Server (encrypted)
  btcpayWebhookSecret: text("btcpay_webhook_secret"), // Webhook secret for verification
  btcpayConnectionStatus: text("btcpay_connection_status"), // connected, disconnected, error, pending
  btcpayMetadata: jsonb("btcpay_metadata"), // BTCPay-specific configuration and settings

  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payment Methods - Provider-agnostic payment method storage (GETTRX, BTCPay, Stripe, etc.)
export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  
  // Provider abstraction - supports multiple payment processors
  paymentProvider: text("payment_provider").notNull(), // gettrx, btcpay, stripe, apple_pay, etc.
  providerPaymentMethodId: text("provider_payment_method_id").notNull(), // Provider-specific payment method ID
  paymentMethodType: text("payment_method_type").notNull(), // card, ach, crypto, apple_pay, google_pay, stock, etc.
  
  // Card-specific fields (nullable for non-card payment methods)
  lastFour: text("last_four"), // Last 4 digits for display
  cardBrand: text("card_brand"), // visa, mastercard, amex, discover, etc.
  expiryMonth: integer("expiry_month"),
  expiryYear: integer("expiry_year"),
  
  // Crypto-specific fields (nullable for non-crypto payment methods)
  cryptoAddress: text("crypto_address"), // Wallet address or invoice ID
  cryptoType: text("crypto_type"), // btc, eth, ltc, etc.
  
  // ACH/Bank-specific fields (nullable for non-ACH payment methods)
  bankName: text("bank_name"),
  accountType: text("account_type"), // checking, savings
  
  // Universal fields
  isDefault: boolean("is_default").default(false),
  priority: integer("priority").default(0), // 0 = highest priority (default), 1+ = fallback methods
  lastUsedAt: timestamp("last_used_at"),
  lastSuccessAt: timestamp("last_success_at"),
  lastFailureAt: timestamp("last_failure_at"),
  failureCount: integer("failure_count").default(0),
  status: text("status").default("active"), // active, expired, failed, disabled
  
  // Provider-specific metadata stored as JSONB for flexibility
  providerMetadata: jsonb("provider_metadata"), // Provider-specific data (tokenization details, etc.)
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  orgDefaultIdx: index("payment_methods_org_default_idx").on(table.organizationId, table.isDefault),
  providerIdx: index("payment_methods_provider_idx").on(table.paymentProvider, table.providerPaymentMethodId),
}));

// Subscription Products - Different types of subscriptions (custom_domain, storage, seats, etc.)
export const subscriptionProducts = pgTable("subscription_products", {
  id: serial("id").primaryKey(),
  productCode: text("product_code").notNull().unique(), // custom_domain, storage_tier, user_seats, etc.
  name: text("name").notNull(), // "Custom Domain", "Storage Upgrade", etc.
  description: text("description"),
  category: text("category"), // infrastructure, features, capacity, etc.
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Subscription Plans - Specific pricing plans for each product
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => subscriptionProducts.id, { onDelete: "cascade" }),
  planCode: text("plan_code").notNull().unique(), // pro_monthly, elite_monthly, storage_100gb_monthly, etc.
  name: text("name").notNull(), // "Pro Plan - Monthly", "Elite Plan - Monthly", etc.
  description: text("description"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // Monthly price
  currency: text("currency").default("USD"),
  billingInterval: text("billing_interval").default("month"), // month, year
  tierLevel: text("tier_level"), // basic, pro, elite (for tiered products)
  features: jsonb("features"), // Array of feature codes included in this plan
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  productPlanIdx: index("subscription_plans_product_idx").on(table.productId),
}));

// Organization Subscriptions - Tracks active subscriptions for each organization
export const organizationSubscriptions = pgTable("organization_subscriptions", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  planId: integer("plan_id").notNull().references(() => subscriptionPlans.id),
  productId: integer("product_id").notNull().references(() => subscriptionProducts.id),
  status: text("status").default("active"), // active, past_due, canceled, trialing, grace_period
  
  // Billing information
  startDate: timestamp("start_date").notNull().defaultNow(),
  endDate: timestamp("end_date"), // Null for active, set on cancellation
  nextBillingDate: timestamp("next_billing_date"),
  lastBillingDate: timestamp("last_billing_date"),
  billingCycleAnchor: timestamp("billing_cycle_anchor"), // Day of month billing occurs
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  
  // Payment method and retry logic
  primaryPaymentMethodId: integer("primary_payment_method_id").references(() => paymentMethods.id),
  failedAttempts: integer("failed_attempts").default(0),
  lastAttemptDate: timestamp("last_attempt_date"),
  nextRetryDate: timestamp("next_retry_date"),
  gracePeriodEndsAt: timestamp("grace_period_ends_at"),
  
  // Cancellation tracking
  canceledAt: timestamp("canceled_at"),
  cancelReason: text("cancel_reason"),
  
  // Metadata
  metadata: jsonb("metadata"), // Additional subscription-specific data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  orgStatusIdx: index("org_subscriptions_org_status_idx").on(table.organizationId, table.status),
  nextBillingIdx: index("org_subscriptions_next_billing_idx").on(table.nextBillingDate),
}));

// Subscription Features - Maps features to subscription plans
export const subscriptionFeatures = pgTable("subscription_features", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull().references(() => subscriptionPlans.id, { onDelete: "cascade" }),
  featureCode: text("feature_code").notNull(), // custom_domain, advanced_analytics, white_label, etc.
  featureName: text("feature_name").notNull(),
  featureValue: text("feature_value"), // For features with values (e.g., storage limit)
  isEnabled: boolean("is_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  planFeatureIdx: index("subscription_features_plan_idx").on(table.planId),
}));

// Users (admins for organizations)
export const users = pgTable("users", {
  id: varchar("id").primaryKey(), // UUID primary key (default set at database level)
  email: text("email").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  phone: text("phone"),
  title: text("title"),
  bio: text("bio"),
  location: text("location"),
  organizationId: integer("organization_id").references(() => organizations.id), // Primary organization
  activeOrganizationId: integer("active_organization_id").references(() => organizations.id), // Currently active organization
  role: text("role").default("admin"), // admin, user, super_admin, donor
  hashedPassword: text("hashed_password"),
  mustChangePassword: boolean("must_change_password").default(false), // Force password change on next login (for auto-generated passwords)
  emailVerified: timestamp("email_verified"),
  isActive: boolean("is_active").default(true),
  provider: text("provider"),
  providerId: text("provider_id"),
  onboardingStep: integer("onboarding_step"),
  onboardingCompleted: boolean("onboarding_completed"),
  tourCompleted: boolean("tour_completed").default(false),
  tourProgress: jsonb("tour_progress"), // Tracks which tour steps have been completed
  featureTutorials: jsonb("feature_tutorials"), // Tracks completion of specific feature tutorials
  customPermissions: jsonb("custom_permissions"),
  twoFactorEnabled: boolean("two_factor_enabled"),
  ipRestrictions: jsonb("ip_restrictions"),
  dailyEmailEnabled: boolean("daily_email_enabled"),
  dailyEmailTime: text("daily_email_time"),
  dataExportPermissions: jsonb("data_export_permissions"),
  donorInfoMasked: boolean("donor_info_masked"),
  lastLoginAt: timestamp("last_login_at"),
  loginAttempts: integer("login_attempts"),
  accountLockedUntil: timestamp("account_locked_until"),
  twoFactorSecret: text("two_factor_secret"),
  twoFactorBackupCodes: jsonb("two_factor_backup_codes"),
  twoFactorAppPreference: text("two_factor_app_preference"),
  roleId: integer("role_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Organizations (Junction table for multi-organization access)
export const userOrganizations = pgTable("user_organizations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  role: text("role").default("admin"), // admin, user, viewer
  accessType: text("access_type").default("full"), // full, limited, read-only
  permissions: jsonb("permissions"), // Custom permissions for this org
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Campaigns
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizations.id),
  name: text("name").notNull(),
  description: text("description"),
  slug: text("slug").notNull(),
  goal: decimal("goal", { precision: 10, scale: 2 }),
  raised: decimal("raised", { precision: 10, scale: 2 }).default("0"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),

  // Media and presentation
  logoUrl: text("logo_url"),
  showLogo: boolean("show_logo").default(true), // Optional logo display
  logoPosition: text("logo_position").default("top-left"), // top-left, top-center, top-right
  bannerImageUrl: text("banner_image_url"),
  bannerVideoUrl: text("banner_video_url"),
  bannerDisplayStyle: text("banner_display_style").default("full-width"), // full-width, above-video
  mainImageUrl: text("main_image_url"),
  mainVideoUrl: text("main_video_url"),
  videoType: text("video_type"), // youtube, vimeo, mp4

  // Page settings
  hasFullPage: boolean("has_full_page").default(false), // true for storytelling pages
  embedCode: text("embed_code"),
  qrCodeUrl: text("qr_code_url"),

  // Cloning support
  clonedFromId: integer("cloned_from_id"),

  // Social sharing
  socialShareEnabled: boolean("social_share_enabled").default(true),

  // Fee handling/passthrough settings
  surchargeOption: text("surcharge_option").default("pre-toggled"), // pre-toggled, toggle-off, disabled

  // Donation wizard display toggles
  showImpactSection: boolean("show_impact_section").default(true),
  showSocialProof: boolean("show_social_proof").default(true),
  showTrustBadges: boolean("show_trust_badges").default(true),
  showLiveDonors: boolean("show_live_donors").default(true),

  // Color customization with warm defaults
  backgroundColor: text("background_color").default("#FFF5EB"), // Warm cream
  accentColor: text("accent_color").default("#E07856"), // Warm terracotta/coral

  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  
  // Reference to donation page (REQUIRED - campaigns must belong to a donation page)
  // RESTRICT prevents deletion of donation page if campaigns exist
  donationPageId: integer("donation_page_id").notNull().references(() => donationPages.id, { onDelete: "restrict" }),
});

// Campaign Categories (Sub-categories within campaigns with independent goals)
export const campaignCategories = pgTable("campaign_categories", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id")
    .notNull()
    .references(() => campaigns.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g., "Food Program", "Medical Supplies"
  description: text("description"),
  goal: decimal("goal", { precision: 10, scale: 2 }).notNull(), // Individual fundraising goal
  raised: decimal("raised", { precision: 10, scale: 2 }).default("0"), // Amount raised for this category
  sortOrder: integer("sort_order").default(0), // Display order
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Donation Pages (Top-level branded container for multiple campaigns)
export const donationPages = pgTable(
  "donation_pages",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(), // unique per organization
    description: text("description"),
    
    // Branding and media
    logoUrl: text("logo_url"),
    showLogo: boolean("show_logo").default(true),
    logoPosition: text("logo_position").default("top-left"), // top-left, top-center, top-right
    primaryColor: text("primary_color"),
    secondaryColor: text("secondary_color"),
    headerImageUrl: text("header_image_url"),
    videoUrl: text("video_url"),
    videoType: text("video_type"), // youtube, vimeo, mp4
    
    // Layout and display
    layout: text("layout").default("grid"), // grid, list, featured
    featuredCampaignIds: jsonb("featured_campaign_ids").default([]), // array for ordering
    
    // Embedding and SEO
    embedAllowedOrigins: jsonb("embed_allowed_origins").default([]), // domains allowed to embed
    ogTitle: text("og_title"),
    ogDescription: text("og_description"),
    ogImageUrl: text("og_image_url"),
    
    // Custom URL and subdomain functionality
    customUrl: text("custom_url"), // e.g., 'kenya-nairobi', 'giving'
    customDomain: text("custom_domain"), // e.g., 'donate.organization.org'
    subdomain: text("subdomain"), // e.g., 'sponsor' for sponsor.prolifeprosper.com
    urlStyle: text("url_style").default("standard"), // standard, custom, subdomain
    
    // Template system
    templateId: text("template_id"), // e.g., 'sponsor-a-child', 'church-giving', 'disaster-relief'
    templateName: text("template_name"), // Human-readable template name
    
    // Optional default fund for page-level donations
    defaultFundId: integer("default_fund_id").references(() => funds.id),
    
    // Fee handling/passthrough settings
    surchargeOption: text("surcharge_option").default("pre-toggled"), // pre-toggled, toggle-off, disabled
    
    // Quick Donate Button Customization
    quickDonateButtonText: text("quick_donate_button_text").default("Donate Now"), // Customizable text for the main donate button
    
    // Checkout Settings (Donor Information Requirements)
    allowGuestCheckout: boolean("allow_guest_checkout").default(true),
    minimalDataCollectionEnabled: boolean("minimal_data_collection_enabled").default(false),
    promptForEmailAfterDonation: boolean("prompt_for_email_after_donation").default(true),
    defaultEmailFieldChecked: boolean("default_email_field_checked").default(true),
    minimalDataMaxAmount: decimal("minimal_data_max_amount", { precision: 10, scale: 2 }).default("500.00"), // Max amount for minimal checkout (fraud prevention)
    guestCheckoutNotice: text("guest_checkout_notice").default("ZIP code required. Provide your email for a receipt and updates (optional, unsubscribe anytime)."),
    
    // Status and metadata
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    // Ensure slug is unique per organization
    orgSlugIdx: index("donation_pages_org_slug_idx").on(table.organizationId, table.slug),
  })
);

// Custom Fields for Donation Pages
export const donationPageCustomFields = pgTable("donation_page_custom_fields", {
  id: serial("id").primaryKey(),
  donationPageId: integer("donation_page_id")
    .notNull()
    .references(() => donationPages.id, { onDelete: "cascade" }),
  fieldId: text("field_id").notNull(), // unique identifier for the field
  label: text("label").notNull(),
  fieldType: text("field_type").notNull(), // text, email, phone, number, date, select, checkbox, textarea
  required: boolean("required").default(false),
  placeholder: text("placeholder"),
  helpText: text("help_text"),
  options: jsonb("options"), // for select fields
  defaultValue: text("default_value"),
  order: integer("order").notNull().default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  donationPageIdx: index("donation_page_custom_fields_page_idx").on(table.donationPageId),
}));

// Donation Products (Give Your Best Gift items)
export const donationProducts = pgTable(
  "donation_products",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    imageUrl: text("image_url"), // Primary/featured image (backwards compatibility)
    videoUrl: text("video_url"), // Single video URL
    videoType: text("video_type"), // youtube, vimeo, mp4

    // Donation tiers (stored as JSON array of tier objects)
    tiers: jsonb("tiers").notNull(), // [{ amount: 25, title: "Basic", items: ["item1"], description: "desc" }]
    defaultAmount: integer("default_amount"),

    // Social sharing and SEO
    ogTitle: text("og_title"),
    ogDescription: text("og_description"),
    ogImageUrl: text("og_image_url"),

    // QR Code
    qrCodeUrl: text("qr_code_url"),

    // Embed settings
    embedEnabled: boolean("embed_enabled").default(true),

    // Lead capture settings
    leadCaptureEnabled: boolean("lead_capture_enabled").default(false),
    leadCaptureListId: text("lead_capture_list_id"), // SendGrid list ID for lead storage

    // Donation-only option (allows giving without selecting a product/tier)
    donationOnlyEnabled: boolean("donation_only_enabled").default(true),

    // Professional page settings
    heroTitle: text("hero_title"), // Custom hero title (defaults to name if empty)
    heroSubtitle: text("hero_subtitle"), // Subtitle/tagline for the hero section
    ctaText: text("cta_text"), // Custom call-to-action text
    suggestedAmounts: jsonb("suggested_amounts"), // Array of suggested donation amounts: [25, 50, 100, 250]

    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    orgIdx: index("donation_products_org_idx").on(table.organizationId),
    slugIdx: index("donation_products_slug_idx").on(table.slug),
  }),
);

// Tier schema for donation products
export const tierSchema = z.object({
  amount: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().optional().default(""),
  items: z.array(z.string()).default([]),
  imageUrl: z.string().url().optional().nullable(), // New field for tier-specific images
});

export type Tier = z.infer<typeof tierSchema>;

// Products (for sellable items: books, courses, packages, digital/physical products)
export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(), // Will add unique constraint later
    description: text("description"),

    // Media
    imageUrl: text("image_url"), // Primary product image
    videoUrl: text("video_url"),
    videoType: text("video_type"), // youtube, vimeo, mp4

    // Classification
    productType: text("product_type").notNull(), // book, course, package, digital, physical
    categories: jsonb("categories"), // String array for categories
    tags: jsonb("tags"), // String array for tags

    // Pricing
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    compareAtPrice: decimal("compare_at_price", { precision: 10, scale: 2 }), // Optional "was" price
    currency: text("currency").default("USD"),

    // Product details
    sku: varchar("sku", { length: 100 }),
    attributes: jsonb("attributes"), // Key-value pairs for flexible product attributes

    // Inventory
    trackInventory: boolean("track_inventory").default(false),
    inventoryQty: integer("inventory_qty"),
    shippingRequired: boolean("shipping_required").default(false),
    weight: decimal("weight", { precision: 8, scale: 2 }), // in grams
    dimensions: jsonb("dimensions"), // { length, width, height } in cm

    // Digital products
    isDigital: boolean("is_digital").default(false),
    digitalDownloadUrl: text("digital_download_url"),
    digitalMetadata: jsonb("digital_metadata"), // File info, access instructions, etc.

    // Course-specific metadata
    courseMetadata: jsonb("course_metadata"), // { durationMinutes, lessonsCount, providerUrl, etc. }

    // SEO
    ogTitle: text("og_title"),
    ogDescription: text("og_description"),
    ogImageUrl: text("og_image_url"),

    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    orgIdx: index("products_org_idx").on(table.organizationId),
    slugIdx: index("products_slug_idx").on(table.slug),
    typeIdx: index("products_type_idx").on(table.productType),
    skuIdx: index("products_sku_idx").on(table.sku),
  }),
);

// Lead Captures (for email collection before donations)
export const leadCaptures = pgTable(
  "lead_captures",
  {
    id: serial("id").primaryKey(),
    donationProductId: integer("donation_product_id")
      .notNull()
      .references(() => donationProducts.id),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id),
    email: text("email").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    phone: text("phone"),
    source: text("source"), // page_load, exit_intent, donation_attempt, etc.
    consentGiven: boolean("consent_given").default(true), // GDPR/privacy consent
    sendGridListId: text("sendgrid_list_id"), // Which SendGrid list was this added to
    sendGridContactId: text("sendgrid_contact_id"), // SendGrid's ID for the contact
    userAgent: text("user_agent"), // For bot detection
    ipAddress: text("ip_address"), // For rate limiting and fraud detection
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    emailIdx: index("lead_captures_email_idx").on(table.email),
    orgIdx: index("lead_captures_org_idx").on(table.organizationId),
    productIdx: index("lead_captures_product_idx").on(table.donationProductId),
  }),
);

// Donors
export const donors = pgTable("donors", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizations.id),
  
  // User Account Integration - Links donor to user account for portal access
  userId: varchar("user_id").references(() => users.id), // Links to users table for donor portal access
  
  totalDonated: decimal("total_donated", { precision: 10, scale: 2 }).default(
    "0",
  ),
  donationCount: integer("donation_count").default(0),
  firstDonationAt: timestamp("first_donation_at"),
  lastDonationAt: timestamp("last_donation_at"),
  achievementBadges: jsonb("achievement_badges"), // Array of achievement badges

  // GETTRX Customer Integration
  gettrxCustomerId: text("gettrx_customer_id"), // GETTRX customer ID for saved payment methods

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payment Accounts - Separate payment routing layer
export const paymentAccounts = pgTable("payment_accounts", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizations.id),
  
  // Payment processor details
  provider: text("provider").notNull().default("gettrx"), // gettrx, stripe, etc.
  merchantAccountId: text("merchant_account_id").notNull(), // GETTRX or other processor account ID
  
  // Account status and settings
  status: text("status").default("pending"), // pending, active, suspended, failed
  isDefault: boolean("is_default").default(false), // One default per organization
  isActive: boolean("is_active").default(true),
  
  // Account metadata
  name: text("name"), // Human-friendly name (e.g., "Main Account", "Church Offerings Account")
  description: text("description"),
  metadata: jsonb("metadata"), // Provider-specific configuration
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  orgIdx: index("payment_accounts_org_idx").on(table.organizationId),
  merchantIdx: index("payment_accounts_merchant_idx").on(table.merchantAccountId),
  defaultIdx: index("payment_accounts_default_idx").on(table.organizationId, table.isDefault),
}));

// Funds - Central accounting units for payment attribution
export const funds = pgTable("funds", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizations.id),
  name: text("name").notNull(), // e.g., "General Fund", "Building Fund", "Mission Fund"
  code: text("code"), // Optional short code for reporting
  type: text("type").notNull(), // general, church_offering, restricted, campaign, product, event, sponsorship, auction, text_to_give, kiosk, virtual_terminal, manual_gift
  description: text("description"),
  
  // Optional routing override (if null, uses organization's default payment account)
  paymentAccountId: integer("payment_account_id").references(() => paymentAccounts.id),
  
  // Fund settings and configuration
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false), // One per organization
  settings: jsonb("settings"), // Flexible configuration (e.g., restrictions, allocation rules)
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  orgIdx: index("funds_org_idx").on(table.organizationId),
  typeIdx: index("funds_type_idx").on(table.type),
  defaultIdx: index("funds_default_idx").on(table.organizationId, table.isDefault),
}));

// Donations - Enhanced with hybrid attribution system
export const donations = pgTable("donations", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizations.id),
  
  // NEW: Required fund attribution - every payment must be assigned to a fund
  fundId: integer("fund_id")
    .notNull()
    .references(() => funds.id),
  
  // NEW: Context attribution - what generated this payment
  contextType: text("context_type"), // campaign, product, event, auction, kiosk, text_to_give, virtual_terminal, manual_gift, general
  contextId: integer("context_id"), // ID of the campaign/product/event that generated this donation
  
  // NEW: Payment routing - which merchant account processed this
  paymentAccountId: integer("payment_account_id")
    .notNull()
    .references(() => paymentAccounts.id),
  
  // NEW: Source tracking - where the payment originated
  source: text("source").notNull(), // website, kiosk, text, virtual_terminal, api, mobile_app, embed, qr_code
  
  // NEW: External transaction ID for idempotency
  externalTxId: text("external_tx_id"), // GETTRX transaction ID or other processor ID
  
  // NEW: Amount in cents for better precision (while keeping decimal for backwards compatibility)
  amountCents: integer("amount_cents"), // Amount in cents for precise calculations
  currency: text("currency").default("usd"),

  // EXISTING: Legacy campaign reference (maintained for backwards compatibility)
  campaignId: integer("campaign_id").references(() => campaigns.id),
  donorId: integer("donor_id").references(() => donors.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  feeAmount: decimal("fee_amount", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(), // card, ach, apple_pay, google_pay, crypto, stock, cash, check, wire_transfer, money_order, imported
  paymentProcessorId: text("payment_processor_id"),
  status: text("status").default("pending"), // pending, completed, failed, refunded
  
  // External Donation Tracking - For historical/offline donations (cash, check, etc.)
  isExternalDonation: boolean("is_external_donation").default(false), // Quick flag for external vs platform donations
  externalPaymentType: text("external_payment_type"), // cash, check, wire_transfer, money_order, stock_transfer, in_kind, null for platform
  externalReferenceNumber: text("external_reference_number"), // Check number, wire reference, receipt number, etc.
  externalNotes: text("external_notes"), // Additional notes for external donations
  isAnonymous: boolean("is_anonymous").default(false),
  isRecurring: boolean("is_recurring").default(false),
  recurringInterval: text("recurring_interval"), // monthly, quarterly, annually
  donorCoversFees: boolean("donor_covers_fees").default(false),
  donorEmail: text("donor_email"),
  donorFirstName: text("donor_first_name"),
  donorLastName: text("donor_last_name"),

  // GETTRX Integration Fields
  gettrxPaymentRequestId: text("gettrx_payment_request_id"), // GETTRX payment request ID
  gettrxCustomerId: text("gettrx_customer_id"), // GETTRX customer ID used for this payment
  gettrxPaymentMethodId: text("gettrx_payment_method_id"), // GETTRX payment method ID if using saved method
  authResponseCode: text("auth_response_code"), // Authorization response code (00=Approved, 51=Insufficient funds, N7=Invalid CVV, 05=Do not honor)

  // Terminal Mode Fields
  deviceId: text("device_id"), // Terminal device identifier (Dejavoo P8 serial, etc.)
  tipAmount: decimal("tip_amount", { precision: 10, scale: 2 }).default("0"), // Tip/gratuity amount
  receiptType: text("receipt_type"), // email, sms, both, none
  transactionNotes: text("transaction_notes"), // Memo/notes for transaction

  // Deduplication and Checkout Mode Tracking
  uniqueDonorId: uuid("unique_donor_id").defaultRandom(), // UUID for unique identification
  donorZipCode: text("donor_zip_code"), // ZIP code for deduplication and regional reporting (always collected)
  checkoutMode: text("checkout_mode").default("standard"), // standard, guest_full, guest_minimal
  duplicateFlag: boolean("duplicate_flag").default(false), // Flag for potential duplicate (same name+ZIP within 24hrs)
  duplicateFlaggedAt: timestamp("duplicate_flagged_at"), // Timestamp when duplicate was flagged
  normalizedName: text("normalized_name"), // Lowercase, trimmed full name for fuzzy matching
  paymentIdentifierHash: text("payment_identifier_hash"), // Hash of payment method identifier for matching

  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Performance indexes for high-volume operations
  orgCreatedIdx: index("donations_org_created_idx").on(table.organizationId, table.createdAt),
  orgDonorIdx: index("donations_org_donor_idx").on(table.organizationId, table.donorId),
  fundIdx: index("donations_fund_idx").on(table.fundId),
  contextIdx: index("donations_context_idx").on(table.contextType, table.contextId),
  externalTxIdx: index("donations_external_tx_idx").on(table.organizationId, table.externalTxId),
  sourceIdx: index("donations_source_idx").on(table.source),
  // Deduplication indexes for efficient duplicate detection
  dedupNameZipIdx: index("donations_dedup_name_zip_idx").on(table.organizationId, table.normalizedName, table.donorZipCode),
  dedupPaymentIdx: index("donations_dedup_payment_idx").on(table.organizationId, table.donorZipCode, table.paymentIdentifierHash),
  duplicateFlagIdx: index("donations_duplicate_flag_idx").on(table.organizationId, table.duplicateFlag, table.createdAt),
}));

// GETTRX Payment Methods (for storing tokenized payment methods)
export const gettrxPaymentMethods = pgTable("gettrx_payment_methods", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizations.id),
  donorId: integer("donor_id")
    .notNull()
    .references(() => donors.id),

  // GETTRX identifiers
  gettrxCustomerId: text("gettrx_customer_id").notNull(),
  gettrxPaymentMethodId: text("gettrx_payment_method_id").notNull(),

  // Payment method details (non-sensitive)
  payment_type: text("payment_type"), // card, us_bank_account, google_pay, apple_pay
  brand: text("brand"), // visa, mastercard, amex, etc. (for cards)
  last_four: text("last_four"),
  exp_month: integer("exp_month"),
  exp_year: integer("exp_year"),
  
  // Bank account details (for ACH payments)
  bank_name: text("bank_name"),
  account_type: text("account_type"), // checking, savings
  routing_number_last4: text("routing_number_last4"),
  account_holder_type: text("account_holder_type"), // individual, business

  // Usage settings
  usageType: text("usage_type").default("off_session"), // off_session, on_session
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),

  // Donor consent and compliance
  consentGiven: boolean("consent_given").default(false),
  consentTimestamp: timestamp("consent_timestamp"),
  consentIpAddress: text("consent_ip_address"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// GETTRX Transfers (for tracking transfers to organizations)
export const gettrxTransfers = pgTable("gettrx_transfers", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizations.id),

  // GETTRX transfer details
  gettrxTransferId: text("gettrx_transfer_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("usd"),
  destination: text("destination").notNull(), // GETTRX destination account

  status: text("status").default("pending"), // pending, completed, failed, cancelled
  description: text("description"),

  // Related donations (if applicable)
  relatedDonationIds: jsonb("related_donation_ids"), // Array of donation IDs included in this transfer

  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// GETTRX Recurring Billing Schedule
export const gettrxRecurringSchedules = pgTable("gettrx_recurring_schedules", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizations.id),
  donorId: integer("donor_id")
    .notNull()
    .references(() => donors.id),
  campaignId: integer("campaign_id").references(() => campaigns.id),
  paymentMethodId: integer("payment_method_id")
    .notNull()
    .references(() => gettrxPaymentMethods.id),

  // Recurring details
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("usd"),
  interval: text("interval").notNull(), // monthly, quarterly, annually
  intervalCount: integer("interval_count").default(1), // e.g., every 2 months

  // Schedule timing
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"), // null for indefinite
  nextPaymentDate: timestamp("next_payment_date").notNull(),
  lastPaymentDate: timestamp("last_payment_date"),

  // Status and tracking
  status: text("status").default("active"), // active, paused, cancelled, completed
  totalPayments: integer("total_payments").default(0),
  failedAttempts: integer("failed_attempts").default(0),
  maxFailedAttempts: integer("max_failed_attempts").default(3),

  // Donor preferences
  donorCoversFees: boolean("donor_covers_fees").default(false),
  sendReminders: boolean("send_reminders").default(true),

  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// GETTRX Merchant Applications (for onboarding)
export const gettrxMerchantApplications = pgTable(
  "gettrx_merchant_applications",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id),

    // GETTRX Application IDs
    gettrxApplicationId: text("gettrx_application_id").notNull().unique(),
    gettrxAccountId: text("gettrx_account_id"), // Populated after approval
    templateId: text("template_id").notNull(), // Onboarding template ID
    externalReferenceId: text("external_reference_id"), // Our internal reference

    // Application status
    status: text("status").notNull().default("pending"), // pending, submitted, approved, declined, incomplete
    submissionStatus: text("submission_status").default("draft"), // draft, pending_acceptance, ready_for_submission, submitted
    underwritingStatus: text("underwriting_status"), // in_review, approved, declined, additional_info_required

    // Business Information
    legalBusinessName: text("legal_business_name").notNull(),
    businessNameDBA: text("business_name_dba"),
    businessWebsite: text("business_website"),
    businessPhone: text("business_phone"),
    customerServicePhone: text("customer_service_phone"),
    ein: text("ein"),
    businessRegistrationType: text("business_registration_type"), // llc, corporation, sole_proprietorship, partnership
    businessRegistrationState: text("business_registration_state"),
    businessStartYear: integer("business_start_year"),
    businessStartMonth: integer("business_start_month"),

    // Address Information
    businessAddress: text("business_address"),
    businessCity: text("business_city"),
    businessState: text("business_state"),
    businessZipcode: text("business_zipcode"),
    billingAddress: text("billing_address"),
    billingCity: text("billing_city"),
    billingState: text("billing_state"),
    billingZipcode: text("billing_zipcode"),

    // Processing Information
    estimatedMonthlySales: integer("estimated_monthly_sales"),
    avgAmountPerSale: integer("avg_amount_per_sale"),
    highSaleAmount: integer("high_sale_amount"),
    productOrServiceDescription: text("product_or_service_description"),
    currentProcessorName: text("current_processor_name"),

    // Banking Information
    bankName: text("bank_name"),
    routingNumber: text("routing_number"),
    accountNumber: text("account_number"), // Encrypted in production

    // Payment Methods Distribution
    onlinePaymentsPercentage: integer("online_payments_percentage").default(
      100,
    ),
    inStorePaymentsPercentage: integer("in_store_payments_percentage").default(
      0,
    ),
    keyedInPaymentsPercentage: integer("keyed_in_payments_percentage").default(
      0,
    ),

    // Principal Information (JSON for flexibility with multiple principals)
    businessPrincipals: jsonb("business_principals").notNull(),

    // Signers Information (from GETTRX response)
    signers: jsonb("signers"), // Array of signer objects with IDs and types

    // Processing Equipment & Gateways
    processingEquipment: jsonb("processing_equipment"),

    // MOTO/E-commerce Questionnaire
    motoQuestionnaire: jsonb("moto_questionnaire"),

    // Security and Compliance
    securityInfo: jsonb("security_info"),

    // Application Settings
    hasPortalAccess: boolean("has_portal_access").default(true),
    autoSubmitEnabled: boolean("auto_submit_enabled").default(true),

    // Acceptance Tracking
    acceptanceCollected: boolean("acceptance_collected").default(false),
    acceptanceCollectedAt: timestamp("acceptance_collected_at"),
    primarySignerAcceptanceCollected: boolean(
      "primary_signer_acceptance_collected",
    ).default(false),
    allSignersAcceptanceCollected: boolean(
      "all_signers_acceptance_collected",
    ).default(false),

    // Webhook and Notification Settings
    notificationEmails: text("notification_emails").array(),
    webhookUrl: text("webhook_url"),

    // Error and Issue Tracking
    lastError: text("last_error"),
    submissionAttempts: integer("submission_attempts").default(0),
    lastSubmissionAttempt: timestamp("last_submission_attempt"),

    // Application lifecycle
    submittedAt: timestamp("submitted_at"),
    approvedAt: timestamp("approved_at"),
    declinedAt: timestamp("declined_at"),
    activatedAt: timestamp("activated_at"),

    // Metadata for additional info
    applicationMetadata: jsonb("application_metadata"),
    notes: text("notes"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    orgIdx: index("gettrx_merchant_applications_org_idx").on(
      table.organizationId,
    ),
    statusIdx: index("gettrx_merchant_applications_status_idx").on(
      table.status,
    ),
    applicationIdx: index("gettrx_merchant_applications_app_id_idx").on(
      table.gettrxApplicationId,
    ),
    accountIdx: index("gettrx_merchant_applications_account_id_idx").on(
      table.gettrxAccountId,
    ),
  }),
);

// GETTRX Acceptance Tokens (temporary tokens for signature collection)
export const gettrxAcceptanceTokens = pgTable(
  "gettrx_acceptance_tokens",
  {
    id: serial("id").primaryKey(),
    applicationId: integer("application_id")
      .notNull()
      .references(() => gettrxMerchantApplications.id),
    signerId: text("signer_id").notNull(), // GETTRX signer ID
    signerType: text("signer_type").notNull(), // primary_signer, secondary_signer

    // Token Information
    acceptanceToken: text("acceptance_token").notNull(),
    expiresAt: timestamp("expires_at").notNull(),

    // Collection Status
    isCollected: boolean("is_collected").default(false),
    collectedAt: timestamp("collected_at"),
    collectionIpAddress: text("collection_ip_address"),
    collectionUserAgent: text("collection_user_agent"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    applicationIdx: index("gettrx_acceptance_tokens_app_idx").on(
      table.applicationId,
    ),
    signerIdx: index("gettrx_acceptance_tokens_signer_idx").on(table.signerId),
    tokenIdx: index("gettrx_acceptance_tokens_token_idx").on(
      table.acceptanceToken,
    ),
  }),
);

// GETTRX Webhook Events (for idempotency protection and audit trail)
export const gettrxWebhookEvents = pgTable(
  "gettrx_webhook_events",
  {
    id: serial("id").primaryKey(),

    // Webhook Event Identification
    webhookEventId: text("webhook_event_id").notNull().unique(), // GETTRX webhook event ID
    eventType: text("event_type").notNull(), // application.created, application.approved, etc.

    // Related Data
    applicationId: text("application_id"), // GETTRX application ID from webhook
    organizationId: integer("organization_id").references(
      () => organizations.id,
    ),

    // Processing Status
    status: text("status").default("pending"), // pending, processed, failed
    processedAt: timestamp("processed_at"),

    // Request Metadata
    signature: text("signature"), // Webhook signature for verification
    timestamp: timestamp("timestamp").notNull(), // Webhook timestamp for replay protection
    ipAddress: text("ip_address"), // Source IP for security audit

    // Payload and Processing
    rawPayload: jsonb("raw_payload").notNull(), // Full webhook payload for debugging
    processingResult: jsonb("processing_result"), // Result of processing attempt
    errorMessage: text("error_message"), // Error details if processing failed
    retryCount: integer("retry_count").default(0),

    // Audit Trail
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    eventIdIdx: index("gettrx_webhook_events_event_id_idx").on(
      table.webhookEventId,
    ),
    orgIdx: index("gettrx_webhook_events_org_idx").on(table.organizationId),
    appIdIdx: index("gettrx_webhook_events_app_id_idx").on(table.applicationId),
    statusIdx: index("gettrx_webhook_events_status_idx").on(table.status),
    timestampIdx: index("gettrx_webhook_events_timestamp_idx").on(
      table.timestamp,
    ),
  }),
);

// BTCPay Server Invoices (for cryptocurrency payment processing)
export const btcpayInvoices = pgTable(
  "btcpay_invoices",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id),
    donationId: integer("donation_id")
      .references(() => donations.id),
    
    // BTCPay Server identification
    btcpayInvoiceId: text("btcpay_invoice_id").notNull().unique(), // BTCPay Server invoice ID
    btcpayStoreId: text("btcpay_store_id").notNull(), // BTCPay Store ID used
    
    // Invoice details
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("USD"), // Fiat currency for the invoice
    
    // Payment context
    contextType: text("context_type"), // campaign, product, event, donation_page, general
    contextId: integer("context_id"), // ID of the campaign/product/event
    
    // Invoice status from BTCPay Server
    status: text("status").default("new"), // new, processing, settled, expired, invalid
    expirationTime: timestamp("expiration_time"),
    
    // Payment details
    checkoutLink: text("checkout_link"), // BTCPay Server checkout URL
    orderId: text("order_id"), // Our internal order reference
    
    // Donor information
    donorEmail: text("donor_email"),
    donorName: text("donor_name"),
    
    // Metadata and tracking
    metadata: jsonb("metadata"), // Additional invoice data from BTCPay
    settlementCurrency: text("settlement_currency"), // Cryptocurrency used for settlement
    settledAmount: decimal("settled_amount", { precision: 18, scale: 8 }), // Amount in cryptocurrency
    
    // Timestamps
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    settledAt: timestamp("settled_at"),
  },
  (table) => ({
    btcpayIdIdx: index("btcpay_invoices_btcpay_id_idx").on(table.btcpayInvoiceId),
    orgIdx: index("btcpay_invoices_org_idx").on(table.organizationId),
    donationIdx: index("btcpay_invoices_donation_idx").on(table.donationId),
    statusIdx: index("btcpay_invoices_status_idx").on(table.status),
    contextIdx: index("btcpay_invoices_context_idx").on(table.contextType, table.contextId),
  }),
);

// BTCPay Server Payments (individual cryptocurrency payments from webhooks)
export const btcpayPayments = pgTable(
  "btcpay_payments",
  {
    id: serial("id").primaryKey(),
    invoiceId: integer("invoice_id")
      .notNull()
      .references(() => btcpayInvoices.id),
    
    // Payment identification
    btcpayPaymentId: text("btcpay_payment_id").notNull().unique(), // BTCPay payment ID
    paymentMethod: text("payment_method").notNull(), // BTC, LTC, ETH, etc.
    
    // Transaction details
    transactionId: text("transaction_id"), // Blockchain transaction ID
    amount: decimal("amount", { precision: 18, scale: 8 }).notNull(), // Amount in cryptocurrency
    networkFee: decimal("network_fee", { precision: 18, scale: 8 }), // Network fee paid
    
    // Confirmation details
    confirmationCount: integer("confirmation_count").default(0),
    requiredConfirmations: integer("required_confirmations").default(1),
    
    // Status and timing
    status: text("status").default("unconfirmed"), // unconfirmed, confirmed, completed
    receivedAt: timestamp("received_at"),
    confirmedAt: timestamp("confirmed_at"),
    
    // Blockchain details
    blockHeight: integer("block_height"),
    blockHash: text("block_hash"),
    
    // Metadata
    metadata: jsonb("metadata"), // Additional payment data from BTCPay
    
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    invoiceIdx: index("btcpay_payments_invoice_idx").on(table.invoiceId),
    btcpayIdIdx: index("btcpay_payments_btcpay_id_idx").on(table.btcpayPaymentId),
    txIdIdx: index("btcpay_payments_tx_id_idx").on(table.transactionId),
    statusIdx: index("btcpay_payments_status_idx").on(table.status),
  }),
);

// Departments (for organizing campaigns and payments)
export const departments = pgTable(
  "departments",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id),

    // Department Information
    name: text("name").notNull(),
    description: text("description"),
    code: text("code"), // Department code for accounting integration

    // Budget and Financial
    budgetAmount: decimal("budget_amount", { precision: 12, scale: 2 }),
    budgetPeriod: text("budget_period").default("annual"), // monthly, quarterly, annual

    // Leadership
    managerId: varchar("manager_id").references(() => users.id),

    // Accounting Integration
    accountingCode: text("accounting_code"), // For QuickBooks, Xero integration
    costCenter: text("cost_center"),

    // Status
    isActive: boolean("is_active").default(true),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    orgIdx: index("departments_org_idx").on(table.organizationId),
    codeIdx: index("departments_code_idx").on(table.code),
  }),
);

// Bulk Import Jobs (for tracking recipient imports)
export const bulkImportJobs = pgTable(
  "bulk_import_jobs",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id),

    // Job Information
    jobType: text("job_type").notNull(), // recipients, payments, members
    fileName: text("file_name").notNull(),
    fileSize: integer("file_size"), // in bytes
    fileUrl: text("file_url"), // Object storage URL

    // Processing Status
    status: text("status").default("pending"), // pending, processing, completed, failed
    progress: integer("progress").default(0), // 0-100 percentage

    // Results
    totalRows: integer("total_rows").default(0),
    successfulRows: integer("successful_rows").default(0),
    failedRows: integer("failed_rows").default(0),

    // Error Handling
    errorSummary: jsonb("error_summary"), // Array of error messages
    validationErrors: jsonb("validation_errors"),

    // Processing Details
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    processedBy: varchar("processed_by").references(() => users.id),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    orgIdx: index("bulk_import_jobs_org_idx").on(table.organizationId),
    statusIdx: index("bulk_import_jobs_status_idx").on(table.status),
    typeIdx: index("bulk_import_jobs_type_idx").on(table.jobType),
  }),
);

// ACH Payment Recipients (vendors, contractors, missionaries, staff)
export const achPaymentRecipients = pgTable(
  "ach_payment_recipients",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id),

    // Recipient Information
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),

    // Address Information
    address: text("address"),
    city: text("city"),
    state: text("state"),
    zipCode: text("zip_code"),
    country: text("country").default("US"),

    // Recipient Type and Category
    recipientType: text("recipient_type").notNull(), // vendor, contractor, missionary, staff, volunteer, beneficiary
    category: text("category"), // medical, supplies, services, stipend, salary, reimbursement, etc.
    departmentId: integer("department_id").references(() => departments.id),

    // Bulk Import Reference
    importJobId: integer("import_job_id").references(() => bulkImportJobs.id),

    // Banking Information (encrypted)
    bankName: text("bank_name"),
    routingNumber: text("routing_number"),
    accountNumber: text("account_number"), // Should be encrypted
    accountType: text("account_type"), // checking, savings

    // Tax Information
    taxId: text("tax_id"), // SSN or EIN (encrypted)
    tax1099Required: boolean("tax_1099_required").default(false),

    // Status and Settings
    isActive: boolean("is_active").default(true),
    isVerified: boolean("is_verified").default(false),
    verifiedAt: timestamp("verified_at"),

    // Payment Preferences
    defaultPaymentPurpose: text("default_payment_purpose"),
    paymentNotes: text("payment_notes"),

    // Metadata
    tags: jsonb("tags"), // For categorization
    customFields: jsonb("custom_fields"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    orgIdx: index("ach_recipients_org_idx").on(table.organizationId),
    typeIdx: index("ach_recipients_type_idx").on(table.recipientType),
    emailIdx: index("ach_recipients_email_idx").on(table.email),
  }),
);

// ACH Payments (individual payments to recipients)
export const achPayments = pgTable(
  "ach_payments",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id),
    recipientId: integer("recipient_id")
      .notNull()
      .references(() => achPaymentRecipients.id),

    // Payment Details
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    currency: text("currency").default("USD"),
    purpose: text("purpose").notNull(), // Purpose/description of payment
    memo: text("memo"), // Internal memo

    // Payment Status and Processing
    status: text("status").default("pending"), // pending, processing, sent, delivered, returned, failed, cancelled
    processorPaymentId: text("processor_payment_id"), // ACH processor's payment ID
    processorStatus: text("processor_status"), // Processor-specific status

    // Scheduling
    scheduledDate: timestamp("scheduled_date"), // When to send the payment
    sentDate: timestamp("sent_date"), // When payment was actually sent
    expectedDeliveryDate: timestamp("expected_delivery_date"),
    deliveredDate: timestamp("delivered_date"), // When payment was delivered

    // Approval Workflow
    requiresApproval: boolean("requires_approval").default(false),
    approvalStatus: text("approval_status").default("auto_approved"), // pending, approved, rejected, auto_approved
    approvedBy: varchar("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at"),
    rejectionReason: text("rejection_reason"),

    // Financial Tracking
    fees: decimal("fees", { precision: 10, scale: 2 }).default("0"),
    netAmount: decimal("net_amount", { precision: 10, scale: 2 }),

    // Campaign/Project Association
    campaignId: integer("campaign_id").references(() => campaigns.id),
    departmentId: integer("department_id").references(() => departments.id),
    projectCode: text("project_code"), // For internal tracking

    // Recurring Payment Reference
    recurringPaymentId: integer("recurring_payment_id"),

    // Error Handling
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    retryCount: integer("retry_count").default(0),

    // Compliance and Audit
    createdBy: varchar("created_by").references(() => users.id),
    processedBy: varchar("processed_by").references(() => users.id),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    orgIdx: index("ach_payments_org_idx").on(table.organizationId),
    recipientIdx: index("ach_payments_recipient_idx").on(table.recipientId),
    statusIdx: index("ach_payments_status_idx").on(table.status),
    scheduledIdx: index("ach_payments_scheduled_idx").on(table.scheduledDate),
    approvalIdx: index("ach_payments_approval_idx").on(table.approvalStatus),
    campaignIdx: index("ach_payments_campaign_idx").on(table.campaignId),
    departmentIdx: index("ach_payments_department_idx").on(table.departmentId),
  }),
);

// ACH Recurring Payments (for regular payments like salaries, stipends)
export const achRecurringPayments = pgTable(
  "ach_recurring_payments",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id),
    recipientId: integer("recipient_id")
      .notNull()
      .references(() => achPaymentRecipients.id),

    // Payment Details
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    currency: text("currency").default("USD"),
    purpose: text("purpose").notNull(),
    memo: text("memo"),

    // Schedule Configuration
    frequency: text("frequency").notNull(), // weekly, bi_weekly, monthly, quarterly, annually
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date"), // Optional end date
    dayOfWeek: integer("day_of_week"), // For weekly (1=Monday, 7=Sunday)
    dayOfMonth: integer("day_of_month"), // For monthly (1-31)
    monthOfYear: integer("month_of_year"), // For annually (1-12)

    // Status and Control
    isActive: boolean("is_active").default(true),
    isPaused: boolean("is_paused").default(false),
    pausedAt: timestamp("paused_at"),
    pauseReason: text("pause_reason"),

    // Payment History Tracking
    nextPaymentDate: timestamp("next_payment_date").notNull(),
    lastPaymentDate: timestamp("last_payment_date"),
    totalPaymentsSent: integer("total_payments_sent").default(0),
    totalAmountSent: decimal("total_amount_sent", {
      precision: 12,
      scale: 2,
    }).default("0"),

    // Approval Settings
    requiresApproval: boolean("requires_approval").default(false),
    autoApprovalLimit: decimal("auto_approval_limit", {
      precision: 10,
      scale: 2,
    }),

    // Financial Tracking
    campaignId: integer("campaign_id").references(() => campaigns.id),
    departmentId: integer("department_id").references(() => departments.id),
    projectCode: text("project_code"),

    // Audit Fields
    createdBy: varchar("created_by").references(() => users.id),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    orgIdx: index("ach_recurring_org_idx").on(table.organizationId),
    recipientIdx: index("ach_recurring_recipient_idx").on(table.recipientId),
    activeIdx: index("ach_recurring_active_idx").on(table.isActive),
    nextPaymentIdx: index("ach_recurring_next_payment_idx").on(
      table.nextPaymentDate,
    ),
    campaignIdx: index("ach_recurring_campaign_idx").on(table.campaignId),
    departmentIdx: index("ach_recurring_department_idx").on(table.departmentId),
  }),
);

// Enhanced Onboarding steps tracking (8-step workflow)
export const organizationOnboarding = pgTable(
  "organization_onboarding",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id),
    stepNumber: integer("step_number").notNull(),
    stepName: text("step_name").notNull(),
    stepKey: text("step_key").notNull(), // unique identifier for step
    isCompleted: boolean("is_completed").default(false),
    completedAt: timestamp("completed_at"),
    completedByUserId: varchar("completed_by_user_id").references(
      () => users.id,
    ),
    data: jsonb("data"),

    // Enhanced tracking fields
    progress: integer("progress").default(0), // 0-100 percentage
    validationStatus: text("validation_status").default("pending"), // pending, valid, invalid, requires_review
    validationErrors: jsonb("validation_errors"),

    // Overall onboarding status
    currentStep: integer("current_step").default(1),
    totalSteps: integer("total_steps").default(8),
    overallProgress: integer("overall_progress").default(0), // 0-100
    status: text("status").default("not_started"), // not_started, in_progress, completed, skipped

    // Feature restrictions
    restrictedFeatures: jsonb("restricted_features"),
    partiallyAvailableFeatures: jsonb("partially_available_features"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    orgStepIdx: index("org_onboarding_org_step_idx").on(
      table.organizationId,
      table.stepNumber,
    ),
    orgKeyIdx: index("org_onboarding_org_key_idx").on(
      table.organizationId,
      table.stepKey,
    ),
  }),
);

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  campaigns: many(campaigns),
  donors: many(donors),
  donations: many(donations),
  onboardingSteps: many(organizationOnboarding),
  events: many(events),
  gettrxPaymentMethods: many(gettrxPaymentMethods),
  gettrxTransfers: many(gettrxTransfers),
  gettrxRecurringSchedules: many(gettrxRecurringSchedules),
  gettrxMerchantApplications: many(gettrxMerchantApplications),
  btcpayInvoices: many(btcpayInvoices),
  paymentMethods: many(paymentMethods),
  subscriptions: many(organizationSubscriptions),
}));

// Payment Methods Relations
export const paymentMethodsRelations = relations(paymentMethods, ({ one }) => ({
  organization: one(organizations, {
    fields: [paymentMethods.organizationId],
    references: [organizations.id],
  }),
}));

// Subscription Products Relations
export const subscriptionProductsRelations = relations(subscriptionProducts, ({ many }) => ({
  plans: many(subscriptionPlans),
  subscriptions: many(organizationSubscriptions),
}));

// Subscription Plans Relations
export const subscriptionPlansRelations = relations(subscriptionPlans, ({ one, many }) => ({
  product: one(subscriptionProducts, {
    fields: [subscriptionPlans.productId],
    references: [subscriptionProducts.id],
  }),
  subscriptions: many(organizationSubscriptions),
  features: many(subscriptionFeatures),
}));

// Organization Subscriptions Relations
export const organizationSubscriptionsRelations = relations(organizationSubscriptions, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationSubscriptions.organizationId],
    references: [organizations.id],
  }),
  plan: one(subscriptionPlans, {
    fields: [organizationSubscriptions.planId],
    references: [subscriptionPlans.id],
  }),
  product: one(subscriptionProducts, {
    fields: [organizationSubscriptions.productId],
    references: [subscriptionProducts.id],
  }),
  primaryPaymentMethod: one(paymentMethods, {
    fields: [organizationSubscriptions.primaryPaymentMethodId],
    references: [paymentMethods.id],
  }),
}));

// Subscription Features Relations
export const subscriptionFeaturesRelations = relations(subscriptionFeatures, ({ one }) => ({
  plan: one(subscriptionPlans, {
    fields: [subscriptionFeatures.planId],
    references: [subscriptionPlans.id],
  }),
}));

export const usersRelations = relations(users, ({ one }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [campaigns.organizationId],
    references: [organizations.id],
  }),
  donationPage: one(donationPages, {
    fields: [campaigns.donationPageId],
    references: [donationPages.id],
  }),
  donations: many(donations),
  categories: many(campaignCategories),
}));

export const campaignCategoriesRelations = relations(campaignCategories, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignCategories.campaignId],
    references: [campaigns.id],
  }),
}));

export const donationPagesRelations = relations(donationPages, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [donationPages.organizationId],
    references: [organizations.id],
  }),
  defaultFund: one(funds, {
    fields: [donationPages.defaultFundId],
    references: [funds.id],
  }),
  campaigns: many(campaigns),
  customFields: many(donationPageCustomFields),
}));

export const donationPageCustomFieldsRelations = relations(donationPageCustomFields, ({ one }) => ({
  donationPage: one(donationPages, {
    fields: [donationPageCustomFields.donationPageId],
    references: [donationPages.id],
  }),
}));

export const donorsRelations = relations(donors, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [donors.organizationId],
    references: [organizations.id],
  }),
  donations: many(donations),
  paymentMethods: many(gettrxPaymentMethods),
  recurringSchedules: many(gettrxRecurringSchedules),
}));

// GETTRX Payment Methods Relations
export const gettrxPaymentMethodsRelations = relations(
  gettrxPaymentMethods,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [gettrxPaymentMethods.organizationId],
      references: [organizations.id],
    }),
    donor: one(donors, {
      fields: [gettrxPaymentMethods.donorId],
      references: [donors.id],
    }),
    recurringSchedules: many(gettrxRecurringSchedules),
  }),
);

// GETTRX Transfers Relations
export const gettrxTransfersRelations = relations(
  gettrxTransfers,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [gettrxTransfers.organizationId],
      references: [organizations.id],
    }),
  }),
);

// GETTRX Recurring Schedules Relations
export const gettrxRecurringSchedulesRelations = relations(
  gettrxRecurringSchedules,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [gettrxRecurringSchedules.organizationId],
      references: [organizations.id],
    }),
    donor: one(donors, {
      fields: [gettrxRecurringSchedules.donorId],
      references: [donors.id],
    }),
    campaign: one(campaigns, {
      fields: [gettrxRecurringSchedules.campaignId],
      references: [campaigns.id],
    }),
    paymentMethod: one(gettrxPaymentMethods, {
      fields: [gettrxRecurringSchedules.paymentMethodId],
      references: [gettrxPaymentMethods.id],
    }),
  }),
);

export const donationsRelations = relations(donations, ({ one }) => ({
  organization: one(organizations, {
    fields: [donations.organizationId],
    references: [organizations.id],
  }),
  campaign: one(campaigns, {
    fields: [donations.campaignId],
    references: [campaigns.id],
  }),
  donor: one(donors, {
    fields: [donations.donorId],
    references: [donors.id],
  }),
}));

// BTCPay Server Invoice Relations
export const btcpayInvoicesRelations = relations(btcpayInvoices, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [btcpayInvoices.organizationId],
    references: [organizations.id],
  }),
  donation: one(donations, {
    fields: [btcpayInvoices.donationId],
    references: [donations.id],
  }),
  payments: many(btcpayPayments),
}));

// BTCPay Server Payment Relations
export const btcpayPaymentsRelations = relations(btcpayPayments, ({ one }) => ({
  invoice: one(btcpayInvoices, {
    fields: [btcpayPayments.invoiceId],
    references: [btcpayInvoices.id],
  }),
}));

export const organizationOnboardingRelations = relations(
  organizationOnboarding,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationOnboarding.organizationId],
      references: [organizations.id],
    }),
  }),
);

// Departments Relations
export const departmentsRelations = relations(departments, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [departments.organizationId],
    references: [organizations.id],
  }),
  manager: one(users, {
    fields: [departments.managerId],
    references: [users.id],
  }),
  payments: many(achPayments),
  recurringPayments: many(achRecurringPayments),
}));

// Bulk Import Jobs Relations
export const bulkImportJobsRelations = relations(
  bulkImportJobs,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [bulkImportJobs.organizationId],
      references: [organizations.id],
    }),
    processedBy: one(users, {
      fields: [bulkImportJobs.processedBy],
      references: [users.id],
    }),
    recipients: many(achPaymentRecipients),
  }),
);

// ACH Payment Recipients Relations
export const achPaymentRecipientsRelations = relations(
  achPaymentRecipients,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [achPaymentRecipients.organizationId],
      references: [organizations.id],
    }),
    department: one(departments, {
      fields: [achPaymentRecipients.departmentId],
      references: [departments.id],
    }),
    importJob: one(bulkImportJobs, {
      fields: [achPaymentRecipients.importJobId],
      references: [bulkImportJobs.id],
    }),
    payments: many(achPayments),
    recurringPayments: many(achRecurringPayments),
  }),
);

// ACH Payments Relations
export const achPaymentsRelations = relations(achPayments, ({ one }) => ({
  organization: one(organizations, {
    fields: [achPayments.organizationId],
    references: [organizations.id],
  }),
  recipient: one(achPaymentRecipients, {
    fields: [achPayments.recipientId],
    references: [achPaymentRecipients.id],
  }),
  campaign: one(campaigns, {
    fields: [achPayments.campaignId],
    references: [campaigns.id],
  }),
  department: one(departments, {
    fields: [achPayments.departmentId],
    references: [departments.id],
  }),
  createdBy: one(users, {
    fields: [achPayments.createdBy],
    references: [users.id],
  }),
  approvedBy: one(users, {
    fields: [achPayments.approvedBy],
    references: [users.id],
  }),
  processedBy: one(users, {
    fields: [achPayments.processedBy],
    references: [users.id],
  }),
}));

// ACH Recurring Payments Relations
export const achRecurringPaymentsRelations = relations(
  achRecurringPayments,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [achRecurringPayments.organizationId],
      references: [organizations.id],
    }),
    recipient: one(achPaymentRecipients, {
      fields: [achRecurringPayments.recipientId],
      references: [achPaymentRecipients.id],
    }),
    campaign: one(campaigns, {
      fields: [achRecurringPayments.campaignId],
      references: [campaigns.id],
    }),
    department: one(departments, {
      fields: [achRecurringPayments.departmentId],
      references: [departments.id],
    }),
    createdBy: one(users, {
      fields: [achRecurringPayments.createdBy],
      references: [users.id],
    }),
  }),
);

// Events (for comprehensive event management)
export const events = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    theme: text("theme"), // e.g., "Night of Impact"

    // Event details
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date").notNull(),
    venue: text("venue"),
    address: text("address"),
    city: text("city"),
    state: text("state"),
    zipCode: text("zip_code"),
    directions: text("directions"),
    parkingInfo: text("parking_info"),
    contactInfo: text("contact_info"),

    // Visual and media
    bannerImageUrl: text("banner_image_url"),
    logoUrl: text("logo_url"),
    venue3DUrl: text("venue_3d_url"), // For 3D venue views

    // Event settings
    maxAttendees: integer("max_attendees"),
    isPublic: boolean("is_public").default(true),
    enableWaitlist: boolean("enable_waitlist").default(false),
    allowGroupBookings: boolean("allow_group_bookings").default(true),
    requiresApproval: boolean("requires_approval").default(false),

    // Payment and pricing
    baseTicketPrice: decimal("base_ticket_price", { precision: 10, scale: 2 }),
    vipTicketPrice: decimal("vip_ticket_price", { precision: 10, scale: 2 }),
    enableDonations: boolean("enable_donations").default(true),
    enableAuctions: boolean("enable_auctions").default(false),
    enableRaffles: boolean("enable_raffles").default(false),

    // Hybrid event support
    enableVirtualAttendance: boolean("enable_virtual_attendance").default(
      false,
    ),
    streamingUrl: text("streaming_url"),
    virtualTablePrice: decimal("virtual_table_price", {
      precision: 10,
      scale: 2,
    }),

    // Email settings
    confirmationEmailTemplate: text("confirmation_email_template"),
    reminderEmailTemplate: text("reminder_email_template"),

    // Analytics and tracking
    totalRevenue: decimal("total_revenue", { precision: 10, scale: 2 }).default(
      "0",
    ),
    totalAttendees: integer("total_attendees").default(0),

    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    slugOrgIdx: index("events_slug_org_idx").on(
      table.slug,
      table.organizationId,
    ),
  }),
);

// Event Tables (for table reservations and sponsorships)
export const eventTables = pgTable("event_tables", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id")
    .references(() => events.id)
    .notNull(),
  tableName: text("table_name").notNull(), // e.g., "Table 1", "Premium Table A"
  tableNumber: integer("table_number"),

  // Seating and layout
  maxSeats: integer("max_seats").default(8),
  positionX: decimal("position_x", { precision: 8, scale: 2 }), // For visual layout
  positionY: decimal("position_y", { precision: 8, scale: 2 }),

  // Pricing
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  tierLevel: text("tier_level"), // premium, standard, basic

  // Special features
  isVIP: boolean("is_vip").default(false),
  isNearStage: boolean("is_near_stage").default(false),
  hasSpecialPerks: boolean("has_special_perks").default(false),
  perksDescription: text("perks_description"),

  // Accessibility
  isWheelchairAccessible: boolean("is_wheelchair_accessible").default(true),
  hasAssistedListening: boolean("has_assisted_listening").default(false),

  // Booking status
  isReserved: boolean("is_reserved").default(false),
  reservedBy: integer("reserved_by"), // Will reference eventRegistrations.id
  reservedAt: timestamp("reserved_at"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Event Registrations (attendee bookings)
export const eventRegistrations = pgTable("event_registrations", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id")
    .references(() => events.id)
    .notNull(),
  tableId: integer("table_id").references(() => eventTables.id),

  // Primary registrant info
  primaryFirstName: text("primary_first_name").notNull(),
  primaryLastName: text("primary_last_name").notNull(),
  primaryEmail: text("primary_email").notNull(),
  primaryPhone: text("primary_phone"),

  // Registration details
  attendeeCount: integer("attendee_count").default(1),
  isGroupBooking: boolean("is_group_booking").default(false),

  // Payment
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paymentStatus: text("payment_status").default("pending"), // pending, paid, refunded
  paymentIntentId: text("payment_intent_id"),
  stripeSessionId: text("stripe_session_id"),

  // Additional features
  donationAmount: decimal("donation_amount", {
    precision: 10,
    scale: 2,
  }).default("0"),
  auctionBids: decimal("auction_bids", { precision: 10, scale: 2 }).default(
    "0",
  ),
  raffleTickets: integer("raffle_tickets").default(0),

  // Special requests
  specialRequests: text("special_requests"),
  dietaryRestrictions: text("dietary_restrictions"),
  accessibilityNeeds: text("accessibility_needs"),

  // Check-in
  checkedIn: boolean("checked_in").default(false),
  checkedInAt: timestamp("checked_in_at"),
  qrCodeUrl: text("qr_code_url"),

  // Virtual attendance
  isVirtual: boolean("is_virtual").default(false),
  virtualTableId: text("virtual_table_id"),

  registrationStatus: text("registration_status").default("confirmed"), // confirmed, cancelled, waitlist
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Event Attendees (individual guests linked to registrations)
export const eventAttendees = pgTable("event_attendees", {
  id: serial("id").primaryKey(),
  registrationId: integer("registration_id")
    .references(() => eventRegistrations.id)
    .notNull(),

  // Personal info
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),

  // Meal preferences
  mealPreference: text("meal_preference"), // vegan, vegetarian, gluten-free, standard, kosher, halal
  dietaryRestrictions: text("dietary_restrictions"),

  // Special needs
  accessibilityNeeds: text("accessibility_needs"),
  specialRequests: text("special_requests"),

  // Check-in
  checkedIn: boolean("checked_in").default(false),
  checkedInAt: timestamp("checked_in_at"),
  seatAssignment: text("seat_assignment"), // e.g., "Seat 3"

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Event Relations
export const eventsRelations = relations(events, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [events.organizationId],
    references: [organizations.id],
  }),
  tables: many(eventTables),
  registrations: many(eventRegistrations),
}));

export const eventTablesRelations = relations(eventTables, ({ one }) => ({
  event: one(events, {
    fields: [eventTables.eventId],
    references: [events.id],
  }),
}));

export const eventRegistrationsRelations = relations(
  eventRegistrations,
  ({ one, many }) => ({
    event: one(events, {
      fields: [eventRegistrations.eventId],
      references: [events.id],
    }),
    table: one(eventTables, {
      fields: [eventRegistrations.tableId],
      references: [eventTables.id],
    }),
    attendees: many(eventAttendees),
  }),
);

export const eventAttendeesRelations = relations(eventAttendees, ({ one }) => ({
  registration: one(eventRegistrations, {
    fields: [eventAttendees.registrationId],
    references: [eventRegistrations.id],
  }),
}));

// Insert schemas
export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubscriptionProductSchema = createInsertSchema(subscriptionProducts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrganizationSubscriptionSchema = createInsertSchema(organizationSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubscriptionFeatureSchema = createInsertSchema(subscriptionFeatures).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true, // ID is auto-generated via UUID
  createdAt: true,
  updatedAt: true,
});

export const insertUserOrganizationSchema = createInsertSchema(userOrganizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  raised: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCampaignCategorySchema = createInsertSchema(campaignCategories).omit({
  id: true,
  raised: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDonationPageSchema = createInsertSchema(donationPages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDonationPageCustomFieldSchema = createInsertSchema(donationPageCustomFields).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDonationProductSchema = createInsertSchema(donationProducts)
  .omit({
    id: true,
    qrCodeUrl: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    tiers: z.array(tierSchema), // Use the tier schema for validation
  });

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLeadCaptureSchema = createInsertSchema(leadCaptures).omit({
  id: true,
  createdAt: true,
});

export const insertDonorSchema = createInsertSchema(donors).omit({
  id: true,
  totalDonated: true,
  donationCount: true,
  firstDonationAt: true,
  lastDonationAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDonationSchema = createInsertSchema(donations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// NEW: Payment Accounts and Funds schema exports
export const insertPaymentAccountSchema = createInsertSchema(paymentAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFundSchema = createInsertSchema(funds).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// GETTRX Schema exports
export const insertGettrxPaymentMethodSchema = createInsertSchema(
  gettrxPaymentMethods,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGettrxTransferSchema = createInsertSchema(
  gettrxTransfers,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGettrxRecurringScheduleSchema = createInsertSchema(
  gettrxRecurringSchedules,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// GETTRX Merchant Application Relations
export const gettrxMerchantApplicationsRelations = relations(
  gettrxMerchantApplications,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [gettrxMerchantApplications.organizationId],
      references: [organizations.id],
    }),
    acceptanceTokens: many(gettrxAcceptanceTokens),
  }),
);

export const gettrxAcceptanceTokensRelations = relations(
  gettrxAcceptanceTokens,
  ({ one }) => ({
    application: one(gettrxMerchantApplications, {
      fields: [gettrxAcceptanceTokens.applicationId],
      references: [gettrxMerchantApplications.id],
    }),
  }),
);

// GETTRX Schema Exports
export const insertGettrxMerchantApplicationSchema = createInsertSchema(
  gettrxMerchantApplications,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGettrxAcceptanceTokenSchema = createInsertSchema(
  gettrxAcceptanceTokens,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGettrxWebhookEventSchema = createInsertSchema(
  gettrxWebhookEvents,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// GETTRX Types
export type InsertGettrxPaymentMethod = z.infer<
  typeof insertGettrxPaymentMethodSchema
>;
export type SelectGettrxPaymentMethod =
  typeof gettrxPaymentMethods.$inferSelect;
export type InsertGettrxTransfer = z.infer<typeof insertGettrxTransferSchema>;
export type SelectGettrxTransfer = typeof gettrxTransfers.$inferSelect;
export type InsertGettrxRecurringSchedule = z.infer<
  typeof insertGettrxRecurringScheduleSchema
>;
export type SelectGettrxRecurringSchedule =
  typeof gettrxRecurringSchedules.$inferSelect;
export type InsertGettrxMerchantApplication = z.infer<
  typeof insertGettrxMerchantApplicationSchema
>;
export type SelectGettrxMerchantApplication =
  typeof gettrxMerchantApplications.$inferSelect;
export type InsertGettrxAcceptanceToken = z.infer<
  typeof insertGettrxAcceptanceTokenSchema
>;
export type SelectGettrxAcceptanceToken =
  typeof gettrxAcceptanceTokens.$inferSelect;
export type InsertGettrxWebhookEvent = z.infer<
  typeof insertGettrxWebhookEventSchema
>;
export type SelectGettrxWebhookEvent = typeof gettrxWebhookEvents.$inferSelect;

// BTCPay Server Schema Exports
export const insertBtcpayInvoiceSchema = createInsertSchema(btcpayInvoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBtcpayPaymentSchema = createInsertSchema(btcpayPayments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// BTCPay Server Types
export type InsertBtcpayInvoice = z.infer<typeof insertBtcpayInvoiceSchema>;
export type SelectBtcpayInvoice = typeof btcpayInvoices.$inferSelect;
export type InsertBtcpayPayment = z.infer<typeof insertBtcpayPaymentSchema>;
export type SelectBtcpayPayment = typeof btcpayPayments.$inferSelect;

export const insertOnboardingSchema = createInsertSchema(
  organizationOnboarding,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Department Insert Schemas
export const insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Bulk Import Job Insert Schemas
export const insertBulkImportJobSchema = createInsertSchema(
  bulkImportJobs,
).omit({
  id: true,
  progress: true,
  totalRows: true,
  successfulRows: true,
  failedRows: true,
  errorSummary: true,
  validationErrors: true,
  startedAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
});

// ACH Payment Insert Schemas
export const insertAchPaymentRecipientSchema = createInsertSchema(
  achPaymentRecipients,
).omit({
  id: true,
  isVerified: true,
  verifiedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAchPaymentSchema = createInsertSchema(achPayments).omit({
  id: true,
  processorPaymentId: true,
  processorStatus: true,
  sentDate: true,
  expectedDeliveryDate: true,
  deliveredDate: true,
  approvedBy: true,
  approvedAt: true,
  fees: true,
  netAmount: true,
  errorCode: true,
  errorMessage: true,
  retryCount: true,
  processedBy: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAchRecurringPaymentSchema = createInsertSchema(
  achRecurringPayments,
).omit({
  id: true,
  isPaused: true,
  pausedAt: true,
  pauseReason: true,
  lastPaymentDate: true,
  totalPaymentsSent: true,
  totalAmountSent: true,
  createdAt: true,
  updatedAt: true,
});

// Event Management Insert Schemas
export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  totalRevenue: true,
  totalAttendees: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEventTableSchema = createInsertSchema(eventTables).omit({
  id: true,
  isReserved: true,
  reservedBy: true,
  reservedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEventRegistrationSchema = createInsertSchema(
  eventRegistrations,
).omit({
  id: true,
  qrCodeUrl: true,
  checkedIn: true,
  checkedInAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEventAttendeeSchema = createInsertSchema(
  eventAttendees,
).omit({
  id: true,
  checkedIn: true,
  checkedInAt: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;
export type SubscriptionProduct = typeof subscriptionProducts.$inferSelect;
export type InsertSubscriptionProduct = z.infer<typeof insertSubscriptionProductSchema>;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type OrganizationSubscription = typeof organizationSubscriptions.$inferSelect;
export type InsertOrganizationSubscription = z.infer<typeof insertOrganizationSubscriptionSchema>;
export type SubscriptionFeature = typeof subscriptionFeatures.$inferSelect;
export type InsertSubscriptionFeature = z.infer<typeof insertSubscriptionFeatureSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UserOrganization = typeof userOrganizations.$inferSelect;
export type InsertUserOrganization = z.infer<typeof insertUserOrganizationSchema>;
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type CampaignCategory = typeof campaignCategories.$inferSelect;
export type InsertCampaignCategory = z.infer<typeof insertCampaignCategorySchema>;
export type DonationPage = typeof donationPages.$inferSelect;
export type InsertDonationPage = z.infer<typeof insertDonationPageSchema>;
export type DonationPageCustomField = typeof donationPageCustomFields.$inferSelect;
export type InsertDonationPageCustomField = z.infer<typeof insertDonationPageCustomFieldSchema>;
export type DonationProduct = typeof donationProducts.$inferSelect;
export type InsertDonationProduct = z.infer<typeof insertDonationProductSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type LeadCapture = typeof leadCaptures.$inferSelect;
export type InsertLeadCapture = z.infer<typeof insertLeadCaptureSchema>;
export type Donor = typeof donors.$inferSelect;
export type InsertDonor = z.infer<typeof insertDonorSchema>;
export type Donation = typeof donations.$inferSelect;
export type InsertDonation = z.infer<typeof insertDonationSchema>;

// NEW: Payment Accounts and Funds types  
export type PaymentAccount = typeof paymentAccounts.$inferSelect;
export type InsertPaymentAccount = z.infer<typeof insertPaymentAccountSchema>;
export type Fund = typeof funds.$inferSelect;
export type InsertFund = z.infer<typeof insertFundSchema>;

export type OrganizationOnboarding = typeof organizationOnboarding.$inferSelect;
export type InsertOnboarding = z.infer<typeof insertOnboardingSchema>;

// Department Types
export type Department = typeof departments.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;

// Bulk Import Types
export type BulkImportJob = typeof bulkImportJobs.$inferSelect;
export type InsertBulkImportJob = z.infer<typeof insertBulkImportJobSchema>;

// ACH Payment Types
export type AchPaymentRecipient = typeof achPaymentRecipients.$inferSelect;
export type InsertAchPaymentRecipient = z.infer<
  typeof insertAchPaymentRecipientSchema
>;
export type AchPayment = typeof achPayments.$inferSelect;
export type InsertAchPayment = z.infer<typeof insertAchPaymentSchema>;
export type AchRecurringPayment = typeof achRecurringPayments.$inferSelect;
export type InsertAchRecurringPayment = z.infer<
  typeof insertAchRecurringPaymentSchema
>;

// Event Management Types
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type EventTable = typeof eventTables.$inferSelect;
export type InsertEventTable = z.infer<typeof insertEventTableSchema>;
export type EventRegistration = typeof eventRegistrations.$inferSelect;
export type InsertEventRegistration = z.infer<
  typeof insertEventRegistrationSchema
>;
export type EventAttendee = typeof eventAttendees.$inferSelect;
export type InsertEventAttendee = z.infer<typeof insertEventAttendeeSchema>;

// SendGrid Email System Tables
export const sendgridEmailCampaigns = pgTable(
  "sendgrid_email_campaigns",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: varchar("name", { length: 255 }).notNull(),
    subject: varchar("subject", { length: 255 }).notNull(),
    fromEmail: varchar("from_email", { length: 255 }).notNull(), // e.g., gracechurch@prolifegive.com
    fromName: varchar("from_name", { length: 255 }).notNull(),
    replyTo: varchar("reply_to", { length: 255 }),
    htmlContent: text("html_content"),
    plainContent: text("plain_content"),
    recipientCount: integer("recipient_count").default(0),
    status: varchar("status", { length: 50 }).default("draft"), // draft, scheduled, sending, sent, paused
    scheduledAt: timestamp("scheduled_at"),
    sentAt: timestamp("sent_at"),
    sendgridBatchId: varchar("sendgrid_batch_id", { length: 100 }), // SendGrid batch ID for tracking
    tags: text("tags").array(), // Campaign tags for organization
    customFields: jsonb("custom_fields"), // Additional campaign data
    createdBy: integer("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    orgIdx: index("sendgrid_campaigns_org_idx").on(table.organizationId),
    statusIdx: index("sendgrid_campaigns_status_idx").on(table.status),
    scheduledIdx: index("sendgrid_campaigns_scheduled_idx").on(
      table.scheduledAt,
    ),
  }),
);

export const sendgridEmailRecipients = pgTable(
  "sendgrid_email_recipients",
  {
    id: serial("id").primaryKey(),
    campaignId: integer("campaign_id")
      .notNull()
      .references(() => sendgridEmailCampaigns.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    firstName: varchar("first_name", { length: 100 }),
    lastName: varchar("last_name", { length: 100 }),
    donorId: integer("donor_id").references(() => donors.id), // Link to donor if available
    status: varchar("status", { length: 50 }).default("pending"), // pending, sent, delivered, bounced, opened, clicked, unsubscribed
    sendgridMessageId: varchar("sendgrid_message_id", { length: 100 }), // SendGrid message ID
    personalizations: jsonb("personalizations"), // Dynamic template data
    sentAt: timestamp("sent_at"),
    deliveredAt: timestamp("delivered_at"),
    openedAt: timestamp("opened_at"),
    clickedAt: timestamp("clicked_at"),
    bouncedAt: timestamp("bounced_at"),
    unsubscribedAt: timestamp("unsubscribed_at"),
    bounceReason: varchar("bounce_reason", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    campaignIdx: index("sendgrid_recipients_campaign_idx").on(table.campaignId),
    emailIdx: index("sendgrid_recipients_email_idx").on(table.email),
    statusIdx: index("sendgrid_recipients_status_idx").on(table.status),
    donorIdx: index("sendgrid_recipients_donor_idx").on(table.donorId),
  }),
);

export const sendgridWebhookEvents = pgTable(
  "sendgrid_webhook_events",
  {
    id: serial("id").primaryKey(),
    eventId: varchar("event_id", { length: 100 }).notNull().unique(), // SendGrid event ID to prevent duplicates
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id),
    campaignId: integer("campaign_id").references(
      () => sendgridEmailCampaigns.id,
    ),
    recipientId: integer("recipient_id").references(
      () => sendgridEmailRecipients.id,
    ),
    email: varchar("email", { length: 255 }).notNull(),
    event: varchar("event", { length: 50 }).notNull(), // processed, delivered, open, click, bounce, dropped, deferred, spam_report, unsubscribe
    timestamp: integer("timestamp").notNull(), // Unix timestamp from SendGrid
    smtpId: varchar("smtp_id", { length: 100 }),
    reason: varchar("reason", { length: 255 }), // Bounce/drop reason
    status: varchar("status", { length: 100 }), // HTTP status for delivery
    response: varchar("response", { length: 255 }), // SMTP response
    url: text("url"), // Clicked URL
    userAgent: text("user_agent"), // Browser/client info
    ip: varchar("ip", { length: 45 }), // Recipient IP address
    sgEventId: varchar("sg_event_id", { length: 100 }), // SendGrid internal event ID
    sgMessageId: varchar("sg_message_id", { length: 100 }), // SendGrid message ID
    category: text("category").array(), // SendGrid categories
    rawEvent: jsonb("raw_event"), // Full webhook payload for debugging
    processed: boolean("processed").default(false), // Whether event has been processed for analytics
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    eventIdIdx: index("sendgrid_webhook_events_event_id_idx").on(table.eventId),
    orgIdx: index("sendgrid_webhook_events_org_idx").on(table.organizationId),
    campaignIdx: index("sendgrid_webhook_events_campaign_idx").on(
      table.campaignId,
    ),
    eventTypeIdx: index("sendgrid_webhook_events_type_idx").on(table.event),
    timestampIdx: index("sendgrid_webhook_events_timestamp_idx").on(
      table.timestamp,
    ),
    emailIdx: index("sendgridWebhook_events_email_idx").on(table.email),
    processedIdx: index("sendgrid_webhook_events_processed_idx").on(
      table.processed,
    ),
  }),
);

export const sendgridEmailAnalytics = pgTable(
  "sendgrid_email_analytics",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id),
    campaignId: integer("campaign_id").references(
      () => sendgridEmailCampaigns.id,
    ),
    date: text("date").notNull(), // Daily aggregation (YYYY-MM-DD format)
    emailsSent: integer("emails_sent").default(0),
    emailsDelivered: integer("emails_delivered").default(0),
    emailsBounced: integer("emails_bounced").default(0),
    emailsOpened: integer("emails_opened").default(0),
    emailsClicked: integer("emails_clicked").default(0),
    emailsUnsubscribed: integer("emails_unsubscribed").default(0),
    emailsSpamReported: integer("emails_spam_reported").default(0),
    uniqueOpens: integer("unique_opens").default(0), // Unique recipients who opened
    uniqueClicks: integer("unique_clicks").default(0), // Unique recipients who clicked
    totalClicks: integer("total_clicks").default(0), // Total click events
    donationsGenerated: integer("donations_generated").default(0), // Attributed donations
    revenueGenerated: decimal("revenue_generated", {
      precision: 10,
      scale: 2,
    }).default("0.00"),
    lastUpdated: timestamp("last_updated").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    orgDateIdx: index("sendgrid_analytics_org_date_idx").on(
      table.organizationId,
      table.date,
    ),
    campaignDateIdx: index("sendgrid_analytics_campaign_date_idx").on(
      table.campaignId,
      table.date,
    ),
    dateIdx: index("sendgrid_analytics_date_idx").on(table.date),
  }),
);

// Zod schemas for SendGrid email system
export const insertSendgridEmailCampaignSchema = createInsertSchema(
  sendgridEmailCampaigns,
).omit({
  id: true,
  recipientCount: true,
  sendgridBatchId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSendgridEmailRecipientSchema = createInsertSchema(
  sendgridEmailRecipients,
).omit({
  id: true,
  sendgridMessageId: true,
  sentAt: true,
  deliveredAt: true,
  openedAt: true,
  clickedAt: true,
  bouncedAt: true,
  unsubscribedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSendgridWebhookEventSchema = createInsertSchema(
  sendgridWebhookEvents,
).omit({
  id: true,
  processed: true,
  createdAt: true,
});

export const insertSendgridEmailAnalyticsSchema = createInsertSchema(
  sendgridEmailAnalytics,
).omit({
  id: true,
  lastUpdated: true,
  createdAt: true,
});

// Types for SendGrid email system
export type SendgridEmailCampaign = typeof sendgridEmailCampaigns.$inferSelect;
export type InsertSendgridEmailCampaign = z.infer<
  typeof insertSendgridEmailCampaignSchema
>;
export type SendgridEmailRecipient =
  typeof sendgridEmailRecipients.$inferSelect;
export type InsertSendgridEmailRecipient = z.infer<
  typeof insertSendgridEmailRecipientSchema
>;
export type SendgridWebhookEvent = typeof sendgridWebhookEvents.$inferSelect;
export type InsertSendgridWebhookEvent = z.infer<
  typeof insertSendgridWebhookEventSchema
>;
export type SendgridEmailAnalytics = typeof sendgridEmailAnalytics.$inferSelect;
export type InsertSendgridEmailAnalytics = z.infer<
  typeof insertSendgridEmailAnalyticsSchema
>;

// Compliance & Notification System Tables

// Notification event types and configuration
export const notificationEventTypes = pgTable("notification_event_types", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(), // transactional, donor_behavior, reporting, refunds_chargebacks, fraud_risk
  eventType: text("event_type").notNull(), // successful_transaction, failed_transaction, card_expiring, etc.
  displayName: text("display_name").notNull(),
  description: text("description"),
  defaultEnabled: boolean("default_enabled").default(true),
  complianceLevel: text("compliance_level").notNull(), // HIPAA, ISO27001, SOC1, SOC2, GDPR
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Organization notification settings
export const notificationSettings = pgTable("notification_settings", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  eventTypeId: integer("event_type_id")
    .references(() => notificationEventTypes.id)
    .notNull(),
  isEnabled: boolean("is_enabled").default(true),

  // Delivery methods
  emailEnabled: boolean("email_enabled").default(true),
  smsEnabled: boolean("sms_enabled").default(false),
  inAppEnabled: boolean("in_app_enabled").default(true),
  slackEnabled: boolean("slack_enabled").default(false),
  teamsEnabled: boolean("teams_enabled").default(false),
  webhookEnabled: boolean("webhook_enabled").default(false),

  // Delivery timing
  deliveryTiming: text("delivery_timing").default("real_time"), // real_time, daily_digest, weekly_digest
  dailyDigestTime: text("daily_digest_time").default("09:00"), // HH:MM format
  weeklyDigestDay: integer("weekly_digest_day").default(1), // 1=Monday, 7=Sunday

  // Assignment
  assignedUserIds: jsonb("assigned_user_ids"), // Array of user IDs to notify
  customThresholds: jsonb("custom_thresholds"), // Event-specific thresholds (e.g., amount limits)

  // Compliance audit fields
  lastModifiedBy: varchar("last_modified_by").references(() => users.id),
  lastModifiedAt: timestamp("last_modified_at").defaultNow(),
  complianceNotes: text("compliance_notes"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notification delivery log for audit trail
export const notificationDeliveryLog = pgTable("notification_delivery_log", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  eventTypeId: integer("event_type_id")
    .references(() => notificationEventTypes.id)
    .notNull(),

  // Event details
  eventData: jsonb("event_data").notNull(), // Original event data that triggered notification
  eventTimestamp: timestamp("event_timestamp").notNull(),

  // Delivery details
  deliveryMethod: text("delivery_method").notNull(), // email, sms, in_app, slack, teams, webhook
  recipientId: varchar("recipient_id"), // User ID if applicable
  recipientContact: text("recipient_contact"), // Email, phone, webhook URL

  // Status tracking
  deliveryStatus: text("delivery_status").notNull(), // pending, sent, failed, bounced
  deliveryAttempts: integer("delivery_attempts").default(1),
  lastAttemptAt: timestamp("last_attempt_at").defaultNow(),
  deliveredAt: timestamp("delivered_at"),
  failureReason: text("failure_reason"),

  // Compliance and audit
  messageId: text("message_id"), // External service message ID
  encryptionUsed: boolean("encryption_used").default(true),
  dataRetentionPolicy: text("data_retention_policy").default("7_years"), // GDPR/compliance requirements

  createdAt: timestamp("created_at").defaultNow(),
});

// Integration configurations (Slack, Teams, Webhooks)
export const integrationConfigurations = pgTable("integration_configurations", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  integrationType: text("integration_type").notNull(), // slack, teams, webhook, zapier

  // Configuration data (encrypted)
  configurationData: jsonb("configuration_data").notNull(), // Encrypted webhook URLs, tokens, etc.

  // Security and compliance
  isActive: boolean("is_active").default(true),
  lastTestAt: timestamp("last_test_at"),
  testStatus: text("test_status"), // success, failed
  encryptionKeyId: text("encryption_key_id"), // Reference to encryption key

  // Audit trail
  createdBy: varchar("created_by")
    .references(() => users.id)
    .notNull(),
  lastModifiedBy: varchar("last_modified_by").references(() => users.id),
  lastModifiedAt: timestamp("last_modified_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// GDPR and compliance audit trail
export const complianceAuditLog = pgTable("compliance_audit_log", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),

  // Audit details
  actionType: text("action_type").notNull(), // create, update, delete, access, export
  resourceType: text("resource_type").notNull(), // notification_settings, integration_config, user_data
  resourceId: text("resource_id").notNull(),

  // User and session information
  userId: varchar("user_id").references(() => users.id),
  userRole: text("user_role"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  sessionId: text("session_id"),

  // Change details
  previousValues: jsonb("previous_values"), // Before state
  newValues: jsonb("new_values"), // After state
  changeReason: text("change_reason"),

  // Compliance context
  complianceFramework: text("compliance_framework").notNull(), // HIPAA, GDPR, SOC2, ISO27001
  dataClassification: text("data_classification"), // public, internal, confidential, restricted

  createdAt: timestamp("created_at").defaultNow(),
});

// Video Templates (for AI-generated video messages)
export const videoTemplates = pgTable("video_templates", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizations.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  templateType: varchar("template_type", { length: 50 }).default(
    "donation_thank_you",
  ), // donation_thank_you, campaign_update, etc.
  videoScript: text("video_script").notNull(), // Script template with placeholders
  visualStyle: varchar("visual_style", { length: 50 }).default("professional"), // professional, casual, animated
  voiceType: varchar("voice_type", { length: 50 }).default("neutral"), // neutral, friendly, authoritative
  duration: integer("duration").default(30), // Duration in seconds
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Video Messages (personalized videos created from templates)
export const videoMessages = pgTable("video_messages", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizations.id),
  templateId: integer("template_id")
    .notNull()
    .references(() => videoTemplates.id),
  donorId: integer("donor_id").references(() => donors.id),
  campaignId: integer("campaign_id").references(() => campaigns.id),
  recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),
  recipientName: varchar("recipient_name", { length: 255 }),
  personalizedScript: text("personalized_script").notNull(), // Script with placeholders filled
  videoUrl: text("video_url"), // URL to generated video
  thumbnailUrl: text("thumbnail_url"), // Video thumbnail
  status: varchar("status", { length: 50 }).default("pending"), // pending, generating, ready, failed, sent
  muxAssetId: varchar("mux_asset_id", { length: 100 }), // Mux video asset ID
  muxPlaybackId: varchar("mux_playback_id", { length: 100 }), // Mux playback ID
  personalizations: jsonb("personalizations"), // Dynamic data used in video
  generatedAt: timestamp("generated_at"),
  sentAt: timestamp("sent_at"),
  viewedAt: timestamp("viewed_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Video Automation Rules (for automatically triggering video generation)
export const videoAutomationRules = pgTable("video_automation_rules", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizations.id),
  templateId: integer("template_id")
    .notNull()
    .references(() => videoTemplates.id),
  name: varchar("name", { length: 255 }).notNull(),
  triggerEvent: varchar("trigger_event", { length: 50 }).notNull(), // donation_received, campaign_milestone, etc.
  triggerConditions: jsonb("trigger_conditions"), // Conditions that must be met
  delayMinutes: integer("delay_minutes").default(0), // Delay before sending video
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Video Campaigns (bulk video message campaigns)
export const videoCampaigns = pgTable("video_campaigns", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizations.id),
  templateId: integer("template_id")
    .notNull()
    .references(() => videoTemplates.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  recipientCount: integer("recipient_count").default(0),
  status: varchar("status", { length: 50 }).default("draft"), // draft, generating, ready, sending, sent, paused
  scheduledAt: timestamp("scheduled_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  successCount: integer("success_count").default(0),
  failureCount: integer("failure_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Export notification system schemas
export const insertNotificationEventTypeSchema = createInsertSchema(
  notificationEventTypes,
);
export const insertNotificationSettingsSchema =
  createInsertSchema(notificationSettings);
export const insertNotificationDeliveryLogSchema = createInsertSchema(
  notificationDeliveryLog,
);
export const insertIntegrationConfigurationSchema = createInsertSchema(
  integrationConfigurations,
);
export const insertComplianceAuditLogSchema =
  createInsertSchema(complianceAuditLog);

// Video system schemas
export const insertVideoTemplateSchema = createInsertSchema(
  videoTemplates,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertVideoMessageSchema = createInsertSchema(videoMessages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertVideoAutomationRuleSchema = createInsertSchema(
  videoAutomationRules,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertVideoCampaignSchema = createInsertSchema(
  videoCampaigns,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Export notification system types
export type NotificationEventType = typeof notificationEventTypes.$inferSelect;
export type NotificationSettings = typeof notificationSettings.$inferSelect;
export type NotificationDeliveryLog =
  typeof notificationDeliveryLog.$inferSelect;
export type IntegrationConfiguration =
  typeof integrationConfigurations.$inferSelect;
export type ComplianceAuditLog = typeof complianceAuditLog.$inferSelect;

export type InsertNotificationEventType = z.infer<
  typeof insertNotificationEventTypeSchema
>;
export type InsertNotificationSettings = z.infer<
  typeof insertNotificationSettingsSchema
>;
export type InsertNotificationDeliveryLog = z.infer<
  typeof insertNotificationDeliveryLogSchema
>;
export type InsertIntegrationConfiguration = z.infer<
  typeof insertIntegrationConfigurationSchema
>;
export type InsertComplianceAuditLog = z.infer<
  typeof insertComplianceAuditLogSchema
>;

// Video system types
export type VideoTemplate = typeof videoTemplates.$inferSelect;
export type VideoMessage = typeof videoMessages.$inferSelect;
export type VideoAutomationRule = typeof videoAutomationRules.$inferSelect;
export type VideoCampaign = typeof videoCampaigns.$inferSelect;

export type InsertVideoTemplate = z.infer<typeof insertVideoTemplateSchema>;
export type InsertVideoMessage = z.infer<typeof insertVideoMessageSchema>;
export type InsertVideoAutomationRule = z.infer<
  typeof insertVideoAutomationRuleSchema
>;
export type InsertVideoCampaign = z.infer<typeof insertVideoCampaignSchema>;

// ================================
// ENHANCED ONBOARDING WORKFLOW SYSTEM (8-STEP)
// ================================

// Note: onboardingStepProgress table removed - functionality consolidated into organizationOnboarding table

// Onboarding Configuration Templates
export const onboardingWorkflowTemplates = pgTable(
  "onboarding_workflow_templates",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    organizationType: text("organization_type"), // nonprofit, church, school, etc
    description: text("description"),

    // Template configuration
    steps: jsonb("steps").notNull(), // Array of step configurations
    estimatedDuration: integer("estimated_duration"), // in minutes

    // Features enabled by this template
    featuresEnabled: jsonb("features_enabled"),
    defaultSettings: jsonb("default_settings"),

    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
);

// Enhanced Type exports for onboarding system
export type SelectOnboardingWorkflowTemplate =
  typeof onboardingWorkflowTemplates.$inferSelect;
export type InsertOnboardingWorkflowTemplate =
  typeof onboardingWorkflowTemplates.$inferInsert;

// Enhanced insert schemas for validation
export const insertOnboardingWorkflowTemplateSchema = createInsertSchema(
  onboardingWorkflowTemplates,
);

// ================================
// ASSOCIATION MANAGEMENT SYSTEM
// ================================

// Association Members
export const associationMembers = pgTable("association_members", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizations.id),
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),

  // Membership details
  membershipType: text("membership_type"), // individual, institutional, corporate
  membershipTier: text("membership_tier"), // basic, standard, premium
  membershipNumber: text("membership_number").unique(),
  joinDate: timestamp("join_date").defaultNow(),
  renewalDate: timestamp("renewal_date"),

  // Status and roles
  status: text("status").default("active"), // active, inactive, suspended, expired
  role: text("role").default("member"), // member, board, officer, admin
  permissions: jsonb("permissions"),

  // Professional details
  organization: text("organization"), // Where they work
  jobTitle: text("job_title"),
  industry: text("industry"),
  specialty: text("specialty"),

  // Communication preferences
  emailNotifications: boolean("email_notifications").default(true),
  smsNotifications: boolean("sms_notifications").default(false),
  newsletterSubscribed: boolean("newsletter_subscribed").default(true),

  // Notes and tags
  notes: text("notes"),
  tags: jsonb("tags"), // Array of strings

  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sub-Organizations (chapters, affiliates, etc.)
export const subOrganizations = pgTable("sub_organizations", {
  id: serial("id").primaryKey(),
  parentOrganizationId: integer("parent_organization_id")
    .notNull()
    .references(() => organizations.id),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  type: text("type"), // chapter, affiliate, branch, division

  // Contact information
  email: text("email"),
  phone: text("phone"),
  website: text("website"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),

  // Leadership
  primaryContactId: integer("primary_contact_id").references(
    () => associationMembers.id,
  ),
  boardChairId: integer("board_chair_id").references(
    () => associationMembers.id,
  ),

  // Settings and branding
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color"),
  customBranding: jsonb("custom_branding"),
  localSettings: jsonb("local_settings"),

  // Financial
  annualBudget: decimal("annual_budget", { precision: 12, scale: 2 }),
  memberCount: integer("member_count").default(0),

  // Status
  status: text("status").default("active"), // active, inactive, pending
  charteredDate: timestamp("chartered_date"),

  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Association Dues
export const associationDues = pgTable("association_dues", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizations.id),
  memberId: integer("member_id")
    .notNull()
    .references(() => associationMembers.id),

  // Dues period
  periodType: text("period_type").default("annual"), // monthly, quarterly, annual
  dueYear: integer("due_year").notNull(),
  dueMonth: integer("due_month"), // For monthly/quarterly

  // Amount details
  baseAmount: decimal("base_amount", { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal("discount_amount", {
    precision: 10,
    scale: 2,
  }).default("0"),
  finalAmount: decimal("final_amount", { precision: 10, scale: 2 }).notNull(),
  discountReason: text("discount_reason"),

  // Payment tracking
  status: text("status").default("pending"), // pending, paid, overdue, waived
  dueDate: timestamp("due_date").notNull(),
  paidDate: timestamp("paid_date"),
  paymentMethod: text("payment_method"), // card, ach, check, cash
  transactionId: text("transaction_id"),

  // Automation
  remindersSent: integer("reminders_sent").default(0),
  lastReminderDate: timestamp("last_reminder_date"),
  autoRenewal: boolean("auto_renewal").default(false),

  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Association Events
export const associationEvents = pgTable("association_events", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizations.id),
  subOrganizationId: integer("sub_organization_id").references(
    () => subOrganizations.id,
  ),

  // Event details
  title: text("title").notNull(),
  description: text("description"),
  eventType: text("event_type"), // conference, workshop, meeting, social, fundraiser
  category: text("category"),

  // Scheduling
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  timezone: text("timezone").default("America/New_York"),
  isAllDay: boolean("is_all_day").default(false),

  // Location
  venue: text("venue"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  isVirtual: boolean("is_virtual").default(false),
  virtualLink: text("virtual_link"),

  // Registration
  registrationRequired: boolean("registration_required").default(false),
  registrationFee: decimal("registration_fee", {
    precision: 10,
    scale: 2,
  }).default("0"),
  maxAttendees: integer("max_attendees"),
  currentAttendees: integer("current_attendees").default(0),
  registrationDeadline: timestamp("registration_deadline"),

  // Sponsors and exhibitors
  sponsorshipAvailable: boolean("sponsorship_available").default(false),
  exhibitorSpaceAvailable: boolean("exhibitor_space_available").default(false),
  sponsorshipInfo: jsonb("sponsorship_info"),

  // Media
  imageUrl: text("image_url"),
  documentUrls: jsonb("document_urls"), // Array of document URLs

  // Status
  status: text("status").default("draft"), // draft, published, cancelled, completed
  visibility: text("visibility").default("members"), // public, members, private

  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Association Resources
export const associationResources = pgTable("association_resources", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizations.id),
  uploadedById: integer("uploaded_by_id").references(
    () => associationMembers.id,
  ),

  // Resource details
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"), // documents, videos, templates, policies
  resourceType: text("resource_type"), // pdf, video, image, link, document

  // File details
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  fileSize: integer("file_size"), // in bytes
  mimeType: text("mime_type"),

  // External link
  externalUrl: text("external_url"),

  // Access control
  accessLevel: text("access_level").default("members"), // public, members, leadership, board
  membershipTierRequired: text("membership_tier_required"), // basic, standard, premium

  // Organization and tagging
  tags: jsonb("tags"), // Array of strings
  featured: boolean("featured").default(false),
  downloadCount: integer("download_count").default(0),

  // Status
  status: text("status").default("active"), // active, archived, pending_review
  approvedById: integer("approved_by_id").references(
    () => associationMembers.id,
  ),
  approvedAt: timestamp("approved_at"),

  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Association Communications
export const associationCommunications = pgTable("association_communications", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizations.id),
  sentById: integer("sent_by_id").references(() => associationMembers.id),

  // Message details
  type: text("type").notNull(), // email, sms, announcement, newsletter
  subject: text("subject"),
  content: text("content").notNull(),
  htmlContent: text("html_content"),

  // Targeting
  recipientType: text("recipient_type").default("all"), // all, specific, tier, role
  targetMembershipTiers: jsonb("target_membership_tiers"), // Array of tier names
  targetRoles: jsonb("target_roles"), // Array of role names
  specificRecipients: jsonb("specific_recipients"), // Array of member IDs

  // Scheduling
  scheduledFor: timestamp("scheduled_for"),
  sentAt: timestamp("sent_at"),

  // Tracking
  totalRecipients: integer("total_recipients").default(0),
  deliveredCount: integer("delivered_count").default(0),
  openedCount: integer("opened_count").default(0),
  clickedCount: integer("clicked_count").default(0),

  // Status
  status: text("status").default("draft"), // draft, scheduled, sent, failed
  priority: text("priority").default("normal"), // low, normal, high, urgent

  // Attachments
  attachments: jsonb("attachments"), // Array of file URLs

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Type exports for association management
export type SelectAssociationMember = typeof associationMembers.$inferSelect;
export type InsertAssociationMember = typeof associationMembers.$inferInsert;
export type SelectSubOrganization = typeof subOrganizations.$inferSelect;
export type InsertSubOrganization = typeof subOrganizations.$inferInsert;
export type SelectAssociationDues = typeof associationDues.$inferSelect;
export type InsertAssociationDues = typeof associationDues.$inferInsert;
export type SelectAssociationEvent = typeof associationEvents.$inferSelect;
export type InsertAssociationEvent = typeof associationEvents.$inferInsert;
export type SelectAssociationResource =
  typeof associationResources.$inferSelect;
export type InsertAssociationResource =
  typeof associationResources.$inferInsert;
export type SelectAssociationCommunication =
  typeof associationCommunications.$inferSelect;
export type InsertAssociationCommunication =
  typeof associationCommunications.$inferInsert;

// Insert schemas for validation
export const insertAssociationMemberSchema =
  createInsertSchema(associationMembers);
export const insertSubOrganizationSchema = createInsertSchema(subOrganizations);
export const insertAssociationDuesSchema = createInsertSchema(associationDues);
export const insertAssociationEventSchema =
  createInsertSchema(associationEvents);
export const insertAssociationResourceSchema =
  createInsertSchema(associationResources);
export const insertAssociationCommunicationSchema = createInsertSchema(
  associationCommunications,
);

// ================================
// DIOCESES/ASSOCIATIONS SYSTEM
// ================================

// Main Associations table (Diocese-level entities)
export const associations = pgTable(
  "associations",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(), // "Diocese of Sacramento", "Archdiocese of Los Angeles"
    slug: text("slug").notNull().unique(), // "diocese-sacramento", "archdiocese-la"
    ownerUserId: varchar("owner_user_id")
      .notNull()
      .references(() => users.id), // Bishop user who owns this association

    // Diocesan Information
    type: text("type").default("diocese"), // diocese, archdiocese, eparchy, association
    region: text("region"), // Geographic region
    website: text("website"),
    email: text("email"),
    phone: text("phone"),

    // Address
    address: text("address"),
    city: text("city"),
    state: text("state"),
    zipCode: text("zip_code"),
    country: text("country").default("US"),

    // Settings
    settings: jsonb("settings"), // Diocese-wide settings and configurations

    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    slugIdx: index("associations_slug_idx").on(table.slug),
    ownerIdx: index("associations_owner_idx").on(table.ownerUserId),
  }),
);

// Association Organizations (linking associations/dioceses to member organizations/parishes)
export const associationOrganizations = pgTable(
  "association_organizations",
  {
    id: serial("id").primaryKey(),
    associationId: integer("association_id")
      .notNull()
      .references(() => associations.id),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id),

    // Membership details
    membershipStatus: text("membership_status").default("active"), // active, pending, suspended, inactive
    joinedAt: timestamp("joined_at").defaultNow(),

    // Parish-specific info within diocese
    parishType: text("parish_type"), // parish, cathedral, mission, chapel
    deanery: text("deanery"), // Administrative subdivision within diocese
    vicariate: text("vicariate"), // Larger administrative subdivision

    // Financial integration
    assessmentRequired: boolean("assessment_required").default(true),
    assessmentAmount: decimal("assessment_amount", { precision: 10, scale: 2 }),
    assessmentPeriod: text("assessment_period").default("annual"), // monthly, quarterly, annual

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    associationIdx: index("association_orgs_association_idx").on(
      table.associationId,
    ),
    organizationIdx: index("association_orgs_organization_idx").on(
      table.organizationId,
    ),
    uniqueAssocOrg: index("association_orgs_unique_idx").on(
      table.associationId,
      table.organizationId,
    ),
  }),
);

// Type exports for associations system
export type Association = typeof associations.$inferSelect;
export type InsertAssociation = typeof associations.$inferInsert;
export type AssociationOrganization =
  typeof associationOrganizations.$inferSelect;
export type InsertAssociationOrganization =
  typeof associationOrganizations.$inferInsert;

// Insert schemas for validation
export const insertAssociationSchema = createInsertSchema(associations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAssociationOrganizationSchema = createInsertSchema(
  associationOrganizations,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ==================== NEW COMPREHENSIVE FEATURES ====================

// Platform Tipping Settings
export const organizationTippingSettings = pgTable(
  "organization_tipping_settings",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id)
      .notNull(),
    tippingEnabled: boolean("tipping_enabled").default(false),
    defaultTipType: varchar("default_tip_type", { length: 20 }).default(
      "percentage",
    ), // percentage or fixed
    defaultTipAmount: decimal("default_tip_amount", {
      precision: 10,
      scale: 2,
    }).default("10.00"),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
);

// Event Sponsorship Management
export const sponsorshipTiers = pgTable("sponsorship_tiers", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  eventId: integer("event_id").references(() => events.id),
  tierName: varchar("tier_name", { length: 100 }).notNull(),
  tierPrice: decimal("tier_price", { precision: 10, scale: 2 }).notNull(),
  tierDescription: text("tier_description"),
  availableSpots: integer("available_spots").default(1),
  soldSpots: integer("sold_spots").default(0),
  benefits: jsonb("benefits"), // Array of benefit descriptions
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const eventSponsors = pgTable("event_sponsors", {
  id: serial("id").primaryKey(),
  tierID: integer("tier_id")
    .references(() => sponsorshipTiers.id)
    .notNull(),
  sponsorName: varchar("sponsor_name", { length: 200 }).notNull(),
  contactName: varchar("contact_name", { length: 100 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 20 }),
  amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending"), // pending, confirmed, cancelled
  confirmationDate: timestamp("confirmation_date"),
  paymentDate: timestamp("payment_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Mobile Intake & e-Consent System
export const clientIntakeRecords = pgTable("client_intake_records", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  clientId: integer("client_id"), // Will reference clients table when created

  // Personal Information (encrypted at rest)
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  dateOfBirth: varchar("date_of_birth", { length: 10 }).notNull(), // Use varchar for date strings
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 255 }),

  // Address Information
  address: text("address").notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 50 }).notNull(),
  zipCode: varchar("zip_code", { length: 10 }).notNull(),

  // Emergency Contact
  emergencyContactName: varchar("emergency_contact_name", {
    length: 200,
  }).notNull(),
  emergencyContactPhone: varchar("emergency_contact_phone", {
    length: 20,
  }).notNull(),
  emergencyContactRelationship: varchar("emergency_contact_relationship", {
    length: 100,
  }).notNull(),

  // Pregnancy Information
  isPregnant: boolean("is_pregnant").default(false),
  estimatedDueDate: varchar("estimated_due_date", { length: 10 }),
  gestationalAge: varchar("gestational_age", { length: 50 }),
  previousPregnancies: text("previous_pregnancies"),
  currentConcerns: text("current_concerns"),

  // Medical History (encrypted)
  medicalConditions: text("medical_conditions"),
  medications: text("medications"),
  allergies: text("allergies"),

  // Services and Language
  servicesNeeded: jsonb("services_needed"), // Array of service strings
  urgentNeeds: text("urgent_needs"),
  preferredLanguage: varchar("preferred_language", { length: 50 }).default(
    "English",
  ),
  needsTranslator: boolean("needs_translator").default(false),
  accessibilityNeeds: text("accessibility_needs"),
  referralSource: varchar("referral_source", { length: 200 }),

  // Consent and Legal
  consentToTreatment: boolean("consent_to_treatment").default(false),
  consentToShare: boolean("consent_to_share").default(false),
  hipaaAcknowledgment: boolean("hipaa_acknowledgment").default(false),
  photographyConsent: boolean("photography_consent").default(false),

  // Digital Signature
  digitalSignature: text("digital_signature"), // Base64 signature data
  signatureDate: varchar("signature_date", { length: 10 }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }), // For audit trail

  // Additional
  additionalNotes: text("additional_notes"),

  // Metadata
  submittedAt: timestamp("submitted_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  processedBy: varchar("processed_by", { length: 100 }),
  status: varchar("status", { length: 20 }).default("pending"), // pending, processed, archived
});

// Custom Form Builder System
export const customFormTemplates = pgTable("custom_form_templates", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).default("intake"), // intake, consent, medical, follow-up
  formType: varchar("form_type", { length: 50 }).default("custom"), // custom, template, system

  // Form Structure (JSON)
  formSchema: jsonb("form_schema"), // Complete form structure definition
  settings: jsonb("settings"), // Form display settings, validation rules, etc.

  // Form Configuration
  isActive: boolean("is_active").default(true),
  isTemplate: boolean("is_template").default(false), // If true, this is a reusable template
  requiresSignature: boolean("requires_signature").default(false),
  allowSaveDraft: boolean("allow_save_draft").default(true),
  multiStep: boolean("multi_step").default(false),
  stepConfiguration: jsonb("step_configuration"), // Multi-step form configuration

  // Conditional Logic
  conditionalLogic: jsonb("conditional_logic"), // Rules for field visibility/requirements

  // Notifications and Processing
  notificationSettings: jsonb("notification_settings"),
  autoResponseSettings: jsonb("auto_response_settings"),

  // Version Control
  version: integer("version").default(1),
  parentFormId: integer("parent_form_id"), // Self-reference for form versions

  // Metadata
  createdBy: varchar("created_by", { length: 100 }).notNull(),
  updatedBy: varchar("updated_by", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const customFormFields = pgTable("custom_form_fields", {
  id: serial("id").primaryKey(),
  formId: integer("form_id")
    .references(() => customFormTemplates.id)
    .notNull(),
  fieldId: varchar("field_id", { length: 100 }).notNull(), // Unique within form (e.g., "client_name", "emergency_contact")

  // Field Configuration
  fieldType: varchar("field_type", { length: 50 }).notNull(), // text, textarea, select, radio, checkbox, date, signature, file, phone, email
  label: varchar("label", { length: 255 }).notNull(),
  placeholder: varchar("placeholder", { length: 255 }),
  description: text("description"),
  helpText: text("help_text"),

  // Layout and Display
  displayOrder: integer("display_order").notNull(),
  stepNumber: integer("step_number").default(1), // For multi-step forms
  columnSpan: integer("column_span").default(1), // 1=half width, 2=full width
  isVisible: boolean("is_visible").default(true),

  // Validation Rules
  isRequired: boolean("is_required").default(false),
  validationRules: jsonb("validation_rules"), // min/max length, regex patterns, etc.

  // Field-specific Configuration
  fieldConfiguration: jsonb("field_configuration"), // Type-specific settings
  conditionalRules: jsonb("conditional_rules"), // Show/hide based on other fields

  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const formFieldOptions = pgTable("form_field_options", {
  id: serial("id").primaryKey(),
  fieldId: integer("field_id")
    .references(() => customFormFields.id)
    .notNull(),
  optionValue: varchar("option_value", { length: 200 }).notNull(),
  optionLabel: varchar("option_label", { length: 200 }).notNull(),
  displayOrder: integer("display_order").notNull(),
  isDefault: boolean("is_default").default(false),
  conditionalValue: varchar("conditional_value", { length: 200 }), // For conditional logic triggers
  createdAt: timestamp("created_at").defaultNow(),
});

export const customFormSubmissions = pgTable("custom_form_submissions", {
  id: serial("id").primaryKey(),
  formId: integer("form_id")
    .references(() => customFormTemplates.id)
    .notNull(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  clientId: integer("client_id"), // Reference to client if exists

  // Submission Data
  formData: jsonb("form_data").notNull(), // All form field values
  attachments: jsonb("attachments"), // File uploads and their metadata

  // Digital Signature
  digitalSignature: text("digital_signature"),
  signatureDate: varchar("signature_date", { length: 10 }),
  signatureIpAddress: varchar("signature_ip_address", { length: 45 }),

  // Submission Status
  status: varchar("status", { length: 20 }).default("draft"), // draft, submitted, processed, archived
  currentStep: integer("current_step").default(1),
  completionPercentage: integer("completion_percentage").default(0),

  // Processing Information
  submittedAt: timestamp("submitted_at"),
  processedAt: timestamp("processed_at"),
  processedBy: varchar("processed_by", { length: 100 }),
  processingNotes: text("processing_notes"),

  // Privacy and Audit
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  sessionId: varchar("session_id", { length: 100 }),

  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// TODO: Add indexes for performance optimization later

// Type exports for new features
export type OrganizationTippingSettings =
  typeof organizationTippingSettings.$inferSelect;
export type InsertOrganizationTippingSettings =
  typeof organizationTippingSettings.$inferInsert;
export type SponsorshipTier = typeof sponsorshipTiers.$inferSelect;
export type InsertSponsorshipTier = typeof sponsorshipTiers.$inferInsert;
export type EventSponsor = typeof eventSponsors.$inferSelect;
export type InsertEventSponsor = typeof eventSponsors.$inferInsert;
export type ClientIntakeRecord = typeof clientIntakeRecords.$inferSelect;
export type InsertClientIntakeRecord = typeof clientIntakeRecords.$inferInsert;

// Custom Form Builder Types
export type CustomFormTemplate = typeof customFormTemplates.$inferSelect;
export type InsertCustomFormTemplate = typeof customFormTemplates.$inferInsert;
export type CustomFormField = typeof customFormFields.$inferSelect;
export type InsertCustomFormField = typeof customFormFields.$inferInsert;
export type FormFieldOption = typeof formFieldOptions.$inferSelect;
export type InsertFormFieldOption = typeof formFieldOptions.$inferInsert;
export type CustomFormSubmission = typeof customFormSubmissions.$inferSelect;
export type InsertCustomFormSubmission =
  typeof customFormSubmissions.$inferInsert;

// New insert schemas for platform features
export const insertOrganizationTippingSettingsSchema = createInsertSchema(
  organizationTippingSettings,
);
export const insertSponsorshipTierSchema = createInsertSchema(sponsorshipTiers);
export const insertEventSponsorSchema = createInsertSchema(eventSponsors);
export const insertClientIntakeRecordSchema = createInsertSchema(
  clientIntakeRecords,
).omit({
  id: true,
  submittedAt: true,
  processedAt: true,
});

// Custom Form Builder Insert Schemas
export const insertCustomFormTemplateSchema = createInsertSchema(
  customFormTemplates,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomFormFieldSchema = createInsertSchema(
  customFormFields,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFormFieldOptionSchema = createInsertSchema(
  formFieldOptions,
).omit({
  id: true,
  createdAt: true,
});

export const insertCustomFormSubmissionSchema = createInsertSchema(
  customFormSubmissions,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  submittedAt: true,
  processedAt: true,
});

// SMS / Text-to-Give Analytics Types
export const SmsAnalyticsSchema = z.object({
  // Summary metrics
  summary: z.object({
    delivered: z.number(),
    uniqueNumbers: z.number(),
    clicks: z.number(),
    donationStarts: z.number(),
    donations: z.number(),
    totalAmount: z.number(),
    avgGift: z.number(),
    medianGift: z.number(),
    conversionRate: z.number(),
    repeatDonorRate: z.number(),
    unsubscribeRate: z.number(),
    smsCost: z.number(),
    processingFees: z.number(),
    netRevenue: z.number(),
    ROI: z.number(),
    RPM: z.number(), // Revenue Per Message
    RPS: z.number(), // Revenue Per Subscriber
  }),

  // Time series data
  timeSeries: z.array(
    z.object({
      date: z.string(),
      delivered: z.number(),
      clicks: z.number(),
      donationStarts: z.number(),
      donations: z.number(),
      amount: z.number(),
    }),
  ),

  // Conversion funnel
  funnel: z.object({
    delivered: z.number(),
    clicked: z.number(),
    checkoutStarted: z.number(),
    paymentInitiated: z.number(),
    success: z.number(),
  }),

  // Donor behavior segments
  donorSegments: z.object({
    firstTimePct: z.number(),
    repeatPct: z.number(),
    rfm: z.object({
      high: z.number(),
      med: z.number(),
      low: z.number(),
    }),
    amountHistogram: z.array(
      z.object({
        bin: z.string(),
        label: z.string(),
        count: z.number(),
      }),
    ),
  }),

  // Campaign performance
  byCampaign: z.array(
    z.object({
      id: z.number(),
      keyword: z.string(),
      name: z.string(),
      delivered: z.number(),
      clicks: z.number(),
      donations: z.number(),
      totalAmount: z.number(),
      avgGift: z.number(),
      conversionRate: z.number(),
      unsubscribeRate: z.number(),
      rpm: z.number(),
    }),
  ),

  // Activity patterns
  activityHeatmap: z.array(
    z.object({
      dow: z.number(), // day of week (0-6)
      hour: z.number(), // hour of day (0-23)
      count: z.number(),
    }),
  ),
});

export type SmsAnalytics = z.infer<typeof SmsAnalyticsSchema>;

// Church Members
export const churchMembers = pgTable(
  "church_members",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id),

    // Personal Information
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    dateOfBirth: timestamp("date_of_birth"),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    city: text("city"),
    state: text("state"),
    zipCode: text("zip_code"),

    // Membership Information
    membershipNumber: text("membership_number").unique(),
    membershipStatus: text("membership_status").default("active"), // active, inactive, visitor, new_member
    membershipDate: timestamp("membership_date"),
    baptismDate: timestamp("baptism_date"),
    confirmationDate: timestamp("confirmation_date"),

    // Family Information
    familyId: integer("family_id"),
    relationshipToHead: text("relationship_to_head"), // head, spouse, child, other

    // Ministry and Service
    ministries: jsonb("ministries"), // Array of ministry names/IDs
    volunteerRoles: jsonb("volunteer_roles"), // Array of volunteer positions
    skills: jsonb("skills"), // Array of skills for volunteer matching
    availability: jsonb("availability"), // Days/times available for service

    // Pastoral Care
    pastorNotes: text("pastor_notes"),
    prayerRequests: jsonb("prayer_requests"),
    specialNeeds: text("special_needs"),

    // Check-in Preferences
    allowPhotoCheckIn: boolean("allow_photo_checkin").default(true),
    emergencyContact: text("emergency_contact"),
    emergencyPhone: text("emergency_phone"),
    medicalInfo: text("medical_info"),

    // System Fields
    isActive: boolean("is_active").default(true),
    profileImageUrl: text("profile_image_url"),
    qrCode: text("qr_code"), // Unique QR code for quick check-in

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    orgIdx: index("church_members_org_idx").on(table.organizationId),
    membershipIdx: index("church_members_membership_idx").on(
      table.membershipNumber,
    ),
    familyIdx: index("church_members_family_idx").on(table.familyId),
    statusIdx: index("church_members_status_idx").on(table.membershipStatus),
  }),
);

// Church Services
export const churchServices = pgTable(
  "church_services",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id),

    // Service Information
    serviceName: text("service_name").notNull(), // Sunday Service, Wednesday Prayer, etc.
    serviceType: text("service_type").notNull(), // regular, special, holiday
    serviceDate: timestamp("service_date").notNull(),
    startTime: text("start_time").notNull(), // "09:00"
    endTime: text("end_time").notNull(), // "10:30"
    location: text("location").default("Main Sanctuary"),

    // Service Details
    theme: text("theme"),
    scripture: text("scripture"),
    sermon: text("sermon"),
    pastor: text("pastor"),
    worship: text("worship"),

    // Attendance Tracking
    expectedAttendance: integer("expected_attendance"),
    actualAttendance: integer("actual_attendance").default(0),
    firstTimeVisitors: integer("first_time_visitors").default(0),

    // Settings
    allowCheckIn: boolean("allow_check_in").default(true),
    checkInStartTime: timestamp("checkin_start_time"),
    checkInEndTime: timestamp("checkin_end_time"),

    // Service Status
    status: text("status").default("scheduled"), // scheduled, in_progress, completed, cancelled

    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    orgIdx: index("church_services_org_idx").on(table.organizationId),
    dateIdx: index("church_services_date_idx").on(table.serviceDate),
    statusIdx: index("church_services_status_idx").on(table.status),
  }),
);

// Church Attendance (Check-in Records)
export const churchAttendance = pgTable(
  "church_attendance",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id),
    serviceId: integer("service_id")
      .notNull()
      .references(() => churchServices.id),
    memberId: integer("member_id").references(() => churchMembers.id), // null for visitors

    // Check-in Information
    checkInTime: timestamp("checkin_time").defaultNow(),
    checkInMethod: text("checkin_method").default("manual"), // manual, qr_code, kiosk
    checkedInBy: text("checked_in_by"), // staff member or "self"

    // Visitor Information (if not a member)
    visitorFirstName: text("visitor_first_name"),
    visitorLastName: text("visitor_last_name"),
    visitorEmail: text("visitor_email"),
    visitorPhone: text("visitor_phone"),
    visitorAddress: text("visitor_address"),
    isFirstTimeVisitor: boolean("is_first_time_visitor").default(false),

    // Family Check-in
    familyId: integer("family_id"), // Group family check-ins
    isGroupCheckIn: boolean("is_group_checkin").default(false),

    // Service Participation
    participatedInWorship: boolean("participated_in_worship").default(true),
    participatedInCommunion: boolean("participated_in_communion").default(
      false,
    ),
    leftEarly: boolean("left_early").default(false),

    // Follow-up
    needsFollowUp: boolean("needs_follow_up").default(false),
    followUpNotes: text("follow_up_notes"),
    assignedPastor: text("assigned_pastor"),

    // System Fields
    notes: text("notes"),
    metadata: jsonb("metadata"), // Additional flexible data

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    orgIdx: index("church_attendance_org_idx").on(table.organizationId),
    serviceIdx: index("church_attendance_service_idx").on(table.serviceId),
    memberIdx: index("church_attendance_member_idx").on(table.memberId),
    dateIdx: index("church_attendance_date_idx").on(table.checkInTime),
    familyIdx: index("church_attendance_family_idx").on(table.familyId),
  }),
);

// Church Volunteer Check-ins
export const volunteerCheckIns = pgTable(
  "volunteer_checkins",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id),
    memberId: integer("member_id")
      .notNull()
      .references(() => churchMembers.id),

    // Volunteer Service Information
    serviceDate: timestamp("service_date").notNull(),
    volunteerRole: text("volunteer_role").notNull(), // usher, greeter, sound, nursery, etc.
    ministry: text("ministry"), // worship, children, youth, etc.
    location: text("location"),

    // Time Tracking
    checkInTime: timestamp("checkin_time").defaultNow(),
    checkOutTime: timestamp("checkout_time"),
    hoursServed: decimal("hours_served", { precision: 4, scale: 2 }),

    // Service Details
    serviceDescription: text("service_description"),
    responsibilityArea: text("responsibility_area"),
    leadVolunteer: text("lead_volunteer"),

    // Recognition and Tracking
    serviceComplete: boolean("service_complete").default(false),
    qualityRating: integer("quality_rating"), // 1-5 rating
    recognitionEarned: text("recognition_earned"), // badge, certificate, etc.

    // System Fields
    notes: text("notes"),
    checkedInBy: text("checked_in_by"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    orgIdx: index("volunteer_checkins_org_idx").on(table.organizationId),
    memberIdx: index("volunteer_checkins_member_idx").on(table.memberId),
    dateIdx: index("volunteer_checkins_date_idx").on(table.serviceDate),
    roleIdx: index("volunteer_checkins_role_idx").on(table.volunteerRole),
  }),
);

// Bishop Blast Messages (for Catholic diocese communication management)
export const bishopBlastMessages = pgTable(
  "bishop_blast_messages",
  {
    id: serial("id").primaryKey(),
    associationId: integer("association_id")
      .notNull()
      .references(() => associations.id),

    // Message Details
    messageType: text("message_type").notNull(), // email, sms, both
    subject: text("subject"), // for emails only
    content: text("content").notNull(),

    // Sender Information
    senderId: varchar("sender_id")
      .notNull()
      .references(() => users.id),
    senderName: text("sender_name").notNull(),
    senderEmail: text("sender_email"),
    senderPhone: text("sender_phone"),

    // Recipient Targeting
    recipientType: text("recipient_type").notNull(), // all_pastors, all_parishioners, specific_parishes, custom_list
    targetParishes: jsonb("target_parishes"), // Array of parish names/IDs for specific targeting
    recipientFilter: jsonb("recipient_filter"), // Additional filtering criteria

    // Message Status
    status: text("status").default("draft"), // draft, scheduled, sending, sent, failed, cancelled
    scheduledAt: timestamp("scheduled_at"),
    sentAt: timestamp("sent_at"),

    // Delivery Statistics
    totalRecipients: integer("total_recipients").default(0),
    emailsSent: integer("emails_sent").default(0),
    smsSent: integer("sms_sent").default(0),
    emailsDelivered: integer("emails_delivered").default(0),
    smsDelivered: integer("sms_delivered").default(0),
    emailsFailed: integer("emails_failed").default(0),
    smsFailed: integer("sms_failed").default(0),

    // Settings
    requireDeliveryConfirmation: boolean(
      "require_delivery_confirmation",
    ).default(false),
    sendTestMessage: boolean("send_test_message").default(false),
    testRecipients: jsonb("test_recipients"), // Array of test email/phone numbers

    // Metadata
    notes: text("notes"),
    tags: jsonb("tags"), // Array of tags for organization

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    associationIdx: index("bishop_blast_messages_association_idx").on(
      table.associationId,
    ),
    senderIdx: index("bishop_blast_messages_sender_idx").on(table.senderId),
    statusIdx: index("bishop_blast_messages_status_idx").on(table.status),
    typeIdx: index("bishop_blast_messages_type_idx").on(table.messageType),
    sentAtIdx: index("bishop_blast_messages_sent_at_idx").on(table.sentAt),
  }),
);

// Bishop Blast Recipients (tracking who received what messages)
export const bishopBlastRecipients = pgTable(
  "bishop_blast_recipients",
  {
    id: serial("id").primaryKey(),
    associationId: integer("association_id")
      .notNull()
      .references(() => associations.id),
    messageId: integer("message_id")
      .notNull()
      .references(() => bishopBlastMessages.id),

    // Recipient Information
    recipientType: text("recipient_type").notNull(), // pastor, parishioner, admin, visitor
    recipientId: integer("recipient_id"), // References churchMembers.id if available
    recipientName: text("recipient_name").notNull(),
    recipientEmail: text("recipient_email"),
    recipientPhone: text("recipient_phone"),
    parishId: integer("parish_id").references(() => organizations.id), // Which parish this recipient belongs to
    parishName: text("parish_name"), // Which parish they belong to

    // Delivery Tracking
    emailStatus: text("email_status").default("pending"), // pending, sent, delivered, opened, clicked, bounced, failed, unsubscribed
    smsStatus: text("sms_status").default("pending"), // pending, sent, delivered, failed, unsubscribed
    emailSentAt: timestamp("email_sent_at"),
    smsSentAt: timestamp("sms_sent_at"),
    emailDeliveredAt: timestamp("email_delivered_at"),
    smsDeliveredAt: timestamp("sms_delivered_at"),
    emailOpenedAt: timestamp("email_opened_at"),
    emailClickedAt: timestamp("email_clicked_at"),

    // External IDs for tracking
    emailMessageId: text("email_message_id"), // SendGrid message ID
    smsMessageId: text("sms_message_id"), // Twilio message ID

    // Error Information
    emailError: text("email_error"),
    smsError: text("sms_error"),
    retryCount: integer("retry_count").default(0),
    lastRetryAt: timestamp("last_retry_at"),

    // Engagement
    unsubscribedAt: timestamp("unsubscribed_at"),
    unsubscribeReason: text("unsubscribe_reason"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    associationIdx: index("bishop_blast_recipients_association_idx").on(
      table.associationId,
    ),
    messageIdx: index("bishop_blast_recipients_message_idx").on(
      table.messageId,
    ),
    recipientIdx: index("bishop_blast_recipients_recipient_idx").on(
      table.recipientId,
    ),
    parishIdx: index("bishop_blast_recipients_parish_idx").on(table.parishId),
    typeIdx: index("bishop_blast_recipients_type_idx").on(table.recipientType),
    emailStatusIdx: index("bishop_blast_recipients_email_status_idx").on(
      table.emailStatus,
    ),
    smsStatusIdx: index("bishop_blast_recipients_sms_status_idx").on(
      table.smsStatus,
    ),
  }),
);

// Bishop Blast Logs (delivery tracking and analytics)
export const bishopBlastLogs = pgTable(
  "bishop_blast_logs",
  {
    id: serial("id").primaryKey(),
    associationId: integer("association_id")
      .notNull()
      .references(() => associations.id),
    messageId: integer("message_id").references(() => bishopBlastMessages.id),
    recipientId: integer("recipient_id").references(
      () => bishopBlastRecipients.id,
    ),

    // Log Details
    logType: text("log_type").notNull(), // message_created, message_sent, email_delivered, sms_delivered, email_opened, email_clicked, unsubscribed, failed, retry
    logLevel: text("log_level").default("info"), // info, warning, error
    event: text("event").notNull(), // Specific event name
    description: text("description"),

    // Technical Details
    channel: text("channel"), // email, sms
    provider: text("provider"), // sendgrid, twilio
    providerId: text("provider_id"), // External message/event ID
    httpStatus: integer("http_status"),
    responseData: jsonb("response_data"), // Full API response

    // Error Information
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    errorDetails: jsonb("error_details"),

    // User Information
    userId: varchar("user_id").references(() => users.id), // Who triggered the action
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),

    // Timing and Performance
    processingTimeMs: integer("processing_time_ms"),
    retryAttempt: integer("retry_attempt").default(0),

    // Analytics Data
    campaignData: jsonb("campaign_data"), // Additional tracking data

    timestamp: timestamp("timestamp").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    associationIdx: index("bishop_blast_logs_association_idx").on(
      table.associationId,
    ),
    messageIdx: index("bishop_blast_logs_message_idx").on(table.messageId),
    recipientIdx: index("bishop_blast_logs_recipient_idx").on(
      table.recipientId,
    ),
    typeIdx: index("bishop_blast_logs_type_idx").on(table.logType),
    levelIdx: index("bishop_blast_logs_level_idx").on(table.logLevel),
    timestampIdx: index("bishop_blast_logs_timestamp_idx").on(table.timestamp),
    eventIdx: index("bishop_blast_logs_event_idx").on(table.event),
    userIdx: index("bishop_blast_logs_user_idx").on(table.userId),
  }),
);

// Insert schemas for church tables
export const insertChurchMemberSchema = createInsertSchema(churchMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChurchServiceSchema = createInsertSchema(
  churchServices,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChurchAttendanceSchema = createInsertSchema(
  churchAttendance,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVolunteerCheckInSchema = createInsertSchema(
  volunteerCheckIns,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Insert schemas for Bishop Blast tables
export const insertBishopBlastMessageSchema = createInsertSchema(
  bishopBlastMessages,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBishopBlastRecipientSchema = createInsertSchema(
  bishopBlastRecipients,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBishopBlastLogSchema = createInsertSchema(
  bishopBlastLogs,
).omit({
  id: true,
  createdAt: true,
});

// Type definitions
export type ChurchMember = typeof churchMembers.$inferSelect;
export type ChurchService = typeof churchServices.$inferSelect;
export type ChurchAttendance = typeof churchAttendance.$inferSelect;
export type VolunteerCheckIn = typeof volunteerCheckIns.$inferSelect;

// Bishop Blast types
export type BishopBlastMessage = typeof bishopBlastMessages.$inferSelect;
export type BishopBlastRecipient = typeof bishopBlastRecipients.$inferSelect;
export type BishopBlastLog = typeof bishopBlastLogs.$inferSelect;

export type InsertChurchMember = z.infer<typeof insertChurchMemberSchema>;
export type InsertChurchService = z.infer<typeof insertChurchServiceSchema>;
export type InsertChurchAttendance = z.infer<
  typeof insertChurchAttendanceSchema
>;
export type InsertVolunteerCheckIn = z.infer<
  typeof insertVolunteerCheckInSchema
>;

// Bishop Blast insert types
export type InsertBishopBlastMessage = z.infer<
  typeof insertBishopBlastMessageSchema
>;
export type InsertBishopBlastRecipient = z.infer<
  typeof insertBishopBlastRecipientSchema
>;
export type InsertBishopBlastLog = z.infer<typeof insertBishopBlastLogSchema>;

// =============================================
// ANALYTICS SCHEMAS AND TYPES
// =============================================

// Analytics Query Parameters
export const analyticsQuerySchema = z.object({
  dateRange: z.enum(["7d", "30d", "90d", "180d", "365d", "all"]).default("30d"),
  includeForecasting: z.enum(["true", "false"]).default("false"),
  organizationId: z.number().int().positive(),
});

// Analytics Overview Response
export const analyticsOverviewSchema = z.object({
  summary: z.object({
    monthlyAverage: z.number(),
    totalVolume: z.number(),
    donationCount: z.number(),
    uniqueDonors: z.number(),
    refundedAmount: z.number(),
    refundCount: z.number(),
    voidedAmount: z.number(),
    voidCount: z.number(),
    recurringRevenue: z.number(),
    averageDonation: z.number(),
    conversionRate: z.number(),
    repeatDonorRate: z.number(),
    donorRetentionRate: z.number(),
    donorLifetimeValue: z.number(),
    costPerDollarRaised: z.number(),
    mrrGrowthRate: z.number(),
  }),
  monthlyData: z.array(
    z.object({
      month: z.string(),
      amount: z.number(),
      donors: z.number(),
      avgDonation: z.number(),
    }),
  ),
  campaignData: z.array(
    z.object({
      name: z.string(),
      amount: z.number(),
      percentage: z.number(),
      color: z.string(),
    }),
  ),
  paymentMethodData: z.array(
    z.object({
      method: z.string(),
      amount: z.number(),
      percentage: z.number(),
      transactions: z.number(),
    }),
  ),
  donorRetentionData: z.array(
    z.object({
      period: z.string(),
      count: z.number(),
      percentage: z.number(),
    }),
  ),
});

// Analytics Forecasting Response
export const analyticsForecastingSchema = z.object({
  forecastData: z.array(
    z.object({
      period: z.string(),
      amount: z.number().nullable(),
      forecast: z.number().nullable(),
      upperBound: z.number().nullable(),
      lowerBound: z.number().nullable(),
    }),
  ),
  confidence: z.number(),
  trendDirection: z.enum(["upward", "downward", "stable"]),
  seasonalityIndex: z.number(),
});

// Analytics Donor Segmentation Response
export const analyticsDonorSegmentationSchema = z.object({
  donorSegments: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      count: z.number(),
      totalValue: z.number(),
      avgDonation: z.number(),
      retentionRate: z.number(),
      growthRate: z.number(),
      color: z.string(),
    }),
  ),
  conversionFunnel: z.array(
    z.object({
      name: z.string(),
      value: z.number(),
      color: z.string(),
    }),
  ),
  retentionCohorts: z.array(
    z.object({
      cohort: z.string(),
      period: z.number(),
      retentionRate: z.number(),
    }),
  ),
  geographicData: z.array(
    z.object({
      state: z.string(),
      donations: z.number(),
      donors: z.number(),
      avgDonation: z.number(),
    }),
  ),
});

// Analytics Campaign ROI Response
export const analyticsCampaignROISchema = z.object({
  campaignROI: z.array(
    z.object({
      campaignId: z.string(),
      campaignName: z.string(),
      totalRaised: z.number(),
      totalCost: z.number(),
      roi: z.number(),
      costPerDollar: z.number(),
      donorAcquisitionCost: z.number(),
      conversionRate: z.number(),
      avgDonationSize: z.number(),
    }),
  ),
  financialMetrics: z.array(
    z.object({
      name: z.string(),
      current: z.number(),
      previous: z.number(),
      target: z.number(),
      format: z.enum(["currency", "percentage", "number"]),
    }),
  ),
});

// Analytics Church/Ministry Response
export const analyticsChurchSchema = z.object({
  attendanceData: z.array(
    z.object({
      month: z.string(),
      attendance: z.number(),
      giving: z.number(),
    }),
  ),
  volunteerEngagement: z.array(
    z.object({
      ministry: z.string(),
      volunteers: z.number(),
      hours: z.number(),
      retention: z.number(),
    }),
  ),
});

// Recent Transactions Response
export const recentTransactionsSchema = z.object({
  transactions: z.array(
    z.object({
      id: z.number(),
      campaignName: z.string(),
      donorName: z.string(),
      amount: z.number(),
      processingFees: z.number(),
      paymentType: z.string(),
      donationType: z.string(),
      frequency: z.string().nullable(),
      initiatedBy: z.string(),
      status: z.string(),
      date: z.string(),
    }),
  ),
});

// Recent Donors Response
export const recentDonorsSchema = z.object({
  donors: z.array(
    z.object({
      id: z.number(),
      email: z.string(),
      phone: z.string().nullable(),
      amount: z.number(),
      date: z.string(),
      address: z.string().nullable(),
      city: z.string().nullable(),
      state: z.string().nullable(),
      zip: z.string().nullable(),
      country: z.string().nullable(),
    }),
  ),
});

// Analytics Filter Schema
export const analyticsFiltersSchema = z.object({
  campaign: z.string().default("all"),
  status: z.string().default("all"),
  paymentType: z.string().default("all"),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  country: z.string().default("all"),
  state: z.string().default("all"),
});

// ================================
// VOLUNTEER MANAGEMENT SYSTEM
// ================================

// Volunteers
export const volunteers = pgTable(
  "volunteers",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id),

    // Personal Information
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    address: text("address"),
    city: text("city"),
    state: text("state"),
    zipCode: text("zip_code"),
    dateOfBirth: text("date_of_birth"), // YYYY-MM-DD format
    gender: text("gender"), // Male, Female, Other, Prefer not to say

    // Emergency Contact
    emergencyContactName: text("emergency_contact_name"),
    emergencyContactPhone: text("emergency_contact_phone"),

    // Skills and Preferences
    skills: jsonb("skills"), // Array of skill strings
    availability: jsonb("availability"), // Array of availability strings
    preferredRoles: jsonb("preferred_roles"), // Array of role strings

    // Status and Activity
    status: text("status").default("pending"), // active, inactive, pending, suspended
    hoursVolunteered: integer("hours_volunteered").default(0),
    joinedDate: timestamp("joined_date").defaultNow(),
    lastActivity: timestamp("last_activity"),

    // Background Check Requirements
    backgroundCheckStatus: text("background_check_status").default("pending"), // pending, approved, expired, failed, not_required
    backgroundCheckDate: timestamp("background_check_date"),
    backgroundCheckExpiryDate: timestamp("background_check_expiry_date"),
    backgroundCheckProvider: text("background_check_provider"), // Sterling, Certn, etc.

    // VIRTUS Training Requirements (for Catholic organizations)
    virtusTrainingStatus: text("virtus_training_status").default(
      "not_required",
    ), // pending, completed, expired, not_required
    virtusTrainingDate: timestamp("virtus_training_date"),
    virtusTrainingExpiryDate: timestamp("virtus_training_expiry_date"),
    virtusCertificateNumber: text("virtus_certificate_number"),

    // General Training
    trainingCompleted: boolean("training_completed").default(false),
    trainingCompletedDate: timestamp("training_completed_date"),
    mandatoryTrainingStatus: text("mandatory_training_status").default(
      "pending",
    ), // pending, completed, expired

    // Notes and Documentation
    notes: text("notes"),
    internalNotes: text("internal_notes"), // Staff-only notes

    // Compliance and Approval
    isApproved: boolean("is_approved").default(false),
    approvedBy: varchar("approved_by").references(() => users.id),
    approvedDate: timestamp("approved_date"),

    // Profile Image
    profileImageUrl: text("profile_image_url"),

    // Metadata
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    orgIdx: index("volunteers_org_idx").on(table.organizationId),
    emailIdx: index("volunteers_email_idx").on(table.email),
    statusIdx: index("volunteers_status_idx").on(table.status),
    bgCheckIdx: index("volunteers_bg_check_idx").on(
      table.backgroundCheckStatus,
    ),
    virtusIdx: index("volunteers_virtus_idx").on(table.virtusTrainingStatus),
  }),
);

// Volunteer Assignments (linking volunteers to specific roles/events)
export const volunteerAssignments = pgTable(
  "volunteer_assignments",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id),
    volunteerId: integer("volunteer_id")
      .notNull()
      .references(() => volunteers.id),

    // Assignment Details
    assignmentType: text("assignment_type").notNull(), // event, role, ministry, ongoing
    assignmentName: text("assignment_name").notNull(),
    description: text("description"),

    // Scheduling
    startDate: timestamp("start_date"),
    endDate: timestamp("end_date"),
    isRecurring: boolean("is_recurring").default(false),
    recurringPattern: text("recurring_pattern"), // weekly, monthly, etc.

    // Requirements Met
    requirementsVerified: boolean("requirements_verified").default(false),
    verifiedBy: varchar("verified_by").references(() => users.id),
    verifiedDate: timestamp("verified_date"),

    // Status
    status: text("status").default("assigned"), // assigned, active, completed, cancelled
    hoursLogged: integer("hours_logged").default(0),

    // Metadata
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    orgIdx: index("volunteer_assignments_org_idx").on(table.organizationId),
    volunteerIdx: index("volunteer_assignments_volunteer_idx").on(
      table.volunteerId,
    ),
    statusIdx: index("volunteer_assignments_status_idx").on(table.status),
  }),
);

// Volunteer Training Records (for tracking various training types)
export const volunteerTrainingRecords = pgTable(
  "volunteer_training_records",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id),
    volunteerId: integer("volunteer_id")
      .notNull()
      .references(() => volunteers.id),

    // Training Details
    trainingType: text("training_type").notNull(), // background_check, virtus, mandatory, role_specific, cpr, first_aid
    trainingName: text("training_name").notNull(),
    provider: text("provider"), // VIRTUS, Sterling, Red Cross, etc.

    // Completion Details
    status: text("status").default("pending"), // pending, in_progress, completed, expired, failed
    completedDate: timestamp("completed_date"),
    expiryDate: timestamp("expiry_date"),
    certificateNumber: text("certificate_number"),
    certificateUrl: text("certificate_url"),

    // Verification
    verifiedBy: varchar("verified_by").references(() => users.id),
    verifiedDate: timestamp("verified_date"),

    // Requirements
    isRequired: boolean("is_required").default(false),
    isBlocking: boolean("is_blocking").default(false), // Blocks volunteer approval if not completed

    // Renewal
    renewalNotificationSent: boolean("renewal_notification_sent").default(
      false,
    ),
    renewalReminderDate: timestamp("renewal_reminder_date"),

    // Metadata
    notes: text("notes"),
    metadata: jsonb("metadata"), // Additional training-specific data

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    orgIdx: index("volunteer_training_org_idx").on(table.organizationId),
    volunteerIdx: index("volunteer_training_volunteer_idx").on(
      table.volunteerId,
    ),
    typeIdx: index("volunteer_training_type_idx").on(table.trainingType),
    statusIdx: index("volunteer_training_status_idx").on(table.status),
  }),
);

// Type exports for volunteer management
export type SelectVolunteer = typeof volunteers.$inferSelect;
export type InsertVolunteer = typeof volunteers.$inferInsert;
export type SelectVolunteerAssignment =
  typeof volunteerAssignments.$inferSelect;
export type InsertVolunteerAssignment =
  typeof volunteerAssignments.$inferInsert;
export type SelectVolunteerTrainingRecord =
  typeof volunteerTrainingRecords.$inferSelect;
export type InsertVolunteerTrainingRecord =
  typeof volunteerTrainingRecords.$inferInsert;

// Insert schemas for validation
export const insertVolunteerSchema = createInsertSchema(volunteers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVolunteerAssignmentSchema = createInsertSchema(
  volunteerAssignments,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVolunteerTrainingRecordSchema = createInsertSchema(
  volunteerTrainingRecords,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Volunteer with comprehensive type for frontend
export type VolunteerWithTraining = SelectVolunteer & {
  trainingRecords?: SelectVolunteerTrainingRecord[];
  assignments?: SelectVolunteerAssignment[];
  isFullyCompliant?: boolean; // Computed field based on organization faith stream requirements
};

// Export analytics types
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
export type AnalyticsOverview = z.infer<typeof analyticsOverviewSchema>;
export type AnalyticsForecasting = z.infer<typeof analyticsForecastingSchema>;
export type AnalyticsDonorSegmentation = z.infer<
  typeof analyticsDonorSegmentationSchema
>;
export type AnalyticsCampaignROI = z.infer<typeof analyticsCampaignROISchema>;
export type AnalyticsChurch = z.infer<typeof analyticsChurchSchema>;
export type RecentTransactions = z.infer<typeof recentTransactionsSchema>;
export type RecentDonors = z.infer<typeof recentDonorsSchema>;
export type AnalyticsFilters = z.infer<typeof analyticsFiltersSchema>;

// ========================================
// GLOBAL MESSENGER SCHEMA
// ========================================

// Communities - Role-based spaces by initiative, location, or partner org
export const communities = pgTable(
  "communities",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id),

    // Basic Information
    name: text("name").notNull(),
    description: text("description"),
    slug: text("slug").notNull(), // Unique within organization for URL paths

    // Community Type and Purpose
    communityType: text("community_type").notNull(), // initiative, location, partner_org, general
    purpose: text("purpose"), // evangelism, crisis_support, prayer, fundraising, etc.

    // Location-based communities
    location: text("location"), // City, State, Region, or "Global"
    coordinates: jsonb("coordinates"), // { lat: number, lng: number } for mapping

    // Partner organization communities
    partnerOrgId: integer("partner_org_id").references(() => organizations.id), // For partner org communities

    // Media and branding
    imageUrl: text("image_url"),
    coverImageUrl: text("cover_image_url"),
    color: text("color").default("#0d72b9"), // Theme color for community

    // Privacy and access settings
    visibility: text("visibility").default("public"), // public, private, invite_only
    requiresApproval: boolean("requires_approval").default(false), // Admin approval to join

    // Community settings
    allowGuestPosts: boolean("allow_guest_posts").default(false), // Non-members can post
    allowDirectMessages: boolean("allow_direct_messages").default(true),
    moderationLevel: text("moderation_level").default("standard"), // minimal, standard, strict

    // Member limits and growth
    maxMembers: integer("max_members"), // null for unlimited
    memberCount: integer("member_count").default(0),

    // Activity tracking
    lastActivityAt: timestamp("last_activity_at"),

    // Status
    isActive: boolean("is_active").default(true),
    isArchived: boolean("is_archived").default(false),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    orgIdx: index("communities_org_idx").on(table.organizationId),
    slugIdx: index("communities_slug_idx").on(table.slug),
    typeIdx: index("communities_type_idx").on(table.communityType),
    locationIdx: index("communities_location_idx").on(table.location),
    visibilityIdx: index("communities_visibility_idx").on(table.visibility),
    activeIdx: index("communities_active_idx").on(table.isActive),
  }),
);

// Initiatives - Initiative cards with goals, budgets, timelines, milestones
export const initiatives = pgTable(
  "initiatives",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id),
    communityId: integer("community_id")
      .notNull()
      .references(() => communities.id),

    // Basic Information
    title: text("title").notNull(),
    description: text("description"),
    summary: text("summary"), // Short description for cards

    // Initiative classification
    category: text("category").notNull(), // evangelism, crisis_support, prayer, fundraising, medical, education
    priority: text("priority").default("medium"), // low, medium, high, urgent

    // Financial goals and tracking
    fundraisingGoal: decimal("fundraising_goal", { precision: 12, scale: 2 }),
    fundsRaised: decimal("funds_raised", { precision: 12, scale: 2 }).default(
      "0",
    ),
    budgetAllocated: decimal("budget_allocated", { precision: 12, scale: 2 }),
    budgetSpent: decimal("budget_spent", { precision: 12, scale: 2 }).default(
      "0",
    ),

    // Timeline and milestones
    startDate: timestamp("start_date"),
    targetDate: timestamp("target_date"),
    completedDate: timestamp("completed_date"),

    // Progress tracking
    status: text("status").default("planning"), // planning, active, paused, completed, cancelled
    progressPercentage: integer("progress_percentage").default(0), // 0-100

    // Media and presentation
    imageUrl: text("image_url"),
    videoUrl: text("video_url"),
    videoType: text("video_type"), // youtube, vimeo, mp4

    // Location for initiatives
    location: text("location"),
    coordinates: jsonb("coordinates"), // { lat: number, lng: number }

    // People involved
    leaderId: varchar("leader_id").references(() => users.id), // Primary initiative leader
    assignedMembers: jsonb("assigned_members"), // Array of user IDs assigned to this initiative

    // Engagement settings
    allowDonations: boolean("allow_donations").default(true),
    allowVolunteers: boolean("allow_volunteers").default(true),
    allowComments: boolean("allow_comments").default(true),

    // External integrations
    campaignId: integer("campaign_id").references(() => campaigns.id), // Link to existing donation campaign
    externalUrl: text("external_url"), // Link to external resources

    // Initiative metadata
    tags: jsonb("tags"), // Array of tags for categorization
    customFields: jsonb("custom_fields"), // Flexible custom data

    // Analytics and engagement
    viewCount: integer("view_count").default(0),
    supporterCount: integer("supporter_count").default(0),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    orgIdx: index("initiatives_org_idx").on(table.organizationId),
    communityIdx: index("initiatives_community_idx").on(table.communityId),
    categoryIdx: index("initiatives_category_idx").on(table.category),
    statusIdx: index("initiatives_status_idx").on(table.status),
    leaderIdx: index("initiatives_leader_idx").on(table.leaderId),
    campaignIdx: index("initiatives_campaign_idx").on(table.campaignId),
    datesIdx: index("initiatives_dates_idx").on(
      table.startDate,
      table.targetDate,
    ),
  }),
);

// Initiative Milestones - Breakdown of initiative progress into trackable steps
export const initiativeMilestones = pgTable(
  "initiative_milestones",
  {
    id: serial("id").primaryKey(),
    initiativeId: integer("initiative_id")
      .notNull()
      .references(() => initiatives.id),

    // Milestone details
    title: text("title").notNull(),
    description: text("description"),

    // Progress and completion
    status: text("status").default("pending"), // pending, in_progress, completed, cancelled
    dueDate: timestamp("due_date"),
    completedDate: timestamp("completed_date"),

    // Financial allocation
    budgetAmount: decimal("budget_amount", { precision: 10, scale: 2 }),
    spentAmount: decimal("spent_amount", { precision: 10, scale: 2 }).default(
      "0",
    ),

    // Ordering and priority
    sortOrder: integer("sort_order").default(0),
    isRequired: boolean("is_required").default(true),

    // Completion tracking
    completedBy: varchar("completed_by").references(() => users.id),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    initiativeIdx: index("initiative_milestones_initiative_idx").on(
      table.initiativeId,
    ),
    statusIdx: index("initiative_milestones_status_idx").on(table.status),
    dueDateIdx: index("initiative_milestones_due_date_idx").on(table.dueDate),
    orderIdx: index("initiative_milestones_order_idx").on(table.sortOrder),
  }),
);

// Community Members - User roles in communities (Leader, Supporter, Org Admin, Moderator)
export const communityMembers = pgTable(
  "community_members",
  {
    id: serial("id").primaryKey(),
    communityId: integer("community_id")
      .notNull()
      .references(() => communities.id),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id),

    // Membership role and permissions
    role: text("role").default("supporter"), // leader, moderator, supporter, org_admin
    permissions: jsonb("permissions"), // Custom permission overrides

    // Membership status
    status: text("status").default("active"), // active, inactive, banned, pending_approval
    membershipType: text("membership_type").default("member"), // member, guest, observer

    // Transport preferences for this community
    preferredTransport: text("preferred_transport"), // signal, telegram, whatsapp, in_app
    notificationSettings: jsonb("notification_settings"), // Granular notification preferences

    // Engagement tracking
    lastActiveAt: timestamp("last_active_at"),
    messagesPosted: integer("messages_posted").default(0),
    postsCreated: integer("posts_created").default(0),

    // Moderation history
    warningCount: integer("warning_count").default(0),
    lastWarningAt: timestamp("last_warning_at"),

    // Membership lifecycle
    joinedAt: timestamp("joined_at").defaultNow(),
    invitedBy: varchar("invited_by").references(() => users.id),
    approvedBy: varchar("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    communityIdx: index("community_members_community_idx").on(
      table.communityId,
    ),
    userIdx: index("community_members_user_idx").on(table.userId),
    roleIdx: index("community_members_role_idx").on(table.role),
    statusIdx: index("community_members_status_idx").on(table.status),
    uniqueMembership: index("community_members_unique_idx").on(
      table.communityId,
      table.userId,
    ),
  }),
);

// Posts/Updates - Initiative updates with photos/videos/voice
export const posts = pgTable(
  "posts",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id),

    // Post context - can be in community, linked to initiative, or standalone
    communityId: integer("community_id").references(() => communities.id),
    initiativeId: integer("initiative_id").references(() => initiatives.id),

    // Author information
    authorId: varchar("author_id")
      .notNull()
      .references(() => users.id),
    authorRole: text("author_role"), // Role at time of posting for context

    // Post content
    title: text("title"),
    content: text("content").notNull(),
    contentType: text("content_type").default("text"), // text, image, video, audio, poll, update

    // Media attachments
    mediaUrls: jsonb("media_urls"), // Array of media URLs
    mediaMetadata: jsonb("media_metadata"), // Metadata for media files (dimensions, duration, etc.)

    // Post classification
    postType: text("post_type").default("general"), // general, update, prayer_request, announcement, emergency
    tags: jsonb("tags"), // Array of tags for categorization

    // Initiative update specific fields
    milestoneId: integer("milestone_id").references(
      () => initiativeMilestones.id,
    ), // If update relates to milestone
    progressUpdate: integer("progress_update"), // Progress percentage at time of post
    fundingUpdate: decimal("funding_update", { precision: 10, scale: 2 }), // Funding amount at time of post

    // Engagement and visibility
    visibility: text("visibility").default("community"), // community, organization, public
    allowComments: boolean("allow_comments").default(true),
    allowReactions: boolean("allow_reactions").default(true),
    isPinned: boolean("is_pinned").default(false),

    // Engagement tracking
    viewCount: integer("view_count").default(0),
    commentCount: integer("comment_count").default(0),
    reactionCount: integer("reaction_count").default(0),
    shareCount: integer("share_count").default(0),

    // Moderation
    moderationStatus: text("moderation_status").default("approved"), // pending, approved, flagged, removed
    moderatedBy: varchar("moderated_by").references(() => users.id),
    moderatedAt: timestamp("moderated_at"),
    moderationReason: text("moderation_reason"),

    // Editorial
    isEdited: boolean("is_edited").default(false),
    editedAt: timestamp("edited_at"),
    editHistory: jsonb("edit_history"), // Array of edit timestamps and reasons

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    orgIdx: index("posts_org_idx").on(table.organizationId),
    communityIdx: index("posts_community_idx").on(table.communityId),
    initiativeIdx: index("posts_initiative_idx").on(table.initiativeId),
    authorIdx: index("posts_author_idx").on(table.authorId),
    typeIdx: index("posts_type_idx").on(table.postType),
    visibilityIdx: index("posts_visibility_idx").on(table.visibility),
    moderationIdx: index("posts_moderation_idx").on(table.moderationStatus),
    milestoneIdx: index("posts_milestone_idx").on(table.milestoneId),
    createdIdx: index("posts_created_idx").on(table.createdAt),
  }),
);

// Conversations/Threads - Discussion threads for initiatives, posts, direct messages
export const conversations = pgTable(
  "conversations",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id),

    // Conversation context
    conversationType: text("conversation_type").notNull(), // post_thread, initiative_discussion, direct_message, group_chat

    // Related entities
    communityId: integer("community_id").references(() => communities.id),
    initiativeId: integer("initiative_id").references(() => initiatives.id),
    postId: integer("post_id").references(() => posts.id),

    // Conversation details
    title: text("title"), // For named conversations/groups
    description: text("description"),

    // Participants (for direct messages and group chats)
    participants: jsonb("participants"), // Array of user IDs for DMs and group chats
    createdBy: varchar("created_by")
      .notNull()
      .references(() => users.id),

    // Conversation settings
    isPrivate: boolean("is_private").default(false), // Private conversations (DMs, closed groups)
    requiresApproval: boolean("requires_approval").default(false), // New participants need approval
    allowGuestMessages: boolean("allow_guest_messages").default(false), // Non-community members can participate

    // E2EE settings (metadata only)
    isE2EE: boolean("is_e2ee").default(false), // End-to-end encrypted conversation
    e2eeKeyId: text("e2ee_key_id"), // Reference to encryption key (not the key itself)

    // Transport integration
    bridgedTransports: jsonb("bridged_transports"), // Array of transport bridges (Signal, Telegram, WhatsApp)

    // Activity tracking
    messageCount: integer("message_count").default(0),
    lastMessageAt: timestamp("last_message_at"),
    lastMessageBy: varchar("last_message_by").references(() => users.id),

    // Moderation
    moderationLevel: text("moderation_level").default("standard"), // minimal, standard, strict
    isLocked: boolean("is_locked").default(false), // Prevent new messages
    lockedBy: varchar("locked_by").references(() => users.id),
    lockedAt: timestamp("locked_at"),
    lockReason: text("lock_reason"),

    // Status
    isActive: boolean("is_active").default(true),
    isArchived: boolean("is_archived").default(false),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    orgIdx: index("conversations_org_idx").on(table.organizationId),
    typeIdx: index("conversations_type_idx").on(table.conversationType),
    communityIdx: index("conversations_community_idx").on(table.communityId),
    initiativeIdx: index("conversations_initiative_idx").on(table.initiativeId),
    postIdx: index("conversations_post_idx").on(table.postId),
    createdByIdx: index("conversations_created_by_idx").on(table.createdBy),
    activeIdx: index("conversations_active_idx").on(table.isActive),
    lastMessageIdx: index("conversations_last_message_idx").on(
      table.lastMessageAt,
    ),
  }),
);

// Messages - Individual messages within conversations (metadata only for E2EE)
export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    conversationId: integer("conversation_id")
      .notNull()
      .references(() => conversations.id),

    // Author information
    senderId: varchar("sender_id")
      .notNull()
      .references(() => users.id),
    senderRole: text("sender_role"), // Role at time of sending for context

    // Message content (metadata only for E2EE messages)
    contentHash: text("content_hash"), // Hash of encrypted content for integrity
    contentType: text("content_type").default("text"), // text, image, video, audio, file, location, reaction
    contentLength: integer("content_length"), // Length of encrypted content

    // Non-E2EE message content (for non-encrypted conversations)
    plaintextContent: text("plaintext_content"), // Only used for non-E2EE conversations

    // Media and attachments metadata
    mediaUrls: jsonb("media_urls"), // URLs for media attachments
    mediaMetadata: jsonb("media_metadata"), // Metadata (filename, size, type) not content

    // Message context
    replyToMessageId: integer("reply_to_message_id"),
    forwardFromMessageId: integer("forward_from_message_id"),

    // Transport delivery tracking
    transportDeliveries: jsonb("transport_deliveries"), // Delivery status across transports

    // E2EE metadata
    isE2EE: boolean("is_e2ee").default(false),
    keyVersion: text("key_version"), // Version of encryption key used

    // Message lifecycle
    editedAt: timestamp("edited_at"),
    editCount: integer("edit_count").default(0),
    deletedAt: timestamp("deleted_at"),
    deletedBy: varchar("deleted_by").references(() => users.id),

    // Moderation
    moderationStatus: text("moderation_status").default("approved"), // approved, flagged, removed, pending
    moderationReason: text("moderation_reason"),
    moderatedBy: varchar("moderated_by").references(() => users.id),
    moderatedAt: timestamp("moderated_at"),

    // Analytics (aggregated, not content)
    reactionCount: integer("reaction_count").default(0),
    replyCount: integer("reply_count").default(0),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    conversationIdx: index("messages_conversation_idx").on(
      table.conversationId,
    ),
    senderIdx: index("messages_sender_idx").on(table.senderId),
    replyToIdx: index("messages_reply_to_idx").on(table.replyToMessageId),
    moderationIdx: index("messages_moderation_idx").on(table.moderationStatus),
    createdIdx: index("messages_created_idx").on(table.createdAt),
    deletedIdx: index("messages_deleted_idx").on(table.deletedAt),
  }),
);

// Transport Links - User connections to Signal/Telegram/WhatsApp
export const transportLinks = pgTable(
  "transport_links",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id),

    // Transport details
    transport: text("transport").notNull(), // signal, telegram, whatsapp, sms
    transportUserId: text("transport_user_id").notNull(), // Phone number or transport-specific ID
    transportUsername: text("transport_username"), // @username for Telegram, display name

    // Verification status
    isVerified: boolean("is_verified").default(false),
    verifiedAt: timestamp("verified_at"),
    verificationCode: text("verification_code"), // Temporary verification code
    verificationExpiresAt: timestamp("verification_expires_at"),

    // Connection settings
    isActive: boolean("is_active").default(true),
    isPrimary: boolean("is_primary").default(false), // Primary transport for this user

    // Notification preferences
    receiveNotifications: boolean("receive_notifications").default(true),
    receiveMessages: boolean("receive_messages").default(true),
    receiveUpdates: boolean("receive_updates").default(true),

    // Transport-specific settings
    transportSettings: jsonb("transport_settings"), // Transport-specific configuration

    // Rate limiting and security
    dailyMessageLimit: integer("daily_message_limit").default(100),
    messagesSentToday: integer("messages_sent_today").default(0),
    lastMessageAt: timestamp("last_message_at"),

    // Error tracking
    lastError: text("last_error"),
    errorCount: integer("error_count").default(0),
    lastErrorAt: timestamp("last_error_at"),

    // Compliance
    optInTimestamp: timestamp("opt_in_timestamp"),
    optInIpAddress: text("opt_in_ip_address"),
    gdprConsent: boolean("gdpr_consent").default(false),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    userIdx: index("transport_links_user_idx").on(table.userId),
    orgIdx: index("transport_links_org_idx").on(table.organizationId),
    transportIdx: index("transport_links_transport_idx").on(table.transport),
    transportUserIdx: index("transport_links_transport_user_idx").on(
      table.transportUserId,
    ),
    primaryIdx: index("transport_links_primary_idx").on(table.isPrimary),
    uniqueTransportUser: index("transport_links_unique_idx").on(
      table.transport,
      table.transportUserId,
    ),
  }),
);

// Initiative Pledges - Giving workflows linked to initiatives (extends existing donations)
export const initiativePledges = pgTable(
  "initiative_pledges",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id),
    initiativeId: integer("initiative_id")
      .notNull()
      .references(() => initiatives.id),

    // Pledger information
    pledgerId: varchar("pledger_id").references(() => users.id), // Community member making pledge
    donorId: integer("donor_id").references(() => donors.id), // External donor making pledge

    // Pledge details
    pledgeAmount: decimal("pledge_amount", {
      precision: 10,
      scale: 2,
    }).notNull(),
    pledgeType: text("pledge_type").default("financial"), // financial, volunteer_hours, prayer, other
    pledgeDescription: text("pledge_description"), // What they're pledging (for non-financial)

    // Fulfillment tracking
    status: text("status").default("pending"), // pending, partial, fulfilled, cancelled, expired
    amountFulfilled: decimal("amount_fulfilled", {
      precision: 10,
      scale: 2,
    }).default("0"),
    fulfilledDate: timestamp("fulfilled_date"),

    // Recurring pledge settings
    isRecurring: boolean("is_recurring").default(false),
    recurringInterval: text("recurring_interval"), // monthly, quarterly, annually
    nextDueDate: timestamp("next_due_date"),
    recurringEndDate: timestamp("recurring_end_date"),

    // Payment integration
    donationId: integer("donation_id").references(() => donations.id), // Linked completed donation
    campaignId: integer("campaign_id").references(() => campaigns.id), // Linked campaign

    // Pledge conditions
    isConditional: boolean("is_conditional").default(false), // Conditional on milestone completion
    conditionDescription: text("condition_description"),
    requiredMilestoneId: integer("required_milestone_id").references(
      () => initiativeMilestones.id,
    ),

    // Anonymous giving
    isAnonymous: boolean("is_anonymous").default(false),
    displayName: text("display_name"), // Display name for anonymous pledges

    // Communication preferences
    sendReminders: boolean("send_reminders").default(true),
    sendUpdates: boolean("send_updates").default(true),

    // Expiration
    expiresAt: timestamp("expires_at"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    orgIdx: index("initiative_pledges_org_idx").on(table.organizationId),
    initiativeIdx: index("initiative_pledges_initiative_idx").on(
      table.initiativeId,
    ),
    pledgerIdx: index("initiative_pledges_pledger_idx").on(table.pledgerId),
    donorIdx: index("initiative_pledges_donor_idx").on(table.donorId),
    statusIdx: index("initiative_pledges_status_idx").on(table.status),
    donationIdx: index("initiative_pledges_donation_idx").on(table.donationId),
    nextDueIdx: index("initiative_pledges_next_due_idx").on(table.nextDueDate),
    milestoneIdx: index("initiative_pledges_milestone_idx").on(
      table.requiredMilestoneId,
    ),
  }),
);

// Moderation Events - Safety and content moderation tracking
export const moderationEvents = pgTable(
  "moderation_events",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id),

    // Event type and target
    eventType: text("event_type").notNull(), // flag_content, remove_content, warn_user, ban_user, approve_content, etc.
    targetType: text("target_type").notNull(), // message, post, user, community, conversation
    targetId: text("target_id").notNull(), // ID of the moderated entity

    // Moderation details
    moderatorId: varchar("moderator_id").references(() => users.id), // null for automated actions
    moderationType: text("moderation_type").default("manual"), // manual, automated, ai_assisted

    // Action taken
    action: text("action").notNull(), // approve, flag, remove, warn, ban, restore, escalate
    reason: text("reason").notNull(), // Reason for moderation action
    severity: text("severity").default("medium"), // low, medium, high, critical

    // Content and context
    originalContent: text("original_content"), // Snapshot of content at time of moderation
    moderationNotes: text("moderation_notes"), // Internal notes from moderator

    // Related entities
    communityId: integer("community_id").references(() => communities.id),
    reporterId: varchar("reporter_id").references(() => users.id), // User who reported the content
    affectedUserId: varchar("affected_user_id").references(() => users.id), // User being moderated

    // Automated detection details
    automatedRuleId: text("automated_rule_id"), // ID of automated rule that triggered
    aiConfidenceScore: decimal("ai_confidence_score", {
      precision: 5,
      scale: 4,
    }), // 0.0000-1.0000
    detectionKeywords: jsonb("detection_keywords"), // Keywords that triggered detection

    // Appeal and resolution
    canAppeal: boolean("can_appeal").default(true),
    appealDeadline: timestamp("appeal_deadline"),
    appealStatus: text("appeal_status"), // null, pending, approved, denied
    appealedAt: timestamp("appealed_at"),
    appealedBy: varchar("appealed_by").references(() => users.id),
    appealReason: text("appeal_reason"),
    appealResolvedBy: varchar("appeal_resolved_by").references(() => users.id),
    appealResolvedAt: timestamp("appeal_resolved_at"),

    // Follow-up actions
    followUpRequired: boolean("follow_up_required").default(false),
    followUpDate: timestamp("follow_up_date"),
    followUpNotes: text("follow_up_notes"),

    // Status and lifecycle
    status: text("status").default("active"), // active, appealed, overturned, expired
    expiresAt: timestamp("expires_at"), // For temporary actions like bans

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    orgIdx: index("moderation_events_org_idx").on(table.organizationId),
    typeIdx: index("moderation_events_type_idx").on(table.eventType),
    targetIdx: index("moderation_events_target_idx").on(
      table.targetType,
      table.targetId,
    ),
    moderatorIdx: index("moderation_events_moderator_idx").on(
      table.moderatorId,
    ),
    communityIdx: index("moderation_events_community_idx").on(
      table.communityId,
    ),
    affectedUserIdx: index("moderation_events_affected_user_idx").on(
      table.affectedUserId,
    ),
    reporterIdx: index("moderation_events_reporter_idx").on(table.reporterId),
    statusIdx: index("moderation_events_status_idx").on(table.status),
    appealIdx: index("moderation_events_appeal_idx").on(table.appealStatus),
    createdIdx: index("moderation_events_created_idx").on(table.createdAt),
  }),
);

// ========================================
// FINANCIAL STATEMENTS & ACCOUNTING
// ========================================

// Chart of Accounts - Account classification for financial statements
export const chartOfAccounts = pgTable(
  "chart_of_accounts",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id),

    // Account Information
    accountNumber: text("account_number").notNull(), // e.g., "1000", "4000"
    accountName: text("account_name").notNull(), // e.g., "Cash - Operating", "Donation Revenue"
    accountType: text("account_type").notNull(), // asset, liability, net_asset, revenue, expense
    accountCategory: text("account_category").notNull(), // cash, receivables, fixed_assets, restricted_funds, etc.

    // Financial Statement Classification
    statementType: text("statement_type").notNull(), // activity, position (for Statement of Activity vs Financial Position)
    statementSection: text("statement_section").notNull(), // revenue, program_expenses, admin_expenses, assets, liabilities, etc.
    statementOrder: integer("statement_order").default(0), // Display order in statements

    // Net Asset Classification (for nonprofits)
    netAssetType: text("net_asset_type"), // unrestricted, temporarily_restricted, permanently_restricted

    // Account Properties
    isActive: boolean("is_active").default(true),
    normalBalance: text("normal_balance").notNull(), // debit, credit
    description: text("description"),

    // Integration
    quickbooksId: text("quickbooks_id"), // For accounting software integration
    xeroId: text("xero_id"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    orgIdx: index("chart_accounts_org_idx").on(table.organizationId),
    numberIdx: index("chart_accounts_number_idx").on(table.accountNumber),
    typeIdx: index("chart_accounts_type_idx").on(table.accountType),
    statementIdx: index("chart_accounts_statement_idx").on(
      table.statementType,
      table.statementSection,
    ),
  }),
);

// Accounting Periods - Monthly/quarterly/annual periods for financial reporting
export const accountingPeriods = pgTable(
  "accounting_periods",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id),

    // Period Information
    periodName: text("period_name").notNull(), // e.g., "2024 Q1", "January 2024", "FY 2024"
    periodType: text("period_type").notNull(), // monthly, quarterly, annual
    fiscalYear: integer("fiscal_year").notNull(), // e.g., 2024

    // Date Range
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date").notNull(),

    // Status
    status: text("status").default("open"), // open, closed, locked
    closedAt: timestamp("closed_at"),
    closedBy: varchar("closed_by").references(() => users.id),

    // Financial Statement Generation
    statementOfActivityGenerated: boolean(
      "statement_of_activity_generated",
    ).default(false),
    statementOfPositionGenerated: boolean(
      "statement_of_position_generated",
    ).default(false),
    statementsGeneratedAt: timestamp("statements_generated_at"),
    statementsGeneratedBy: varchar("statements_generated_by").references(
      () => users.id,
    ),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    orgIdx: index("accounting_periods_org_idx").on(table.organizationId),
    fiscalYearIdx: index("accounting_periods_fiscal_year_idx").on(
      table.fiscalYear,
    ),
    statusIdx: index("accounting_periods_status_idx").on(table.status),
    dateRangeIdx: index("accounting_periods_date_range_idx").on(
      table.startDate,
      table.endDate,
    ),
  }),
);

// Journal Entries - Double-entry bookkeeping transactions
export const journalEntries = pgTable(
  "journal_entries",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id),
    accountingPeriodId: integer("accounting_period_id")
      .notNull()
      .references(() => accountingPeriods.id),

    // Entry Information
    entryNumber: text("entry_number").notNull(), // e.g., "JE-2024-001"
    entryDate: timestamp("entry_date").notNull(),
    entryType: text("entry_type").notNull(), // standard, adjusting, closing, opening

    // Source Information
    sourceType: text("source_type").notNull(), // donation, expense, payroll, manual, automated
    sourceId: text("source_id"), // Reference to source record (donation ID, expense ID, etc.)

    // Entry Details
    description: text("description").notNull(),
    reference: text("reference"), // Check number, invoice number, etc.
    memo: text("memo"),

    // Amounts (must balance: total debits = total credits)
    totalDebitAmount: decimal("total_debit_amount", {
      precision: 12,
      scale: 2,
    }).notNull(),
    totalCreditAmount: decimal("total_credit_amount", {
      precision: 12,
      scale: 2,
    }).notNull(),

    // Status and Approval
    status: text("status").default("draft"), // draft, posted, void
    isReversed: boolean("is_reversed").default(false),
    reversalEntryId: integer("reversal_entry_id").references(
      () => journalEntries.id,
    ),

    // Audit Trail
    createdBy: varchar("created_by")
      .notNull()
      .references(() => users.id),
    approvedBy: varchar("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at"),
    postedAt: timestamp("posted_at"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    orgIdx: index("journal_entries_org_idx").on(table.organizationId),
    periodIdx: index("journal_entries_period_idx").on(table.accountingPeriodId),
    entryNumberIdx: index("journal_entries_number_idx").on(table.entryNumber),
    entryDateIdx: index("journal_entries_date_idx").on(table.entryDate),
    sourceIdx: index("journal_entries_source_idx").on(
      table.sourceType,
      table.sourceId,
    ),
    statusIdx: index("journal_entries_status_idx").on(table.status),
  }),
);

// Journal Entry Line Items - Individual debit/credit lines for each journal entry
export const journalEntryLineItems = pgTable(
  "journal_entry_line_items",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id),
    journalEntryId: integer("journal_entry_id")
      .notNull()
      .references(() => journalEntries.id),
    chartOfAccountId: integer("chart_of_account_id")
      .notNull()
      .references(() => chartOfAccounts.id),

    // Line Item Details
    lineNumber: integer("line_number").notNull(), // Order within the journal entry
    description: text("description").notNull(),

    // Debit/Credit Amounts
    debitAmount: decimal("debit_amount", { precision: 12, scale: 2 }).default(
      "0",
    ),
    creditAmount: decimal("credit_amount", { precision: 12, scale: 2 }).default(
      "0",
    ),

    // Additional Classification
    departmentId: integer("department_id").references(() => departments.id),
    campaignId: integer("campaign_id").references(() => campaigns.id),

    // Net Asset Classification (for nonprofits)
    netAssetType: text("net_asset_type"), // unrestricted, temporarily_restricted, permanently_restricted
    restrictionDescription: text("restriction_description"), // Description of donor restrictions

    // Metadata
    memo: text("memo"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    orgIdx: index("journal_line_items_org_idx").on(table.organizationId),
    entryIdx: index("journal_line_items_entry_idx").on(table.journalEntryId),
    accountIdx: index("journal_line_items_account_idx").on(
      table.chartOfAccountId,
    ),
    departmentIdx: index("journal_line_items_department_idx").on(
      table.departmentId,
    ),
    campaignIdx: index("journal_line_items_campaign_idx").on(table.campaignId),
  }),
);

// Financial Statement Templates - Pre-configured financial statement formats
export const financialStatementTemplates = pgTable(
  "financial_statement_templates",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id").references(
      () => organizations.id,
    ), // null for system-wide templates

    // Template Information
    templateName: text("template_name").notNull(),
    templateType: text("template_type").notNull(), // activity, position
    description: text("description"),

    // Template Structure (JSON configuration for statement layout)
    templateStructure: jsonb("template_structure").notNull(), // Detailed JSON structure for statement sections

    // Usage
    isDefault: boolean("is_default").default(false),
    isActive: boolean("is_active").default(true),
    usageCount: integer("usage_count").default(0),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    orgIdx: index("financial_statement_templates_org_idx").on(
      table.organizationId,
    ),
    typeIdx: index("financial_statement_templates_type_idx").on(
      table.templateType,
    ),
  }),
);

// Generated Financial Statements - Historical record of generated statements
export const generatedFinancialStatements = pgTable(
  "generated_financial_statements",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id),
    accountingPeriodId: integer("accounting_period_id")
      .notNull()
      .references(() => accountingPeriods.id),
    templateId: integer("template_id").references(
      () => financialStatementTemplates.id,
    ),

    // Statement Information
    statementType: text("statement_type").notNull(), // activity, position
    statementTitle: text("statement_title").notNull(),
    reportingPeriod: text("reporting_period").notNull(), // e.g., "Year Ended December 31, 2024"

    // Generated Data
    statementData: jsonb("statement_data").notNull(), // Complete statement with all calculated values

    // Generation Details
    generatedAt: timestamp("generated_at").defaultNow(),
    generatedBy: varchar("generated_by")
      .notNull()
      .references(() => users.id),
    generationMethod: text("generation_method").default("automated"), // automated, manual

    // Audit Information
    dataAsOfDate: timestamp("data_as_of_date").notNull(),
    totalAssets: decimal("total_assets", { precision: 15, scale: 2 }),
    totalLiabilities: decimal("total_liabilities", { precision: 15, scale: 2 }),
    totalNetAssets: decimal("total_net_assets", { precision: 15, scale: 2 }),
    totalRevenue: decimal("total_revenue", { precision: 15, scale: 2 }),
    totalExpenses: decimal("total_expenses", { precision: 15, scale: 2 }),
    changeInNetAssets: decimal("change_in_net_assets", {
      precision: 15,
      scale: 2,
    }),

    // Export and Sharing
    pdfUrl: text("pdf_url"), // Generated PDF location
    excelUrl: text("excel_url"), // Generated Excel location
    isPublic: boolean("is_public").default(false),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    orgIdx: index("generated_statements_org_idx").on(table.organizationId),
    periodIdx: index("generated_statements_period_idx").on(
      table.accountingPeriodId,
    ),
    typeIdx: index("generated_statements_type_idx").on(table.statementType),
    generatedIdx: index("generated_statements_generated_idx").on(
      table.generatedAt,
    ),
  }),
);

// ========================================
// MERCHANT STATEMENTS (Payment Processing Reports)
// ========================================

// Merchant Statements - Monthly aggregated payment processing reports
export const merchantStatements = pgTable(
  "merchant_statements",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id),
    paymentAccountId: integer("payment_account_id")
      .notNull()
      .references(() => paymentAccounts.id),

    // Merchant Identifiers (from GETTRX or other processors)
    merchantAccountId: text("merchant_account_id").notNull(), // MID
    dbaName: text("dba_name").notNull(), // Doing Business As name
    bin: text("bin"), // Bank Identification Number
    agentCode: text("agent_code"), // Agent/reseller code

    // Statement Period
    statementMonth: text("statement_month").notNull(), // Format: "2025-09" or display format "September 2025"
    statementYear: integer("statement_year").notNull(),
    statementPeriodStart: timestamp("statement_period_start").notNull(),
    statementPeriodEnd: timestamp("statement_period_end").notNull(),

    // Sales Metrics (successful transactions)
    salesCount: integer("sales_count").default(0).notNull(),
    salesVolume: decimal("sales_volume", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),

    // Credits/Refunds Metrics
    creditsCount: integer("credits_count").default(0).notNull(),
    creditsVolume: decimal("credits_volume", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),

    // Net Settlement
    netVolume: decimal("net_volume", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    totalFees: decimal("total_fees", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    netSettlement: decimal("net_settlement", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),

    // Statement Status
    status: text("status").default("pending"), // pending, finalized, exported
    finalizedAt: timestamp("finalized_at"),
    finalizedBy: varchar("finalized_by").references(() => users.id),

    // Export and Download
    pdfUrl: text("pdf_url"), // Generated PDF statement
    csvUrl: text("csv_url"), // Generated CSV export
    excelUrl: text("excel_url"), // Generated Excel export

    // Metadata
    metadata: jsonb("metadata"), // Additional processor-specific data
    notes: text("notes"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    orgIdx: index("merchant_statements_org_idx").on(table.organizationId),
    merchantIdx: index("merchant_statements_merchant_idx").on(
      table.merchantAccountId,
    ),
    periodIdx: index("merchant_statements_period_idx").on(
      table.statementYear,
      table.statementMonth,
    ),
    binIdx: index("merchant_statements_bin_idx").on(table.bin),
    agentIdx: index("merchant_statements_agent_idx").on(table.agentCode),
    statusIdx: index("merchant_statements_status_idx").on(table.status),
    uniqueStatement: index("merchant_statements_unique_idx").on(
      table.organizationId,
      table.merchantAccountId,
      table.statementMonth,
    ),
  }),
);

// ========================================
// GLOBAL MESSENGER INSERT/SELECT SCHEMAS
// ========================================

// Community schemas
export const insertCommunitySchema = createInsertSchema(communities).omit({
  id: true,
  memberCount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInitiativeSchema = createInsertSchema(initiatives).omit({
  id: true,
  fundsRaised: true,
  budgetSpent: true,
  progressPercentage: true,
  viewCount: true,
  supporterCount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInitiativeMilestoneSchema = createInsertSchema(
  initiativeMilestones,
).omit({
  id: true,
  spentAmount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommunityMemberSchema = createInsertSchema(
  communityMembers,
).omit({
  id: true,
  messagesPosted: true,
  postsCreated: true,
  warningCount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  viewCount: true,
  commentCount: true,
  reactionCount: true,
  shareCount: true,
  isEdited: true,
  createdAt: true,
  updatedAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  messageCount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  editCount: true,
  reactionCount: true,
  replyCount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTransportLinkSchema = createInsertSchema(
  transportLinks,
).omit({
  id: true,
  messagesSentToday: true,
  errorCount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInitiativePledgeSchema = createInsertSchema(
  initiativePledges,
).omit({
  id: true,
  amountFulfilled: true,
  createdAt: true,
  updatedAt: true,
});

export const insertModerationEventSchema = createInsertSchema(
  moderationEvents,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Select types for all Global Messenger tables
export type SelectCommunity = typeof communities.$inferSelect;
export type SelectInitiative = typeof initiatives.$inferSelect;
export type SelectInitiativeMilestone =
  typeof initiativeMilestones.$inferSelect;
export type SelectCommunityMember = typeof communityMembers.$inferSelect;
export type SelectPost = typeof posts.$inferSelect;
export type SelectConversation = typeof conversations.$inferSelect;
export type SelectMessage = typeof messages.$inferSelect;
export type SelectTransportLink = typeof transportLinks.$inferSelect;
export type SelectInitiativePledge = typeof initiativePledges.$inferSelect;
export type SelectModerationEvent = typeof moderationEvents.$inferSelect;

// Insert types for all Global Messenger tables
export type InsertCommunity = z.infer<typeof insertCommunitySchema>;
export type InsertInitiative = z.infer<typeof insertInitiativeSchema>;
export type InsertInitiativeMilestone = z.infer<
  typeof insertInitiativeMilestoneSchema
>;
export type InsertCommunityMember = z.infer<typeof insertCommunityMemberSchema>;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertTransportLink = z.infer<typeof insertTransportLinkSchema>;
export type InsertInitiativePledge = z.infer<
  typeof insertInitiativePledgeSchema
>;
export type InsertModerationEvent = z.infer<typeof insertModerationEventSchema>;

// Comprehensive types with relationships for frontend use
export type CommunityWithMembers = SelectCommunity & {
  members?: SelectCommunityMember[];
  initiatives?: SelectInitiative[];
  memberCount?: number;
  lastActivity?: SelectPost | SelectMessage;
};

export type InitiativeWithDetails = SelectInitiative & {
  community?: SelectCommunity;
  leader?: typeof users.$inferSelect;
  milestones?: SelectInitiativeMilestone[];
  pledges?: SelectInitiativePledge[];
  posts?: SelectPost[];
  campaign?: typeof campaigns.$inferSelect;
  progressPercentage?: number;
  completedMilestones?: number;
  totalMilestones?: number;
};

export type ConversationWithMessages = SelectConversation & {
  messages?: SelectMessage[];
  participants?: (typeof users.$inferSelect)[];
  community?: SelectCommunity;
  initiative?: SelectInitiative;
  post?: SelectPost;
  lastMessage?: SelectMessage;
};

export type PostWithEngagement = SelectPost & {
  author?: typeof users.$inferSelect;
  community?: SelectCommunity;
  initiative?: SelectInitiative;
  milestone?: SelectInitiativeMilestone;
  comments?: SelectConversation;
  reactions?: any[]; // Will be defined when reaction system is added
};

export type UserWithTransports = typeof users.$inferSelect & {
  transportLinks?: SelectTransportLink[];
  communityMemberships?: (SelectCommunityMember & {
    community: SelectCommunity;
  })[];
  primaryTransport?: SelectTransportLink;
};

// ========================================
// FINANCIAL STATEMENTS RELATIONS
// ========================================

export const chartOfAccountsRelations = relations(
  chartOfAccounts,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [chartOfAccounts.organizationId],
      references: [organizations.id],
    }),
    journalEntryLineItems: many(journalEntryLineItems),
  }),
);

export const accountingPeriodsRelations = relations(
  accountingPeriods,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [accountingPeriods.organizationId],
      references: [organizations.id],
    }),
    closedByUser: one(users, {
      fields: [accountingPeriods.closedBy],
      references: [users.id],
    }),
    statementsGeneratedByUser: one(users, {
      fields: [accountingPeriods.statementsGeneratedBy],
      references: [users.id],
    }),
    journalEntries: many(journalEntries),
    generatedStatements: many(generatedFinancialStatements),
  }),
);

export const journalEntriesRelations = relations(
  journalEntries,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [journalEntries.organizationId],
      references: [organizations.id],
    }),
    accountingPeriod: one(accountingPeriods, {
      fields: [journalEntries.accountingPeriodId],
      references: [accountingPeriods.id],
    }),
    createdByUser: one(users, {
      fields: [journalEntries.createdBy],
      references: [users.id],
    }),
    approvedByUser: one(users, {
      fields: [journalEntries.approvedBy],
      references: [users.id],
    }),
    reversalEntry: one(journalEntries, {
      fields: [journalEntries.reversalEntryId],
      references: [journalEntries.id],
    }),
    lineItems: many(journalEntryLineItems),
  }),
);

export const journalEntryLineItemsRelations = relations(
  journalEntryLineItems,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [journalEntryLineItems.organizationId],
      references: [organizations.id],
    }),
    journalEntry: one(journalEntries, {
      fields: [journalEntryLineItems.journalEntryId],
      references: [journalEntries.id],
    }),
    account: one(chartOfAccounts, {
      fields: [journalEntryLineItems.chartOfAccountId],
      references: [chartOfAccounts.id],
    }),
    department: one(departments, {
      fields: [journalEntryLineItems.departmentId],
      references: [departments.id],
    }),
    campaign: one(campaigns, {
      fields: [journalEntryLineItems.campaignId],
      references: [campaigns.id],
    }),
  }),
);

export const financialStatementTemplatesRelations = relations(
  financialStatementTemplates,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [financialStatementTemplates.organizationId],
      references: [organizations.id],
    }),
    generatedStatements: many(generatedFinancialStatements),
  }),
);

export const generatedFinancialStatementsRelations = relations(
  generatedFinancialStatements,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [generatedFinancialStatements.organizationId],
      references: [organizations.id],
    }),
    accountingPeriod: one(accountingPeriods, {
      fields: [generatedFinancialStatements.accountingPeriodId],
      references: [accountingPeriods.id],
    }),
    template: one(financialStatementTemplates, {
      fields: [generatedFinancialStatements.templateId],
      references: [financialStatementTemplates.id],
    }),
    generatedByUser: one(users, {
      fields: [generatedFinancialStatements.generatedBy],
      references: [users.id],
    }),
  }),
);

// ========================================
// FINANCIAL STATEMENTS INSERT/SELECT SCHEMAS
// ========================================

export const insertChartOfAccountSchema = createInsertSchema(
  chartOfAccounts,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAccountingPeriodSchema = createInsertSchema(
  accountingPeriods,
).omit({
  id: true,
  closedAt: true,
  statementOfActivityGenerated: true,
  statementOfPositionGenerated: true,
  statementsGeneratedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertJournalEntrySchema = createInsertSchema(journalEntries).omit(
  {
    id: true,
    isReversed: true,
    postedAt: true,
    createdAt: true,
    updatedAt: true,
  },
);

export const insertJournalEntryLineItemSchema = createInsertSchema(
  journalEntryLineItems,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFinancialStatementTemplateSchema = createInsertSchema(
  financialStatementTemplates,
).omit({
  id: true,
  usageCount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGeneratedFinancialStatementSchema = createInsertSchema(
  generatedFinancialStatements,
).omit({
  id: true,
  generatedAt: true,
  createdAt: true,
  updatedAt: true,
});

// Select types for Financial Statements
export type SelectChartOfAccount = typeof chartOfAccounts.$inferSelect;
export type SelectAccountingPeriod = typeof accountingPeriods.$inferSelect;
export type SelectJournalEntry = typeof journalEntries.$inferSelect;
export type SelectJournalEntryLineItem =
  typeof journalEntryLineItems.$inferSelect;
export type SelectFinancialStatementTemplate =
  typeof financialStatementTemplates.$inferSelect;
export type SelectGeneratedFinancialStatement =
  typeof generatedFinancialStatements.$inferSelect;

// Insert types for Financial Statements
export type InsertChartOfAccount = z.infer<typeof insertChartOfAccountSchema>;
export type InsertAccountingPeriod = z.infer<
  typeof insertAccountingPeriodSchema
>;
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
export type InsertJournalEntryLineItem = z.infer<
  typeof insertJournalEntryLineItemSchema
>;
export type InsertFinancialStatementTemplate = z.infer<
  typeof insertFinancialStatementTemplateSchema
>;
export type InsertGeneratedFinancialStatement = z.infer<
  typeof insertGeneratedFinancialStatementSchema
>;

// Merchant Statements schemas
export const insertMerchantStatementSchema = createInsertSchema(
  merchantStatements,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type SelectMerchantStatement = typeof merchantStatements.$inferSelect;
export type InsertMerchantStatement = z.infer<
  typeof insertMerchantStatementSchema
>;

// Comprehensive types with relationships for frontend use
export type JournalEntryWithLineItems = SelectJournalEntry & {
  lineItems?: (SelectJournalEntryLineItem & {
    account?: SelectChartOfAccount;
    department?: typeof departments.$inferSelect;
    campaign?: typeof campaigns.$inferSelect;
  })[];
  createdByUser?: typeof users.$inferSelect;
  approvedByUser?: typeof users.$inferSelect;
  accountingPeriod?: SelectAccountingPeriod;
};

export type AccountingPeriodWithStatements = SelectAccountingPeriod & {
  journalEntries?: SelectJournalEntry[];
  generatedStatements?: SelectGeneratedFinancialStatement[];
  organization?: typeof organizations.$inferSelect;
};

export type FinancialStatementData = {
  statementType: "activity" | "position";
  reportingPeriod: string;
  organizationName: string;
  sections: {
    [sectionName: string]: {
      title: string;
      order: number;
      lineItems: {
        accountName: string;
        accountNumber: string;
        amount: number;
        netAssetType?: string;
      }[];
      subtotal?: number;
    };
  };
  totals: {
    totalRevenue?: number;
    totalExpenses?: number;
    changeInNetAssets?: number;
    totalAssets?: number;
    totalLiabilities?: number;
    totalNetAssets?: number;
  };
};

// Church Announcement Canvas Tool Tables

// Announcement Templates (pre-built, reusable templates)
export const announcementTemplates = pgTable("announcement_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // e.g., "Parenting Class", "Sunday Service", "Holiday Event"
  category: text("category").notNull(), // sermon, event, class, fundraiser, holiday, general
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"), // Preview thumbnail
  
  // Canvas data stored as JSON (fabric.js compatible format)
  canvasData: jsonb("canvas_data").notNull(), // Full canvas state including layers, elements, positioning
  
  // Canvas dimensions
  width: integer("width").notNull().default(1920), // Default projector width
  height: integer("height").notNull().default(1080), // Default projector height
  
  // Template settings
  isPublic: boolean("is_public").default(true), // Available to all organizations
  organizationId: integer("organization_id"), // If template is org-specific
  
  // Usage tracking
  usageCount: integer("usage_count").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User-created Announcement Designs
export const announcementDesigns = pgTable("announcement_designs", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  userId: text("user_id").notNull().references(() => users.id),
  
  // Design metadata
  title: text("title").notNull(),
  templateId: integer("template_id").references(() => announcementTemplates.id), // Original template if cloned
  
  // Canvas data stored as JSON (fabric.js compatible format)
  canvasData: jsonb("canvas_data").notNull(), // Full canvas state including layers, elements, positioning
  
  // Canvas dimensions
  width: integer("width").notNull().default(1920),
  height: integer("height").notNull().default(1080),
  
  // Export metadata
  thumbnailUrl: text("thumbnail_url"), // Preview of the design
  lastExportedAt: timestamp("last_exported_at"),
  exportFormat: text("export_format"), // png, jpg, pdf
  
  // Status
  isPublished: boolean("is_published").default(false), // Whether it's actively being used
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations for announcement templates
export const announcementTemplatesRelations = relations(
  announcementTemplates,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [announcementTemplates.organizationId],
      references: [organizations.id],
    }),
    designs: many(announcementDesigns),
  }),
);

// Relations for announcement designs
export const announcementDesignsRelations = relations(
  announcementDesigns,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [announcementDesigns.organizationId],
      references: [organizations.id],
    }),
    user: one(users, {
      fields: [announcementDesigns.userId],
      references: [users.id],
    }),
    template: one(announcementTemplates, {
      fields: [announcementDesigns.templateId],
      references: [announcementTemplates.id],
    }),
  }),
);

// Insert schemas for announcement templates
export const insertAnnouncementTemplateSchema = createInsertSchema(
  announcementTemplates,
).omit({
  id: true,
  usageCount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAnnouncementDesignSchema = createInsertSchema(
  announcementDesigns,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Select types
export type SelectAnnouncementTemplate = typeof announcementTemplates.$inferSelect;
export type SelectAnnouncementDesign = typeof announcementDesigns.$inferSelect;

// Insert types
export type InsertAnnouncementTemplate = z.infer<typeof insertAnnouncementTemplateSchema>;
export type InsertAnnouncementDesign = z.infer<typeof insertAnnouncementDesignSchema>;

// Payment Disputes and Chargebacks
export const disputes = pgTable("disputes", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  
  // Case identification
  initialCaseId: text("initial_case_id").notNull().unique(), // e.g., "20252260243446"
  dbaName: text("dba_name"), // Doing Business As name
  mid: text("mid"), // Merchant ID
  sid: text("sid"), // Service ID
  bin: text("bin"), // Bank Identification Number
  
  // Dispute details
  disputeState: text("dispute_state").notNull(), // Chargeback, ACH Return, Inquiry, Won, Lost, etc.
  disputeType: text("dispute_type"), // fraud, processing_error, product_not_received, etc.
  reasonCode: text("reason_code"), // M38, R01, etc.
  reasonDescription: text("reason_description"), // Description of reason code
  
  // Payment information
  paymentMethod: text("payment_method"), // card, bank_account
  cardBrand: text("card_brand"), // VISA, MasterCard, Discover, Amex
  cardLast4: text("card_last_4"), // Last 4 digits
  accountLast4: text("account_last_4"), // For ACH returns
  
  // Financial details
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("USD"),
  
  // Important dates
  firstProcessedOn: timestamp("first_processed_on"),
  disputeDate: timestamp("dispute_date"),
  dueDate: timestamp("due_date"),
  resolvedDate: timestamp("resolved_date"),
  
  // Related records
  donationId: integer("donation_id").references(() => donations.id),
  donorId: integer("donor_id").references(() => donors.id),
  
  // Response and evidence
  responseSubmitted: boolean("response_submitted").default(false),
  responseSubmittedAt: timestamp("response_submitted_at"),
  evidenceFiles: jsonb("evidence_files"), // Array of uploaded evidence file URLs
  notes: text("notes"),
  
  // Status and tracking
  status: text("status").default("open"), // open, under_review, won, lost, closed
  isResolved: boolean("is_resolved").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations for disputes
export const disputesRelations = relations(disputes, ({ one }) => ({
  organization: one(organizations, {
    fields: [disputes.organizationId],
    references: [organizations.id],
  }),
  donation: one(donations, {
    fields: [disputes.donationId],
    references: [donations.id],
  }),
  donor: one(donors, {
    fields: [disputes.donorId],
    references: [donors.id],
  }),
}));

// Insert schema for disputes
export const insertDisputeSchema = createInsertSchema(disputes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Select and Insert types
export type SelectDispute = typeof disputes.$inferSelect;
export type InsertDispute = z.infer<typeof insertDisputeSchema>;

// Dispute Documents - Supporting evidence and files
export const disputeDocuments = pgTable("dispute_documents", {
  id: serial("id").primaryKey(),
  disputeId: integer("dispute_id").notNull().references(() => disputes.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  
  // File information
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"), // in bytes
  fileType: text("file_type"), // pdf, jpg, png, etc.
  mimeType: text("mime_type"),
  
  // Document metadata
  documentType: text("document_type"), // invoice, receipt, contract, email, authorization, photo, other
  description: text("description"),
  
  // Upload information
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations for dispute documents
export const disputeDocumentsRelations = relations(disputeDocuments, ({ one }) => ({
  dispute: one(disputes, {
    fields: [disputeDocuments.disputeId],
    references: [disputes.id],
  }),
  organization: one(organizations, {
    fields: [disputeDocuments.organizationId],
    references: [organizations.id],
  }),
  uploadedByUser: one(users, {
    fields: [disputeDocuments.uploadedBy],
    references: [users.id],
  }),
}));

// Insert schema for dispute documents
export const insertDisputeDocumentSchema = createInsertSchema(disputeDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Select and Insert types
export type SelectDisputeDocument = typeof disputeDocuments.$inferSelect;
export type InsertDisputeDocument = z.infer<typeof insertDisputeDocumentSchema>;
