import React from "react";
import { Container, Div, Heading, Main, Section, Text } from "../../../ui";
import { AdSlot } from "../../homepage/components/AdSlot";
import { ProductsIndexListing } from "./ProductsIndexListing";
import { PRODUCT_FIELDS } from "../../../constants/field-names";
import { sortBy } from "../../../constants/sort";
import {
  ART_STICKERS_TYPE_FILTER_TABS,
  ART_STICKERS_LISTING_TYPES,
} from "../constants/listing-tabs";
import {
  listPublicProducts,
  parsePublicProductParams,
  defaultTogglesForListingTypes,
} from "../../../_internal/server/features/products/list-public";

type SearchParams = Record<string, string | string[]>;

const DEFAULT_PAGE_SIZE = 24;
const DEFAULT_SORT = sortBy(PRODUCT_FIELDS.CREATED_AT);

export interface ArtStickersListViewProps {
  searchParams?: SearchParams;
}

export async function ArtStickersListView({ searchParams = {} }: ArtStickersListViewProps) {
  // Filter semantics live in `listPublicProducts`, shared verbatim with
  // /api/products — so the SSR first paint and the client's refetch can never
  // disagree about what the default view means (Root Cause #30).
  const result = await listPublicProducts(
    parsePublicProductParams(searchParams, {
      listingTypes: ART_STICKERS_LISTING_TYPES,
      pageSize: DEFAULT_PAGE_SIZE,
      sorts: DEFAULT_SORT,
      // Derived, so this page and ProductsIndexListing can never disagree
      // about the default view (Root Cause #30).
      ...defaultTogglesForListingTypes(ART_STICKERS_LISTING_TYPES),
    }),
  );

  return (
    <Main>
      <Section border="bottom-subtle" paddingY="b-md" padding="t-xl">
        <Container size="xl">
          <Heading level={1} size="3xl" weight="bold" color="primary">
            Art & Stickers
          </Heading>
          <Text className="mt-1" color="muted" size="sm">
            Original art prints and sticker packs from independent sellers
          </Text>
        </Container>
      </Section>

      <Container size="xl" padding="x-md">
        <AdSlot id="listing-sidebar-top" className="mb-4 mt-4" />
        <ProductsIndexListing
          initialData={result ?? null}
          listingTypes={ART_STICKERS_LISTING_TYPES}
          typeTabs={ART_STICKERS_TYPE_FILTER_TABS}
          searchPlaceholder="Search art & stickers..."
        />
        <AdSlot id="listing-sidebar-bottom" className="mt-8" />
      </Container>
    </Main>
  );
}
