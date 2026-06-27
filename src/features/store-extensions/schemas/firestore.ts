import type { FirestoreDocument } from "@mohasinac/appkit";
import type { BaseDocument } from "../../../_internal/shared/types/base-document";
/**
 * S-STORE Extensions — Firestore Document Types
 *
 * Foundational schemas for the 11 new collections introduced in Tier S-STORE.
 * Each collection includes COLLECTION constant, document interface,
 * INDEXED_FIELDS tuple, and DEFAULT_DATA partial.
 *
 * Collections covered:
 *   1. payoutMethods         — seller payout destinations (UPI/bank/card/other)
 *   2. shippingConfigs       — store shipping rules (free/flat/weight/express)
 *   3. analyticsCards        — seller-defined dashboard cards
 *   4. analyticsAlerts       — seller-defined alert thresholds
 *   5. storeCategories       — storefront-level catalogue groupings
 *   6. listingTemplates      — seller-defined listing templates
 *   7. moderationQueue       — video / media moderation queue items
 *   8. reports               — buyer-submitted reports against listings/stores
 *   9. itemRequests          — community item request bulletin board
 *  10. storeWhatsAppConfig   — per-store WhatsApp business catalogue + auto-replies
 *  11. storeGoogleConfig     — per-store Google Business reviews integration
 */

// 1. ───── payoutMethods ────────────────────────────────────────────────────

export type PayoutMethodType = "upi" | "bank" | "card" | "other";

export interface PayoutMethodDocument extends BaseDocument {
  sellerId: string;
  storeId: string;
  type: PayoutMethodType;
  label: string;
  isDefault: boolean;
  isActive: boolean;
  // UPI
  upiVpa?: string;
  // Bank
  accountNumber?: string;
  ifscCode?: string;
  accountHolderName?: string;
  bankName?: string;
  // Card / other
  details?: Record<string, string>;
}

export const PAYOUT_METHODS_COLLECTION = "payoutMethods" as const;
export const PAYOUT_METHOD_INDEXED_FIELDS = [
  "sellerId",
  "storeId",
  "type",
  "isDefault",
  "isActive",
  "createdAt",
] as const;
export const DEFAULT_PAYOUT_METHOD_DATA: Partial<PayoutMethodDocument> = {
  isDefault: false,
  isActive: true,
};

// 2. ───── shippingConfigs ──────────────────────────────────────────────────

export type ShippingMethod =
  | "free"
  | "flat"
  | "weight"
  | "express"
  | "pickup"
  | "custom";

export interface ShippingConfigDocument extends BaseDocument {
  storeId: string;
  label: string;
  method: ShippingMethod;
  isDefault: boolean;
  isActive: boolean;
  flatRateInPaise?: number;
  pricePerKgInPaise?: number;
  freeAbovePaise?: number;
  expressSurchargeInPaise?: number;
  estimatedDays?: number;
  zones?: string[];
}

export const SHIPPING_CONFIGS_COLLECTION = "shippingConfigs" as const;
export const SHIPPING_CONFIG_INDEXED_FIELDS = [
  "storeId",
  "method",
  "isDefault",
  "isActive",
  "createdAt",
] as const;
export const DEFAULT_SHIPPING_CONFIG_DATA: Partial<ShippingConfigDocument> = {
  isDefault: false,
  isActive: true,
};

// 3. ───── analyticsCards ──────────────────────────────────────────────────

export type AnalyticsScope = "seller" | "admin";
export type AnalyticsCardType =
  | "metric"
  | "line"
  | "bar"
  | "pie"
  | "table"
  | "custom";

export interface AnalyticsCardDocument extends BaseDocument {
  scope: AnalyticsScope;
  ownerId: string;
  title: string;
  type: AnalyticsCardType;
  metric: string;
  filters: FirestoreDocument;
  position: number;
  isBuiltIn: boolean;
  isVisible: boolean;
}

export const ANALYTICS_CARDS_COLLECTION = "analyticsCards" as const;
export const ANALYTICS_CARD_INDEXED_FIELDS = [
  "scope",
  "ownerId",
  "isVisible",
  "position",
  "createdAt",
] as const;
export const DEFAULT_ANALYTICS_CARD_DATA: Partial<AnalyticsCardDocument> = {
  isBuiltIn: false,
  isVisible: true,
  position: 0,
  filters: {},
};

