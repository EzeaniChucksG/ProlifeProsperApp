/**
 * Storage Module Index - Consolidated Storage Access
 */
import { UserStorage } from './user-storage';
import { OrganizationStorage } from './organization-storage';
import { CampaignStorage } from './campaign-storage';
import { DonationPageStorage } from './donation-page-storage';
import { DonationProductStorage } from './donation-product-storage';
import { ProductStorage } from './product-storage';
import { LeadCaptureStorage } from './lead-capture-storage';
import { DonorStorage } from './donor-storage';
import { DonationStorage } from './donation-storage';
import { EventStorage } from './event-storage';
import { SendgridStorage } from './sendgrid-storage';
import { GettrxStorage } from './gettrx-storage';
import { BTCPayStorage } from './btcpay-storage';
import { OnboardingStorage } from './onboarding-storage';
import { AnalyticsStorage } from './analytics-storage';
import { TippingStorage } from './tipping-storage';
import { SponsorshipStorage } from './sponsorship-storage';
import { IntakeStorage } from './intake-storage';
import { CustomFormsStorage } from './custom-forms-storage';
import { BishopBlastStorage } from './bishop-blast-storage';
import { FinancialStatementStorage } from './financial-statement-storage';
import { PaymentAccountStorage } from './payment-account-storage';
import { FundStorage } from './fund-storage';
import { DisputesStorage } from './disputes-storage';
import type { IStorage } from './interfaces';

/**
 * Main Storage Implementation
 * Consolidates all storage modules into a single interface
 */
export class Storage implements IStorage {
  private userStorage: UserStorage;
  private organizationStorage: OrganizationStorage;
  private campaignStorage: CampaignStorage;
  private donationPageStorage: DonationPageStorage;
  private donationProductStorage: DonationProductStorage;
  private productStorage: ProductStorage;
  private leadCaptureStorage: LeadCaptureStorage;
  private donorStorage: DonorStorage;
  private donationStorage: DonationStorage;
  private eventStorage: EventStorage;
  private sendgridStorage: SendgridStorage;
  private gettrxStorage: GettrxStorage;
  private btcpayStorage: BTCPayStorage;
  private onboardingStorage: OnboardingStorage;
  private analyticsStorage: AnalyticsStorage;
  private tippingStorage: TippingStorage;
  private sponsorshipStorage: SponsorshipStorage;
  private intakeStorage: IntakeStorage;
  private customFormsStorage: CustomFormsStorage;
  private bishopBlastStorage: BishopBlastStorage;
  private financialStatementStorage: FinancialStatementStorage;
  private paymentAccountStorage: PaymentAccountStorage;
  private fundStorage: FundStorage;
  private disputesStorage: DisputesStorage;

  constructor() {
    this.userStorage = new UserStorage();
    this.organizationStorage = new OrganizationStorage();
    this.campaignStorage = new CampaignStorage();
    this.donationPageStorage = new DonationPageStorage();
    this.donationProductStorage = new DonationProductStorage();
    this.productStorage = new ProductStorage();
    this.leadCaptureStorage = new LeadCaptureStorage();
    this.donorStorage = new DonorStorage();
    this.donationStorage = new DonationStorage();
    this.eventStorage = new EventStorage();
    this.sendgridStorage = new SendgridStorage();
    this.gettrxStorage = new GettrxStorage();
    this.btcpayStorage = new BTCPayStorage();
    this.onboardingStorage = new OnboardingStorage();
    this.analyticsStorage = new AnalyticsStorage();
    this.tippingStorage = new TippingStorage();
    this.sponsorshipStorage = new SponsorshipStorage();
    this.intakeStorage = new IntakeStorage();
    this.customFormsStorage = new CustomFormsStorage();
    this.bishopBlastStorage = new BishopBlastStorage();
    this.financialStatementStorage = new FinancialStatementStorage();
    this.paymentAccountStorage = new PaymentAccountStorage();
    this.fundStorage = new FundStorage();
    this.disputesStorage = new DisputesStorage();
  }

  // User methods - delegate to UserStorage
  async getUser(id: string | number) { return this.userStorage.getUser(id); }
  async getUserByUsername(username: string) { return this.userStorage.getUserByUsername(username); }
  async getUserByEmail(email: string) { return this.userStorage.getUserByEmail(email); }
  async createUser(user: any) { return this.userStorage.createUser(user); }
  async upsertUser(user: any) { return this.userStorage.upsertUser(user); }
  async updateUser(id: string, updates: any) { return this.userStorage.updateUser(id, updates); }
  async updateAllUsersOnboardingStep(organizationId: number, currentStep: number, isCompleted: boolean) {
    return this.userStorage.updateAllUsersOnboardingStep(organizationId, currentStep, isCompleted);
  }
  async updateUserOnboardingStep(userId: string, stepNumber: number) {
    return this.userStorage.updateUser(userId, { onboardingStep: stepNumber });
  }

  // Organization methods - delegate to OrganizationStorage
  async getOrganizationById(id: number) { return this.organizationStorage.getOrganizationById(id); }
  async getOrganizationBySlug(slug: string) { return this.organizationStorage.getOrganizationBySlug(slug); }
  async getDefaultAdminOrganization() { return this.organizationStorage.getDefaultAdminOrganization(); }
  async createOrganization(organization: any) { return this.organizationStorage.createOrganization(organization); }
  async updateOrganization(id: number, updates: any) { return this.organizationStorage.updateOrganization(id, updates); }
  async updateOrganizationSettings(id: number, settings: any) { return this.organizationStorage.updateOrganizationSettings(id, settings); }
  async updateOrganizationMerchantAccount(organizationId: number, merchantAccountId: string) {
    return this.organizationStorage.updateOrganization(organizationId, { merchantAccountId });
  }
  async updateOrganizationIntegrations(id: number, integrations: any) { 
    return this.organizationStorage.updateOrganizationIntegrations(id, integrations); 
  }
  async validateCustomDomain(domain: string) { return this.organizationStorage.validateCustomDomain(domain); }
  // Security method for redacting sensitive organization data
  redactOrganizationSecrets(organization: any) { return this.organizationStorage.redactOrganizationSecrets(organization); }

  // Campaign methods - delegate to CampaignStorage
  async getCampaignsByOrganization(organizationId: number) { return this.campaignStorage.getCampaignsByOrganization(organizationId); }
  async getCampaign(id: number) { return this.campaignStorage.getCampaign(id); }
  async getCampaignBySlug(slug: string) { return this.campaignStorage.getCampaignBySlug(slug); }
  async getCampaignBySlugWithOrganization(slug: string) { return this.campaignStorage.getCampaignBySlugWithOrganization(slug); }
  async createCampaign(campaign: any) { return this.campaignStorage.createCampaign(campaign); }
  async updateCampaign(id: number, updates: any) { return this.campaignStorage.updateCampaign(id, updates); }
  async cloneCampaign(id: number) { return this.campaignStorage.cloneCampaign(id); }
  async generateEmbedCode(campaignId: number) { return this.campaignStorage.generateEmbedCode(campaignId); }
  async generateQRCode(campaignId: number) { return this.campaignStorage.generateQRCode(campaignId); }

