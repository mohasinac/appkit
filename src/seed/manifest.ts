/**
 * Seed Manifest
 *
 * Lightweight index of every seeded document across all collections.
 * Imported by SeedPanel to render previews without loading full seed data.
 * Auto-derived from the live seed data files — stays in sync automatically.
 */

import type { SeedCollectionName } from "./actions/demo-seed-actions";
import type { FirestoreDocument, JsonValue } from "../schemas/types";
import {
  payoutMethodsSeedData,
  shippingConfigsSeedData,
  analyticsCardsSeedData,
  analyticsAlertsSeedData,
  storeCategoriesSeedData,
  listingTemplatesSeedData,
  moderationQueueSeedData,
  reportsSeedData,
  itemRequestsSeedData,
  storeWhatsAppConfigSeedData,
  storeGoogleConfigSeedData,
} from "./store-extensions-seed-data";
// SB-UNI-C — brandsSeedData merged into categoriesSeedData.
import { categoriesSeedData } from "./categories-seed-data";
import { usersSeedData } from "./users-seed-data";
import { storesSeedData } from "./stores-seed-data";
import { productsStandardSeedData } from "./products-standard-seed-data";
import { productsAuctionsSeedData } from "./products-auctions-seed-data";
import { productsPreordersSeedData } from "./products-preorders-seed-data";
import { productsPrizeDrawsSeedData } from "./products-prize-draws-seed-data";
import { productsClassifiedsSeedData } from "./products-classifieds-seed-data";
import { productsDigitalCodesSeedData } from "./products-digital-codes-seed-data";
import { productsLiveItemsSeedData } from "./products-live-items-seed-data";
import { ordersSeedData } from "./orders-seed-data";
import { reviewsSeedData } from "./reviews-seed-data";
import { bidsSeedData } from "./bids-seed-data";
import { couponsSeedData } from "./coupons-seed-data";
import { carouselsSeedData } from "./carousels-seed-data";
import { carouselSlidesSeedData } from "./carousel-slides-seed-data";
import { homepageSectionsSeedData } from "./homepage-sections-seed-data";
import { siteSettingsSeedData } from "./site-settings-seed-data";
import { faqSeedData } from "./faq-seed-data";
import { notificationsSeedData } from "./notifications-seed-data";
import { payoutsSeedData } from "./payouts-seed-data";
import { blogPostsSeedData } from "./blog-posts-seed-data";
import { eventsSeedData } from "./events-seed-data";
import { sessionsSeedData } from "./sessions-seed-data";
import { addressesSeedData } from "./addresses-seed-data";
import { storeAddressesSeedData } from "./store-addresses-seed-data";
import { cartsSeedData } from "./cart-seed-data";
import { wishlistsSeedData } from "./wishlists-seed-data";
import { historySeedData } from "./history-seed-data";
import { conversationsSeedData } from "./conversations-seed-data";
// SB-UNI-B — sublistingCategoriesSeedData absorbed into categoriesSeedData.
import { groupedListingsSeedData } from "./grouped-listings-seed-data";
// SB-UNI-V — bundlesSeedData absorbed into categoriesSeedData.
import { scammersSeedData } from "./scammers-seed-data";
import { supportTicketsSeedData } from "./support-tickets-seed-data";
import { productFeaturesSeedData } from "./product-features-seed-data";
import { offersSeedData } from "./offers-seed-data";
import { couponUsageSeedData } from "./coupon-usage-seed-data";
import { claimedCouponsSeedData } from "./claimed-coupons-seed-data";

export interface SeedManifestEntry {
  id: string;
  name: string;
  type?: string;
}

export type SeedManifest = Record<SeedCollectionName, SeedManifestEntry[]>;

// audit-unknown-ok: type-narrowing entry point — accepts any value, narrows by typeof/Array.isArray
function asArr(items: unknown): Array<Record<string, JsonValue>> {
  // audit-unknown-ok: TS structural escape — Array
  return (items as unknown as Array<Record<string, JsonValue>>) ?? [];
}

// audit-unknown-ok: type-narrowing entry point — accepts any value, narrows by typeof/Array.isArray
function pick(items: unknown[], nameKey = "name"): SeedManifestEntry[] {
  return (items as Array<Record<string, JsonValue>>)
    .filter((item) => Boolean(item.id))
    .map((item) => ({
      id: String(item.id),
      name: String(item[nameKey] ?? item.id),
      ...(item.type ? { type: String(item.type) } : {}),
    }));
}

