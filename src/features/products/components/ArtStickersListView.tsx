import React from "react";
import { productRepository } from "../../../repositories";
import { Container, Div, Heading, Main, Section, Text } from "../../../ui";
import { AdSlot } from "../../homepage/components/AdSlot";
import { parseListingSearchParams } from "../../../utils/listing-params";
import { ProductsIndexListing } from "./ProductsIndexListing";
import { PRODUCT_FIELDS } from "../../../constants/field-names";
import { sieveFilter, sieveMultiEq, sieveAnd, SIEVE_OP } from "../../../utils/sieve-builder";
import { sortBy } from "../../../constants/sort";
import { ART_STICKERS_TYPE_FILTER_TABS } from "../constants/listing-tabs";

type SearchParams = Record<string, string | string[]>;

const ART_STICKERS_LISTING_TYPES = ["art", "stickers"] as const;
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 24;
const DEFAULT_SORT = sortBy(PRODUCT_FIELDS.CREATED_AT);

function sp(params: SearchParams, key: string): string {
  const v = params[key];
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

function buildArtStickersFilters(params: SearchParams): string {
  const listingTypeParam = sp(params, "listingType");
  const listingType =
    listingTypeParam && (ART_STICKERS_LISTING_TYPES as readonly string[]).includes(listingTypeParam)
      ? listingTypeParam
      : ART_STICKERS_LISTING_TYPES.join("|");
  const parts: string[] = [
    sieveFilter(PRODUCT_FIELDS.STATUS, SIEVE_OP.EQ, PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED),
    sieveFilter(PRODUCT_FIELDS.LISTING_TYPE, SIEVE_OP.EQ, listingType),
  ];
  const condition = sp(params, "condition");
  if (condition) {
    const values = condition.split("|").filter(Boolean);
    if (values.length === 1) parts.push(sieveFilter(PRODUCT_FIELDS.CONDITION, SIEVE_OP.EQ, values[0]));
    else if (values.length > 1) parts.push(sieveMultiEq(PRODUCT_FIELDS.CONDITION, values));
  }
  const minPrice = sp(params, "minPrice");
  const maxPrice = sp(params, "maxPrice");
  if (minPrice) parts.push(sieveFilter(PRODUCT_FIELDS.PRICE, SIEVE_OP.GTE, minPrice));
  if (maxPrice) parts.push(sieveFilter(PRODUCT_FIELDS.PRICE, SIEVE_OP.LTE, maxPrice));
  const storeId = sp(params, "seller");
  if (storeId) parts.push(sieveFilter(PRODUCT_FIELDS.STORE_ID, SIEVE_OP.EQ, storeId));
  return sieveAnd(...parts);
}

export interface ArtStickersListViewProps {
  searchParams?: SearchParams;
}

export async function ArtStickersListView({ searchParams = {} }: ArtStickersListViewProps) {
  const std = parseListingSearchParams(searchParams);
  const sort = std.sorts ?? DEFAULT_SORT;
  const page = std.page ?? DEFAULT_PAGE;
  const pageSize = std.pageSize ?? DEFAULT_PAGE_SIZE;
  const filters = buildArtStickersFilters(searchParams);

  const result = await productRepository
    .list({ filters, sorts: sort, page, pageSize })
    .catch(() => null);

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
