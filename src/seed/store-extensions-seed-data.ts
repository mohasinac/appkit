/*
 * WHY: Seeds the 11 store-extension collections for the Beyblade marketplace (2 stores).
 * WHAT: payoutMethods, shippingConfigs, analyticsCards, analyticsAlerts, storeCategories,
 *       listingTemplates, moderationQueue, reports, itemRequests, storeWhatsAppConfig, storeGoogleConfig.
 *
 * EXPORTS:
 *   payoutMethodsSeedData, shippingConfigsSeedData, analyticsCardsSeedData,
 *   analyticsAlertsSeedData, storeCategoriesSeedData, listingTemplatesSeedData,
 *   moderationQueueSeedData, reportsSeedData, itemRequestsSeedData,
 *   storeWhatsAppConfigSeedData, storeGoogleConfigSeedData
 *
 * @tag domain:store-extensions
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts
 * @tag sideEffects:none
 */

import { seedExtMedia } from "./_helpers/media";
import type {
  AnalyticsAlertDocument,
  AnalyticsCardDocument,
  ItemRequestDocument,
  ListingTemplateDocument,
  ModerationQueueDocument,
  PayoutMethodDocument,
  ReportDocument,
  ShippingConfigDocument,
  StoreCategoryDocument,
  StoreGoogleConfigDocument,
  StoreWhatsAppConfigDocument,
} from "../features/store-extensions/schemas/firestore";

const NOW = new Date();

// ───── payoutMethods (4 records) ──────────────────────────────────────────
export const payoutMethodsSeedData: Partial<PayoutMethodDocument>[] = [
  {
    id: "payout-method-beyblade-arena-upi-default",
    sellerId: "user-tyson-blader",
    storeId: "store-beyblade-arena",
    type: "upi",
    label: "Primary UPI",
    upiVpa: "beybladearena@upi",
    isDefault: true,
    isActive: true,
  },
  {
    id: "payout-method-beyblade-arena-bank",
    sellerId: "user-tyson-blader",
    storeId: "store-beyblade-arena",
    type: "bank",
    label: "HDFC Current Account",
    accountNumber: "50200012345678",
    ifscCode: "HDFC0001234",
    accountHolderName: "Beyblade Arena LLP",
    bankName: "HDFC Bank",
    isDefault: false,
    isActive: true,
  },
  {
    id: "payout-method-letitrip-official-upi",
    sellerId: "user-admin-letitrip",
    storeId: "store-letitrip-official",
    type: "upi",
    label: "LetItRip UPI",
    upiVpa: "letitrip@upi",
    isDefault: true,
    isActive: true,
  },
  {
    id: "payout-method-letitrip-official-bank",
    sellerId: "user-admin-letitrip",
    storeId: "store-letitrip-official",
    type: "bank",
    label: "SBI Current Account",
    accountNumber: "00112233445566",
    ifscCode: "SBIN0001234",
    accountHolderName: "LetItRip Admin",
    bankName: "State Bank of India",
    isDefault: false,
    isActive: true,
  },
];

// ───── shippingConfigs (4 records) ────────────────────────────────────────
export const shippingConfigsSeedData: Partial<ShippingConfigDocument>[] = [
  {
    id: "ship-config-beyblade-arena-free",
    storeId: "store-beyblade-arena",
    label: "Free over ₹599",
    method: "free",
    freeAbove: 599,
    estimatedDays: 5,
    isDefault: true,
    isActive: true,
  },
  {
    id: "ship-config-beyblade-arena-express",
    storeId: "store-beyblade-arena",
    label: "Express (2 days)",
    method: "express",
    flatRate: 149,
    expressSurcharge: 79,
    estimatedDays: 2,
    isDefault: false,
    isActive: true,
  },
  {
    id: "ship-config-letitrip-free-999",
    storeId: "store-letitrip-official",
    label: "Free over ₹999",
    method: "free",
    freeAbove: 999,
    estimatedDays: 5,
    isDefault: true,
    isActive: true,
  },
  {
    id: "ship-config-letitrip-flat",
    storeId: "store-letitrip-official",
    label: "Flat ₹99",
    method: "flat",
    flatRate: 99,
    estimatedDays: 4,
    isDefault: false,
    isActive: true,
  },
];