  // Campaign Category methods - delegate to CampaignStorage
  async getCategoriesByCampaign(campaignId: number) { return this.campaignStorage.getCategoriesByCampaign(campaignId); }
  async getCategory(id: number) { return this.campaignStorage.getCategory(id); }
  async createCategory(category: any) { return this.campaignStorage.createCategory(category); }
  async updateCategory(id: number, updates: any) { return this.campaignStorage.updateCategory(id, updates); }
  async deleteCategory(id: number) { return this.campaignStorage.deleteCategory(id); }
  async incrementCategoryRaised(categoryId: number, amount: string) { return this.campaignStorage.incrementCategoryRaised(categoryId, amount); }

  // Donation Page methods - delegate to DonationPageStorage
  async getDonationPagesByOrganization(organizationId: number) { return this.donationPageStorage.getDonationPagesByOrganization(organizationId); }
  async getDonationPage(id: number) { return this.donationPageStorage.getDonationPage(id); }
  async getDonationPageBySlug(organizationId: number, slug: string) { return this.donationPageStorage.getDonationPageBySlug(organizationId, slug); }
  async getDonationPageBySlugGlobal(slug: string) { return this.donationPageStorage.getDonationPageBySlugGlobal(slug); }
  async getDonationPageByCustomUrl(customUrl: string) { return this.donationPageStorage.getDonationPageByCustomUrl(customUrl); }
  async getDonationPageBySubdomain(subdomain: string) { return this.donationPageStorage.getDonationPageBySubdomain(subdomain); }
  async createDonationPage(donationPage: any) { return this.donationPageStorage.createDonationPage(donationPage); }
  async updateDonationPage(id: number, updates: any) { return this.donationPageStorage.updateDonationPage(id, updates); }
  async deleteDonationPage(id: number) { return this.donationPageStorage.deleteDonationPage(id); }
  async cloneDonationPage(id: number, options: { suffix?: string; cloneCampaigns?: boolean }) { return this.donationPageStorage.cloneDonationPage(id, options); }
  async assignCampaignToPage(campaignId: number, donationPageId: number | null) { return this.donationPageStorage.assignCampaignToPage(campaignId, donationPageId); }
  async getCampaignsByDonationPage(donationPageId: number) { return this.donationPageStorage.getCampaignsByDonationPage(donationPageId); }

  // Donation Page Analytics methods - delegate to DonationPageStorage
  async getDonationPageAnalytics(pageId: number, startDate: Date, endDate: Date) { return this.donationPageStorage.getDonationPageAnalytics(pageId, startDate, endDate); }
  async getCampaignAnalytics(campaignId: number, startDate: Date, endDate: Date) { return this.donationPageStorage.getCampaignAnalytics(campaignId, startDate, endDate); }
  async getDonationPageDonations(pageId: number, startDate: Date, endDate: Date) { return this.donationPageStorage.getDonationPageDonations(pageId, startDate, endDate); }
  async getOrganizationAnalytics(orgId: number, startDate: Date, endDate: Date) { return this.donationPageStorage.getOrganizationAnalytics(orgId, startDate, endDate); }

  // Donation Product methods - delegate to DonationProductStorage
  async getDonationProductsByOrganization(organizationId: number) { return this.donationProductStorage.getDonationProductsByOrganization(organizationId); }
  async getDonationProduct(id: number) { return this.donationProductStorage.getDonationProduct(id); }
  async getDonationProductBySlug(slug: string) { return this.donationProductStorage.getDonationProductBySlug(slug); }
  async getDonationProductBySlugWithOrganization(slug: string) { return this.donationProductStorage.getDonationProductBySlugWithOrganization(slug); }
  async createDonationProduct(product: any) { return this.donationProductStorage.createDonationProduct(product); }
  async updateDonationProduct(id: number, updates: any) { return this.donationProductStorage.updateDonationProduct(id, updates); }
  async deleteDonationProduct(id: number) { return this.donationProductStorage.deleteDonationProduct(id); }
  async generateDonationProductQRCode(productId: number) { return this.donationProductStorage.generateDonationProductQRCode(productId); }

  // Product methods - delegate to ProductStorage (sellable items: books, courses, packages)
  async getProductsByOrganization(organizationId: number) { return this.productStorage.getProductsByOrganization(organizationId); }
  async getProduct(id: number) { return this.productStorage.getProduct(id); }
  async getProductBySlug(slug: string) { return this.productStorage.getProductBySlug(slug); }
  async createProduct(product: any) { return this.productStorage.createProduct(product); }
  async updateProduct(id: number, updates: any) { return this.productStorage.updateProduct(id, updates); }
  async deleteProduct(id: number) { return this.productStorage.deleteProduct(id); }

  // Lead Capture methods - delegate to LeadCaptureStorage
  async createLeadCapture(leadCapture: any) { return this.leadCaptureStorage.createLeadCapture(leadCapture); }
  async getLeadCapturesByOrganization(organizationId: number) { return this.leadCaptureStorage.getLeadCapturesByOrganization(organizationId); }
  async getLeadCapturesByProduct(donationProductId: number) { return this.leadCaptureStorage.getLeadCapturesByProduct(donationProductId); }

  // Donor methods - delegate to DonorStorage
  async getDonorsByOrganization(organizationId: number) { return this.donorStorage.getDonorsByOrganization(organizationId); }
  async getDonorById(id: number) { return this.donorStorage.getDonorById(id); }
  async getDonorByEmail(organizationId: number, email: string) { return this.donorStorage.getDonorByEmail(organizationId, email); }
  async findDonorByEmail(organizationId: number, email: string) { return this.donorStorage.findDonorByEmail(organizationId, email); }
  async createDonor(donor: any) { return this.donorStorage.createDonor(donor); }
  async updateDonor(id: number, updates: any) { return this.donorStorage.updateDonor(id, updates); }

  // Donation methods - delegate to DonationStorage
  async getDonationsByOrganization(organizationId: number, limit?: number) { return this.donationStorage.getDonationsByOrganization(organizationId, limit); }
  async getDonationsByCampaign(campaignId: number) { return this.donationStorage.getDonationsByCampaign(campaignId); }
  async createDonation(donation: any) { return this.donationStorage.createDonation(donation); }
  async updateDonation(id: number, updates: any) { return this.donationStorage.updateDonation(id, updates); }

