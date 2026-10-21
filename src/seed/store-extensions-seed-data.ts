/*
 * WHY: Seeds the 11 store-extension collections for the Beyblade marketplace (2 stores).
 * WHAT: payoutMethods, shippingConfigs, analyticsCards, analyticsAlerts, storeCategories,
 *       listingTemplates, moderationQueue, reports, itemRequests, storeGoogleConfig.
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
} from "../features/store-extensions/schemas/firestore";

const NOW = new Date();

// ───── payoutMethods (4 records) ──────────────────────────────────────────
export const payoutMethodsSeedData: Partial<PayoutMethodDocument>[] = [];

// ───── shippingConfigs (4 records) ────────────────────────────────────────
export const shippingConfigsSeedData: Partial<ShippingConfigDocument>[] = [{
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
export const analyticsCardsSeedData: Partial<AnalyticsCardDocument>[] = [{ id: "ac-admin-platform-gmv", scope: "admin", ownerId: "user-admin-letitrip", title: "Platform GMV", type: "metric", metric: "platform-gmv:30d", filters: {}, position: 0, isBuiltIn: true, isVisible: true },
  { id: "ac-admin-active-stores", scope: "admin", ownerId: "user-admin-letitrip", title: "Active Stores", type: "metric", metric: "active-stores", filters: {}, position: 1, isBuiltIn: true, isVisible: true },
  { id: "ac-admin-pending-mod", scope: "admin", ownerId: "user-admin-letitrip", title: "Pending Moderation", type: "metric", metric: "moderation-pending", filters: {}, position: 2, isBuiltIn: true, isVisible: true },
  { id: "ac-admin-open-reports", scope: "admin", ownerId: "user-admin-letitrip", title: "Open Reports", type: "metric", metric: "reports-open", filters: {}, position: 3, isBuiltIn: true, isVisible: true },
];

// ───── analyticsAlerts (4 records) ────────────────────────────────────────
export const analyticsAlertsSeedData: Partial<AnalyticsAlertDocument>[] = [];

// ───── storeCategories (4 records) ────────────────────────────────────────
export const storeCategoriesSeedData: Partial<StoreCategoryDocument>[] = [];

// ───── listingTemplates (4 records) ───────────────────────────────────────
export const listingTemplatesSeedData: Partial<ListingTemplateDocument>[] = [];

// ───── moderationQueue (6 records) ────────────────────────────────────────
export const moderationQueueSeedData: Partial<ModerationQueueDocument>[] = [// Removed 2026-10-21: referenced event-favourite-blader-poll, one of the 11
  // demo events deleted when the seed was pruned to match live (Root Cause #26).
];

// ───── reports (5 records) ────────────────────────────────────────────────
export const reportsSeedData: Partial<ReportDocument>[] = [];

// ───── itemRequests (4 records) ───────────────────────────────────────────
export const itemRequestsSeedData: Partial<ItemRequestDocument>[] = [];

// ───── storeGoogleConfig (2 records) ──────────────────────────────────────
export const storeGoogleConfigSeedData: Partial<StoreGoogleConfigDocument>[] = [];
