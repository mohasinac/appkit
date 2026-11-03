import React from "react";
import { categoriesRepository } from "../repository/categories.repository";
import { Container } from "../../../ui/components/Layout";
import { Heading, Text } from "../../../ui/components/Typography";
import { Main, Section } from "../../../ui/components/Semantic";
import { AdSlot } from "../../homepage/components/AdSlot";
import { CategoryBundlesListing } from "./CategoryBundlesListing";
import { safeRead } from "../../../errors/safe-read";
import { hidePublicTestData } from "../../../_internal/server/features/tester/visibility";
import { firstParam } from "../../../utils/search-params";
import type { SearchParamsRecord } from "../../../utils/search-params";
import { AdminComposableRegion } from "../../dashboard/components/AdminComposableRegion";
import type { DashboardCard } from "../../../_internal/shared/features/dashboard/recent-entry";

const DEFAULT_LIMIT = 200;

export interface BundlesListViewProps {
  searchParams?: SearchParamsRecord;
  onBuyNow?: (input: { bundleSlug: string; quantity: number }) => Promise<unknown>;
  /** Admin-curated page-region cards (Phase 12). Omit for no extra content. */
  pageRegionCards?: DashboardCard[];
}

/**
 * Public `/bundles` index. Bundles live as `categoryType:"bundle"` rows on
 * the categories collection (SB-UNI-D + V), so this fetches via
 * `categoriesRepository.listByType("bundle", …)` instead of `productRepository`.
 * Optional `?storeId=…` post-filters to a single seller's bundles.
 * Sort UI is owned by `CategoryBundlesListing` (client).
 */
export async function BundlesListView({
  searchParams = {},
  onBuyNow,
  pageRegionCards = [],
}: BundlesListViewProps) {
  const storeId = firstParam(searchParams, "storeId");

  const all = await safeRead(
    () =>
      categoriesRepository.listByType("bundle", {
        activeOnly: true,
        limit: DEFAULT_LIMIT,
      }),
    { route: "/bundles", key: "categories.listByType(bundle)", fallback: [] },
  );

  const visible = hidePublicTestData(all);
  const bundles = storeId
    ? visible.filter((c) => c.createdByStoreId === storeId)
    : visible;

  return (
    <Main>
      <Section padding="y-2xl">
        <Container size="xl">
          <Heading
            level={1}
            className="mb-2" color="primary" size="3xl" weight="semibold"
          >
            Collectible Bundles
          </Heading>
          <Text className="mb-6 text-[var(--appkit-color-text-muted)]" size="sm">
            Curated multi-product bundles — Pokémon starter sets, Beyblade
            tournament packs, Hot Wheels collector boxes and more. One price,
            one checkout, one shipment.
          </Text>
          <AdminComposableRegion pageId="bundles-index" initialCards={pageRegionCards} />
          <AdSlot id="listing-sidebar-top" className="mb-6" />
          <CategoryBundlesListing initialBundles={bundles} onBuyNow={onBuyNow} />
          <AdSlot id="listing-sidebar-bottom" className="mt-8" />
        </Container>
      </Section>
    </Main>
  );
}
