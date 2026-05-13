import React, { cache } from "react";
import type { ReactNode } from "react";
import { storeRepository, productRepository, categoriesRepository } from "../../../repositories";
import { ROUTES } from "../../../next";
import { Container, Main, Section } from "../../../ui";
import { STORE_PAGE_TABS } from "../../products/constants/listing-tabs";
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
        <Section className="py-20">
          <Container size="md">
            <p className="text-center text-zinc-500">Store not found.</p>
          </Container>
        </Section>
      </Main>
    );
  }

  const storeId = (store as Record<string, any>)?.id;

  const [productsCount, auctionsCount, preOrdersCount, prizeDrawsCount, bundlesCount] = storeId
    ? await Promise.all([
        productRepository
          .list({ filters: `storeId==${storeId},status==published,listingType==standard`, page: 1, pageSize: 1 })
          .then((r) => r.total)
          .catch(() => 0),
        productRepository
          .list({ filters: `storeId==${storeId},status==published,listingType==auction`, page: 1, pageSize: 1 })
          .then((r) => r.total)
          .catch(() => 0),
        productRepository
          .list({ filters: `storeId==${storeId},status==published,listingType==pre-order`, page: 1, pageSize: 1 })
          .then((r) => r.total)
          .catch(() => 0),
        productRepository
          .list({ filters: `storeId==${storeId},status==published,listingType==prize-draw`, page: 1, pageSize: 1 })
          .then((r) => r.total)
          .catch(() => 0),
        // SB-UNI-D — bundles live on categories with categoryType:"bundle"
        // + createdByStoreId scoping.
        categoriesRepository
          .listByType("bundle", { activeOnly: true, limit: 100 })
          .then((rows) => rows.filter((c) => c.createdByStoreId === storeId).length)
          .catch(() => 0),
      ])
    : [0, 0, 0, 0, 0];

  const listingCounts: Record<(typeof STORE_PAGE_TABS)[number]["id"], number> = {
    products: productsCount,
    auctions: auctionsCount,
    "pre-orders": preOrdersCount,
    "prize-draws": prizeDrawsCount,
    bundles: bundlesCount,
  };

  const tabs = [
    ...STORE_PAGE_TABS.map((tab) => ({
      value: tab.id,
      label: tabLabel(tab.label, listingCounts[tab.id]),
      href: STORE_LISTING_HREF[tab.id](storeSlug),
    })),
    { value: "coupons", label: "Coupons", href: String(ROUTES.PUBLIC.STORE_COUPONS(storeSlug)) },
    { value: "reviews", label: "Reviews", href: String(ROUTES.PUBLIC.STORE_REVIEWS(storeSlug)) },
    { value: "about", label: "About", href: String(ROUTES.PUBLIC.STORE_ABOUT(storeSlug)) },
  ];

  return (
    <Main>
      <StoreHeader store={store as unknown as StoreDetail} />
      <Container size="xl" className="mt-6">
        <StoreNavTabs tabs={tabs} activeValue={activeTab} />
        <Section className="pt-6">{children}</Section>
      </Container>
    </Main>
  );
}
