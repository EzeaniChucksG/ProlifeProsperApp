/**
 * Product Storage - Handles sellable product-related database operations 
 * (books, courses, packages, digital/physical products)
 */
import {
  products,
  type Product,
  type InsertProduct,
} from "@shared/schema";
import { db } from "../db";
import { eq, and } from "drizzle-orm";

export class ProductStorage {
  async getProductsByOrganization(organizationId: number): Promise<Product[]> {
    return await db
      .select({
        id: products.id,
        organizationId: products.organizationId,
        name: products.name,
        slug: products.slug,
        description: products.description,
        imageUrls: products.imageUrls,
        videoUrl: products.videoUrl,
        videoType: products.videoType,
        productType: products.productType,
        categories: products.categories,
        tags: products.tags,
        price: products.price,
        compareAtPrice: products.compareAtPrice,
        currency: products.currency,
        sku: products.sku,
        attributes: products.attributes,
        trackInventory: products.trackInventory,
        inventoryQty: products.inventoryQty,
        shippingRequired: products.shippingRequired,
        weight: products.weight,
        dimensions: products.dimensions,
        isDigital: products.isDigital,
        digitalDownloadUrl: products.digitalDownloadUrl,
        digitalMetadata: products.digitalMetadata,
        courseMetadata: products.courseMetadata,
        ogTitle: products.ogTitle,
        ogDescription: products.ogDescription,
        ogImageUrl: products.ogImageUrl,
        isActive: products.isActive,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .where(and(
        eq(products.organizationId, organizationId),
        eq(products.isActive, true)
      ));
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db
      .select({
        id: products.id,
        organizationId: products.organizationId,
        name: products.name,
        slug: products.slug,
        description: products.description,
        imageUrls: products.imageUrls,
        videoUrl: products.videoUrl,
        videoType: products.videoType,
        productType: products.productType,
        categories: products.categories,
        tags: products.tags,
        price: products.price,
        compareAtPrice: products.compareAtPrice,
        currency: products.currency,
        sku: products.sku,
        attributes: products.attributes,
        trackInventory: products.trackInventory,
        inventoryQty: products.inventoryQty,
        shippingRequired: products.shippingRequired,
        weight: products.weight,
        dimensions: products.dimensions,
        isDigital: products.isDigital,
        digitalDownloadUrl: products.digitalDownloadUrl,
        digitalMetadata: products.digitalMetadata,
        courseMetadata: products.courseMetadata,
        ogTitle: products.ogTitle,
        ogDescription: products.ogDescription,
        ogImageUrl: products.ogImageUrl,
        isActive: products.isActive,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .where(eq(products.id, id));
    return product || undefined;
  }

  async getProductBySlug(slug: string): Promise<Product | undefined> {
    const [product] = await db
      .select({
        id: products.id,
        organizationId: products.organizationId,
        name: products.name,
        slug: products.slug,
        description: products.description,
        imageUrls: products.imageUrls,
        videoUrl: products.videoUrl,
        videoType: products.videoType,
        productType: products.productType,
        categories: products.categories,
        tags: products.tags,
        price: products.price,
        compareAtPrice: products.compareAtPrice,
        currency: products.currency,
        sku: products.sku,
        attributes: products.attributes,
        trackInventory: products.trackInventory,
        inventoryQty: products.inventoryQty,
        shippingRequired: products.shippingRequired,
        weight: products.weight,
        dimensions: products.dimensions,
        isDigital: products.isDigital,
        digitalDownloadUrl: products.digitalDownloadUrl,
        digitalMetadata: products.digitalMetadata,
        courseMetadata: products.courseMetadata,
        ogTitle: products.ogTitle,
        ogDescription: products.ogDescription,
        ogImageUrl: products.ogImageUrl,
        isActive: products.isActive,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .where(eq(products.slug, slug));
    return product || undefined;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db
      .insert(products)
      .values(product)
      .returning({
        id: products.id,
        organizationId: products.organizationId,
        name: products.name,
        slug: products.slug,
        description: products.description,
        imageUrls: products.imageUrls,
        videoUrl: products.videoUrl,
        videoType: products.videoType,
        productType: products.productType,
        categories: products.categories,
        tags: products.tags,
        price: products.price,
        compareAtPrice: products.compareAtPrice,
        currency: products.currency,
        sku: products.sku,
        attributes: products.attributes,
        trackInventory: products.trackInventory,
        inventoryQty: products.inventoryQty,
        shippingRequired: products.shippingRequired,
        weight: products.weight,
        dimensions: products.dimensions,
        isDigital: products.isDigital,
        digitalDownloadUrl: products.digitalDownloadUrl,
        digitalMetadata: products.digitalMetadata,
        courseMetadata: products.courseMetadata,
        ogTitle: products.ogTitle,
        ogDescription: products.ogDescription,
        ogImageUrl: products.ogImageUrl,
        isActive: products.isActive,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      });
    return newProduct;
  }

  async updateProduct(id: number, updates: Partial<Product>): Promise<Product> {
    const [updatedProduct] = await db
      .update(products)
      .set(updates)
      .where(eq(products.id, id))
      .returning({
        id: products.id,
        organizationId: products.organizationId,
        name: products.name,
        slug: products.slug,
        description: products.description,
        imageUrls: products.imageUrls,
        videoUrl: products.videoUrl,
        videoType: products.videoType,
        productType: products.productType,
        categories: products.categories,
        tags: products.tags,
        price: products.price,
        compareAtPrice: products.compareAtPrice,
        currency: products.currency,
        sku: products.sku,
        attributes: products.attributes,
        trackInventory: products.trackInventory,
        inventoryQty: products.inventoryQty,
        shippingRequired: products.shippingRequired,
        weight: products.weight,
        dimensions: products.dimensions,
        isDigital: products.isDigital,
        digitalDownloadUrl: products.digitalDownloadUrl,
        digitalMetadata: products.digitalMetadata,
        courseMetadata: products.courseMetadata,
        ogTitle: products.ogTitle,
        ogDescription: products.ogDescription,
        ogImageUrl: products.ogImageUrl,
        isActive: products.isActive,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      });
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<void> {
    await db
      .update(products)
      .set({ isActive: false })
      .where(eq(products.id, id));
  }
}