// 4. ───── analyticsAlerts ─────────────────────────────────────────────────

export type AlertOperator = ">" | "<" | ">=" | "<=" | "==" | "!=";

export interface AnalyticsAlertDocument extends BaseDocument {
  scope: AnalyticsScope;
  ownerId: string;
  label: string;
  metric: string;
  operator: AlertOperator;
  threshold: number;
  windowHours: number;
  isActive: boolean;
  notifyChannels: Array<"in-app" | "email" | "whatsapp">;
  lastTriggeredAt?: Date;
}

export const ANALYTICS_ALERTS_COLLECTION = "analyticsAlerts" as const;
export const ANALYTICS_ALERT_INDEXED_FIELDS = [
  "scope",
  "ownerId",
  "isActive",
  "metric",
  "createdAt",
] as const;
export const DEFAULT_ANALYTICS_ALERT_DATA: Partial<AnalyticsAlertDocument> = {
  isActive: true,
  windowHours: 24,
  notifyChannels: ["in-app"],
};

// 5. ───── storeCategories ────────────────────────────────────────────────

export interface StoreCategoryDocument extends BaseDocument {
  storeId: string;
  label: string;
  slug: string;
  displayOrder: number;
  productIds: string[];
  isActive: boolean;
  description?: string;
  coverImageUrl?: string;
}

export const STORE_CATEGORIES_COLLECTION = "storeCategories" as const;
export const STORE_CATEGORY_INDEXED_FIELDS = [
  "storeId",
  "slug",
  "isActive",
  "displayOrder",
  "createdAt",
] as const;
export const DEFAULT_STORE_CATEGORY_DATA: Partial<StoreCategoryDocument> = {
  isActive: true,
  displayOrder: 0,
  productIds: [],
};

// 6. ───── listingTemplates ───────────────────────────────────────────────

export type ListingTemplateType =
  | "standard"
  | "auction"
  | "pre-order"
  | "prize-draw"
  | "bundle"
  | "classified"
  | "digital-code"
  | "live";

export interface ListingTemplateDocument extends BaseDocument {
  storeId: string;
  ownerId: string;
  name: string;
  description?: string;
  listingType: ListingTemplateType;
  /** JSON-shaped default fields applied when the template is selected. */
  defaults: FirestoreDocument;
  isShared: boolean;
  isActive: boolean;
  usageCount: number;
}

export const LISTING_TEMPLATES_COLLECTION = "listingTemplates" as const;
export const LISTING_TEMPLATE_INDEXED_FIELDS = [
  "storeId",
  "ownerId",
  "listingType",
  "isShared",
  "isActive",
  "createdAt",
] as const;
export const DEFAULT_LISTING_TEMPLATE_DATA: Partial<ListingTemplateDocument> = {
  isShared: false,
  isActive: true,
  usageCount: 0,
  defaults: {},
};

// 7. ───── moderationQueue ───────────────────────────────────────────────

export type ModerationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "auto-approved";
export type ModerationMediaType = "video" | "image" | "rich-text";

export interface ModerationQueueDocument extends BaseDocument {
  mediaType: ModerationMediaType;
  mediaUrl?: string;
  thumbnailUrl?: string;
  entityType: "product" | "review" | "event" | "blog" | "storefront";
  entityId: string;
  ownerId: string;
  storeId?: string;
  status: ModerationStatus;
  reason?: string;
  reviewerId?: string;
  reviewedAt?: Date;
  submittedAt: Date;
}

export const MODERATION_QUEUE_COLLECTION = "moderationQueue" as const;
export const MODERATION_QUEUE_INDEXED_FIELDS = [
  "status",
  "mediaType",
  "entityType",
  "entityId",
  "storeId",
  "ownerId",
  "submittedAt",
  "createdAt",
] as const;
export const DEFAULT_MODERATION_QUEUE_DATA: Partial<ModerationQueueDocument> = {
  status: "pending",
};

// 8. ───── reports ─────────────────────────────────────────────────────

export type ReportEntityType =
  | "product"
  | "store"
  | "review"
  | "event"
  | "user"
  | "blog"
  | "comment";