// ───── analyticsCards (9 records) ─────────────────────────────────────────
export const analyticsCardsSeedData: Partial<AnalyticsCardDocument>[] = [
  { id: "ac-seller-revenue-30d", scope: "seller", ownerId: "user-tyson-blader", title: "Revenue · 30d", type: "metric", metric: "revenue:30d", filters: {}, position: 0, isBuiltIn: true, isVisible: true },
  { id: "ac-seller-orders-30d", scope: "seller", ownerId: "user-tyson-blader", title: "Orders · 30d", type: "metric", metric: "orders:30d", filters: {}, position: 1, isBuiltIn: true, isVisible: true },
  { id: "ac-seller-aov", scope: "seller", ownerId: "user-tyson-blader", title: "Avg Order Value", type: "metric", metric: "aov:30d", filters: {}, position: 2, isBuiltIn: true, isVisible: true },
  { id: "ac-seller-traffic", scope: "seller", ownerId: "user-tyson-blader", title: "Storefront Traffic", type: "line", metric: "store-views:30d", filters: {}, position: 3, isBuiltIn: true, isVisible: true },
  { id: "ac-seller-top-products", scope: "seller", ownerId: "user-tyson-blader", title: "Top Products", type: "table", metric: "top-products:30d", filters: {}, position: 4, isBuiltIn: true, isVisible: true },
  { id: "ac-admin-platform-gmv", scope: "admin", ownerId: "user-admin-letitrip", title: "Platform GMV", type: "metric", metric: "platform-gmv:30d", filters: {}, position: 0, isBuiltIn: true, isVisible: true },
  { id: "ac-admin-active-stores", scope: "admin", ownerId: "user-admin-letitrip", title: "Active Stores", type: "metric", metric: "active-stores", filters: {}, position: 1, isBuiltIn: true, isVisible: true },
  { id: "ac-admin-pending-mod", scope: "admin", ownerId: "user-admin-letitrip", title: "Pending Moderation", type: "metric", metric: "moderation-pending", filters: {}, position: 2, isBuiltIn: true, isVisible: true },
  { id: "ac-admin-open-reports", scope: "admin", ownerId: "user-admin-letitrip", title: "Open Reports", type: "metric", metric: "reports-open", filters: {}, position: 3, isBuiltIn: true, isVisible: true },
];

// ───── analyticsAlerts (4 records) ────────────────────────────────────────
export const analyticsAlertsSeedData: Partial<AnalyticsAlertDocument>[] = [
  { id: "alert-low-stock-arena", scope: "seller", ownerId: "user-tyson-blader", label: "Low stock", metric: "min-stock", operator: "<", threshold: 5, windowHours: 24, isActive: true, notifyChannels: ["in-app", "email"] },
  { id: "alert-no-sales-arena", scope: "seller", ownerId: "user-tyson-blader", label: "Zero sales 48h", metric: "orders-window", operator: "==", threshold: 0, windowHours: 48, isActive: true, notifyChannels: ["in-app"] },
  { id: "alert-platform-error-rate", scope: "admin", ownerId: "user-admin-letitrip", label: "API error rate > 5%", metric: "api-error-rate", operator: ">", threshold: 0.05, windowHours: 1, isActive: true, notifyChannels: ["in-app", "email", "whatsapp"] },
  { id: "alert-fraud-surge", scope: "admin", ownerId: "user-admin-letitrip", label: "Fraud reports surge", metric: "reports-1h", operator: ">", threshold: 10, windowHours: 1, isActive: true, notifyChannels: ["in-app", "email"] },
];

