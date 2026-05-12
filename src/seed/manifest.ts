/**
 * Seed Manifest
 *
 * Lightweight index of every seeded document across all collections.
 * Imported by SeedPanel to render previews without loading full seed data.
 * Auto-derived from the live seed data files — stays in sync automatically.
 */

import type { SeedCollectionName } from "./actions/demo-seed-actions";
import { brandsSeedData } from "./brands-seed-data";
import { categoriesSeedData } from "./categories-seed-data";
import { usersSeedData } from "./users-seed-data";
import { storesSeedData } from "./stores-seed-data";
import { productsStandardSeedData } from "./products-standard-seed-data";
import { productsAuctionsSeedData } from "./products-auctions-seed-data";
import { productsPreOrdersSeedData } from "./products-preorders-seed-data";
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
import { sublistingCategoriesSeedData } from "./sublisting-categories-seed-data";
import { groupedListingsSeedData } from "./grouped-listings-seed-data";
import { bundlesSeedData } from "./bundles-seed-data";
import { scammersSeedData } from "./scammers-seed-data";
import { productFeaturesSeedData } from "./product-features-seed-data";

export interface SeedManifestEntry {
  id: string;
  name: string;
  type?: string;
}

export type SeedManifest = Record<SeedCollectionName, SeedManifestEntry[]>;

function asArr(items: unknown): Array<Record<string, unknown>> {
  return (items as unknown as Array<Record<string, unknown>>) ?? [];
}

function pick(items: unknown[], nameKey = "name"): SeedManifestEntry[] {
  return (items as Array<Record<string, unknown>>)
    .filter((item) => Boolean(item.id))
    .map((item) => ({
      id: String(item.id),
      name: String(item[nameKey] ?? item.id),
      ...(item.type ? { type: String(item.type) } : {}),
    }));
}

export const SEED_MANIFEST: SeedManifest = {
  brands: pick(asArr(brandsSeedData)),
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
      ...asArr(productsPreOrdersSeedData),
    ].map((p) => ({
      ...p,
      // SB1-G Phase 4 — canonical listingType drives the manifest "type" tag.
      type:
        p.listingType === "auction"
          ? "auction"
          : p.listingType === "pre-order"
            ? "preorder"
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
    [siteSettingsSeedData as unknown as Record<string, unknown>].map((s) => ({
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
  addresses: pick(
    asArr(addressesSeedData).map((a) => ({
      ...a,
      name: a.label ?? a.fullName ?? a.id,
    })),
  ),
  storeAddresses: pick(
    asArr(storeAddressesSeedData).map((a) => ({
      ...a,
      name: a.label ?? a.fullName ?? a.id,
    })),
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
  sublistingCategories: pick(
    asArr(sublistingCategoriesSeedData).map((s) => ({
      ...s,
      name: s.title ?? s.id,
    })),
  ),
  groupedListings: pick(
    asArr(groupedListingsSeedData).map((g) => ({
      ...g,
      name: g.title ?? g.id,
    })),
  ),
  bundles: pick(
    asArr(bundlesSeedData).map((b) => ({
      ...b,
      name: b.title ?? b.id,
    })),
  ),
  scammerProfiles: pick(
    asArr(scammersSeedData).map((s) => ({
      ...s,
      name: (s.displayNames as string[] | undefined)?.[0] ?? s.id,
    })),
  ),
  productFeatures: pick(
    asArr(productFeaturesSeedData).map((f) => ({
      ...f,
      name: f.label ?? f.id,
    })),
  ),
};
