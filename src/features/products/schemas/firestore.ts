/**
 * Products Firestore Document Types & Constants
 */

import {
  generateProductId,
  generateAuctionId,
  generatePreOrderId,
  type GenerateProductIdInput,
  type GenerateAuctionIdInput,
  type GeneratePreOrderIdInput,
} from "../../../utils/id-generators";
import type { ProductStatus } from "../types";

export interface ProductVideoField {
  url: string;
  thumbnailUrl: string;
  duration: number;
  trimStart?: number;
  trimEnd?: number;
}

export interface ProductSpecification {
  name: string;
  value: string;
  unit?: string;
}

export type CustomFieldType = "text" | "number" | "boolean" | "url";

export interface CustomField {
  key: string;
  type: CustomFieldType;
  value: string;
  unit?: string;
}

export const MAX_CUSTOM_FIELDS = 50;
export const MAX_CUSTOM_SECTIONS = 3;

export interface CustomSection {
  id: string;
  title: string;
  text?: string;
  fields?: CustomField[];
}

export interface ProductDocument {
  id: string;
  title: string;
  description: string;
  slug?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  category: string;
  categoryName?: string;
  subcategory?: string;
  brand?: string;
  brandSlug?: string;
  price: number;
  currency: string;
  stockQuantity: number;
  availableQuantity: number;
  mainImage: string;
  images: string[];
  video?: ProductVideoField;
  status: ProductStatus;
  storeId: string;
  storeName?: string;
  featured: boolean;
  tags: string[];
  specifications?: ProductSpecification[];
  features?: string[];
  shippingInfo?: string;
  returnPolicy?: string;
  condition?: "new" | "used" | "refurbished" | "broken" | "graded";
  insurance?: boolean;
  insuranceCost?: number;
  shippingPaidBy?: "seller" | "buyer";
  isAuction?: boolean;
  auctionEndDate?: Date;
  startingBid?: number;
  currentBid?: number;
  bidCount?: number;
  reservePrice?: number;
  buyNowPrice?: number;
  minBidIncrement?: number;
  autoExtendable?: boolean;
  auctionExtensionMinutes?: number;
  auctionOriginalEndDate?: Date;
  auctionShippingPaidBy?: "seller" | "winner";
  isPreOrder?: boolean;
  preOrderDeliveryDate?: Date;
  preOrderDepositPercent?: number;
  preOrderDepositAmount?: number;
  preOrderMaxQuantity?: number;
  preOrderCurrentCount?: number;
  preOrderProductionStatus?: "upcoming" | "in_production" | "ready_to_ship";
  preOrderCancellable?: boolean;
  isPromoted?: boolean;
  isOnSale?: boolean;
  isSold?: boolean;
  promotionEndDate?: Date;
  pickupAddressId?: string;
  viewCount?: number;
  avgRating?: number;
  reviewCount?: number;
  bulkDiscounts?: { quantity: number; discountPercent: number }[];
  ingredients?: string[];
  howToUse?: string[];
  allowOffers?: boolean;
  minOfferPercent?: number;
  customFields?: CustomField[];
  customSections?: CustomSection[];
  sublistingCategoryId?: string;
  groupId?: string;
  isGroupParent?: boolean;
  groupParentSlug?: string;
  groupChildSlugs?: string[];
  groupTitle?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Runtime-accessible product status values — use instead of bare string literals. */
export const ProductStatusValues = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
  SOLD: "sold",
  OUT_OF_STOCK: "out_of_stock",
  DISCONTINUED: "discontinued",
} as const satisfies Record<string, ProductStatus>;

export const PRODUCT_COLLECTION = "products" as const;

export const PRODUCT_INDEXED_FIELDS = [
  "storeId",
  "status",
  "category",
  "featured",
  "isAuction",
  "isPreOrder",
  "isPromoted",
  "isOnSale",
  "isSold",
  "createdAt",
] as const;

export const DEFAULT_PRODUCT_DATA: Partial<ProductDocument> = {
  status: "draft",
  featured: false,
  images: [],
  tags: [],
  availableQuantity: 0,
  isAuction: false,
  isPreOrder: false,
  isPromoted: false,
  isOnSale: false,
  isSold: false,
  bidCount: 0,
  condition: "new",
  insurance: false,
  shippingPaidBy: "buyer",
  autoExtendable: false,
  auctionExtensionMinutes: 5,
  auctionShippingPaidBy: "winner",
};

