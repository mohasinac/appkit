/**
 * ProductTemplate — Firestore document schema for seller product templates.
 * Templates let sellers pre-fill common fields when creating new listings.
 */

export const PRODUCT_TEMPLATE_COLLECTION = "product_templates";
export const PRODUCT_TEMPLATE_PREFIX = "template-";

export interface ProductTemplateDocument {
  id: string;
  /** Owning store (storeSlug = storeId) */
  storeId: string;
  name: string;
  description?: string;
  // Pre-fillable listing fields
  category?: string;
  brand?: string;
  condition?: string;
  tags?: string[];
  /** Price hint in paise (INR × 100) */
  price?: number;
  currency?: string;
  shippingPaidBy?: "buyer" | "seller";
  pickupAddressId?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type ProductTemplateCreateInput = Omit<
  ProductTemplateDocument,
  "id" | "createdAt" | "updatedAt"
>;

export type ProductTemplateUpdateInput = Partial<
  Omit<ProductTemplateDocument, "id" | "storeId" | "createdAt">
>;
