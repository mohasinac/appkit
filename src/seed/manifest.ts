/**
 * Seed Manifest
 *
 * Lightweight index of every seeded document across all collections —
 * name/id pairs without loading the full seed data payload.
 * Auto-derived from the live seed data files — stays in sync automatically.
 */

import type { FirestoreDocument, JsonValue } from "../schemas/types";
import type { ListingType } from "../features/products/types/index";
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
import { productsArtSeedData } from "./products-art-seed-data";
import { productsStickersSeedData } from "./products-stickers-seed-data";
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
import { shipmentsSeedData, shipmentLotsSeedData, shipmentItemsSeedData } from "./shipments-seed-data";
import { catalogueSeedData } from "./catalogue-seed-data";
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
// Tester sandbox seed fixtures live in ../features/tester/seed-data (isolated on purpose).
import {
  testerChecklistSeedData,
  storesTesterSeedData,
  categoriesTesterSeedData,
  productsTesterSeedData,
  blogTesterSeedData,
  eventsTesterSeedData,
  couponsTesterSeedData,
  bidsTesterSeedData,
  ordersTesterSeedData,
} from "../features/tester/seed-data";

export interface SeedManifestEntry {
  id: string;
  name: string;
  type?: string;
}

/** Every collection name the CLI seeder (appkit/scripts/seed-cli.mjs) and this manifest cover. */
export type SeedCollectionName =
  | "users" | "addresses" | "categories" | "stores" | "products" | "orders"
  | "reviews" | "bids" | "coupons" | "carousels" | "carouselSlides"
  | "homepageSections" | "siteSettings" | "faqs" | "notifications" | "payouts"
  | "blogPosts" | "events" | "eventEntries" | "sessions" | "carts" | "wishlists"
  | "history" | "conversations" | "groupedListings" | "scammerProfiles"
  | "supportTickets" | "productFeatures" | "offers" | "couponUsage" | "claimedCoupons"
  | "payoutMethods" | "shippingConfigs" | "analyticsCards" | "analyticsAlerts"
  | "storeCategories" | "listingTemplates" | "moderationQueue" | "reports"
  | "itemRequests" | "storeWhatsAppConfig" | "storeGoogleConfig" | "roleOverrides"
  | "customRoles" | "adminNotifications" | "lotteryEntries" | "shipments"
  | "shipmentLots" | "shipmentItems" | "catalogueItems" | "testerChecklistItems";

export type SeedManifest = Record<SeedCollectionName, SeedManifestEntry[]>;

function asArr(items: unknown): Array<Record<string, JsonValue>> {
  return (items as unknown as Array<Record<string, JsonValue>>) ?? [];
}

function pick(items: unknown[], nameKey = "name"): SeedManifestEntry[] {
  return (items as Array<Record<string, JsonValue>>)
    .filter((item) => Boolean(item.id))
    .map((item) => ({
      id: String(item.id),
      name: String(item[nameKey] ?? item.id),
      ...(item.type ? { type: String(item.type) } : {}),
    }));
}

// SB1-G Phase 4 — canonical listingType drives the manifest "type" tag.
// "bundle" is a categoryType, not a ListingType — falls through to "bundle" below.
const LISTING_TYPE_TO_MANIFEST_TAG: Record<ListingType, string> = {
  standard: "standard",
  auction: "auction",
  "pre-order": "preorder",
  "prize-draw": "prize-draw",
  classified: "classified",
  "digital-code": "digital-code",
  live: "live",
  art: "art",
  stickers: "stickers",
};

export const SEED_MANIFEST: SeedManifest = {
  categories: pick([...asArr(categoriesSeedData), ...asArr(categoriesTesterSeedData)]),
  users: pick(
    asArr(usersSeedData).map((u) => ({
      ...u,
      name: u.displayName ?? u.email ?? u.uid,
    })),
  ),
  stores: pick(
    [...asArr(storesSeedData), ...asArr(storesTesterSeedData)].map((s) => ({
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
      ...asArr(productsArtSeedData),
      ...asArr(productsStickersSeedData),
      ...asArr(productsTesterSeedData),
    ].map((p) => ({
      ...p,
      type:
        p.listingType === "bundle"
          ? "bundle"
          : LISTING_TYPE_TO_MANIFEST_TAG[(p.listingType as ListingType) ?? "standard"],
    })),
    "title",
  ),
  orders: pick([...asArr(ordersSeedData), ...asArr(ordersTesterSeedData)]),
  reviews: pick(asArr(reviewsSeedData), "title"),
  bids: pick([...asArr(bidsSeedData), ...asArr(bidsTesterSeedData)]),
  coupons: pick(
    [...asArr(couponsSeedData), ...asArr(couponsTesterSeedData)].map((c) => ({
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
  shipments: pick(asArr(shipmentsSeedData), "shipmentNumber"),
  shipmentLots: pick(asArr(shipmentLotsSeedData), "lotName"),
  shipmentItems: pick(asArr(shipmentItemsSeedData), "title"),
  catalogueItems: pick(asArr(catalogueSeedData), "title"),
  blogPosts: pick(
    [...asArr(blogPostsSeedData), ...asArr(blogTesterSeedData)].map((p) => ({
      ...p,
      name: p.title ?? p.id,
    })),
  ),
  events: pick(
    [...asArr(eventsSeedData), ...asArr(eventsTesterSeedData)].map((e) => ({
      ...e,
      name: e.title ?? e.id,
    })),
  ),
  eventEntries: [],
  lotteryEntries: [],
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
  testerChecklistItems: pick(
    asArr(testerChecklistSeedData).map((c) => ({
      ...c,
      name: c.label ?? c.id,
    })),
  ),
};