export const PRODUCT_PUBLIC_FIELDS = [
  "id",
  "title",
  "description",
  "category",
  "subcategory",
  "brand",
  "price",
  "currency",
  "stockQuantity",
  "availableQuantity",
  "images",
  "status",
  "storeName",
  "featured",
  "tags",
  "specifications",
  "features",
  "shippingInfo",
  "returnPolicy",
  "isAuction",
  "auctionEndDate",
  "startingBid",
  "currentBid",
  "bidCount",
  "reservePrice",
  "buyNowPrice",
  "minBidIncrement",
  "autoExtendable",
  "auctionExtensionMinutes",
  "auctionShippingPaidBy",
  "isPreOrder",
  "preOrderDeliveryDate",
  "preOrderDepositPercent",
  "preOrderDepositAmount",
  "preOrderMaxQuantity",
  "preOrderCurrentCount",
  "preOrderProductionStatus",
  "preOrderCancellable",
  "condition",
  "insurance",
  "insuranceCost",
  "shippingPaidBy",
  "isPromoted",
  "isOnSale",
  "isSold",
  "slug",
  "seoTitle",
  "seoDescription",
  "seoKeywords",
  "viewCount",
  "customFields",
  "customSections",
  "sublistingCategoryId",
  "groupId",
  "isGroupParent",
  "groupParentSlug",
  "groupChildSlugs",
  "groupTitle",
  "createdAt",
] as const;

export const PRODUCT_UPDATABLE_FIELDS = [
  "title",
  "description",
  "category",
  "subcategory",
  "brand",
  "price",
  "stockQuantity",
  "images",
  "status",
  "tags",
  "specifications",
  "features",
  "shippingInfo",
  "returnPolicy",
  "pickupAddressId",
  "condition",
  "insurance",
  "shippingPaidBy",
  "autoExtendable",
  "auctionExtensionMinutes",
  "auctionShippingPaidBy",
  "reservePrice",
  "buyNowPrice",
  "minBidIncrement",
  "isPreOrder",
  "preOrderDeliveryDate",
  "preOrderDepositPercent",
  "preOrderDepositAmount",
  "preOrderMaxQuantity",
  "preOrderProductionStatus",
  "preOrderCancellable",
  "isOnSale",
  "isSold",
  "seoTitle",
  "seoDescription",
  "seoKeywords",
  "customFields",
  "customSections",
  "sublistingCategoryId",
  "groupId",
  "isGroupParent",
  "groupParentSlug",
  "groupChildSlugs",
  "groupTitle",
] as const;

export type ProductCreateInput = Omit<
  ProductDocument,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "availableQuantity"
  | "bidCount"
  | "currentBid"
  | "auctionOriginalEndDate"
>;

export type ProductUpdateInput = Partial<
  Pick<ProductDocument, (typeof PRODUCT_UPDATABLE_FIELDS)[number]>
>;

export type ProductAdminUpdateInput = Partial<
  Omit<ProductDocument, "id" | "createdAt">
>;

export const productQueryHelpers = {
  byStore: (storeId: string) => ["storeId", "==", storeId] as const,
  byStatus: (status: ProductStatus) => ["status", "==", status] as const,
  byCategory: (category: string) => ["category", "==", category] as const,
  featured: () => ["featured", "==", true] as const,
  published: () => ["status", "==", "published"] as const,
  available: () => ["availableQuantity", ">", 0] as const,
  auctions: () => ["isAuction", "==", true] as const,
  preOrders: () => ["isPreOrder", "==", true] as const,
  promoted: () => ["isPromoted", "==", true] as const,
  activeAuction: (date: Date) => ["auctionEndDate", ">=", date] as const,
} as const;

export function createProductId(
  input: Omit<GenerateProductIdInput, "count"> & { count?: number },
): string {
  return generateProductId(input as GenerateProductIdInput);
}

export function createAuctionId(
  input: Omit<GenerateAuctionIdInput, "count"> & { count?: number },
): string {
  return generateAuctionId(input as GenerateAuctionIdInput);
}

export function createPreOrderId(
  input: Omit<GeneratePreOrderIdInput, "count"> & { count?: number },
): string {
  return generatePreOrderId(input as GeneratePreOrderIdInput);
}