// ───── storeCategories (4 records) ────────────────────────────────────────
export const storeCategoriesSeedData: Partial<StoreCategoryDocument>[] = [
  { id: "scat-arena-original-series", storeId: "store-beyblade-arena", label: "Original Series", slug: "original-series", displayOrder: 0, productIds: [], isActive: true, description: "Original 1999-2003 series beyblades.", coverImageUrl: seedExtMedia("https://picsum.photos/seed/storecat-original-series-20260101/600/400") },
  { id: "scat-arena-metal-fight", storeId: "store-beyblade-arena", label: "Metal Fight", slug: "metal-fight", displayOrder: 1, productIds: [], isActive: true, description: "Metal Fight / Metal Fusion era beyblades.", coverImageUrl: seedExtMedia("https://picsum.photos/seed/storecat-metal-fight-20260101/600/400") },
  { id: "scat-letitrip-sealed", storeId: "store-letitrip-official", label: "Sealed Products", slug: "sealed-products", displayOrder: 0, productIds: [], isActive: true, description: "Factory-sealed launcher sets, stadiums, and starter boxes.", coverImageUrl: seedExtMedia("https://picsum.photos/seed/storecat-sealed-products-20260101/600/400") },
  { id: "scat-letitrip-accessories", storeId: "store-letitrip-official", label: "Accessories", slug: "accessories", displayOrder: 1, productIds: [], isActive: true, description: "Launchers, grip tape, ripcords, and carry cases.", coverImageUrl: seedExtMedia("https://picsum.photos/seed/storecat-accessories-20260101/600/400") },
];

// ───── listingTemplates (4 records) ───────────────────────────────────────
export const listingTemplatesSeedData: Partial<ListingTemplateDocument>[] = [
  {
    id: "tmpl-standard-beyblade",
    storeId: "store-beyblade-arena",
    ownerId: "user-tyson-blader",
    name: "Beyblade · Standard",
    description: "Default fields for a standard beyblade listing.",
    listingType: "standard",
    defaults: { condition: "mint", currency: "INR", tags: ["beyblade", "spinning-tops"] },
    isShared: true,
    isActive: true,
    usageCount: 14,
  },
  {
    id: "tmpl-auction-vintage-beyblade",
    storeId: "store-beyblade-arena",
    ownerId: "user-tyson-blader",
    name: "Vintage Beyblade Auction",
    listingType: "auction",
    defaults: { reserveMultiplier: 1.2, auctionDays: 7, currency: "INR" },
    isShared: false,
    isActive: true,
    usageCount: 5,
  },
  {
    id: "tmpl-preorder-takara-tomy",
    storeId: "store-letitrip-official",
    ownerId: "user-admin-letitrip",
    name: "Takara-Tomy Pre-Order",
    listingType: "pre-order",
    defaults: { releaseLeadDays: 90, depositPercent: 30 },
    isShared: false,
    isActive: true,
    usageCount: 9,
  },
  {
    id: "tmpl-bundle-beyblade-set",
    storeId: "store-beyblade-arena",
    ownerId: "user-tyson-blader",
    name: "Beyblade Set Bundle",
    listingType: "bundle",
    defaults: { minItems: 3, maxItems: 10, autoDiscountPercent: 12 },
    isShared: true,
    isActive: true,
    usageCount: 2,
  },
];