  // Disputes methods - delegate to DisputesStorage
  async getDisputesByOrganization(organizationId: number) { return this.disputesStorage.getDisputesByOrganization(organizationId); }
  async getDispute(id: number) { return this.disputesStorage.getDispute(id); }
  async getDisputeByCaseId(caseId: string) { return this.disputesStorage.getDisputeByCaseId(caseId); }
  async createDispute(dispute: any) { return this.disputesStorage.createDispute(dispute); }
  async updateDispute(id: number, updates: any) { return this.disputesStorage.updateDispute(id, updates); }
  async deleteDispute(id: number) { return this.disputesStorage.deleteDispute(id); }
  async getDisputeStats(organizationId: number) { return this.disputesStorage.getDisputeStats(organizationId); }
  async getDisputeDocuments(disputeId: number) { return this.disputesStorage.getDisputeDocuments(disputeId); }
  async getDisputeDocument(id: number) { return this.disputesStorage.getDisputeDocument(id); }
  async createDisputeDocument(document: any) { return this.disputesStorage.createDisputeDocument(document); }
  async deleteDisputeDocument(id: number) { return this.disputesStorage.deleteDisputeDocument(id); }

  // Payment Account methods - delegate to PaymentAccountStorage
  async getPaymentAccountsByOrganization(organizationId: number) { return this.paymentAccountStorage.getPaymentAccountsByOrganization(organizationId); }
  async getPaymentAccount(id: number) { return this.paymentAccountStorage.getPaymentAccount(id); }
  async getDefaultPaymentAccount(organizationId: number) { return this.paymentAccountStorage.getDefaultPaymentAccount(organizationId); }
  async createPaymentAccount(account: any) { return this.paymentAccountStorage.createPaymentAccount(account); }
  async updatePaymentAccount(id: number, updates: any) { return this.paymentAccountStorage.updatePaymentAccount(id, updates); }
  async setDefaultPaymentAccount(organizationId: number, accountId: number) { return this.paymentAccountStorage.setDefaultPaymentAccount(organizationId, accountId); }

  // Fund methods - delegate to FundStorage
  async getFundsByOrganization(organizationId: number) { return this.fundStorage.getFundsByOrganization(organizationId); }
  async getFund(id: number) { return this.fundStorage.getFund(id); }
  async getDefaultFund(organizationId: number) { return this.fundStorage.getDefaultFund(organizationId); }
  async getFundByType(organizationId: number, type: string) { return this.fundStorage.getFundByType(organizationId, type); }
  async createFund(fund: any) { return this.fundStorage.createFund(fund); }
  async updateFund(id: number, updates: any) { return this.fundStorage.updateFund(id, updates); }
  async setDefaultFund(organizationId: number, fundId: number) { return this.fundStorage.setDefaultFund(organizationId, fundId); }

  // Analytics methods - delegate to AnalyticsStorage
  async getOrganizationStats(organizationId: number) { return this.analyticsStorage.getOrganizationStats(organizationId); }
  async getPlatformStats() { return this.analyticsStorage.getPlatformStats(); }
  async getAnalyticsOverview(organizationId: number, startDate: Date, endDate: Date) { 
    return this.analyticsStorage.getAnalyticsOverview(organizationId, startDate, endDate); 
  }
  async getRecentTransactions(organizationId: number, limit: number = 12, offset: number = 0) {
    return this.analyticsStorage.getRecentTransactions(organizationId, limit, offset);
  }
  async getRecentDonors(organizationId: number, limit: number = 10, offset: number = 0) {
    return this.analyticsStorage.getRecentDonors(organizationId, limit, offset);
  }
  async getDonorSegmentationAnalytics(organizationId: number, dateRange: string) {
    return this.analyticsStorage.getDonorSegmentationAnalytics(organizationId, dateRange);
  }
  async getCampaignROIAnalytics(organizationId: number, dateRange: string) {
    return this.analyticsStorage.getCampaignROIAnalytics(organizationId, dateRange);
  }
  async getChurchAnalytics(organizationId: number, dateRange: string) {
    return this.analyticsStorage.getChurchAnalytics(organizationId, dateRange);
  }

  // Onboarding methods - delegate to OnboardingStorage
  async getOnboardingSteps(organizationId: number) { return this.onboardingStorage.getOnboardingSteps(organizationId); }
  async createOnboardingStep(step: any) { return this.onboardingStorage.createOnboardingStep(step); }
  async updateOnboardingStep(id: number, updates: any) { return this.onboardingStorage.updateOnboardingStep(id, updates); }
  async initializeOrganizationOnboarding(organizationId: number) {
    // Create 8 onboarding steps for the organization
    const steps = [];
    const stepNames = [
      'Organization Setup', 'Branding & Design', 'Create First Campaign',
      'GETTRX Merchant Setup', 'Communication Templates', 'Donation Page Configuration',
      'Integrations & APIs', 'Testing & Launch'
    ];
    for (let i = 1; i <= 8; i++) {
      const step = await this.onboardingStorage.createOnboardingStep({
        organizationId,
        stepNumber: i,
        stepName: stepNames[i-1],
        stepKey: `step_${i}`,
        isCompleted: false,
        data: {}
      });
      steps.push(step);
    }
    return steps;
  }
  async completeOnboardingStep(organizationId: number, stepNumber: number, userId: string, stepData: any) {
    const steps = await this.onboardingStorage.getOnboardingSteps(organizationId);
    const targetStep = steps.find(s => s.stepNumber === stepNumber);
    if (!targetStep) {
      throw new Error(`Step ${stepNumber} not found`);
    }
    const targetData = targetStep.data || {};
    return this.onboardingStorage.updateOnboardingStep(targetStep.id, {
      isCompleted: true,
      completedAt: new Date(),
      completedByUserId: userId,
      data: { ...targetData, ...stepData }
    });
  }

  // Event methods - delegate to EventStorage
  async getEventsByOrganization(organizationId: number) { return this.eventStorage.getEventsByOrganization(organizationId); }
  async getEventById(id: number) { return this.eventStorage.getEventById(id); }
  async createEvent(event: any) { return this.eventStorage.createEvent(event); }
  async updateEvent(id: number, updates: any) { return this.eventStorage.updateEvent(id, updates); }
  async deleteEvent(id: number) { return this.eventStorage.deleteEvent(id); }
  async getEventTables(eventId: number) { return this.eventStorage.getEventTables(eventId); }
  async createEventTable(table: any) { return this.eventStorage.createEventTable(table); }
  async updateEventTable(id: number, updates: any) { return this.eventStorage.updateEventTable(id, updates); }
  async deleteEventTable(id: number) { return this.eventStorage.deleteEventTable(id); }
  async getEventRegistrations(eventId: number) { return this.eventStorage.getEventRegistrations(eventId); }
  async createEventRegistration(registration: any) { return this.eventStorage.createEventRegistration(registration); }
  async updateEventRegistration(id: number, updates: any) { return this.eventStorage.updateEventRegistration(id, updates); }
  async deleteEventRegistration(id: number) { return this.eventStorage.deleteEventRegistration(id); }
  async getEventAttendees(eventId: number) { return this.eventStorage.getEventAttendees(eventId); }
  async createEventAttendee(attendee: any) { return this.eventStorage.createEventAttendee(attendee); }
  async updateEventAttendee(id: number, updates: any) { return this.eventStorage.updateEventAttendee(id, updates); }
  async deleteEventAttendee(id: number) { return this.eventStorage.deleteEventAttendee(id); }

