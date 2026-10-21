/*
 * 🛑 Deliberately NO `"use server"`. That directive marks every export as a
 * client-callable RPC endpoint, and these are not — they are read helpers
 * invoked from a Server Component (`StoreDetailLayoutView`) and a server
 * page (`/stores/[slug]`). Declaring it anyway also obliges every export to
 * return `ActionResult<T>` (`audit-server-action-envelope`), which would
 * wrap a path string in an envelope nobody unwraps. The sibling helpers
 * this file sits beside — `adapters.ts`, `denormalize.ts` and
 * `listing-tab-counts.ts`, which it calls — carry no directive either.
 *
 * WHY: `StoreDetailLayoutView`'s nav bar and the bare `/stores/[slug]`
 *      redirect both need "which tabs does this store actually have
 *      something in, and in what order". Before this file the redirect
 *      didn't ask the question at all — it always sent a visitor to
 *      `/products`, even for a store with zero products (and nothing else),
 *      landing on a tab that isn't even in the nav bar. Computing the answer
 *      twice (once per caller) is exactly the duplicated-predicate shape
 *      Root Cause #73 warns about, so it lives in one place.
 * WHAT: `resolveStoreTabs` — every visible tab for a store, in priority
 *       order (listing types in `STORE_PAGE_TABS` order, then Coupons, then
 *       Reviews, then About last). `getDefaultStoreTabPath` picks the first
 *       one — the correct landing page for a store with no products.
 */

import { sieveAnd, sieveFilter, SIEVE_OP } from "../../../../utils/sieve-builder";
import { couponsRepository, reviewRepository } from "../../../../repositories";
import { ROUTES } from "../../../../next/routing/route-map";
import { STORE_PAGE_TABS } from "../../../../features/products/constants/listing-tabs";
import { isListingTypeEnabled, isCategoryTypeEnabled } from "../../../shared/listing-types/feature-flags";
import { pluginFor } from "../../../shared/listing-types/_registry";
import type { ListingType } from "../../../../features/products/types";
import {
  listingTabCounts,
  type ListingTabCounts,
  type ListingTabCountResult,
} from "../products/listing-tab-counts";

type SiteSettingsSnapshot = Parameters<typeof isListingTypeEnabled>[1];

export interface StoreTabLink {
  value: string;
  label: string;
  href: string;
}

export interface ResolvedStoreTabs {
  /** Listing-type tabs with something in them, in `STORE_PAGE_TABS` order. */
  dropdownTabs: StoreTabLink[];
  /** Coupons (if any), Reviews (if any), About — always non-empty. */
  tabs: StoreTabLink[];
  /**
   * Both numbers, because they answer different questions: `available` is what
   * each tab badges, `total` is what decides whether the tab exists at all.
   * See `ListingTabCountResult`.
   */
  listingCounts: ListingTabCountResult;
  couponsCount: number;
  reviewsCount: number;
}

function tabLabel(base: string, count?: number) {
  if (!count) return base;
  return `${base} (${count.toLocaleString()})`;
}

/**
 * tabSlug -> route builder. Mirrors `ROUTES.PUBLIC.STORE_*` exactly.
 *
 * 🛑 `spares` was missing here until this file was added, which meant
 * `visibleStoreTabs` could include a tab this map had no builder for the
 * moment a store's spares count went above zero — `STORE_LISTING_HREF[tab.id]`
 * would resolve to `undefined`, and calling it as a function would throw.
 * `/stores/[storeSlug]/spares/page.tsx` is a real route; the href map just
 * never named it.
 */
const STORE_LISTING_HREF: Record<
  (typeof STORE_PAGE_TABS)[number]["id"],
  (slug: string) => string
> = {
  products: (slug) => String(ROUTES.PUBLIC.STORE_PRODUCTS(slug)),
  auctions: (slug) => String(ROUTES.PUBLIC.STORE_AUCTIONS(slug)),
  "pre-orders": (slug) => String(ROUTES.PUBLIC.STORE_PRE_ORDERS(slug)),
  "prize-draws": (slug) => String(ROUTES.PUBLIC.STORE_PRIZE_DRAWS(slug)),
  bundles: (slug) => String(ROUTES.PUBLIC.STORE_BUNDLES(slug)),
  classifieds: (slug) => String(ROUTES.PUBLIC.STORE_CLASSIFIEDS(slug)),
  "digital-codes": (slug) => String(ROUTES.PUBLIC.STORE_DIGITAL_CODES(slug)),
  live: (slug) => String(ROUTES.PUBLIC.STORE_LIVE(slug)),
  // Combined art + stickers, mirroring the public /art page. This used to
  // point at STORE_PRODUCTS, which filters to `standard` — so the tab showed
  // a real non-zero count and landed on a page with none of those items.
  art: (slug) => String(ROUTES.PUBLIC.STORE_ART(slug)),
  spares: (slug) => String(ROUTES.PUBLIC.STORE_SPARES(slug)),
};