// ───── moderationQueue (6 records) ────────────────────────────────────────
export const moderationQueueSeedData: Partial<ModerationQueueDocument>[] = [
  { id: "mod-video-dragoon-auction", mediaType: "video", mediaUrl: "/media/product-video-dragoon-storm-20260518.mp4", entityType: "product", entityId: "auction-beyblade-original-dragoon-storm", ownerId: "user-tyson-blader", storeId: "store-beyblade-arena", status: "pending", submittedAt: new Date(NOW.getTime() - 3600_000) },
  { id: "mod-video-dranzer-unbox", mediaType: "video", mediaUrl: "/media/product-video-original-dranzer-s-20260518.mp4", entityType: "product", entityId: "product-beyblade-original-dranzer-s", ownerId: "user-tyson-blader", storeId: "store-beyblade-arena", status: "pending", submittedAt: new Date(NOW.getTime() - 7200_000) },
  { id: "mod-review-driger-v", mediaType: "rich-text", entityType: "review", entityId: "review-8", ownerId: "user-yugi-muto", status: "approved", reviewerId: "user-admin-letitrip", reviewedAt: new Date(NOW.getTime() - 86400_000), submittedAt: new Date(NOW.getTime() - 90000_000) },
  { id: "mod-image-arena-banner", mediaType: "image", mediaUrl: seedExtMedia("https://picsum.photos/seed/store-banner-beyblade-arena-20260518/1600/400"), entityType: "storefront", entityId: "store-beyblade-arena", ownerId: "user-tyson-blader", storeId: "store-beyblade-arena", status: "auto-approved", submittedAt: new Date(NOW.getTime() - 172800_000) },
  { id: "mod-blog-authentication-guide", mediaType: "rich-text", entityType: "blog", entityId: "blog-spot-genuine-takara-tomy-beyblade", ownerId: "user-admin-letitrip", status: "approved", reviewerId: "user-admin-letitrip", reviewedAt: new Date(NOW.getTime() - 432000_000), submittedAt: new Date(NOW.getTime() - 438000_000) },
  { id: "mod-event-cover-tournament", mediaType: "image", mediaUrl: seedExtMedia("https://picsum.photos/seed/event-cover-beyblade-tournament-20260518/1200/600"), entityType: "event", entityId: "event-favourite-blader-poll", ownerId: "user-admin-letitrip", status: "approved", reviewerId: "user-admin-letitrip", reviewedAt: new Date(NOW.getTime() - 86400_000), submittedAt: new Date(NOW.getTime() - 90000_000) },
];

// ───── reports (5 records) ────────────────────────────────────────────────
export const reportsSeedData: Partial<ReportDocument>[] = [
  { id: "report-counterfeit-l-drago", entityType: "product", entityId: "product-suspect-l-drago", reporterId: "user-yugi-muto", reason: "counterfeit", detail: "Weight feels hollow; laser-etched logo missing on the underside.", evidenceUrls: [], status: "pending" },
  { id: "report-scam-store-fly-by-night", entityType: "store", entityId: "store-suspect-fly-by-night", reporterId: "user-seto-kaiba", reason: "scam", detail: "Reports of orders not shipped after 4 weeks.", evidenceUrls: [], status: "under-review", assignedTo: "user-admin-letitrip" },
  { id: "report-spam-review-beyblade", entityType: "review", entityId: "review-spammy", reporterId: "user-yugi-muto", reason: "spam", detail: "Promotional link in review.", evidenceUrls: [], status: "actioned", resolution: "Review hidden.", resolvedAt: new Date(NOW.getTime() - 86400_000) },
  { id: "report-prohibited-replica-listing", entityType: "product", entityId: "product-suspect-replica-driver", reporterId: "user-admin-letitrip", reason: "prohibited", detail: "Fake authenticity certificate with forged serial number.", evidenceUrls: [], status: "pending" },
  { id: "report-ip-violation-fan-art-print", entityType: "product", entityId: "product-bootleg-beyblade-print", reporterId: "user-seto-kaiba", reason: "ip-violation", detail: "Unauthorised Beyblade art prints — not licensed by Takara-Tomy.", evidenceUrls: [], status: "under-review", assignedTo: "user-admin-letitrip" },
];