  // SendGrid methods - delegate to SendgridStorage
  async getSendgridCampaignsByOrganization(organizationId: number) { return this.sendgridStorage.getSendgridCampaignsByOrganization(organizationId); }
  async getSendgridCampaignById(campaignId: number) { return this.sendgridStorage.getSendgridCampaignById(campaignId); }
  async createSendgridCampaign(campaign: any) { return this.sendgridStorage.createSendgridCampaign(campaign); }
  async updateSendgridCampaign(campaignId: number, updates: any) { return this.sendgridStorage.updateSendgridCampaign(campaignId, updates); }
  async deleteSendgridCampaign(campaignId: number) { return this.sendgridStorage.deleteSendgridCampaign(campaignId); }
  async getSendgridRecipientsByCampaign(campaignId: number) { return this.sendgridStorage.getSendgridRecipientsByCampaign(campaignId); }
  async createSendgridRecipient(recipient: any) { return this.sendgridStorage.createSendgridRecipient(recipient); }
  async updateSendgridRecipient(recipientId: number, updates: any) { return this.sendgridStorage.updateSendgridRecipient(recipientId, updates); }
  async createSendgridWebhookEvent(event: any) { return this.sendgridStorage.createSendgridWebhookEvent(event); }
  async getSendgridWebhookEventsByCampaign(campaignId: number) { return this.sendgridStorage.getSendgridWebhookEventsByCampaign(campaignId); }
  async getSendgridAnalyticsByCampaign(campaignId: number) { return this.sendgridStorage.getSendgridAnalyticsByCampaign(campaignId); }
  async createOrUpdateSendgridAnalytics(analytics: any) { return this.sendgridStorage.createOrUpdateSendgridAnalytics(analytics); }
  
  // Email Template methods
  async getEmailTemplates() { return this.sendgridStorage.getEmailTemplates(); }
  async getEmailTemplatesByOrganization(organizationId: number) { 
    // For now, return empty array as email templates by org not implemented
    return [];
  }
  async getEmailTemplateById(id: number) { return this.sendgridStorage.getEmailTemplateById(id); }
  async createEmailTemplate(template: any) { return this.sendgridStorage.createEmailTemplate(template); }
  async updateEmailTemplate(id: number, updates: any) { return this.sendgridStorage.updateEmailTemplate(id, updates); }
  async deleteEmailTemplate(id: number) { return this.sendgridStorage.deleteEmailTemplate(id); }
  async getEmailTemplateVariables() { return this.sendgridStorage.getEmailTemplateVariables(); }
  async sendTemplateEmail(params: any) { return this.sendgridStorage.sendTemplateEmail(params); }

  // GETTRX methods - delegate to GettrxStorage
  async getGettrxPaymentMethods(organizationId: number) { return this.gettrxStorage.getGettrxPaymentMethods(organizationId); }
  async getGettrxPaymentMethod(id: number) { return this.gettrxStorage.getGettrxPaymentMethod(id); }
  async createGettrxPaymentMethod(paymentMethod: any) { return this.gettrxStorage.createGettrxPaymentMethod(paymentMethod); }
  async updateGettrxPaymentMethod(id: number, updates: any) { return this.gettrxStorage.updateGettrxPaymentMethod(id, updates); }
  async deleteGettrxPaymentMethod(id: number) { return this.gettrxStorage.deleteGettrxPaymentMethod(id); }
  async getGettrxTransfers(organizationId: number) { return this.gettrxStorage.getGettrxTransfers(organizationId); }
  async getGettrxTransfer(id: number) { return this.gettrxStorage.getGettrxTransfer(id); }
  async createGettrxTransfer(transfer: any) { return this.gettrxStorage.createGettrxTransfer(transfer); }
  async updateGettrxTransfer(id: number, updates: any) { return this.gettrxStorage.updateGettrxTransfer(id, updates); }
  async getGettrxRecurringSchedules(organizationId: number) { return this.gettrxStorage.getGettrxRecurringSchedules(organizationId); }
  async getGettrxRecurringSchedule(id: number) { return this.gettrxStorage.getGettrxRecurringSchedule(id); }
  async getGettrxRecurringSchedulesDue(beforeDate: Date) { return this.gettrxStorage.getGettrxRecurringSchedulesDue(beforeDate); }
  async createGettrxRecurringSchedule(schedule: any) { return this.gettrxStorage.createGettrxRecurringSchedule(schedule); }
  async updateGettrxRecurringSchedule(id: number, updates: any) { return this.gettrxStorage.updateGettrxRecurringSchedule(id, updates); }
  async cancelGettrxRecurringSchedule(id: number) { return this.gettrxStorage.cancelGettrxRecurringSchedule(id); }
  async getGettrxMerchantApplications(organizationId: number) { return this.gettrxStorage.getGettrxMerchantApplications(organizationId); }
  async getGettrxMerchantApplication(id: number) { return this.gettrxStorage.getGettrxMerchantApplication(id); }
  async getGettrxMerchantApplicationByGettrxId(gettrxApplicationId: string) { return this.gettrxStorage.getGettrxMerchantApplicationByGettrxId(gettrxApplicationId); }
  async getGettrxMerchantApplicationByOrganization(organizationId: number) { 
    const applications = await this.gettrxStorage.getGettrxMerchantApplications(organizationId);
    return applications[0] || undefined;
  }
  async createGettrxMerchantApplication(application: any) { return this.gettrxStorage.createGettrxMerchantApplication(application); }
  async updateGettrxMerchantApplication(id: number, updates: any) { return this.gettrxStorage.updateGettrxMerchantApplication(id, updates); }
  async getGettrxAcceptanceTokens(applicationId: number) { return this.gettrxStorage.getGettrxAcceptanceTokens(applicationId); }
  async getGettrxAcceptanceToken(id: number) { return this.gettrxStorage.getGettrxAcceptanceToken(id); }
  async createGettrxAcceptanceToken(token: any) { return this.gettrxStorage.createGettrxAcceptanceToken(token); }
  async updateGettrxAcceptanceToken(id: number, updates: any) { return this.gettrxStorage.updateGettrxAcceptanceToken(id, updates); }
  
