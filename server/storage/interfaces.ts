/**
 * Storage Interface Definitions
 * Extracted from the main storage file for better modularity
 */
import type {
  Organization,
  InsertOrganization,
  User,
  InsertUser,
  Campaign,
  InsertCampaign,
  DonationPage,
  InsertDonationPage,
  DonationProduct,
  InsertDonationProduct,
  Product,
  InsertProduct,
  LeadCapture,
  InsertLeadCapture,
  Donor,
  InsertDonor,
  Donation,
  InsertDonation,
  PaymentAccount,
  InsertPaymentAccount,
  Fund,
  InsertFund,
  OrganizationOnboarding,
  InsertOnboarding,
  Event,
  InsertEvent,
  EventTable,
  InsertEventTable,
  EventRegistration,
  InsertEventRegistration,
  EventAttendee,
  InsertEventAttendee,
  SelectGettrxPaymentMethod,
  InsertGettrxPaymentMethod,
  SelectGettrxTransfer,
  InsertGettrxTransfer,
  SelectGettrxRecurringSchedule,
  InsertGettrxRecurringSchedule,
  SelectGettrxMerchantApplication,
  InsertGettrxMerchantApplication,
  SelectGettrxAcceptanceToken,
  InsertGettrxAcceptanceToken,
  SendgridEmailCampaign,
  InsertSendgridEmailCampaign,
  SendgridEmailRecipient,
  InsertSendgridEmailRecipient,
  SendgridWebhookEvent,
  InsertSendgridWebhookEvent,
  SendgridEmailAnalytics,
  InsertSendgridEmailAnalytics,
  OrganizationTippingSettings,
  InsertOrganizationTippingSettings,
  SponsorshipTier,
  InsertSponsorshipTier,
  EventSponsor,
  InsertEventSponsor,
  ClientIntakeRecord,
  InsertClientIntakeRecord,
  // Global Messenger Types
  SelectCommunity,
  InsertCommunity,
  SelectInitiative,
  InsertInitiative,
  SelectInitiativeMilestone,
  InsertInitiativeMilestone,
  SelectCommunityMember,
  InsertCommunityMember,
  SelectPost,
  InsertPost,
  SelectConversation,
  InsertConversation,
  SelectMessage,
  InsertMessage,
  SelectTransportLink,
  InsertTransportLink,
  SelectInitiativePledge,
  InsertInitiativePledge,
  SelectModerationEvent,
  InsertModerationEvent,
  CommunityWithMembers,
  InitiativeWithDetails,
  ConversationWithMessages,
  PostWithEngagement,
  UserWithTransports,
  // Financial Statement Types
  SelectChartOfAccount,
  InsertChartOfAccount,
  SelectAccountingPeriod,
  InsertAccountingPeriod,
  SelectJournalEntry,
  InsertJournalEntry,
  SelectJournalEntryLineItem,
  InsertJournalEntryLineItem,
  SelectFinancialStatementTemplate,
  InsertFinancialStatementTemplate,
  SelectGeneratedFinancialStatement,
  InsertGeneratedFinancialStatement,
  JournalEntryWithLineItems,
  AccountingPeriodWithStatements,
  FinancialStatementData,
  SelectDispute,
  InsertDispute,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string | number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(
    user: Partial<User> & { id: string; email: string; firstName: string },
  ): Promise<User>;
  updateUser(id: string, updates: any): Promise<User>;
  updateAllUsersOnboardingStep(
    organizationId: number,
    currentStep: number,
    isCompleted: boolean,
  ): Promise<void>;

  // Organizations
  getOrganizationById(id: number): Promise<Organization | undefined>;
  getOrganizationBySlug(slug: string): Promise<Organization | undefined>;
  getDefaultAdminOrganization(): Promise<Organization | undefined>;
  createOrganization(organization: InsertOrganization): Promise<Organization>;
  updateOrganization(
    id: number,
    updates: Partial<Organization>,
  ): Promise<Organization>;
  updateOrganizationSettings(id: number, settings: any): Promise<Organization>;
  updateOrganizationMerchantAccount(
    organizationId: number,
    merchantAccountId: string
  ): Promise<Organization>;
  updateOrganizationIntegrations(
    id: number,
    integrations: {
      smsProvider?: string;
      smsConnectionStatus?: string;
      smsMetadata?: any;
      marketingProvider?: string;
      marketingConnectionStatus?: string;
      marketingMetadata?: any;
      crmProvider?: string;
      crmConnectionStatus?: string;
      crmMetadata?: any;
    },
  ): Promise<Organization>;
  validateCustomDomain(
    domain: string,
  ): Promise<{ valid: boolean; message: string }>;

  // Campaigns
  getCampaignsByOrganization(organizationId: number): Promise<Campaign[]>;
  getCampaign(id: number): Promise<Campaign | undefined>;
  getCampaignBySlug(slug: string): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: number, updates: Partial<Campaign>): Promise<Campaign>;
  cloneCampaign(id: number): Promise<Campaign>;
  generateEmbedCode(campaignId: number): Promise<string>;
  generateQRCode(campaignId: number): Promise<string>;

  // Donation Pages (Top-level branded containers for campaigns)
  getDonationPagesByOrganization(organizationId: number): Promise<DonationPage[]>;
  getDonationPage(id: number): Promise<DonationPage | undefined>;
  getDonationPageBySlug(organizationId: number, slug: string): Promise<DonationPage | undefined>;
  getDonationPageBySlugGlobal(slug: string): Promise<DonationPage | undefined>;
  getDonationPageByCustomUrl(customUrl: string): Promise<DonationPage | undefined>;
  getDonationPageBySubdomain(subdomain: string): Promise<DonationPage | undefined>;
  createDonationPage(donationPage: InsertDonationPage): Promise<DonationPage>;
  updateDonationPage(id: number, updates: Partial<DonationPage>): Promise<DonationPage>;
  deleteDonationPage(id: number): Promise<void>;
  cloneDonationPage(id: number, options: { suffix?: string; cloneCampaigns?: boolean }): Promise<DonationPage>;
  assignCampaignToPage(campaignId: number, donationPageId: number | null): Promise<Campaign>;
  getCampaignsByDonationPage(donationPageId: number): Promise<Campaign[]>;

  // Donation Products
  getDonationProductsByOrganization(organizationId: number): Promise<DonationProduct[]>;
  getDonationProduct(id: number): Promise<DonationProduct | undefined>;
  getDonationProductBySlug(slug: string): Promise<DonationProduct | undefined>;
  createDonationProduct(product: InsertDonationProduct): Promise<DonationProduct>;
  updateDonationProduct(id: number, updates: Partial<DonationProduct>): Promise<DonationProduct>;
  deleteDonationProduct(id: number): Promise<void>;
  generateDonationProductQRCode(productId: number): Promise<string>;

  // Products (sellable items: books, courses, packages, digital/physical products)
  getProductsByOrganization(organizationId: number): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  getProductBySlug(slug: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, updates: Partial<Product>): Promise<Product>;
  deleteProduct(id: number): Promise<void>;

  // Lead Captures
  createLeadCapture(leadCapture: InsertLeadCapture): Promise<LeadCapture>;
  getLeadCapturesByOrganization(organizationId: number): Promise<LeadCapture[]>;
  getLeadCapturesByProduct(donationProductId: number): Promise<LeadCapture[]>;

  // Donors
  getDonorsByOrganization(organizationId: number): Promise<Donor[]>;
  getDonorById(id: number): Promise<Donor | undefined>;
  getDonorByEmail(
    organizationId: number,
    email: string,
  ): Promise<Donor | undefined>;
  findDonorByEmail(
    organizationId: number,
    email: string,
  ): Promise<Donor | undefined>;
  createDonor(donor: InsertDonor): Promise<Donor>;
  updateDonor(id: number, updates: Partial<Donor>): Promise<Donor>;

  // Donations
  getDonationsByOrganization(
    organizationId: number,
    limit?: number,
  ): Promise<Donation[]>;
  getDonationsByCampaign(campaignId: number): Promise<Donation[]>;
  createDonation(donation: InsertDonation): Promise<Donation>;
  updateDonation(id: number, updates: Partial<Donation>): Promise<Donation>;

  // Disputes and Chargebacks
  getDisputesByOrganization(organizationId: number): Promise<SelectDispute[]>;
  getDispute(id: number): Promise<SelectDispute | undefined>;
  getDisputeByCaseId(caseId: string): Promise<SelectDispute | undefined>;
  createDispute(dispute: InsertDispute): Promise<SelectDispute>;
  updateDispute(id: number, updates: Partial<SelectDispute>): Promise<SelectDispute>;
  deleteDispute(id: number): Promise<void>;
  getDisputeStats(organizationId: number): Promise<{
    totalDisputes: number;
    totalVolume: string;
    byCardBrand: Record<string, { count: number; volume: string }>;
  }>;

  // Payment Accounts - New hybrid architecture
  getPaymentAccountsByOrganization(organizationId: number): Promise<PaymentAccount[]>;
  getPaymentAccount(id: number): Promise<PaymentAccount | undefined>;
  getDefaultPaymentAccount(organizationId: number): Promise<PaymentAccount | undefined>;
  createPaymentAccount(account: InsertPaymentAccount): Promise<PaymentAccount>;
  updatePaymentAccount(id: number, updates: Partial<PaymentAccount>): Promise<PaymentAccount>;
  setDefaultPaymentAccount(organizationId: number, accountId: number): Promise<void>;

  // Funds - New hybrid architecture
  getFundsByOrganization(organizationId: number): Promise<Fund[]>;
  getFund(id: number): Promise<Fund | undefined>;
  getDefaultFund(organizationId: number): Promise<Fund | undefined>;
  getFundByType(organizationId: number, type: string): Promise<Fund | undefined>;
  createFund(fund: InsertFund): Promise<Fund>;
  updateFund(id: number, updates: Partial<Fund>): Promise<Fund>;
  setDefaultFund(organizationId: number, fundId: number): Promise<void>;

  // Analytics
  getOrganizationStats(organizationId: number): Promise<{
    totalRaised: string;
    totalDonations: number;
    totalDonors: number;
    averageDonation: string;
    monthlyTotal: string;
  }>;
  getPlatformStats(): Promise<any>;

  // Onboarding
  getOnboardingSteps(organizationId: number): Promise<OrganizationOnboarding[]>;
  createOnboardingStep(step: InsertOnboarding): Promise<OrganizationOnboarding>;
  updateOnboardingStep(
    id: number,
    updates: Partial<OrganizationOnboarding>,
  ): Promise<OrganizationOnboarding>;
  initializeOrganizationOnboarding(organizationId: number): Promise<any>;
  completeOnboardingStep(
    organizationId: number,
    stepNumber: number,
    userId: string,
    stepData: any
  ): Promise<OrganizationOnboarding>;
  updateUserOnboardingStep(userId: string, stepNumber: number): Promise<User>;

  // SendGrid Email Campaigns
  getSendgridCampaignsByOrganization(
    organizationId: number,
  ): Promise<SendgridEmailCampaign[]>;
  getSendgridCampaignById(
    campaignId: number,
  ): Promise<SendgridEmailCampaign | undefined>;
  createSendgridCampaign(
    campaign: InsertSendgridEmailCampaign,
  ): Promise<SendgridEmailCampaign>;
  updateSendgridCampaign(
    campaignId: number,
    updates: Partial<SendgridEmailCampaign>,
  ): Promise<SendgridEmailCampaign>;
  deleteSendgridCampaign(campaignId: number): Promise<void>;

  // SendGrid Email Recipients
  getSendgridRecipientsByCampaign(
    campaignId: number,
  ): Promise<SendgridEmailRecipient[]>;
  createSendgridRecipient(
    recipient: InsertSendgridEmailRecipient,
  ): Promise<SendgridEmailRecipient>;
  updateSendgridRecipient(
    recipientId: number,
    updates: Partial<SendgridEmailRecipient>,
  ): Promise<SendgridEmailRecipient>;

  // SendGrid Webhook Events
  createSendgridWebhookEvent(
    event: InsertSendgridWebhookEvent,
  ): Promise<SendgridWebhookEvent>;
  getSendgridWebhookEventsByCampaign(
    campaignId: number,
  ): Promise<SendgridWebhookEvent[]>;

  // SendGrid Analytics
  getSendgridAnalyticsByCampaign(
    campaignId: number,
  ): Promise<SendgridEmailAnalytics[]>;
  createOrUpdateSendgridAnalytics(
    analytics: InsertSendgridEmailAnalytics,
  ): Promise<SendgridEmailAnalytics>;

  // Email Templates
  getEmailTemplates(): Promise<any[]>;
  getEmailTemplatesByOrganization(organizationId: number): Promise<any[]>;
  getEmailTemplateById(id: number): Promise<any>;
  createEmailTemplate(template: any): Promise<any>;
  updateEmailTemplate(id: number, updates: any): Promise<any>;
  deleteEmailTemplate(id: number): Promise<void>;
  getEmailTemplateVariables(): Promise<any[]>;
  sendTemplateEmail(params: {
    templateId: number;
    recipients: string[];
    variables: any;
  }): Promise<any>;

  // Events Management
  getEventsByOrganization(organizationId: number): Promise<Event[]>;
  getEventById(id: number): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, updates: Partial<Event>): Promise<Event>;
  deleteEvent(id: number): Promise<void>;

  // Event Tables
  getEventTables(eventId: number): Promise<EventTable[]>;
  createEventTable(table: InsertEventTable): Promise<EventTable>;
  updateEventTable(
    id: number,
    updates: Partial<EventTable>,
  ): Promise<EventTable>;
  deleteEventTable(id: number): Promise<void>;

  // Event Registrations
  getEventRegistrations(eventId: number): Promise<EventRegistration[]>;
  createEventRegistration(
    registration: InsertEventRegistration,
  ): Promise<EventRegistration>;
  updateEventRegistration(
    id: number,
    updates: Partial<EventRegistration>,
  ): Promise<EventRegistration>;
  deleteEventRegistration(id: number): Promise<void>;

  // Event Attendees
  getEventAttendees(eventId: number): Promise<EventAttendee[]>;
  createEventAttendee(
    attendee: InsertEventAttendee,
  ): Promise<EventAttendee>;
  updateEventAttendee(
    id: number,
    updates: Partial<EventAttendee>,
  ): Promise<EventAttendee>;
  deleteEventAttendee(id: number): Promise<void>;

  // GETTRX Payment Methods
  getGettrxPaymentMethods(
    organizationId: number,
  ): Promise<SelectGettrxPaymentMethod[]>;
  getGettrxPaymentMethod(
    id: number,
  ): Promise<SelectGettrxPaymentMethod | undefined>;
  createGettrxPaymentMethod(
    paymentMethod: InsertGettrxPaymentMethod,
  ): Promise<SelectGettrxPaymentMethod>;
  updateGettrxPaymentMethod(
    id: number,
    updates: Partial<SelectGettrxPaymentMethod>,
  ): Promise<SelectGettrxPaymentMethod>;
  deleteGettrxPaymentMethod(id: number): Promise<void>;

  // GETTRX Transfers
  getGettrxTransfers(organizationId: number): Promise<SelectGettrxTransfer[]>;
  getGettrxTransfer(id: number): Promise<SelectGettrxTransfer | undefined>;
  createGettrxTransfer(
    transfer: InsertGettrxTransfer,
  ): Promise<SelectGettrxTransfer>;
  updateGettrxTransfer(
    id: number,
    updates: Partial<SelectGettrxTransfer>,
  ): Promise<SelectGettrxTransfer>;

  // GETTRX Recurring Schedules
  getGettrxRecurringSchedules(
    organizationId: number,
  ): Promise<SelectGettrxRecurringSchedule[]>;
  getGettrxRecurringSchedule(
    id: number,
  ): Promise<SelectGettrxRecurringSchedule | undefined>;
  getGettrxRecurringSchedulesDue(
    beforeDate: Date,
  ): Promise<SelectGettrxRecurringSchedule[]>;
  createGettrxRecurringSchedule(
    schedule: InsertGettrxRecurringSchedule,
  ): Promise<SelectGettrxRecurringSchedule>;
  updateGettrxRecurringSchedule(
    id: number,
    updates: Partial<SelectGettrxRecurringSchedule>,
  ): Promise<SelectGettrxRecurringSchedule>;
  cancelGettrxRecurringSchedule(
    id: number,
  ): Promise<SelectGettrxRecurringSchedule>;

  // GETTRX Merchant Applications
  getGettrxMerchantApplications(
    organizationId: number,
  ): Promise<SelectGettrxMerchantApplication[]>;
  getGettrxMerchantApplication(
    id: number,
  ): Promise<SelectGettrxMerchantApplication | undefined>;
  getGettrxMerchantApplicationByOrganization(
    organizationId: number
  ): Promise<SelectGettrxMerchantApplication | undefined>;
  createGettrxMerchantApplication(
    application: InsertGettrxMerchantApplication,
  ): Promise<SelectGettrxMerchantApplication>;
  updateGettrxMerchantApplication(
    id: number,
    updates: Partial<SelectGettrxMerchantApplication>,
  ): Promise<SelectGettrxMerchantApplication>;

  // GETTRX Acceptance Tokens
  getGettrxAcceptanceTokens(
    organizationId: number,
  ): Promise<SelectGettrxAcceptanceToken[]>;
  getGettrxAcceptanceToken(
    id: number,
  ): Promise<SelectGettrxAcceptanceToken | undefined>;
  createGettrxAcceptanceToken(
    token: InsertGettrxAcceptanceToken,
  ): Promise<SelectGettrxAcceptanceToken>;
  updateGettrxAcceptanceToken(
    id: number,
    updates: Partial<SelectGettrxAcceptanceToken>,
  ): Promise<SelectGettrxAcceptanceToken>;

  // Platform Tipping Settings
  getTippingSettings(organizationId: number): Promise<OrganizationTippingSettings | undefined>;
  createTippingSettings(settings: InsertOrganizationTippingSettings): Promise<OrganizationTippingSettings>;
  updateTippingSettings(organizationId: number, updates: Partial<OrganizationTippingSettings>): Promise<OrganizationTippingSettings>;
  upsertTippingSettings(organizationId: number, settings: Partial<OrganizationTippingSettings>): Promise<OrganizationTippingSettings>;

  // Event Sponsorship Management
  getSponsorshipTiersByOrganization(organizationId: number): Promise<SponsorshipTier[]>;
  getSponsorshipTiersByEvent(eventId: number): Promise<SponsorshipTier[]>;
  getSponsorshipTier(id: number): Promise<SponsorshipTier | undefined>;
  createSponsorshipTier(tier: InsertSponsorshipTier): Promise<SponsorshipTier>;
  updateSponsorshipTier(id: number, updates: Partial<SponsorshipTier>): Promise<SponsorshipTier>;
  deleteSponsorshipTier(id: number): Promise<void>;
  getEventSponsorsByTier(tierId: number): Promise<EventSponsor[]>;
  getEventSponsorsByOrganization(organizationId: number): Promise<any[]>;
  getEventSponsor(id: number): Promise<EventSponsor | undefined>;
  createEventSponsor(sponsor: InsertEventSponsor): Promise<EventSponsor>;
  updateEventSponsor(id: number, updates: Partial<EventSponsor>): Promise<EventSponsor>;
  deleteEventSponsor(id: number): Promise<void>;

  // Client Intake & e-Consent System
  getIntakeRecordsByOrganization(organizationId: number): Promise<ClientIntakeRecord[]>;
  getIntakeRecord(id: number): Promise<ClientIntakeRecord | undefined>;
  createIntakeRecord(record: InsertClientIntakeRecord): Promise<ClientIntakeRecord>;
  updateIntakeRecord(id: number, updates: Partial<ClientIntakeRecord>): Promise<ClientIntakeRecord>;
  markIntakeRecordProcessed(id: number, processedBy: string): Promise<ClientIntakeRecord>;
  getIntakeRecordsByStatus(organizationId: number, status: string): Promise<ClientIntakeRecord[]>;
  searchIntakeRecords(organizationId: number, searchTerm: string): Promise<ClientIntakeRecord[]>;
  getIntakeStatistics(organizationId: number): Promise<{
    total: number;
    pending: number;
    processed: number;
    thisMonth: number;
  }>;

  // Integration Configurations
  getIntegrationConfigurations(organizationId: number): Promise<any[]>;
  
  // Bishop Blast Communications (Association/Diocese Level)
  getBishopBlastMessagesByAssociation(associationId: number): Promise<any[]>;
  getBishopBlastMessageById(id: number): Promise<any | undefined>;
  createBishopBlastMessage(message: any): Promise<any>;
  updateBishopBlastMessage(id: number, updates: any): Promise<any>;
  deleteBishopBlastMessage(id: number): Promise<void>;
  
  getBishopBlastRecipientsByMessage(messageId: number): Promise<any[]>;
  getBishopBlastRecipientsByAssociation(associationId: number): Promise<any[]>;
  createBishopBlastRecipients(recipients: any[]): Promise<any[]>;
  updateBishopBlastRecipient(id: number, updates: any): Promise<any>;
  updateRecipientDeliveryStatus(recipientId: number, channel: 'email' | 'sms', status: string, metadata?: any): Promise<any>;
  
  getBishopBlastLogsByAssociation(associationId: number): Promise<any[]>;
  getBishopBlastLogsByMessage(messageId: number): Promise<any[]>;
  createBishopBlastLog(log: any): Promise<any>;
  
  getAssociationRecipients(associationId: number, recipientType?: string): Promise<any[]>;
  getAssociationBishopBlastStats(associationId: number): Promise<any>;
  verifyBishopPermission(userId: string, associationId: number): Promise<boolean>;
  getUserAssociations(userId: string): Promise<any[]>;

  // ========================================
  // GLOBAL MESSENGER STORAGE INTERFACES
  // ========================================

  // Communities
  getCommunities(organizationId: number): Promise<SelectCommunity[]>;
  getCommunity(id: number): Promise<SelectCommunity | undefined>;
  getCommunityBySlug(organizationId: number, slug: string): Promise<SelectCommunity | undefined>;
  getCommunityWithMembers(id: number): Promise<CommunityWithMembers | undefined>;
  createCommunity(community: InsertCommunity): Promise<SelectCommunity>;
  updateCommunity(id: number, updates: Partial<SelectCommunity>): Promise<SelectCommunity>;
  deleteCommunity(id: number): Promise<void>;
  archiveCommunity(id: number): Promise<SelectCommunity>;
  updateCommunityMemberCount(communityId: number): Promise<void>;

  // Initiatives
  getInitiatives(organizationId: number): Promise<SelectInitiative[]>;
  getInitiativesByCommunity(communityId: number): Promise<SelectInitiative[]>;
  getInitiative(id: number): Promise<SelectInitiative | undefined>;
  getInitiativeWithDetails(id: number): Promise<InitiativeWithDetails | undefined>;
  createInitiative(initiative: InsertInitiative): Promise<SelectInitiative>;
  updateInitiative(id: number, updates: Partial<SelectInitiative>): Promise<SelectInitiative>;
  deleteInitiative(id: number): Promise<void>;
  updateInitiativeProgress(id: number, progressPercentage: number): Promise<SelectInitiative>;
  updateInitiativeFunding(id: number, fundsRaised: string): Promise<SelectInitiative>;

  // Initiative Milestones
  getInitiativeMilestones(initiativeId: number): Promise<SelectInitiativeMilestone[]>;
  getInitiativeMilestone(id: number): Promise<SelectInitiativeMilestone | undefined>;
  createInitiativeMilestone(milestone: InsertInitiativeMilestone): Promise<SelectInitiativeMilestone>;
  updateInitiativeMilestone(id: number, updates: Partial<SelectInitiativeMilestone>): Promise<SelectInitiativeMilestone>;
  deleteInitiativeMilestone(id: number): Promise<void>;
  completeInitiativeMilestone(id: number, completedBy: string): Promise<SelectInitiativeMilestone>;
  getInitiativeMilestonesDue(beforeDate: Date): Promise<SelectInitiativeMilestone[]>;

  // Community Members
  getCommunityMembers(communityId: number): Promise<SelectCommunityMember[]>;
  getCommunityMembersByUser(userId: string): Promise<SelectCommunityMember[]>;
  getCommunityMember(communityId: number, userId: string): Promise<SelectCommunityMember | undefined>;
  createCommunityMember(member: InsertCommunityMember): Promise<SelectCommunityMember>;
  updateCommunityMember(id: number, updates: Partial<SelectCommunityMember>): Promise<SelectCommunityMember>;
  deleteCommunityMember(id: number): Promise<void>;
  updateCommunityMemberActivity(id: number, activityType: 'message' | 'post'): Promise<void>;
  banCommunityMember(id: number, reason: string): Promise<SelectCommunityMember>;
  approveCommunityMember(id: number, approvedBy: string): Promise<SelectCommunityMember>;

  // Posts
  getPosts(organizationId: number, limit?: number): Promise<SelectPost[]>;
  getPostsByCommunity(communityId: number, limit?: number): Promise<SelectPost[]>;
  getPostsByInitiative(initiativeId: number): Promise<SelectPost[]>;
  getPost(id: number): Promise<SelectPost | undefined>;
  getPostWithEngagement(id: number): Promise<PostWithEngagement | undefined>;
  createPost(post: InsertPost): Promise<SelectPost>;
  updatePost(id: number, updates: Partial<SelectPost>): Promise<SelectPost>;
  deletePost(id: number): Promise<void>;
  moderatePost(id: number, status: string, moderatedBy: string, reason?: string): Promise<SelectPost>;
  updatePostEngagement(id: number, type: 'view' | 'comment' | 'reaction' | 'share'): Promise<void>;
  pinPost(id: number): Promise<SelectPost>;
  unpinPost(id: number): Promise<SelectPost>;

  // Conversations
  getConversations(organizationId: number): Promise<SelectConversation[]>;
  getConversationsByCommunity(communityId: number): Promise<SelectConversation[]>;
  getConversationsByUser(userId: string): Promise<SelectConversation[]>;
  getConversation(id: number): Promise<SelectConversation | undefined>;
  getConversationWithMessages(id: number, limit?: number): Promise<ConversationWithMessages | undefined>;
  createConversation(conversation: InsertConversation): Promise<SelectConversation>;
  updateConversation(id: number, updates: Partial<SelectConversation>): Promise<SelectConversation>;
  deleteConversation(id: number): Promise<void>;
  archiveConversation(id: number): Promise<SelectConversation>;
  lockConversation(id: number, lockedBy: string, reason: string): Promise<SelectConversation>;
  unlockConversation(id: number): Promise<SelectConversation>;
  updateConversationActivity(id: number, lastMessageBy: string): Promise<void>;

  // Messages
  getMessages(conversationId: number, limit?: number, offset?: number): Promise<SelectMessage[]>;
  getMessage(id: number): Promise<SelectMessage | undefined>;
  createMessage(message: InsertMessage): Promise<SelectMessage>;
  updateMessage(id: number, updates: Partial<SelectMessage>): Promise<SelectMessage>;
  deleteMessage(id: number, deletedBy: string): Promise<SelectMessage>;
  moderateMessage(id: number, status: string, moderatedBy: string, reason?: string): Promise<SelectMessage>;
  getMessageReplies(messageId: number): Promise<SelectMessage[]>;
  updateMessageReactions(id: number, reactionCount: number): Promise<void>;
  markMessageDelivered(id: number, transport: string, status: string): Promise<void>;

  // Transport Links
  getTransportLinks(userId: string): Promise<SelectTransportLink[]>;
  getTransportLinksByOrganization(organizationId: number): Promise<SelectTransportLink[]>;
  getTransportLink(id: number): Promise<SelectTransportLink | undefined>;
  getTransportLinkByTransportUser(transport: string, transportUserId: string): Promise<SelectTransportLink | undefined>;
  createTransportLink(link: InsertTransportLink): Promise<SelectTransportLink>;
  updateTransportLink(id: number, updates: Partial<SelectTransportLink>): Promise<SelectTransportLink>;
  deleteTransportLink(id: number): Promise<void>;
  verifyTransportLink(id: number, verificationCode: string): Promise<SelectTransportLink>;
  setPrimaryTransportLink(userId: string, linkId: number): Promise<void>;
  updateTransportLinkActivity(id: number): Promise<void>;
  updateTransportLinkError(id: number, error: string): Promise<void>;

  // Initiative Pledges
  getInitiativePledges(initiativeId: number): Promise<SelectInitiativePledge[]>;
  getInitiativePledgesByUser(userId: string): Promise<SelectInitiativePledge[]>;
  getInitiativePledge(id: number): Promise<SelectInitiativePledge | undefined>;
  createInitiativePledge(pledge: InsertInitiativePledge): Promise<SelectInitiativePledge>;
  updateInitiativePledge(id: number, updates: Partial<SelectInitiativePledge>): Promise<SelectInitiativePledge>;
  deleteInitiativePledge(id: number): Promise<void>;
  fulfillInitiativePledge(id: number, amount: string, donationId?: number): Promise<SelectInitiativePledge>;
  getInitiativePledgesDue(beforeDate: Date): Promise<SelectInitiativePledge[]>;
  getInitiativePledgesByStatus(status: string): Promise<SelectInitiativePledge[]>;

  // Moderation Events
  getModerationEvents(organizationId: number, limit?: number): Promise<SelectModerationEvent[]>;
  getModerationEventsByCommunity(communityId: number): Promise<SelectModerationEvent[]>;
  getModerationEventsByUser(userId: string): Promise<SelectModerationEvent[]>;
  getModerationEvent(id: number): Promise<SelectModerationEvent | undefined>;
  createModerationEvent(event: InsertModerationEvent): Promise<SelectModerationEvent>;
  updateModerationEvent(id: number, updates: Partial<SelectModerationEvent>): Promise<SelectModerationEvent>;
  appealModerationEvent(id: number, appealedBy: string, reason: string): Promise<SelectModerationEvent>;
  resolveModerationAppeal(id: number, resolvedBy: string, approved: boolean): Promise<SelectModerationEvent>;
  getModerationEventsByTarget(targetType: string, targetId: string): Promise<SelectModerationEvent[]>;
  getActiveModerationEvents(organizationId: number): Promise<SelectModerationEvent[]>;

  // Global Messenger Analytics
  getCommunityStats(communityId: number): Promise<{
    memberCount: number;
    activeMembers: number;
    postCount: number;
    messageCount: number;
    initiativeCount: number;
  }>;
  getInitiativeStats(initiativeId: number): Promise<{
    progressPercentage: number;
    fundsRaised: string;
    pledgeCount: number;
    supporterCount: number;
    postCount: number;
  }>;
  getUserMessagingStats(userId: string): Promise<{
    communitiesJoined: number;
    messagesSent: number;
    postsCreated: number;
    initiativesLed: number;
    pledgesMade: number;
  }>;
  getOrganizationMessagingStats(organizationId: number): Promise<{
    totalCommunities: number;
    totalInitiatives: number;
    totalMembers: number;
    totalMessages: number;
    totalPosts: number;
    activeCommunities: number;
  }>;

  // ========================================
  // FINANCIAL STATEMENTS & ACCOUNTING
  // ========================================

  // Chart of Accounts
  getChartOfAccounts(organizationId: number): Promise<SelectChartOfAccount[]>;
  getChartOfAccount(id: number, organizationId: number): Promise<SelectChartOfAccount | undefined>;
  createChartOfAccount(account: InsertChartOfAccount): Promise<SelectChartOfAccount>;
  updateChartOfAccount(id: number, organizationId: number, updates: Partial<InsertChartOfAccount>): Promise<SelectChartOfAccount | undefined>;
  deleteChartOfAccount(id: number, organizationId: number): Promise<void>;
  initializeDefaultChartOfAccounts(organizationId: number, organizationType: string): Promise<SelectChartOfAccount[]>;

  // Accounting Periods
  getAccountingPeriods(organizationId: number, fiscalYear?: number, status?: string): Promise<SelectAccountingPeriod[]>;
  getAccountingPeriod(id: number, organizationId: number): Promise<SelectAccountingPeriod | undefined>;
  createAccountingPeriod(period: InsertAccountingPeriod): Promise<SelectAccountingPeriod>;
  updateAccountingPeriod(id: number, organizationId: number, updates: Partial<InsertAccountingPeriod>): Promise<SelectAccountingPeriod | undefined>;
  closeAccountingPeriod(id: number, organizationId: number, userId: string): Promise<SelectAccountingPeriod | undefined>;
  getCurrentAccountingPeriod(organizationId: number): Promise<SelectAccountingPeriod | undefined>;

  // Journal Entries
  getJournalEntries(organizationId: number, periodId?: number, status?: string, sourceType?: string): Promise<JournalEntryWithLineItems[]>;
  getJournalEntry(id: number, organizationId: number): Promise<JournalEntryWithLineItems | undefined>;
  createJournalEntry(entry: InsertJournalEntry, lineItems: InsertJournalEntryLineItem[]): Promise<JournalEntryWithLineItems>;
  updateJournalEntry(id: number, organizationId: number, updates: Partial<InsertJournalEntry>): Promise<JournalEntryWithLineItems | undefined>;
  postJournalEntry(id: number, organizationId: number, userId: string): Promise<JournalEntryWithLineItems | undefined>;
  reverseJournalEntry(id: number, organizationId: number, userId: string, reason: string): Promise<JournalEntryWithLineItems>;
  autoPostDonationsToJournal(organizationId: number, userId: string, startDate?: string, endDate?: string, periodId?: number): Promise<{ entriesCreated: number; totalAmount: string; }>;

  // Financial Statement Generation
  generateStatementOfActivity(organizationId: number, periodId?: number, startDate?: string, endDate?: string): Promise<FinancialStatementData>;
  generateStatementOfPosition(organizationId: number, asOfDate: string): Promise<FinancialStatementData>;
  getTrialBalance(organizationId: number, asOfDate: string): Promise<{ accountName: string; accountNumber: string; debitBalance: number; creditBalance: number; }[]>;
  
  // Financial Statement Templates & Storage
  getFinancialStatementTemplates(organizationId?: number, templateType?: string): Promise<SelectFinancialStatementTemplate[]>;
  createFinancialStatementTemplate(template: InsertFinancialStatementTemplate): Promise<SelectFinancialStatementTemplate>;
  updateFinancialStatementTemplate(id: number, updates: Partial<InsertFinancialStatementTemplate>): Promise<SelectFinancialStatementTemplate | undefined>;
  
  // Generated Financial Statements
  getGeneratedFinancialStatements(organizationId: number, statementType?: string, fiscalYear?: number): Promise<SelectGeneratedFinancialStatement[]>;
  getGeneratedFinancialStatement(id: number, organizationId: number): Promise<SelectGeneratedFinancialStatement | undefined>;
  saveGeneratedFinancialStatement(statement: InsertGeneratedFinancialStatement): Promise<SelectGeneratedFinancialStatement>;
  deleteGeneratedFinancialStatement(id: number, organizationId: number): Promise<void>;
}