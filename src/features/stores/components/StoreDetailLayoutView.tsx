import React, { cache } from "react";
import type { ReactNode } from "react";
import { storeRepository } from "../repository/store.repository";
import { siteSettingsRepository } from "../../admin/repository/site-settings.repository";
import { safeRead } from "../../../errors/safe-read";
import { Container } from "../../../ui/components/Layout";
import { Main, Section } from "../../../ui/components/Semantic";
import { Text } from "../../../ui/components/Typography";
import { getSellerTrustStatus } from "../../scams/actions/scam-actions";
import { StoreHeader } from "./StoreHeader";
import { StoreNavTabs } from "./StoreNavTabs";
import { toStoreDetail } from "../../../_internal/server/features/stores/adapters";
import { resolveStoreTabs } from "../../../_internal/server/features/stores/tabs";

// The store IS this layout's subject, and `findBySlug` already returns null for
// "no such slug" — swallowing a read failure into the same value would render
// the "Store not found." branch below for a live store during an outage.
export const getStoreBySlug = cache((slug: string) =>
  storeRepository.findBySlug(slug),
);

export interface StoreDetailLayoutViewProps {
  storeSlug: string;
  /** The current active tab value: "products" | "collector-drops" | "reviews" | "about" */
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
    safeRead(() => siteSettingsRepository.findById("global"), {
      route: "/stores/[slug]", key: "store.siteSettings", fallback: null,
    }),
    scamRegistryEnabled && storeId
      // Fails open to "no trust verdict", which hides the badge entirely rather
      // than asserting a seller is clear — but that has to be recorded, since a
      // missing badge is exactly what a clean seller looks like.
      ? safeRead<Awaited<ReturnType<typeof getSellerTrustStatus>> | undefined>(
          () => getSellerTrustStatus(storeId),
          { route: "/stores/[slug]", key: "store.sellerTrust", fallback: undefined },
        )
      : Promise.resolve(undefined),
  ]);

  // Single source of truth shared with the bare `/stores/[slug]` redirect
  // (`getDefaultStoreTabPath`) — both need "which tabs actually have
  // something in them, in what order", and computing that twice is the
  // duplicated-predicate shape Root Cause #73 warns about.
  const { dropdownTabs, tabs } = await resolveStoreTabs(storeSlug, storeId, settings);

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