  // GETTRX Webhook Event methods - delegate to GettrxStorage
  async getGettrxWebhookEvent(webhookEventId: string) { return this.gettrxStorage.getGettrxWebhookEvent(webhookEventId); }
  async createGettrxWebhookEvent(webhookEvent: any) { return this.gettrxStorage.createGettrxWebhookEvent(webhookEvent); }
  async updateGettrxWebhookEvent(id: number, updates: any) { return this.gettrxStorage.updateGettrxWebhookEvent(id, updates); }
  async getRecentGettrxWebhookEvents(applicationId: string, hours?: number) { return this.gettrxStorage.getRecentGettrxWebhookEvents(applicationId, hours); }
  async isWebhookEventProcessed(webhookEventId: string) { return this.gettrxStorage.isWebhookEventProcessed(webhookEventId); }
  async markWebhookEventProcessed(webhookEventId: string, processingResult: any) { return this.gettrxStorage.markWebhookEventProcessed(webhookEventId, processingResult); }
  async markWebhookEventFailed(webhookEventId: string, errorMessage: string, incrementRetryCount?: boolean) { return this.gettrxStorage.markWebhookEventFailed(webhookEventId, errorMessage, incrementRetryCount); }
  async cleanupOldWebhookEvents(days?: number) { return this.gettrxStorage.cleanupOldWebhookEvents(days); }

  // BTCPay Server methods - delegate to BTCPayStorage
  async createBTCPayInvoice(invoiceData: any) { return this.btcpayStorage.createBTCPayInvoice(invoiceData); }
  async getBTCPayInvoice(id: number) { return this.btcpayStorage.getBTCPayInvoice(id); }
  async getBTCPayInvoiceByInvoiceId(btcpayInvoiceId: string) { return this.btcpayStorage.getBTCPayInvoiceByInvoiceId(btcpayInvoiceId); }
  async getBTCPayInvoicesByOrganization(organizationId: number) { return this.btcpayStorage.getBTCPayInvoicesByOrganization(organizationId); }
  async getBTCPayInvoicesByDonation(donationId: number) { return this.btcpayStorage.getBTCPayInvoicesByDonation(donationId); }
  async updateBTCPayInvoice(id: number, updates: any) { return this.btcpayStorage.updateBTCPayInvoice(id, updates); }
  async deleteBTCPayInvoice(id: number) { return this.btcpayStorage.deleteBTCPayInvoice(id); }
  async createBTCPayPayment(paymentData: any) { return this.btcpayStorage.createBTCPayPayment(paymentData); }
  async getBTCPayPayment(id: number) { return this.btcpayStorage.getBTCPayPayment(id); }
  async getBTCPayPaymentByPaymentId(btcpayPaymentId: string) { return this.btcpayStorage.getBTCPayPaymentByPaymentId(btcpayPaymentId); }
  async getBTCPayPaymentsByInvoice(invoiceId: number) { return this.btcpayStorage.getBTCPayPaymentsByInvoice(invoiceId); }
  async updateBTCPayPayment(id: number, updates: any) { return this.btcpayStorage.updateBTCPayPayment(id, updates); }
  async deleteBTCPayPayment(id: number) { return this.btcpayStorage.deleteBTCPayPayment(id); }
  async getBTCPayInvoiceStats(organizationId: number, startDate?: Date, endDate?: Date) { return this.btcpayStorage.getBTCPayInvoiceStats(organizationId, startDate, endDate); }
  async getRecentBTCPayActivity(organizationId: number, limit?: number) { return this.btcpayStorage.getRecentBTCPayActivity(organizationId, limit); }

  // Platform Tipping methods - delegate to TippingStorage
  async getTippingSettings(organizationId: number) { return this.tippingStorage.getTippingSettings(organizationId); }
  async createTippingSettings(settings: any) { return this.tippingStorage.createTippingSettings(settings); }
  async updateTippingSettings(organizationId: number, updates: any) { return this.tippingStorage.updateTippingSettings(organizationId, updates); }
  async upsertTippingSettings(organizationId: number, settings: any) { return this.tippingStorage.upsertTippingSettings(organizationId, settings); }

  // Event Sponsorship methods - delegate to SponsorshipStorage
  async getSponsorshipTiersByOrganization(organizationId: number) { return this.sponsorshipStorage.getSponsorshipTiersByOrganization(organizationId); }
  async getSponsorshipTiersByEvent(eventId: number) { return this.sponsorshipStorage.getSponsorshipTiersByEvent(eventId); }
  async getSponsorshipTier(id: number) { return this.sponsorshipStorage.getSponsorshipTier(id); }
  async createSponsorshipTier(tier: any) { return this.sponsorshipStorage.createSponsorshipTier(tier); }
  async updateSponsorshipTier(id: number, updates: any) { return this.sponsorshipStorage.updateSponsorshipTier(id, updates); }
  async deleteSponsorshipTier(id: number) { return this.sponsorshipStorage.deleteSponsorshipTier(id); }
  async getEventSponsorsByTier(tierId: number) { return this.sponsorshipStorage.getEventSponsorsByTier(tierId); }
  async getEventSponsorsByOrganization(organizationId: number) { return this.sponsorshipStorage.getEventSponsorsByOrganization(organizationId); }
  async getEventSponsor(id: number) { return this.sponsorshipStorage.getEventSponsor(id); }
  async createEventSponsor(sponsor: any) { return this.sponsorshipStorage.createEventSponsor(sponsor); }
  async updateEventSponsor(id: number, updates: any) { return this.sponsorshipStorage.updateEventSponsor(id, updates); }
  async deleteEventSponsor(id: number) { return this.sponsorshipStorage.deleteEventSponsor(id); }

  // Client Intake methods - delegate to IntakeStorage
  async getIntakeRecordsByOrganization(organizationId: number) { return this.intakeStorage.getIntakeRecordsByOrganization(organizationId); }
  async getIntakeRecord(id: number) { return this.intakeStorage.getIntakeRecord(id); }
  async createIntakeRecord(record: any) { return this.intakeStorage.createIntakeRecord(record); }
  async updateIntakeRecord(id: number, updates: any) { return this.intakeStorage.updateIntakeRecord(id, updates); }
  async markIntakeRecordProcessed(id: number, processedBy: string) { return this.intakeStorage.markIntakeRecordProcessed(id, processedBy); }
  async getIntakeRecordsByStatus(organizationId: number, status: string) { return this.intakeStorage.getIntakeRecordsByStatus(organizationId, status); }
  async searchIntakeRecords(organizationId: number, searchTerm: string) { return this.intakeStorage.searchIntakeRecords(organizationId, searchTerm); }
  async getIntakeStatistics(organizationId: number) { return this.intakeStorage.getIntakeStatistics(organizationId); }

