/**
 * Donation Product Storage - Handles donation product-related database operations
 */
import {
  donationProducts,
  organizations,
  type DonationProduct,
  type InsertDonationProduct,
} from "@shared/schema";
import { db } from "../db";
import { eq, and } from "drizzle-orm";

export class DonationProductStorage {
  async getDonationProductsByOrganization(organizationId: number): Promise<DonationProduct[]> {
    return await db
      .select({
        id: donationProducts.id,
        organizationId: donationProducts.organizationId,
        name: donationProducts.name,
        slug: donationProducts.slug,
        description: donationProducts.description,
        imageUrl: donationProducts.imageUrl,

        videoUrl: donationProducts.videoUrl,
        videoType: donationProducts.videoType,
        tiers: donationProducts.tiers,
        defaultAmount: donationProducts.defaultAmount,
        ogTitle: donationProducts.ogTitle,
        ogDescription: donationProducts.ogDescription,
        ogImageUrl: donationProducts.ogImageUrl,
        qrCodeUrl: donationProducts.qrCodeUrl,
        leadCaptureEnabled: donationProducts.leadCaptureEnabled,
        leadCaptureListId: donationProducts.leadCaptureListId,
        donationOnlyEnabled: donationProducts.donationOnlyEnabled,
        heroTitle: donationProducts.heroTitle,
        heroSubtitle: donationProducts.heroSubtitle,
        ctaText: donationProducts.ctaText,
        suggestedAmounts: donationProducts.suggestedAmounts,
        embedEnabled: donationProducts.embedEnabled,
        isActive: donationProducts.isActive,
        createdAt: donationProducts.createdAt,
        updatedAt: donationProducts.updatedAt,
      })
      .from(donationProducts)
      .where(and(
        eq(donationProducts.organizationId, organizationId),
        eq(donationProducts.isActive, true)
      ));
  }

  async getDonationProduct(id: number): Promise<DonationProduct | undefined> {
    const [product] = await db
      .select({
        id: donationProducts.id,
        organizationId: donationProducts.organizationId,
        name: donationProducts.name,
        slug: donationProducts.slug,
        description: donationProducts.description,
        imageUrl: donationProducts.imageUrl,

        videoUrl: donationProducts.videoUrl,
        videoType: donationProducts.videoType,
        tiers: donationProducts.tiers,
        defaultAmount: donationProducts.defaultAmount,
        ogTitle: donationProducts.ogTitle,
        ogDescription: donationProducts.ogDescription,
        ogImageUrl: donationProducts.ogImageUrl,
        qrCodeUrl: donationProducts.qrCodeUrl,
        leadCaptureEnabled: donationProducts.leadCaptureEnabled,
        leadCaptureListId: donationProducts.leadCaptureListId,
        donationOnlyEnabled: donationProducts.donationOnlyEnabled,
        heroTitle: donationProducts.heroTitle,
        heroSubtitle: donationProducts.heroSubtitle,
        ctaText: donationProducts.ctaText,
        suggestedAmounts: donationProducts.suggestedAmounts,
        embedEnabled: donationProducts.embedEnabled,
        isActive: donationProducts.isActive,
        createdAt: donationProducts.createdAt,
        updatedAt: donationProducts.updatedAt,
      })
      .from(donationProducts)
      .where(eq(donationProducts.id, id));
    return product || undefined;
  }

  async getDonationProductBySlug(slug: string): Promise<DonationProduct | undefined> {
    const [product] = await db
      .select({
        id: donationProducts.id,
        organizationId: donationProducts.organizationId,
        name: donationProducts.name,
        slug: donationProducts.slug,
        description: donationProducts.description,
        imageUrl: donationProducts.imageUrl,

        videoUrl: donationProducts.videoUrl,
        videoType: donationProducts.videoType,
        tiers: donationProducts.tiers,
        defaultAmount: donationProducts.defaultAmount,
        ogTitle: donationProducts.ogTitle,
        ogDescription: donationProducts.ogDescription,
        ogImageUrl: donationProducts.ogImageUrl,
        qrCodeUrl: donationProducts.qrCodeUrl,
        leadCaptureEnabled: donationProducts.leadCaptureEnabled,
        leadCaptureListId: donationProducts.leadCaptureListId,
        donationOnlyEnabled: donationProducts.donationOnlyEnabled,
        heroTitle: donationProducts.heroTitle,
        heroSubtitle: donationProducts.heroSubtitle,
        ctaText: donationProducts.ctaText,
        suggestedAmounts: donationProducts.suggestedAmounts,
        embedEnabled: donationProducts.embedEnabled,
        isActive: donationProducts.isActive,
        createdAt: donationProducts.createdAt,
        updatedAt: donationProducts.updatedAt,
      })
      .from(donationProducts)
      .where(and(
        eq(donationProducts.slug, slug),
        eq(donationProducts.isActive, true)
      ));
    return product || undefined;
  }

  // Public method that includes organization data for donation pages
  async getDonationProductBySlugWithOrganization(slug: string): Promise<any | undefined> {
    const [result] = await db
      .select({
        // Product fields
        product: {
          id: donationProducts.id,
          organizationId: donationProducts.organizationId,
          name: donationProducts.name,
          slug: donationProducts.slug,
          description: donationProducts.description,
          imageUrl: donationProducts.imageUrl,
  
          videoUrl: donationProducts.videoUrl,
          videoType: donationProducts.videoType,
          tiers: donationProducts.tiers,
          defaultAmount: donationProducts.defaultAmount,
          ogTitle: donationProducts.ogTitle,
          ogDescription: donationProducts.ogDescription,
          qrCodeUrl: donationProducts.qrCodeUrl,
          embedEnabled: donationProducts.embedEnabled,
          isActive: donationProducts.isActive,
          createdAt: donationProducts.createdAt,
          updatedAt: donationProducts.updatedAt,
        },
        // Organization fields
        organization: {
          id: organizations.id,
          name: organizations.name,
          slug: organizations.slug,
          primaryColor: organizations.primaryColor,
          secondaryColor: organizations.secondaryColor,
          logoUrl: organizations.logoUrl,
          website: organizations.website,
          phone: organizations.phone,
          email: organizations.email,
        }
      })
      .from(donationProducts)
      .innerJoin(organizations, eq(donationProducts.organizationId, organizations.id))
      .where(and(
        eq(donationProducts.slug, slug),
        eq(donationProducts.isActive, true),
        eq(organizations.isActive, true)
      ));
    
    return result || undefined;
  }

  async createDonationProduct(product: InsertDonationProduct): Promise<DonationProduct> {
    const [newProduct] = await db
      .insert(donationProducts)
      .values(product)
      .returning();
    return newProduct;
  }

  async updateDonationProduct(id: number, updates: Partial<DonationProduct>): Promise<DonationProduct> {
    const [product] = await db
      .update(donationProducts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(donationProducts.id, id))
      .returning();
    return product;
  }

  async deleteDonationProduct(id: number): Promise<void> {
    await db
      .update(donationProducts)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(donationProducts.id, id));
  }

  async generateDonationProductQRCode(productId: number): Promise<string> {
    const product = await this.getDonationProduct(productId);
    if (!product) {
      throw new Error("Donation product not found");
    }

    // Generate QR code URL pointing to the donation product page
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${process.env.BASE_URL || 'https://app.replit.dev'}/give/${product.slug}`)}`;
    
    await this.updateDonationProduct(productId, { qrCodeUrl });
    return qrCodeUrl;
  }
}