export const SEED_MANIFEST: SeedManifest = {
  categories: pick(asArr(categoriesSeedData)),
  users: pick(
    asArr(usersSeedData).map((u) => ({
      ...u,
      name: u.displayName ?? u.email ?? u.uid,
    })),
  ),
  stores: pick(
    asArr(storesSeedData).map((s) => ({
      ...s,
      name: s.storeName ?? s.id,
    })),
  ),
  products: pick(
    [
      ...asArr(productsStandardSeedData),
      ...asArr(productsAuctionsSeedData),
      ...asArr(productsPreordersSeedData),
      ...asArr(productsPrizeDrawsSeedData),
      ...asArr(productsClassifiedsSeedData),
      ...asArr(productsDigitalCodesSeedData),
      ...asArr(productsLiveItemsSeedData),
    ].map((p) => ({
      ...p,
      // SB1-G Phase 4 — canonical listingType drives the manifest "type" tag.
      type:
        p.listingType === "auction"
          ? "auction"
          : p.listingType === "pre-order"
            ? "preorder"
            : p.listingType === "prize-draw"
              ? "prize-draw"
              : p.listingType === "classified"
                ? "classified"
                : p.listingType === "digital-code"
                  ? "digital-code"
                  : p.listingType === "live"
                    ? "live"
                    : p.listingType === "bundle"
                      ? "bundle"
                      : "standard",
    })),
    "title",
  ),
  orders: pick(asArr(ordersSeedData)),
  reviews: pick(asArr(reviewsSeedData), "title"),
  bids: pick(asArr(bidsSeedData)),
  coupons: pick(
    asArr(couponsSeedData).map((c) => ({
      ...c,
      name: c.code ?? c.id,
    })),
  ),
  carousels: pick(asArr(carouselsSeedData)),
  carouselSlides: pick(
    asArr(carouselSlidesSeedData).map((s) => ({
      ...s,
      name: s.title ?? s.id,
    })),
  ),
  homepageSections: pick(
    asArr(homepageSectionsSeedData).map((s) => ({
      ...s,
      name: s.title ?? s.type ?? s.id,
    })),
    "name",
  ),
  siteSettings: pick(
    // audit-unknown-ok: TS structural escape — domain document type lacks index signature
    [siteSettingsSeedData as unknown as FirestoreDocument].map((s) => ({
      ...s,
      name: s.siteName ?? "global",
    })),
  ),
  faqs: pick(
    asArr(faqSeedData).map((f) => ({
      ...f,
      name: f.question ?? f.id,
    })),
  ),
  notifications: pick(
    asArr(notificationsSeedData).map((n) => ({
      ...n,
      name: n.title ?? n.type ?? n.id,
    })),
  ),
  payouts: pick(asArr(payoutsSeedData)),
  blogPosts: pick(
    asArr(blogPostsSeedData).map((p) => ({
      ...p,
      name: p.title ?? p.id,
    })),
  ),
  events: pick(
    asArr(eventsSeedData).map((e) => ({
      ...e,
      name: e.title ?? e.id,
    })),
  ),
  eventEntries: [],
  sessions: pick(
    asArr(sessionsSeedData).map((s) => ({
      ...s,
      name: s.userId ?? s.id,
    })),
  ),
  // SB-UNI-A 2026-05-13 — user + store addresses merged into the unified
  // top-level `addresses` collection w/ ownerType discriminator.
  addresses: pick(
    [
      ...asArr(addressesSeedData).map((a) => ({
        ...a,
        ownerType: "user" as const,
        ownerId: a.userId,
        name: a.label ?? a.fullName ?? a.id,
      })),
      ...asArr(storeAddressesSeedData).map((a) => ({
        ...a,
        ownerType: "store" as const,
        ownerId: a.storeSlug,
        name: a.label ?? a.fullName ?? a.id,
      })),
    ],
  ),
  carts: pick(
    asArr(cartsSeedData).map((c) => ({
      ...c,
      name: c.userId ?? c.id,
    })),
  ),
  wishlists: pick(
    asArr(wishlistsSeedData).map((w) => ({
      ...w,
      name: w.userId ?? w.id,
    })),
  ),
  history: pick(
    asArr(historySeedData).map((h) => ({
      ...h,
      name: h.userId ?? h.id,
    })),
  ),
  conversations: pick(
    asArr(conversationsSeedData).map((c) => ({
      ...c,
      name: c.productTitle ?? c.id,
    })),
  ),
  groupedListings: pick(
    asArr(groupedListingsSeedData).map((g) => ({
      ...g,
      name: g.title ?? g.id,
    })),
  ),
  scammerProfiles: pick(
    asArr(scammersSeedData).map((s) => ({
      ...s,
      name: (s.displayNames as string[] | undefined)?.[0] ?? s.id,
    })),
  ),
  supportTickets: pick(
    asArr(supportTicketsSeedData).map((t) => ({
      ...t,
      name: t.subject ?? t.id,
    })),
  ),
  productFeatures: pick(
    asArr(productFeaturesSeedData).map((f) => ({
      ...f,
      name: f.label ?? f.id,
    })),
  ),
  offers: pick(
    asArr(offersSeedData).map((o) => ({
      ...o,
      name: o.productTitle ?? o.id,
    })),
  ),
  couponUsage: asArr(couponUsageSeedData).map((u) => ({
    id: `${u.userId}/${u.couponId}`,
    name: String(u.couponCode ?? u.couponId),
  })),
  claimedCoupons: pick(
    asArr(claimedCouponsSeedData).map((c) => ({
      ...c,
      name: c.couponCode ?? c.couponId ?? c.id,
    })),
  ),
  // S-STORE foundation collections — entries derived lazily from store-extensions-seed-data
  payoutMethods: pick(asArr(payoutMethodsSeedData)),
  shippingConfigs: pick(asArr(shippingConfigsSeedData)),
  analyticsCards: pick(
    asArr(analyticsCardsSeedData).map((c) => ({ ...c, name: c.title ?? c.id })),
  ),
  analyticsAlerts: pick(
    asArr(analyticsAlertsSeedData).map((a) => ({ ...a, name: a.label ?? a.id })),
  ),
  storeCategories: pick(asArr(storeCategoriesSeedData)),
  listingTemplates: pick(
    asArr(listingTemplatesSeedData).map((t) => ({ ...t, name: t.name ?? t.id })),
  ),
  moderationQueue: pick(asArr(moderationQueueSeedData)),
  reports: pick(asArr(reportsSeedData)),
  itemRequests: pick(
    asArr(itemRequestsSeedData).map((r) => ({ ...r, name: r.title ?? r.id })),
  ),
  storeWhatsAppConfig: pick(asArr(storeWhatsAppConfigSeedData)),
  storeGoogleConfig: pick(asArr(storeGoogleConfigSeedData)),
  // RBAC + admin notifications — no seed docs yet; manifest stays empty until populated.
  roleOverrides: [],
  customRoles: [],
  adminNotifications: [],
};