export async function resolveStoreTabs(
  storeSlug: string,
  storeId: string | undefined,
  settings: SiteSettingsSnapshot,
): Promise<ResolvedStoreTabs> {
  const [listingCounts, couponsCount, reviewsCount] = storeId
    ? await Promise.all([
        listingTabCounts(STORE_PAGE_TABS, { storeId }),
        // audit-public-test-data-ok: a COUNT of the store's own coupons, and
        // `CouponDocument` carries no isTestData field — there is nothing to strip.
        couponsRepository
          .list({ filters: sieveAnd(sieveFilter("storeId", SIEVE_OP.EQ, storeId), sieveFilter("validity.isActive", SIEVE_OP.EQ, "true")), page: 1, pageSize: 1 })
          .then((r) => r.total)
          .catch(() => 0),
        reviewRepository
          .listAll({ filters: sieveAnd(sieveFilter("storeId", SIEVE_OP.EQ, storeId), sieveFilter("status", SIEVE_OP.EQ, "approved")), page: 1, pageSize: 1 })
          .then((r) => r.total)
          .catch(() => 0),
      ])
    : [{ available: {}, total: {} } as ListingTabCountResult, 0, 0];

  const visibleStoreTabs = STORE_PAGE_TABS.filter((tab) => {
    if (tab.id === "bundles") {
      if (!isCategoryTypeEnabled("bundle", settings)) return false;
    } else if (tab.id === pluginFor("art").tabSlug) {
      // Combined tab — visible if either underlying listing type is enabled.
      if (!(isListingTypeEnabled("art", settings) || isListingTypeEnabled("stickers", settings))) return false;
    } else if (tab.listingType) {
      if (!isListingTypeEnabled(tab.listingType as ListingType, settings)) return false;
    }
    // A store with zero items of a given listing type shouldn't offer a tab
    // that leads to an empty page. `undefined` means the count query FAILED,
    // not zero, so the tab stays visible rather than hiding real stock
    // behind a swallowed error (Root Cause #59).
    // TOTAL, not the badge: a tab whose rows have all ended still has an
    // archive behind the Ended/All scopes, and hiding it would strand that.
    const count = listingCounts.total[tab.id];
    return count === undefined || count > 0;
  });

  const dropdownTabs: StoreTabLink[] = visibleStoreTabs.map((tab) => ({
    value: tab.id,
    label: tabLabel(tab.label, listingCounts.available[tab.id]),
    href: STORE_LISTING_HREF[tab.id](storeSlug),
  }));

  const tabs: StoreTabLink[] = [
    ...(couponsCount > 0
      ? [{ value: "coupons", label: tabLabel("Coupons", couponsCount), href: String(ROUTES.PUBLIC.STORE_COUPONS(storeSlug)) }]
      : []),
    ...(reviewsCount > 0
      ? [{ value: "reviews", label: tabLabel("Reviews", reviewsCount), href: String(ROUTES.PUBLIC.STORE_REVIEWS(storeSlug)) }]
      : []),
    { value: "about", label: "About", href: String(ROUTES.PUBLIC.STORE_ABOUT(storeSlug)) },
  ];

  return { dropdownTabs, tabs, listingCounts, couponsCount, reviewsCount };
}

/**
 * Where the bare `/stores/[slug]` route should land.
 *
 * Order: **About when the store has written one**, else the first
 * listing-type tab holding anything, else Coupons, else Reviews, else About.
 * `about` is always present in `tabs`, so this never falls through to nothing.
 *
 * 🛑 About was promoted to first on 2026-10-21, deliberately. Previously the
 * richest listing tab always won, so any stocked store sent every visitor
 * straight to a filtered product grid — the storefront read as a search
 * result, and a seller who had written an introduction was the only person who
 * ever saw it.
 *
 * It is gated on the store ACTUALLY having About content rather than applied
 * unconditionally: landing on an empty About page would be strictly worse than
 * landing on products, so the old behaviour remains the fallback. The caller
 * supplies the flag because this module takes a `storeId`, not the document,
 * and giving it store-shape knowledge it does not otherwise need would make it
 * a second place that decides what "has an About" means.
 */
export async function getDefaultStoreTabPath(
  storeSlug: string,
  storeId: string | undefined,
  settings: SiteSettingsSnapshot,
  hasAboutContent?: boolean,
): Promise<string> {
  const { dropdownTabs, tabs } = await resolveStoreTabs(storeSlug, storeId, settings);
  if (hasAboutContent) {
    const about = tabs.find((t) => t.value === "about");
    if (about) return about.href;
  }
  return (dropdownTabs[0] ?? tabs[0]!).href;
}