// ───── itemRequests (4 records) ───────────────────────────────────────────
export const itemRequestsSeedData: Partial<ItemRequestDocument>[] = [
  {
    id: "irq-l-drago-sealed",
    opUserId: "user-yugi-muto",
    opDisplayName: "Rehan Sheikh",
    title: "Looking for sealed Metal Lightning L-Drago",
    description: "Hunting a sealed Metal Lightning L-Drago, tournament-grade tip. Budget ₹8,000.",
    category: "spinning-tops",
    brand: "takara-tomy",
    maxBudget: 8000,
    imageUrls: [seedExtMedia("https://picsum.photos/seed/irq-l-drago-sealed-20260101/600/600")],
    status: "open",
    replyCount: 2,
    replies: [],
    approvedAt: new Date(NOW.getTime() - 86400_000),
    approvedBy: "user-admin-letitrip",
  },
  {
    id: "irq-original-complete-set",
    opUserId: "user-yugi-muto",
    opDisplayName: "Rehan Sheikh",
    title: "Complete Original Series Set — Sealed",
    description: "Need all 5 original starter beyblades in sealed condition. Willing to pay premium for a matching set.",
    category: "spinning-tops",
    brand: "takara-tomy",
    maxBudget: 15000,
    imageUrls: [seedExtMedia("https://picsum.photos/seed/irq-original-set-20260101/600/600")],
    status: "open",
    replyCount: 0,
    replies: [],
    approvedAt: new Date(NOW.getTime() - 43200_000),
    approvedBy: "user-admin-letitrip",
  },
  {
    id: "irq-x-bx08-sealed",
    opUserId: "user-admin-letitrip",
    opDisplayName: "LetItRip Admin",
    title: "Beyblade X BX-08 Wave — any launcher combo",
    description: "Sealed only. For platform demo.",
    category: "spinning-tops",
    brand: "takara-tomy",
    maxBudget: 1500,
    imageUrls: [seedExtMedia("https://picsum.photos/seed/irq-x-bx08-20260101/600/600")],
    status: "fulfilled",
    replyCount: 4,
    replies: [],
    approvedAt: new Date(NOW.getTime() - 7 * 86400_000),
    approvedBy: "user-admin-letitrip",
    closedAt: new Date(NOW.getTime() - 2 * 86400_000),
  },
  {
    id: "irq-rejected-replica-driver",
    opUserId: "user-yugi-muto",
    opDisplayName: "Rehan Sheikh",
    title: "Looking for cheap metal drivers",
    description: "Cheapest possible metal drivers, any condition.",
    category: "spinning-tops",
    imageUrls: [],
    status: "rejected",
    replyCount: 0,
    replies: [],
  },
];

// ───── storeWhatsAppConfig (2 records) ────────────────────────────────────
export const storeWhatsAppConfigSeedData: Partial<StoreWhatsAppConfigDocument>[] = [
  {
    id: "whatsapp-beyblade-arena",
    storeId: "store-beyblade-arena",
    isConnected: true,
    isPaid: true,
    phoneNumber: "+919876501001",
    businessProfileName: "Beyblade Arena",
    catalogUrl: "https://wa.me/c/919876501001",
    autoReply: "Hi! Thanks for messaging Beyblade Arena. We respond within 2 hours.",
    welcomeMessage: "Welcome to Beyblade Arena! Browse our full catalog above.",
    onboardingStatus: "approved",
  },
  {
    id: "whatsapp-letitrip-official",
    storeId: "store-letitrip-official",
    isConnected: false,
    isPaid: false,
    onboardingStatus: "pending",
  },
];

// ───── storeGoogleConfig (2 records) ──────────────────────────────────────
export const storeGoogleConfigSeedData: Partial<StoreGoogleConfigDocument>[] = [
  {
    id: "google-beyblade-arena",
    storeId: "store-beyblade-arena",
    isConnected: true,
    placeId: "ChIJbeybladearena12345",
    businessName: "Beyblade Arena",
    averageRating: 4.8,
    totalReviews: 89,
    lastSyncedAt: new Date(NOW.getTime() - 3600_000),
  },
  {
    id: "google-letitrip-official",
    storeId: "store-letitrip-official",
    isConnected: false,
  },
];
