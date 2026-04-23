import React from "react";
import type { ReactNode } from "react";
import { storeRepository } from "../../../repositories";
import { ROUTES } from "../../../next";
import { Container, Main, Section } from "../../../ui";
import { StoreHeader } from "./StoreHeader";
import { StoreNavTabs } from "./StoreNavTabs";
import type { StoreDetail } from "../types";

export interface StoreDetailLayoutViewProps {
  storeSlug: string;
  /** The current active tab value: "products" | "auctions" | "reviews" | "about" */
  activeTab: string;
  children: ReactNode;
}

export async function StoreDetailLayoutView({
  storeSlug,
  activeTab,
  children,
}: StoreDetailLayoutViewProps) {
  const store = await storeRepository.findBySlug(storeSlug).catch(() => undefined);

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

  const tabs = [
    { value: "products", label: "Products", href: String(ROUTES.PUBLIC.STORE_PRODUCTS(storeSlug)) },
    { value: "auctions", label: "Auctions", href: String(ROUTES.PUBLIC.STORE_AUCTIONS(storeSlug)) },
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
