import React, { cache } from "react";
import type { ReactNode } from "react";
import { storeRepository, productRepository } from "../../../repositories";
import { ROUTES } from "../../../next";
import { Container, Main, Section } from "../../../ui";
import { StoreHeader } from "./StoreHeader";
import { StoreNavTabs } from "./StoreNavTabs";
import type { StoreDetail } from "../types";

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

  const [productsCount, auctionsCount, preOrdersCount] = storeId
    ? await Promise.all([
        productRepository
          .list({ filters: `storeId==${storeId},status==published,isAuction==false,isPreOrder==false`, page: 1, pageSize: 1 })
          .then((r) => r.total)
          .catch(() => 0),
        productRepository
          .list({ filters: `storeId==${storeId},status==published,isAuction==true`, page: 1, pageSize: 1 })
          .then((r) => r.total)
          .catch(() => 0),
        productRepository
          .list({ filters: `storeId==${storeId},status==published,isPreOrder==true`, page: 1, pageSize: 1 })
          .then((r) => r.total)
          .catch(() => 0),
      ])
    : [0, 0, 0];

  const tabs = [
    { value: "products", label: tabLabel("Products", productsCount), href: String(ROUTES.PUBLIC.STORE_PRODUCTS(storeSlug)) },
    { value: "auctions", label: tabLabel("Auctions", auctionsCount), href: String(ROUTES.PUBLIC.STORE_AUCTIONS(storeSlug)) },
    { value: "pre-orders", label: tabLabel("Pre-Orders", preOrdersCount), href: String(ROUTES.PUBLIC.STORE_PRE_ORDERS(storeSlug)) },
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