  // Custom Forms methods - delegate to CustomFormsStorage
  async getCustomFormsByOrganization(organizationId: number) { return this.customFormsStorage.getFormTemplatesByOrganization(organizationId); }
  async getCustomFormTemplate(id: number) { return this.customFormsStorage.getFormTemplate(id); }
  async createCustomFormTemplate(template: any) { return this.customFormsStorage.createFormTemplate(template); }
  async updateCustomFormTemplate(id: number, updates: any) { return this.customFormsStorage.updateFormTemplate(id, updates); }
  async deleteCustomFormTemplate(id: number) { return this.customFormsStorage.deleteFormTemplate(id); }
  async cloneCustomFormTemplate(id: number, newName: string, organizationId: number, createdBy: string) { 
    return this.customFormsStorage.cloneFormTemplate(id, newName, organizationId, createdBy); 
  }
  async getCustomFormFields(formId: number) { return this.customFormsStorage.getFormFieldsByTemplate(formId); }
  async createCustomFormField(field: any) { return this.customFormsStorage.createFormField(field); }
  async updateCustomFormField(id: number, updates: any) { return this.customFormsStorage.updateFormField(id, updates); }
  async deleteCustomFormField(id: number) { return this.customFormsStorage.deleteFormField(id); }
  async reorderCustomFormFields(formId: number, fieldOrders: any) { return this.customFormsStorage.reorderFormFields(formId, fieldOrders); }
  async getFormFieldOptions(fieldId: number) { return this.customFormsStorage.getFormFieldOptions(fieldId); }
  async createFormFieldOption(option: any) { return this.customFormsStorage.createFormFieldOption(option); }
  async updateFormFieldOption(id: number, updates: any) { return this.customFormsStorage.updateFormFieldOption(id, updates); }
  async deleteFormFieldOption(id: number) { return this.customFormsStorage.deleteFormFieldOption(id); }
  async getCustomFormSubmissionsByForm(formId: number) { return this.customFormsStorage.getFormSubmissionsByTemplate(formId); }
  async getCustomFormSubmissionsByOrganization(organizationId: number) { return this.customFormsStorage.getFormSubmissionsByOrganization(organizationId); }
  async getCustomFormSubmission(id: number) { return this.customFormsStorage.getFormSubmission(id); }
  async createCustomFormSubmission(submission: any) { return this.customFormsStorage.createFormSubmission(submission); }
  async updateCustomFormSubmission(id: number, updates: any) { return this.customFormsStorage.updateFormSubmission(id, updates); }
  async markCustomFormSubmissionProcessed(id: number, processedBy: string) { return this.customFormsStorage.markSubmissionProcessed(id, processedBy); }
  async getCustomFormSubmissionsByStatus(formId: number, status: string) { return this.customFormsStorage.getSubmissionsByStatus(formId, status); }
  async getCompleteFormDefinition(formId: number) { return this.customFormsStorage.getCompleteFormDefinition(formId); }
  async getCustomFormStatistics(organizationId: number) { return this.customFormsStorage.getFormStatistics(organizationId); }
  async searchCustomForms(organizationId: number, searchTerm: string) { return this.customFormsStorage.searchForms(organizationId, searchTerm); }

  // Integration Configurations
  async getIntegrationConfigurations(organizationId: number) {
    // For now, return empty array as integrations not fully implemented
    return [];
  }

  // Bishop Blast Communications (Association/Diocese Level)
  async getBishopBlastMessagesByAssociation(associationId: number) {
    return this.bishopBlastStorage.getMessagesByAssociation(associationId);
  }
  async getBishopBlastMessageById(id: number) {
    return this.bishopBlastStorage.getMessageById(id);
  }
  async createBishopBlastMessage(message: any) {
    return this.bishopBlastStorage.createMessage(message);
  }
  async updateBishopBlastMessage(id: number, updates: any) {
    return this.bishopBlastStorage.updateMessage(id, updates);
  }
  async deleteBishopBlastMessage(id: number) {
    return this.bishopBlastStorage.deleteMessage(id);
  }
  
  async getBishopBlastRecipientsByMessage(messageId: number) {
    return this.bishopBlastStorage.getRecipientsByMessage(messageId);
  }
  async getBishopBlastRecipientsByAssociation(associationId: number) {
    return this.bishopBlastStorage.getRecipientsByAssociation(associationId);
  }
  async createBishopBlastRecipients(recipients: any[]) {
    return this.bishopBlastStorage.createRecipients(recipients);
  }
  async updateBishopBlastRecipient(id: number, updates: any) {
    return this.bishopBlastStorage.updateRecipient(id, updates);
  }
  async updateRecipientDeliveryStatus(recipientId: number, channel: 'email' | 'sms', status: string, metadata?: any) {
    return this.bishopBlastStorage.updateRecipientDeliveryStatus(recipientId, channel, status, metadata);
  }
  
  async getBishopBlastLogsByAssociation(associationId: number) {
    return this.bishopBlastStorage.getLogsByAssociation(associationId);
  }
  async getBishopBlastLogsByMessage(messageId: number) {
    return this.bishopBlastStorage.getLogsByMessage(messageId);
  }
  async createBishopBlastLog(log: any) {
    return this.bishopBlastStorage.createLog(log);
  }
  
  async getAssociationRecipients(associationId: number, recipientType?: string) {
    return this.bishopBlastStorage.getAssociationRecipients(associationId, recipientType);
  }
  async getAssociationBishopBlastStats(associationId: number) {
    return this.bishopBlastStorage.getAssociationMessageStats(associationId);
  }
  async verifyBishopPermission(userId: string, associationId: number) {
    return this.bishopBlastStorage.verifyBishopPermission(userId, associationId);
  }
  async getUserAssociations(userId: string) {
    return this.bishopBlastStorage.getUserAssociations(userId);
  }

  // ========================================
  // GLOBAL MESSENGER STORAGE METHODS (STUBS)
  // ========================================
  // These methods are not yet implemented but are required by the interface

  // Communities
  async getCommunities(organizationId: number) {
    return [];
  }
  async getCommunity(id: number) {
    return undefined;
  }
  async getCommunityBySlug(organizationId: number, slug: string) {
    return undefined;
  }
  async getCommunityWithMembers(id: number) {
    return undefined;
  }
  async createCommunity(community: any) {
    throw new Error("Global Messenger Communities not implemented yet");
  }
  async updateCommunity(id: number, updates: any) {
    throw new Error("Global Messenger Communities not implemented yet");
  }
  async deleteCommunity(id: number) {
    return Promise.resolve();
  }
  async archiveCommunity(id: number) {
    throw new Error("Global Messenger Communities not implemented yet");
  }
  async updateCommunityMemberCount(communityId: number) {
    return Promise.resolve();
  }

  // Initiatives
  async getInitiatives(organizationId: number) {
    return [];
  }
  async getInitiativesByCommunity(communityId: number) {
    return [];
  }
  async getInitiative(id: number) {
    return undefined;
  }
  async getInitiativeWithDetails(id: number) {
    return undefined;
  }
  async createInitiative(initiative: any) {
    throw new Error("Global Messenger Initiatives not implemented yet");
  }
  async updateInitiative(id: number, updates: any) {
    throw new Error("Global Messenger Initiatives not implemented yet");
  }
  async deleteInitiative(id: number) {
    return Promise.resolve();
  }
  async updateInitiativeProgress(id: number, progressPercentage: number) {
    throw new Error("Global Messenger Initiatives not implemented yet");
  }
  async updateInitiativeFunding(id: number, fundsRaised: string) {
    throw new Error("Global Messenger Initiatives not implemented yet");
  }

