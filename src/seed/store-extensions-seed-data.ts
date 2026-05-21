/*
 * WHY: Seeds the 11 store-extension collections for YGO marketplace (2 stores).
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
 * @tag consumers:seed/index.ts,seed/runner.ts,SeedPanel
 * @tag sideEffects:none
 */

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
    id: "payout-method-kaiba-corp-upi-default",
    sellerId: "user-seto-kaiba",
    storeId: "store-kaiba-corp-cards",
    type: "upi",
    label: "Primary UPI",
    upiVpa: "kaibacorp@upi",
    isDefault: true,
    isActive: true,
  },
  {
    id: "payout-method-kaiba-corp-bank",
    sellerId: "user-seto-kaiba",
    storeId: "store-kaiba-corp-cards",
    type: "bank",
    label: "HDFC Current Account",
    accountNumber: "50200012345678",
    ifscCode: "HDFC0001234",
    accountHolderName: "Kaiba Corp Card Vault LLP",
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
    id: "ship-config-kaiba-corp-free",
    storeId: "store-kaiba-corp-cards",
    label: "Free over ₹999",
    method: "free",
    freeAbovePaise: 99900,
    estimatedDays: 5,
    isDefault: true,
    isActive: true,
  },
  {
    id: "ship-config-kaiba-corp-express",
    storeId: "store-kaiba-corp-cards",
    label: "Express (2 days)",
    method: "express",
    flatRateInPaise: 19900,
    expressSurchargeInPaise: 9900,
    estimatedDays: 2,
    isDefault: false,
    isActive: true,
  },
  {
    id: "ship-config-letitrip-free-999",
    storeId: "store-letitrip-official",
    label: "Free over ₹999",
    method: "free",
    freeAbovePaise: 99900,
    estimatedDays: 5,
    isDefault: true,
    isActive: true,
  },
  {
    id: "ship-config-letitrip-flat",
    storeId: "store-letitrip-official",
    label: "Flat ₹99",
    method: "flat",
    flatRateInPaise: 9900,
    estimatedDays: 4,
    isDefault: false,
    isActive: true,
  },
];

// ───── analyticsCards (9 records) ─────────────────────────────────────────
export const analyticsCardsSeedData: Partial<AnalyticsCardDocument>[] = [
  { id: "ac-seller-revenue-30d", scope: "seller", ownerId: "user-seto-kaiba", title: "Revenue · 30d", type: "metric", metric: "revenue:30d", filters: {}, position: 0, isBuiltIn: true, isVisible: true },
  { id: "ac-seller-orders-30d", scope: "seller", ownerId: "user-seto-kaiba", title: "Orders · 30d", type: "metric", metric: "orders:30d", filters: {}, position: 1, isBuiltIn: true, isVisible: true },
  { id: "ac-seller-aov", scope: "seller", ownerId: "user-seto-kaiba", title: "Avg Order Value", type: "metric", metric: "aov:30d", filters: {}, position: 2, isBuiltIn: true, isVisible: true },
  { id: "ac-seller-traffic", scope: "seller", ownerId: "user-seto-kaiba", title: "Storefront Traffic", type: "line", metric: "store-views:30d", filters: {}, position: 3, isBuiltIn: true, isVisible: true },
  { id: "ac-seller-top-products", scope: "seller", ownerId: "user-seto-kaiba", title: "Top Products", type: "table", metric: "top-products:30d", filters: {}, position: 4, isBuiltIn: true, isVisible: true },
  { id: "ac-admin-platform-gmv", scope: "admin", ownerId: "user-admin-letitrip", title: "Platform GMV", type: "metric", metric: "platform-gmv:30d", filters: {}, position: 0, isBuiltIn: true, isVisible: true },
  { id: "ac-admin-active-stores", scope: "admin", ownerId: "user-admin-letitrip", title: "Active Stores", type: "metric", metric: "active-stores", filters: {}, position: 1, isBuiltIn: true, isVisible: true },
  { id: "ac-admin-pending-mod", scope: "admin", ownerId: "user-admin-letitrip", title: "Pending Moderation", type: "metric", metric: "moderation-pending", filters: {}, position: 2, isBuiltIn: true, isVisible: true },
  { id: "ac-admin-open-reports", scope: "admin", ownerId: "user-admin-letitrip", title: "Open Reports", type: "metric", metric: "reports-open", filters: {}, position: 3, isBuiltIn: true, isVisible: true },
];