export type ReportStatus =
  | "pending"
  | "under-review"
  | "actioned"
  | "dismissed";
export type ReportReason =
  | "scam"
  | "counterfeit"
  | "prohibited"
  | "inappropriate"
  | "harassment"
  | "spam"
  | "ip-violation"
  | "other";

export interface ReportDocument extends BaseDocument {
  entityType: ReportEntityType;
  entityId: string;
  reporterId: string;
  reporterEmail?: string;
  reason: ReportReason;
  detail: string;
  evidenceUrls: string[];
  status: ReportStatus;
  assignedTo?: string;
  resolution?: string;
  resolvedAt?: Date;
}

export const REPORTS_COLLECTION = "reports" as const;
export const REPORT_INDEXED_FIELDS = [
  "entityType",
  "entityId",
  "reporterId",
  "reason",
  "status",
  "createdAt",
] as const;
export const DEFAULT_REPORT_DATA: Partial<ReportDocument> = {
  status: "pending",
  evidenceUrls: [],
};

// 9. ───── itemRequests ──────────────────────────────────────────────────

export type ItemRequestStatus =
  | "pending-approval"
  | "open"
  | "fulfilled"
  | "closed"
  | "rejected";

export interface ItemRequestReply {
  // audit-schema-base-ok: embedded sub-document stored inside ItemRequestDocument.replies[], not a top-level collection root
  id: string;
  authorId: string;
  authorName?: string;
  body: string;
  isOpInitiatedThread: boolean;
  createdAt: Date;
}

export interface ItemRequestDocument extends BaseDocument {
  opUserId: string;
  opDisplayName: string;
  title: string;
  description: string;
  category?: string;
  brand?: string;
  maxBudgetInPaise?: number;
  imageUrls: string[];
  status: ItemRequestStatus;
  replyCount: number;
  /** Replies kept inline up to a cap; spillover lives in a sub-collection. */
  replies: ItemRequestReply[];
  approvedAt?: Date;
  approvedBy?: string;
  closedAt?: Date;
}

export const ITEM_REQUESTS_COLLECTION = "itemRequests" as const;
export const ITEM_REQUEST_INDEXED_FIELDS = [
  "opUserId",
  "status",
  "category",
  "createdAt",
] as const;
export const DEFAULT_ITEM_REQUEST_DATA: Partial<ItemRequestDocument> = {
  status: "pending-approval",
  imageUrls: [],
  replies: [],
  replyCount: 0,
};

// 10. ───── storeWhatsAppConfig ──────────────────────────────────────────

export interface StoreWhatsAppConfigDocument extends BaseDocument {
  storeId: string;
  isConnected: boolean;
  isPaid: boolean;
  phoneNumber?: string;
  businessProfileName?: string;
  catalogUrl?: string;
  autoReply?: string;
  welcomeMessage?: string;
  /** Status of pending WhatsApp Business onboarding (Meta Cloud API). */
  onboardingStatus?: "pending" | "approved" | "rejected";
}

export const STORE_WHATSAPP_CONFIG_COLLECTION =
  "storeWhatsAppConfig" as const;
export const STORE_WHATSAPP_CONFIG_INDEXED_FIELDS = [
  "storeId",
  "isConnected",
  "isPaid",
] as const;
export const DEFAULT_STORE_WHATSAPP_CONFIG_DATA: Partial<StoreWhatsAppConfigDocument> = {
  isConnected: false,
  isPaid: false,
};

// 11. ───── storeGoogleConfig ────────────────────────────────────────────

export interface StoreGoogleConfigDocument extends BaseDocument {
  storeId: string;
  isConnected: boolean;
  placeId?: string;
  businessName?: string;
  averageRating?: number;
  totalReviews?: number;
  lastSyncedAt?: Date;
  oauthRefreshToken?: string;
}

export const STORE_GOOGLE_CONFIG_COLLECTION = "storeGoogleConfig" as const;
export const STORE_GOOGLE_CONFIG_INDEXED_FIELDS = [
  "storeId",
  "isConnected",
] as const;
export const DEFAULT_STORE_GOOGLE_CONFIG_DATA: Partial<StoreGoogleConfigDocument> = {
  isConnected: false,
};
