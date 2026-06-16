import { sieveFilter, sieveAnd, SIEVE_OP } from "@mohasinac/appkit";
import React, { cache } from "react";
import type { ReactNode } from "react";
import { storeRepository, productRepository, categoriesRepository, siteSettingsRepository, reviewRepository, couponsRepository } from "../../../repositories";
import { ROUTES } from "../../../next";
import { Container, Main, Section, Text } from "../../../ui";
import { STORE_PAGE_TABS } from "../../products/constants/listing-tabs";
import { isListingTypeEnabled, isCategoryTypeEnabled } from "../../../_internal/shared/listing-types/feature-flags";
import { StoreHeader } from "./StoreHeader";
import { StoreNavTabs } from "./StoreNavTabs";
import type { StoreDetail } from "../types";

const STORE_LISTING_HREF: Record<
  (typeof STORE_PAGE_TABS)[number]["id"],
  (slug: string) => string
> = {
  products: (slug) => String(ROUTES.PUBLIC.STORE_PRODUCTS(slug)),
  auctions: (slug) => String(ROUTES.PUBLIC.STORE_AUCTIONS(slug)),
  "pre-orders": (slug) => String(ROUTES.PUBLIC.STORE_PRE_ORDERS(slug)),
  "prize-draws": (slug) => String(ROUTES.PUBLIC.STORE_PRIZE_DRAWS(slug)),
  bundles: (slug) => String(ROUTES.PUBLIC.STORE_BUNDLES(slug)),
};

export const getStoreBySlug = cache((slug: string) =>
  storeRepository.findBySlug(slug).catch(() => undefined),
);

export interface StoreDetailLayoutViewProps {
  storeSlug: string;
  /** The current active tab value: "products" | "auctions" | "reviews" | "about" */
  activeTab: string;
  children: ReactNode;
}

function tabLabel(base: string, count?: number) {
  if (!count) return base;
  return `${base} (${count.toLocaleString()})`;
}

export async function StoreDetailLayoutView({
  storeSlug,
  activeTab,
  children,
}: StoreDetailLayoutViewProps) {
  const store = await getStoreBySlug(storeSlug);

  if (!store) {
    return (
      <Main>
        <Section padding="y-5xl" >
          <Container size="md">
            <Text align="center" color="muted">Store not found.</Text>
          </Container>
        </Section>
      </Main>
    );
  }

  const storeId = (store as Record<string, any>)?.id;

  const settings = await siteSettingsRepository.findById("global").catch(() => null);

  const [productsCount, auctionsCount, preOrdersCount, prizeDrawsCount, bundlesCount, couponsCount, reviewsCount] = storeId
    ? await Promise.all([
        productRepository
          .list({ filters: sieveAnd(sieveFilter("storeId", SIEVE_OP.EQ, storeId), sieveFilter("status", SIEVE_OP.EQ, "published"), sieveFilter("listingType", SIEVE_OP.EQ, "standard")), page: 1, pageSize: 1 })
          .then((r) => r.total)
          .catch(() => 0),
        productRepository
          .list({ filters: sieveAnd(sieveFilter("storeId", SIEVE_OP.EQ, storeId), sieveFilter("status", SIEVE_OP.EQ, "published"), sieveFilter("listingType", SIEVE_OP.EQ, "auction")), page: 1, pageSize: 1 })
          .then((r) => r.total)
          .catch(() => 0),
        productRepository
          .list({ filters: sieveAnd(sieveFilter("storeId", SIEVE_OP.EQ, storeId), sieveFilter("status", SIEVE_OP.EQ, "published"), sieveFilter("listingType", SIEVE_OP.EQ, "pre-order")), page: 1, pageSize: 1 })
          .then((r) => r.total)
          .catch(() => 0),
        productRepository
          .list({ filters: sieveAnd(sieveFilter("storeId", SIEVE_OP.EQ, storeId), sieveFilter("status", SIEVE_OP.EQ, "published"), sieveFilter("listingType", SIEVE_OP.EQ, "prize-draw")), page: 1, pageSize: 1 })
          .then((r) => r.total)
          .catch(() => 0),
        // SB-UNI-D — bundles live on categories with categoryType:"bundle"
        // + createdByStoreId scoping.
        categoriesRepository
          .listByType("bundle", { activeOnly: true, limit: 100 })
          .then((rows) => rows.filter((c) => c.createdByStoreId === storeId).length)
          .catch(() => 0),
        couponsRepository
          .list({ filters: sieveAnd(sieveFilter("sellerId", SIEVE_OP.EQ, storeId), sieveFilter("validity.isActive", SIEVE_OP.EQ, "true")), page: 1, pageSize: 1 })
          .then((r) => r.total)
          .catch(() => 0),
        reviewRepository
          .listAll({ filters: sieveAnd(sieveFilter("storeId", SIEVE_OP.EQ, storeId), sieveFilter("status", SIEVE_OP.EQ, "approved")), page: 1, pageSize: 1 })
          .then((r) => r.total)
          .catch(() => 0),
      ])
    : [0, 0, 0, 0, 0, 0, 0];

  const listingCounts: Record<(typeof STORE_PAGE_TABS)[number]["id"], number> = {
    products: productsCount,
    auctions: auctionsCount,
    "pre-orders": preOrdersCount,
    "prize-draws": prizeDrawsCount,
    bundles: bundlesCount,
  };

  const TAB_LISTING_TYPE: Record<string, string> = {
    products: "standard",
    auctions: "auction",
    "pre-orders": "pre-order",
    "prize-draws": "prize-draw",
  };

  const visibleStoreTabs = STORE_PAGE_TABS.filter((tab) => {
    if (tab.id === "bundles") return isCategoryTypeEnabled("bundle", settings);
    const lt = TAB_LISTING_TYPE[tab.id];
    return lt ? isListingTypeEnabled(lt as Parameters<typeof isListingTypeEnabled>[0], settings) : true;
  });

  const tabs = [
    ...visibleStoreTabs.map((tab) => ({
      value: tab.id,
      label: tabLabel(tab.label, listingCounts[tab.id]),
      href: STORE_LISTING_HREF[tab.id](storeSlug),
    })),
    { value: "coupons", label: tabLabel("Coupons", couponsCount), href: String(ROUTES.PUBLIC.STORE_COUPONS(storeSlug)) },
    { value: "reviews", label: tabLabel("Reviews", reviewsCount), href: String(ROUTES.PUBLIC.STORE_REVIEWS(storeSlug)) },
    { value: "about", label: "About", href: String(ROUTES.PUBLIC.STORE_ABOUT(storeSlug)) },
  ];

  return (
    <Main>
      // audit-unknown-ok: TS structural escape — StoreDetail
      <StoreHeader store={store as unknown as StoreDetail} />
      <Container size="xl" className="mt-6">
        <StoreNavTabs tabs={tabs} activeValue={activeTab} />
        <Section padding="t-lg">{children}</Section>
      </Container>
    </Main>
  );
}