// ───── analyticsAlerts (4 records) ────────────────────────────────────────
export const analyticsAlertsSeedData: Partial<AnalyticsAlertDocument>[] = [
  { id: "alert-low-stock-kaiba", scope: "seller", ownerId: "user-seto-kaiba", label: "Low stock", metric: "min-stock", operator: "<", threshold: 5, windowHours: 24, isActive: true, notifyChannels: ["in-app", "email"] },
  { id: "alert-no-sales-kaiba", scope: "seller", ownerId: "user-seto-kaiba", label: "Zero sales 48h", metric: "orders-window", operator: "==", threshold: 0, windowHours: 48, isActive: true, notifyChannels: ["in-app"] },
  { id: "alert-platform-error-rate", scope: "admin", ownerId: "user-admin-letitrip", label: "API error rate > 5%", metric: "api-error-rate", operator: ">", threshold: 0.05, windowHours: 1, isActive: true, notifyChannels: ["in-app", "email", "whatsapp"] },
  { id: "alert-fraud-surge", scope: "admin", ownerId: "user-admin-letitrip", label: "Fraud reports surge", metric: "reports-1h", operator: ">", threshold: 10, windowHours: 1, isActive: true, notifyChannels: ["in-app", "email"] },
];

// ───── storeCategories (4 records) ────────────────────────────────────────
export const storeCategoriesSeedData: Partial<StoreCategoryDocument>[] = [
  { id: "scat-kaiba-lob-singles", storeId: "store-kaiba-corp-cards", label: "LOB Singles", slug: "lob-singles", displayOrder: 0, productIds: [], isActive: true, description: "Legend of Blue Eyes White Dragon singles.", coverImageUrl: "https://images.ygoprodeck.com/images/cards/cropped/89631139.jpg" },
  { id: "scat-kaiba-graded-slabs", storeId: "store-kaiba-corp-cards", label: "Graded Slabs", slug: "graded-slabs", displayOrder: 1, productIds: [], isActive: true, description: "PSA, BGS, and CGC graded Yu-Gi-Oh! slabs.", coverImageUrl: "https://images.ygoprodeck.com/images/cards/cropped/46986414.jpg" },
  { id: "scat-letitrip-sealed", storeId: "store-letitrip-official", label: "Sealed Products", slug: "sealed-products", displayOrder: 0, productIds: [], isActive: true, description: "Factory-sealed booster boxes, tins, and structure decks.", coverImageUrl: "https://images.ygoprodeck.com/images/cards/cropped/33396948.jpg" },
  { id: "scat-letitrip-accessories", storeId: "store-letitrip-official", label: "Accessories", slug: "accessories", displayOrder: 1, productIds: [], isActive: true, description: "Deck boxes, sleeves, playmats, and binders.", coverImageUrl: "https://images.ygoprodeck.com/images/cards/cropped/38033121.jpg" },
];

// ───── listingTemplates (4 records) ───────────────────────────────────────
export const listingTemplatesSeedData: Partial<ListingTemplateDocument>[] = [
  {
    id: "tmpl-standard-ygo-card",
    storeId: "store-kaiba-corp-cards",
    ownerId: "user-seto-kaiba",
    name: "YGO Card · Standard",
    description: "Default fields for a graded Yu-Gi-Oh! card listing.",
    listingType: "standard",
    defaults: { condition: "mint", currency: "INR", tags: ["yugioh", "tcg"] },
    isShared: true,
    isActive: true,
    usageCount: 14,
  },
  {
    id: "tmpl-auction-vintage-ygo",
    storeId: "store-kaiba-corp-cards",
    ownerId: "user-seto-kaiba",
    name: "Vintage YGO Auction",
    listingType: "auction",
    defaults: { reserveMultiplier: 1.2, auctionDays: 7, currency: "INR" },
    isShared: false,
    isActive: true,
    usageCount: 5,
  },
  {
    id: "tmpl-preorder-konami",
    storeId: "store-letitrip-official",
    ownerId: "user-admin-letitrip",
    name: "Konami Pre-Order",
    listingType: "pre-order",
    defaults: { releaseLeadDays: 90, depositPercent: 30 },
    isShared: false,
    isActive: true,
    usageCount: 9,
  },
  {
    id: "tmpl-bundle-ygo-set",
    storeId: "store-kaiba-corp-cards",
    ownerId: "user-seto-kaiba",
    name: "YGO Set Bundle",
    listingType: "bundle",
    defaults: { minItems: 3, maxItems: 10, autoDiscountPercent: 12 },
    isShared: true,
    isActive: true,
    usageCount: 2,
  },
];

