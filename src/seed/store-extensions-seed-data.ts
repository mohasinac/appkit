/*
 * WHY: Seeds the store-extension collections, pruned to what production holds.
 * WHAT: shippingConfigs (2) and analyticsCards (4) carry live rows. The other
 *       eight arrays are EMPTY — payoutMethods, analyticsAlerts, storeCategories,
 *       listingTemplates, moderationQueue, reports, itemRequests,
 *       storeGoogleConfig all report 0 documents in production.
 *
 * 🛑 PRUNED TO MATCH LIVE, 2026-10-21. 32 demo rows removed. `appkit-seed load`
 * has NO production guard and `.env.local` points at the live project, so each
 * of those rows — including fake reports and fake moderation entries — was one
 * command away from appearing on the live site.
 *
 * 🛑 The arrays are kept and EMPTIED rather than deleted: ten collections share
 * this one file, `seed/index.ts` and `seed-cli` import every export by name, and
 * an empty array is honest where a removed one is a build error.
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

// ───── payoutMethods (empty — production has none) ──────────────────────────────────────────
export const payoutMethodsSeedData: Partial<PayoutMethodDocument>[] = [];

// ───── shippingConfigs (2 records, matching live) ────────────────────────────────────────
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

// ───── analyticsCards (4 records, matching live) ─────────────────────────────────────────
export const analyticsCardsSeedData: Partial<AnalyticsCardDocument>[] = [{ id: "ac-admin-platform-gmv", scope: "admin", ownerId: "user-admin-letitrip", title: "Platform GMV", type: "metric", metric: "platform-gmv:30d", filters: {}, position: 0, isBuiltIn: true, isVisible: true },
  { id: "ac-admin-active-stores", scope: "admin", ownerId: "user-admin-letitrip", title: "Active Stores", type: "metric", metric: "active-stores", filters: {}, position: 1, isBuiltIn: true, isVisible: true },
  { id: "ac-admin-pending-mod", scope: "admin", ownerId: "user-admin-letitrip", title: "Pending Moderation", type: "metric", metric: "moderation-pending", filters: {}, position: 2, isBuiltIn: true, isVisible: true },
  { id: "ac-admin-open-reports", scope: "admin", ownerId: "user-admin-letitrip", title: "Open Reports", type: "metric", metric: "reports-open", filters: {}, position: 3, isBuiltIn: true, isVisible: true },
];

// ───── analyticsAlerts (empty — production has none) ────────────────────────────────────────
export const analyticsAlertsSeedData: Partial<AnalyticsAlertDocument>[] = [];

// ───── storeCategories (empty — production has none) ────────────────────────────────────────
export const storeCategoriesSeedData: Partial<StoreCategoryDocument>[] = [];

// ───── listingTemplates (empty — production has none) ───────────────────────────────────────
export const listingTemplatesSeedData: Partial<ListingTemplateDocument>[] = [];

// ───── moderationQueue (empty — production has none) ────────────────────────────────────────
export const moderationQueueSeedData: Partial<ModerationQueueDocument>[] = [// Removed 2026-10-21: referenced event-favourite-blader-poll, one of the 11
  // demo events deleted when the seed was pruned to match live (Root Cause #26).
];

// ───── reports (empty — production has none) ────────────────────────────────────────────────
export const reportsSeedData: Partial<ReportDocument>[] = [];

// ───── itemRequests (empty — production has none) ───────────────────────────────────────────
export const itemRequestsSeedData: Partial<ItemRequestDocument>[] = [];

// ───── storeGoogleConfig (empty — production has none) ──────────────────────────────────────
export const storeGoogleConfigSeedData: Partial<StoreGoogleConfigDocument>[] = [];