  // Initiative Milestones
  async getInitiativeMilestones(initiativeId: number) {
    return [];
  }
  async getInitiativeMilestone(id: number) {
    return undefined;
  }
  async createInitiativeMilestone(milestone: any) {
    throw new Error("Global Messenger Initiative Milestones not implemented yet");
  }
  async updateInitiativeMilestone(id: number, updates: any) {
    throw new Error("Global Messenger Initiative Milestones not implemented yet");
  }
  async deleteInitiativeMilestone(id: number) {
    return Promise.resolve();
  }
  async completeInitiativeMilestone(id: number, completedBy: string) {
    throw new Error("Global Messenger Initiative Milestones not implemented yet");
  }
  async getInitiativeMilestonesDue(beforeDate: Date) {
    return [];
  }

  // Community Members
  async getCommunityMembers(communityId: number) {
    return [];
  }
  async getCommunityMembersByUser(userId: string) {
    return [];
  }
  async getCommunityMember(communityId: number, userId: string) {
    return undefined;
  }
  async createCommunityMember(member: any) {
    throw new Error("Global Messenger Community Members not implemented yet");
  }
  async updateCommunityMember(id: number, updates: any) {
    throw new Error("Global Messenger Community Members not implemented yet");
  }
  async deleteCommunityMember(id: number) {
    return Promise.resolve();
  }
  async updateCommunityMemberActivity(id: number, activityType: 'message' | 'post') {
    return Promise.resolve();
  }
  async banCommunityMember(id: number, reason: string) {
    throw new Error("Global Messenger Community Members not implemented yet");
  }
  async approveCommunityMember(id: number, approvedBy: string) {
    throw new Error("Global Messenger Community Members not implemented yet");
  }

  // Posts
  async getPosts(organizationId: number, limit?: number) {
    return [];
  }
  async getPostsByCommunity(communityId: number, limit?: number) {
    return [];
  }
  async getPostsByInitiative(initiativeId: number) {
    return [];
  }
  async getPost(id: number) {
    return undefined;
  }
  async getPostWithEngagement(id: number) {
    return undefined;
  }
  async createPost(post: any) {
    throw new Error("Global Messenger Posts not implemented yet");
  }
  async updatePost(id: number, updates: any) {
    throw new Error("Global Messenger Posts not implemented yet");
  }
  async deletePost(id: number) {
    return Promise.resolve();
  }
  async moderatePost(id: number, status: string, moderatedBy: string, reason?: string) {
    throw new Error("Global Messenger Posts not implemented yet");
  }
  async updatePostEngagement(id: number, type: 'view' | 'comment' | 'reaction' | 'share') {
    return Promise.resolve();
  }
  async pinPost(id: number) {
    throw new Error("Global Messenger Posts not implemented yet");
  }
  async unpinPost(id: number) {
    throw new Error("Global Messenger Posts not implemented yet");
  }

  // Conversations
  async getConversations(organizationId: number) {
    return [];
  }
  async getConversationsByCommunity(communityId: number) {
    return [];
  }
  async getConversationsByUser(userId: string) {
    return [];
  }
  async getConversation(id: number) {
    return undefined;
  }
  async getConversationWithMessages(id: number, limit?: number) {
    return undefined;
  }
  async createConversation(conversation: any) {
    throw new Error("Global Messenger Conversations not implemented yet");
  }
  async updateConversation(id: number, updates: any) {
    throw new Error("Global Messenger Conversations not implemented yet");
  }
  async deleteConversation(id: number) {
    return Promise.resolve();
  }
  async archiveConversation(id: number) {
    throw new Error("Global Messenger Conversations not implemented yet");
  }
  async lockConversation(id: number, lockedBy: string, reason: string) {
    throw new Error("Global Messenger Conversations not implemented yet");
  }
  async unlockConversation(id: number) {
    throw new Error("Global Messenger Conversations not implemented yet");
  }
  async updateConversationActivity(id: number, lastMessageBy: string) {
    return Promise.resolve();
  }

  // Messages
  async getMessages(conversationId: number, limit?: number, offset?: number) {
    return [];
  }
  async getMessage(id: number) {
    return undefined;
  }
  async createMessage(message: any) {
    throw new Error("Global Messenger Messages not implemented yet");
  }
  async updateMessage(id: number, updates: any) {
    throw new Error("Global Messenger Messages not implemented yet");
  }
  async deleteMessage(id: number, deletedBy: string) {
    throw new Error("Global Messenger Messages not implemented yet");
  }
  async moderateMessage(id: number, status: string, moderatedBy: string, reason?: string) {
    throw new Error("Global Messenger Messages not implemented yet");
  }
  async getMessageReplies(messageId: number) {
    return [];
  }
  async updateMessageReactions(id: number, reactionCount: number) {
    return Promise.resolve();
  }
  async markMessageDelivered(id: number, transport: string, status: string) {
    return Promise.resolve();
  }

  // Transport Links
  async getTransportLinks(userId: string) {
    return [];
  }
  async getTransportLinksByOrganization(organizationId: number) {
    return [];
  }
  async getTransportLink(id: number) {
    return undefined;
  }
  async getTransportLinkByTransportUser(transport: string, transportUserId: string) {
    return undefined;
  }
  async createTransportLink(link: any) {
    throw new Error("Global Messenger Transport Links not implemented yet");
  }
  async updateTransportLink(id: number, updates: any) {
    throw new Error("Global Messenger Transport Links not implemented yet");
  }
  async deleteTransportLink(id: number) {
    return Promise.resolve();
  }
  async verifyTransportLink(id: number, verificationCode: string) {
    throw new Error("Global Messenger Transport Links not implemented yet");
  }
  async setPrimaryTransportLink(userId: string, linkId: number) {
    return Promise.resolve();
  }
  async updateTransportLinkActivity(id: number) {
    return Promise.resolve();
  }
  async updateTransportLinkError(id: number, error: string) {
    return Promise.resolve();
  }

  // Initiative Pledges
  async getInitiativePledges(initiativeId: number) {
    return [];
  }
  async getInitiativePledgesByUser(userId: string) {
    return [];
  }
  async getInitiativePledge(id: number) {
    return undefined;
  }
  async createInitiativePledge(pledge: any) {
    throw new Error("Global Messenger Initiative Pledges not implemented yet");
  }
  async updateInitiativePledge(id: number, updates: any) {
    throw new Error("Global Messenger Initiative Pledges not implemented yet");
  }
  async deleteInitiativePledge(id: number) {
    return Promise.resolve();
  }
  async fulfillInitiativePledge(id: number, amount: string, donationId?: number) {
    throw new Error("Global Messenger Initiative Pledges not implemented yet");
  }
  async getInitiativePledgesDue(beforeDate: Date) {
    return [];
  }
  async getInitiativePledgesByStatus(status: string) {
    return [];
  }

