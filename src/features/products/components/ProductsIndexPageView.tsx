import React from "react";
import { ROUTES } from "../../../constants";
import { Container, Div, Heading, Main, Section, Text, TextLink } from "../../../ui";
import { AdSlot } from "../../homepage/components/AdSlot";
import { ProductsIndexListing } from "./ProductsIndexListing";
import { PRODUCT_FIELDS } from "../../../constants/field-names";
import { TABLE_KEYS } from "../../../constants/table-keys";
import { sortBy } from "../../../constants/sort";
import { GENERIC_PRODUCT_LISTING_TYPES } from "../constants/listing-tabs";
import { pluginFor } from "../../../_internal/shared/listing-types/_registry";
import {
  listPublicProducts,
  parsePublicProductParams,
  defaultAvailabilityForListingTypes,
} from "../../../_internal/server/features/products/list-public";
import { parseSelectedListingTypes } from "../utils/listing-type";

type SearchParams = Record<string, string | string[]>;

const DEFAULT_PAGE_SIZE = 24;
const DEFAULT_SORT = sortBy(PRODUCT_FIELDS.CREATED_AT);

export interface ProductsIndexPageViewProps {
  searchParams?: SearchParams;
}

export async function ProductsIndexPageView({ searchParams = {} }: ProductsIndexPageViewProps) {
  // The availability scope is derived from the same helper the client reads
  // its default from — a hardcoded default here would disagree with the
  // client, and `staleTime: Infinity` would freeze that disagreement
  // (Root Cause #30).
  const raw = searchParams[TABLE_KEYS.LISTING_TYPE];
  const selectedTypes = parseSelectedListingTypes(Array.isArray(raw) ? raw[0] : raw);

  // A selection naming ONLY types outside the general catalogue (a bookmark or
  // an inbound link from before /products was narrowed) must be sent to the
  // dedicated page that owns them. Without this, `narrowed = selected ∩ span`
  // is empty and listPublicProducts falls back to the FULL span — so
  // /products?listingType=auction would silently render the general catalogue
  // and look like the auctions had vanished.
  //
  // Only redirect when the out-of-span types agree on one destination: `art`
  // and `stickers` both point at /art, so that pair still resolves, whereas
  // auction+pre-order genuinely has no single home and is better served by
  // dropping the filter.
  const outOfSpan = selectedTypes.filter(
    (t) => !GENERIC_PRODUCT_LISTING_TYPES.includes(t),
  );
  if (outOfSpan.length > 0 && outOfSpan.length === selectedTypes.length) {
    const destinations = new Set(
      outOfSpan.map((t) => pluginFor(t).browseRoute).filter((r): r is string => Boolean(r)),
    );
    if (destinations.size === 1) {
      const [destination] = [...destinations];
      // Carry the search term only. Sort keys are per-type (Root Cause #63) —
      // forwarding a /products sort to /auctions would name a field that page's
      // config never offers, which drops the sort silently rather than loudly.
      const q = searchParams[TABLE_KEYS.QUERY];
      const term = (Array.isArray(q) ? q[0] : q)?.trim();
      const { redirect } = await import("next/navigation");
      redirect(term ? `${destination}?${TABLE_KEYS.QUERY}=${encodeURIComponent(term)}` : destination);
    }
  }

  const effectiveTypes =
    selectedTypes.length > 0 ? selectedTypes : GENERIC_PRODUCT_LISTING_TYPES;

  // See ArtStickersListView — one shared filter implementation with
  // /api/products, so SSR and the client refetch agree by construction.
  const products = await listPublicProducts(
    parsePublicProductParams(searchParams, {
      listingTypes: GENERIC_PRODUCT_LISTING_TYPES,
      pageSize: DEFAULT_PAGE_SIZE,
      sorts: DEFAULT_SORT,
      ...defaultAvailabilityForListingTypes(effectiveTypes),
    }),
  );

  return (
    <Main>
      {/* Page header */}
      <Section border="bottom-subtle" paddingY="b-md" padding="t-xl">
        <Container size="xl">
          <Heading level={1} size="3xl" weight="bold" color="primary">
            Products
          </Heading>
          <Text className="mt-1" color="muted" size="sm">
            Discover amazing products and deals
          </Text>
          <Div className="mt-3">
            <TextLink
              variant="bare"
              href={String(ROUTES.PUBLIC.AUCTIONS)}
              rounded="full"
              paddingX="sm"
              paddingY="2xs"
              size="xs"
              weight="medium"
              layout="inline-flex"
              align="center"
              gap="sm"
              className="border border-primary/30 bg-primary/10 text-primary-700 dark:text-primary-400 hover:bg-primary/15 transition-colors"
            >
              🏷️ Looking for unique deals? Browse Auctions →
            </TextLink>
          </Div>
        </Container>
      </Section>

      {/* Listing with sticky toolbar */}
      <Container size="xl" padding="x-md">
        <AdSlot id="listing-sidebar-top" className="mb-4 mt-4" />
        <ProductsIndexListing initialData={products} />
        <AdSlot id="listing-sidebar-bottom" className="mt-8" />
      </Container>
    </Main>
  );
}