// ───── moderationQueue (6 records) ────────────────────────────────────────
export const moderationQueueSeedData: Partial<ModerationQueueDocument>[] = [
  { id: "mod-video-blue-eyes-auction", mediaType: "video", mediaUrl: "/media/product-video-blue-eyes-lob-psa10-20260518.mp4", entityType: "product", entityId: "auction-blue-eyes-lob-1st-psa10", ownerId: "user-seto-kaiba", storeId: "store-kaiba-corp-cards", status: "pending", submittedAt: new Date(NOW.getTime() - 3600_000) },
  { id: "mod-video-dark-magician-unbox", mediaType: "video", mediaUrl: "/media/product-video-dark-magician-lob-20260518.mp4", entityType: "product", entityId: "product-dark-magician-lob-nm", ownerId: "user-seto-kaiba", storeId: "store-kaiba-corp-cards", status: "pending", submittedAt: new Date(NOW.getTime() - 7200_000) },
  { id: "mod-review-exodia", mediaType: "rich-text", entityType: "review", entityId: "review-exodia-head-yugi-20260510", ownerId: "user-yugi-muto", status: "approved", reviewerId: "user-admin-letitrip", reviewedAt: new Date(NOW.getTime() - 86400_000), submittedAt: new Date(NOW.getTime() - 90000_000) },
  { id: "mod-image-kaiba-banner", mediaType: "image", mediaUrl: "/media/store-banner-kaiba-corp-cards-20260518.jpg", entityType: "storefront", entityId: "store-kaiba-corp-cards", ownerId: "user-seto-kaiba", storeId: "store-kaiba-corp-cards", status: "auto-approved", submittedAt: new Date(NOW.getTime() - 172800_000) },
  { id: "mod-blog-grading-guide", mediaType: "rich-text", entityType: "blog", entityId: "blog-how-to-grade-yugioh-cards", ownerId: "user-admin-letitrip", status: "approved", reviewerId: "user-admin-letitrip", reviewedAt: new Date(NOW.getTime() - 432000_000), submittedAt: new Date(NOW.getTime() - 438000_000) },
  { id: "mod-event-cover-tournament", mediaType: "image", mediaUrl: "/media/event-cover-ygo-duel-championship-20260518.jpg", entityType: "event", entityId: "event-ygo-duel-championship-june-2026", ownerId: "user-admin-letitrip", status: "approved", reviewerId: "user-admin-letitrip", reviewedAt: new Date(NOW.getTime() - 86400_000), submittedAt: new Date(NOW.getTime() - 90000_000) },
];

// ───── reports (5 records) ────────────────────────────────────────────────
export const reportsSeedData: Partial<ReportDocument>[] = [
  { id: "report-counterfeit-blue-eyes", entityType: "product", entityId: "product-suspect-blue-eyes", reporterId: "user-yugi-muto", reason: "counterfeit", detail: "Card edges look reprinted; eye of Anubis hologram missing.", evidenceUrls: [], status: "pending" },
  { id: "report-scam-store-fly-by-night", entityType: "store", entityId: "store-suspect-fly-by-night", reporterId: "user-seto-kaiba", reason: "scam", detail: "Reports of orders not shipped after 4 weeks.", evidenceUrls: [], status: "under-review", assignedTo: "user-admin-letitrip" },
  { id: "report-spam-review-ygo", entityType: "review", entityId: "review-ygo-spammy", reporterId: "user-yugi-muto", reason: "spam", detail: "Promotional link in review.", evidenceUrls: [], status: "actioned", resolution: "Review hidden.", resolvedAt: new Date(NOW.getTime() - 86400_000) },
  { id: "report-prohibited-replica-listing", entityType: "product", entityId: "product-suspect-replica-slab", reporterId: "user-admin-letitrip", reason: "prohibited", detail: "Fake PSA slab with forged cert number.", evidenceUrls: [], status: "pending" },
  { id: "report-ip-violation-fan-art-print", entityType: "product", entityId: "product-bootleg-ygo-print", reporterId: "user-seto-kaiba", reason: "ip-violation", detail: "Unauthorised Yu-Gi-Oh! art prints — not licensed by Konami.", evidenceUrls: [], status: "under-review", assignedTo: "user-admin-letitrip" },
];