  // Moderation Events
  async getModerationEvents(organizationId: number, limit?: number) {
    return [];
  }
  async getModerationEventsByCommunity(communityId: number) {
    return [];
  }
  async getModerationEventsByUser(userId: string) {
    return [];
  }
  async getModerationEvent(id: number) {
    return undefined;
  }
  async createModerationEvent(event: any) {
    throw new Error("Global Messenger Moderation Events not implemented yet");
  }
  async updateModerationEvent(id: number, updates: any) {
    throw new Error("Global Messenger Moderation Events not implemented yet");
  }
  async appealModerationEvent(id: number, appealedBy: string, reason: string) {
    throw new Error("Global Messenger Moderation Events not implemented yet");
  }
  async resolveModerationAppeal(id: number, resolvedBy: string, approved: boolean) {
    throw new Error("Global Messenger Moderation Events not implemented yet");
  }
  async getModerationEventsByTarget(targetType: string, targetId: string) {
    return [];
  }
  async getActiveModerationEvents(organizationId: number) {
    return [];
  }

  // Global Messenger Analytics
  async getCommunityStats(communityId: number) {
    return {
      memberCount: 0,
      activeMembers: 0,
      postCount: 0,
      messageCount: 0
    };
  }
  async getInitiativeStats(initiativeId: number) {
    return {
      pledges: 0,
      supporters: 0,
      progress: 0,
      fundsRaised: "0"
    };
  }
  async getMessagingStats(organizationId: number, startDate: Date, endDate: Date) {
    return {
      totalMessages: 0,
      activeUsers: 0,
      conversationsStarted: 0,
      responseRate: 0
    };
  }
  async getUserEngagementStats(userId: string, communityId?: number) {
    return {
      messagesCount: 0,
      postsCount: 0,
      reactionsGiven: 0,
      reactionsReceived: 0
    };
  }
  async getGlobalMessengerOverview(organizationId: number) {
    return {
      totalCommunities: 0,
      totalInitiatives: 0,
      totalMembers: 0,
      totalMessages: 0
    };
  }

  // ========================================
  // FINANCIAL STATEMENTS METHODS - Delegate to FinancialStatementStorage
  // ========================================

  // Chart of Accounts
  async getChartOfAccounts(organizationId: number) { return this.financialStatementStorage.getChartOfAccounts(organizationId); }
  async getChartOfAccount(id: number, organizationId: number) { return this.financialStatementStorage.getChartOfAccount(id, organizationId); }
  async createChartOfAccount(account: any) { return this.financialStatementStorage.createChartOfAccount(account); }
  async updateChartOfAccount(id: number, organizationId: number, updates: any) { return this.financialStatementStorage.updateChartOfAccount(id, organizationId, updates); }
  async deleteChartOfAccount(id: number, organizationId: number) { return this.financialStatementStorage.deleteChartOfAccount(id, organizationId); }
  async initializeDefaultChartOfAccounts(organizationId: number, organizationType: string) { return this.financialStatementStorage.initializeDefaultChartOfAccounts(organizationId, organizationType); }

  // Accounting Periods
  async getAccountingPeriods(organizationId: number, fiscalYear?: number, status?: string) { return this.financialStatementStorage.getAccountingPeriods(organizationId, fiscalYear, status); }
  async getAccountingPeriod(id: number, organizationId: number) { return this.financialStatementStorage.getAccountingPeriod(id, organizationId); }
  async createAccountingPeriod(period: any) { return this.financialStatementStorage.createAccountingPeriod(period); }
  async updateAccountingPeriod(id: number, organizationId: number, updates: any) { return this.financialStatementStorage.updateAccountingPeriod(id, organizationId, updates); }
  async closeAccountingPeriod(id: number, organizationId: number, userId: string) { return this.financialStatementStorage.closeAccountingPeriod(id, organizationId, userId); }
  async getCurrentAccountingPeriod(organizationId: number) { return this.financialStatementStorage.getCurrentAccountingPeriod(organizationId); }

  // Journal Entries
  async getJournalEntries(organizationId: number, periodId?: number, status?: string, sourceType?: string) { return this.financialStatementStorage.getJournalEntries(organizationId, periodId, status, sourceType); }
  async getJournalEntry(id: number, organizationId: number) { return this.financialStatementStorage.getJournalEntry(id, organizationId); }
  async createJournalEntry(entry: any, lineItems: any[]) { return this.financialStatementStorage.createJournalEntry(entry, lineItems); }
  async updateJournalEntry(id: number, organizationId: number, updates: any) { return this.financialStatementStorage.updateJournalEntry(id, organizationId, updates); }
  async postJournalEntry(id: number, organizationId: number, userId: string) { return this.financialStatementStorage.postJournalEntry(id, organizationId, userId); }
  async reverseJournalEntry(id: number, organizationId: number, userId: string, reason: string) { return this.financialStatementStorage.reverseJournalEntry(id, organizationId, userId, reason); }
  async autoPostDonationsToJournal(organizationId: number, userId: string, startDate?: string, endDate?: string, periodId?: number) { return this.financialStatementStorage.autoPostDonationsToJournal(organizationId, userId, startDate, endDate, periodId); }

  // Financial Statement Generation
  async generateStatementOfActivity(organizationId: number, periodId?: number, startDate?: string, endDate?: string) { return this.financialStatementStorage.generateStatementOfActivity(organizationId, periodId, startDate, endDate); }
  async generateStatementOfPosition(organizationId: number, asOfDate: string) { return this.financialStatementStorage.generateStatementOfPosition(organizationId, asOfDate); }
  async getTrialBalance(organizationId: number, asOfDate: string) { return this.financialStatementStorage.getTrialBalance(organizationId, asOfDate); }
  
  // Financial Statement Templates & Storage
  async getFinancialStatementTemplates(organizationId?: number, templateType?: string) { return this.financialStatementStorage.getFinancialStatementTemplates(organizationId, templateType); }
  async createFinancialStatementTemplate(template: any) { return this.financialStatementStorage.createFinancialStatementTemplate(template); }
  async updateFinancialStatementTemplate(id: number, updates: any) { return this.financialStatementStorage.updateFinancialStatementTemplate(id, updates); }
  
  // Generated Financial Statements
  async getGeneratedFinancialStatements(organizationId: number, statementType?: string, fiscalYear?: number) { return this.financialStatementStorage.getGeneratedFinancialStatements(organizationId, statementType, fiscalYear); }
  async getGeneratedFinancialStatement(id: number, organizationId: number) { return this.financialStatementStorage.getGeneratedFinancialStatement(id, organizationId); }
  async saveGeneratedFinancialStatement(statement: any) { return this.financialStatementStorage.saveGeneratedFinancialStatement(statement); }
  async deleteGeneratedFinancialStatement(id: number, organizationId: number) { return this.financialStatementStorage.deleteGeneratedFinancialStatement(id, organizationId); }

}

// Export singleton instance
export const storage = new Storage();