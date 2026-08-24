import { sieveFilter, sieveAnd, SIEVE_OP } from "@mohasinac/appkit";
import React, { cache } from "react";
import type { ReactNode } from "react";
import { storeRepository, siteSettingsRepository, reviewRepository, couponsRepository } from "../../../repositories";
import { ROUTES } from "../../../next";
import { Container, Main, Section, Text } from "../../../ui";
import { STORE_PAGE_TABS } from "../../products/constants/listing-tabs";
import { isListingTypeEnabled, isCategoryTypeEnabled } from "../../../_internal/shared/listing-types/feature-flags";
import { pluginFor } from "../../../_internal/shared/listing-types/_registry";
import {
  listingTabCounts,
  type ListingTabCounts,
} from "../../../_internal/server/features/products/listing-tab-counts";
import type { ListingType } from "../../products/types";
import { getSellerTrustStatus } from "../../scams/actions/scam-actions";
import { StoreHeader } from "./StoreHeader";
import { StoreNavTabs } from "./StoreNavTabs";
import { toStoreDetail } from "../../../_internal/server/features/stores/adapters";

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
};

export const getStoreBySlug = cache((slug: string) =>
  storeRepository.findBySlug(slug).catch(() => undefined),
);

export interface StoreDetailLayoutViewProps {
  storeSlug: string;
  /** The current active tab value: "products" | "auctions" | "reviews" | "about" */
  activeTab: string;
  children: ReactNode;
  /**
   * P-12 — gates the trust badge behind the same FEATURE_SCAM_REGISTRY flag
   * that gates the registry itself (pending legal sign-off). Consumer passes
   * `getFlag("SCAM_REGISTRY")`; appkit has no access to that env reader.
   * Defaults to `false` — off unless the consumer explicitly opts in.
   */
  scamRegistryEnabled?: boolean;
}

function tabLabel(base: string, count?: number) {
  if (!count) return base;
  return `${base} (${count.toLocaleString()})`;
}

export async function StoreDetailLayoutView({
  storeSlug,
  activeTab,
  children,
  scamRegistryEnabled = false,
}: StoreDetailLayoutViewProps) {
  const store = await getStoreBySlug(storeSlug);

  if (!store) {
    return (
      <Main>
        <Section padding="y-5xl" >
          <Container size="md">
            <Text align="start" color="muted">Store not found.</Text>
          </Container>
        </Section>
      </Main>
    );
  }

  const storeId = (store as Record<string, any>)?.id;

  const [settings, trust] = await Promise.all([
    siteSettingsRepository.findById("global").catch(() => null),
    scamRegistryEnabled && storeId
      ? getSellerTrustStatus(storeId).catch(() => undefined)
      : Promise.resolve(undefined),
  ]);

  // One derived batch instead of nine copy-pasted per-type queries. The tabs
  // themselves say which listing types to count (including the combined
  // `art|stickers` OR-group), so a tenth type is counted automatically — the
  // hand-written `TAB_LISTING_TYPE` map this replaces was unguarded by any
  // audit and already omitted art/stickers (Root Cause #61).
  const [listingCounts, couponsCount, reviewsCount] = storeId
    ? await Promise.all([
        listingTabCounts(STORE_PAGE_TABS, { storeId }),
        couponsRepository
          .list({ filters: sieveAnd(sieveFilter("storeId", SIEVE_OP.EQ, storeId), sieveFilter("validity.isActive", SIEVE_OP.EQ, "true")), page: 1, pageSize: 1 })
          .then((r) => r.total)
          .catch(() => 0),
        reviewRepository
          .listAll({ filters: sieveAnd(sieveFilter("storeId", SIEVE_OP.EQ, storeId), sieveFilter("status", SIEVE_OP.EQ, "approved")), page: 1, pageSize: 1 })
          .then((r) => r.total)
          .catch(() => 0),
      ])
    : [{} as ListingTabCounts, 0, 0];

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
    // that leads to an empty page — matches the "hide empty tab" rule below
    // for coupons/reviews. `undefined` means the count query FAILED, not zero,
    // so the tab stays visible rather than hiding real stock behind a
    // swallowed error (Root Cause #59) — this used to be `.catch(() => 0)`.
    const count = listingCounts[tab.id];
    return count === undefined || count > 0;
  });

  const dropdownTabs = visibleStoreTabs.map((tab) => ({
    value: tab.id,
    label: tabLabel(tab.label, listingCounts[tab.id]),
    href: STORE_LISTING_HREF[tab.id](storeSlug),
  }));

  const tabs = [
    ...(couponsCount > 0
      ? [{ value: "coupons", label: tabLabel("Coupons", couponsCount), href: String(ROUTES.PUBLIC.STORE_COUPONS(storeSlug)) }]
      : []),
    ...(reviewsCount > 0
      ? [{ value: "reviews", label: tabLabel("Reviews", reviewsCount), href: String(ROUTES.PUBLIC.STORE_REVIEWS(storeSlug)) }]
      : []),
    { value: "about", label: "About", href: String(ROUTES.PUBLIC.STORE_ABOUT(storeSlug)) },
  ];

  return (
    <Main>
      {/* Projected, not cast: the raw document carries secrets, and the cast
          also skipped the stats flattening StoreHeader's counters rely on. */}
      <StoreHeader store={toStoreDetail(store)} trust={trust} />
      <Container size="xl" className="mt-6">
        <StoreNavTabs
          dropdownTabs={dropdownTabs}
          dropdownPlaceholder="Browse listings"
          tabs={tabs}
          activeValue={activeTab}
        />
        <Section padding="t-lg">{children}</Section>
      </Container>
    </Main>
  );
}