// ───── itemRequests (4 records) ───────────────────────────────────────────
export const itemRequestsSeedData: Partial<ItemRequestDocument>[] = [
  {
    id: "irq-blue-eyes-1st-ed-psa8",
    opUserId: "user-yugi-muto",
    opDisplayName: "Yugi Muto",
    title: "Looking for Blue-Eyes White Dragon LOB 1st Ed PSA 8+",
    description: "Hunting a LOB 1st Edition Blue-Eyes, grade 8 or above. Budget ₹2,50,000.",
    category: "trading-cards",
    brand: "konami",
    maxBudgetInPaise: 25000000,
    imageUrls: ["https://images.ygoprodeck.com/images/cards/cropped/89631139.jpg"],
    status: "open",
    replyCount: 2,
    replies: [],
    approvedAt: new Date(NOW.getTime() - 86400_000),
    approvedBy: "user-admin-letitrip",
  },
  {
    id: "irq-exodia-complete-set",
    opUserId: "user-yugi-muto",
    opDisplayName: "Yugi Muto",
    title: "Complete Exodia Set — LOB 1st Edition",
    description: "Need all 5 pieces in NM+ condition. Willing to pay premium for matching set.",
    category: "trading-cards",
    brand: "konami",
    maxBudgetInPaise: 15000000,
    imageUrls: ["https://images.ygoprodeck.com/images/cards/cropped/33396948.jpg"],
    status: "open",
    replyCount: 0,
    replies: [],
    approvedAt: new Date(NOW.getTime() - 43200_000),
    approvedBy: "user-admin-letitrip",
  },
  {
    id: "irq-lob-sealed-booster",
    opUserId: "user-admin-letitrip",
    opDisplayName: "LetItRip Admin",
    title: "LOB Sealed Booster Pack — any printing",
    description: "Sealed only. 1st Ed or Unlimited OK. For platform demo.",
    category: "trading-cards",
    brand: "konami",
    maxBudgetInPaise: 1500000,
    imageUrls: ["https://images.ygoprodeck.com/images/cards/cropped/46986414.jpg"],
    status: "fulfilled",
    replyCount: 4,
    replies: [],
    approvedAt: new Date(NOW.getTime() - 7 * 86400_000),
    approvedBy: "user-admin-letitrip",
    closedAt: new Date(NOW.getTime() - 2 * 86400_000),
  },
  {
    id: "irq-rejected-replica-slab",
    opUserId: "user-yugi-muto",
    opDisplayName: "Yugi Muto",
    title: "Looking for cheap PSA slabs",
    description: "Cheapest possible graded cards, any condition.",
    category: "trading-cards",
    imageUrls: [],
    status: "rejected",
    replyCount: 0,
    replies: [],
  },
];

// ───── storeWhatsAppConfig (2 records) ────────────────────────────────────
export const storeWhatsAppConfigSeedData: Partial<StoreWhatsAppConfigDocument>[] = [
  {
    id: "whatsapp-kaiba-corp",
    storeId: "store-kaiba-corp-cards",
    isConnected: true,
    isPaid: true,
    phoneNumber: "+919876501001",
    businessProfileName: "Kaiba Corp Card Vault",
    catalogUrl: "https://wa.me/c/919876501001",
    autoReply: "Hi! Thanks for messaging Kaiba Corp Card Vault. We respond within 2 hours.",
    welcomeMessage: "Welcome to Kaiba Corp Card Vault! Browse our YGO catalog above.",
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
    id: "google-kaiba-corp",
    storeId: "store-kaiba-corp-cards",
    isConnected: true,
    placeId: "ChIJkaibacorpcards12345",
    businessName: "Kaiba Corp Card Vault",
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
