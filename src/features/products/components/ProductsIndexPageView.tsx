import React from "react";
import { productRepository } from "../../../repositories";
import { ROUTES } from "../../../constants";
import { Container, Div, Heading, Main, Section, Text } from "../../../ui";
import { AdSlot } from "../../homepage/components/AdSlot";
import { parseListingSearchParams } from "../../../utils/listing-params";
import { ProductsIndexListing } from "./ProductsIndexListing";
import { PRODUCT_FIELDS } from "../../../constants/field-names";
import { sieveFilter, sieveMultiEq, sieveAnd, SIEVE_OP } from "../../../utils/sieve-builder";
import { sortBy } from "../../../constants/sort";

type SearchParams = Record<string, string | string[]>;

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 24;
const DEFAULT_SORT = sortBy(PRODUCT_FIELDS.CREATED_AT);

function sp(params: SearchParams, key: string): string {
  const v = params[key];
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

function buildProductFilters(params: SearchParams): string {
  const parts: string[] = [
    sieveFilter(PRODUCT_FIELDS.STATUS, SIEVE_OP.EQ, PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED),
    sieveFilter(PRODUCT_FIELDS.LISTING_TYPE, SIEVE_OP.EQ, "standard"),
  ];
  const condition = sp(params, "condition");
  if (condition) {
    const values = condition.split("|").filter(Boolean);
    if (values.length === 1) parts.push(sieveFilter(PRODUCT_FIELDS.CONDITION, SIEVE_OP.EQ, values[0]));
    // BUG FIX: pipe is invalid for ==; expand to multiple AND clauses
    else if (values.length > 1) parts.push(sieveMultiEq(PRODUCT_FIELDS.CONDITION, values));
  }
  const minPrice = sp(params, "minPrice");
  const maxPrice = sp(params, "maxPrice");
  if (minPrice) parts.push(sieveFilter(PRODUCT_FIELDS.PRICE, SIEVE_OP.GTE, minPrice));
  if (maxPrice) parts.push(sieveFilter(PRODUCT_FIELDS.PRICE, SIEVE_OP.LTE, maxPrice));
  const storeId = sp(params, "seller");
  if (storeId) parts.push(sieveFilter(PRODUCT_FIELDS.STORE_ID, SIEVE_OP.EQ, storeId));
  const freeShipping = sp(params, "freeShipping");
  if (freeShipping === "true") {
    parts.push(sieveFilter(PRODUCT_FIELDS.SHIPPING_PAID_BY, SIEVE_OP.EQ, PRODUCT_FIELDS.SHIPPING_PAID_BY_VALUES.SELLER));
  }
  return sieveAnd(...parts);
}

export interface ProductsIndexPageViewProps {
  searchParams?: SearchParams;
}

export async function ProductsIndexPageView({ searchParams = {} }: ProductsIndexPageViewProps) {
  const std = parseListingSearchParams(searchParams);
  const sort = std.sorts ?? DEFAULT_SORT;
  const page = std.page ?? DEFAULT_PAGE;
  const pageSize = std.pageSize ?? DEFAULT_PAGE_SIZE;
  const filters = buildProductFilters(searchParams);

  const result = await productRepository
    .list({
      filters,
      sorts: sort,
      page,
      pageSize,
    })
    .catch(() => null);

  const products = result ?? null;

  return (
    <Main>
      {/* Page header */}
      <Section className="pt-8 pb-4 border-b border-zinc-100 dark:border-slate-800">
        <Container size="xl">
          <Heading level={1} size="3xl" weight="bold" color="primary">
            Products
          </Heading>
          <Text className="mt-1" color="muted" size="sm">
            Discover amazing products and deals
          </Text>
          <Div className="mt-3">
            <a
              href={ROUTES.PUBLIC.AUCTIONS}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary-700 dark:text-primary-400 hover:bg-primary/15 transition-colors"
            >
              🏷️ Looking for unique deals? Browse Auctions →
            </a>
          </Div>
        </Container>
      </Section>

      {/* Listing with sticky toolbar */}
      <Container size="xl" className="px-4">
        <AdSlot id="listing-sidebar-top" className="mb-4 mt-4" />
        <ProductsIndexListing initialData={products} />
        <AdSlot id="listing-sidebar-bottom" className="mt-8" />
      </Container>
    </Main>
  );
}
