import React from "react";
import { categoriesRepository } from "../../../repositories";
import { Container, Heading, Main, Section, Text } from "../../../ui";
import { AdSlot } from "../../homepage/components/AdSlot";
import { CategoryBundlesListing } from "./CategoryBundlesListing";

type SearchParams = Record<string, string | string[]>;

const DEFAULT_LIMIT = 200;

function sp(params: SearchParams, key: string): string {
  const v = params[key];
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

export interface BundlesListViewProps {
  searchParams?: SearchParams;
  onBuyNow?: (input: { bundleSlug: string }) => Promise<unknown>;
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
}: BundlesListViewProps) {
  const storeId = sp(searchParams, "storeId");

  const all = await categoriesRepository
    .listByType("bundle", { activeOnly: true, limit: DEFAULT_LIMIT })
    .catch(() => []);

  const bundles = storeId
    ? all.filter((c) => c.createdByStoreId === storeId)
    : all;

  return (
    <Main>
      <Section className="py-10">
        <Container size="xl">
          <Heading
            level={1}
            className="mb-2 text-3xl font-semibold text-zinc-900 dark:text-zinc-100"
          >
            Collectible Bundles
          </Heading>
          <Text className="mb-6 text-[var(--appkit-color-text-muted)]" size="sm">
            Curated multi-product bundles — Pokémon starter sets, Beyblade
            tournament packs, Hot Wheels collector boxes and more. One price,
            one checkout, one shipment.
          </Text>
          <AdSlot id="listing-sidebar-top" className="mb-6" />
          <CategoryBundlesListing initialBundles={bundles} onBuyNow={onBuyNow} />
          <AdSlot id="listing-sidebar-bottom" className="mt-8" />
        </Container>
      </Section>
    </Main>
  );
}
