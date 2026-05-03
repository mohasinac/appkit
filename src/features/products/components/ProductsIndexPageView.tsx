import React from "react";
import { productRepository } from "../../../repositories";
import { ROUTES } from "../../../constants";
import { Container, Heading, Main, Section } from "../../../ui";
import { AdSlot } from "../../homepage/components/AdSlot";
import { ProductsIndexListing } from "./ProductsIndexListing";

type SearchParams = Record<string, string | string[]>;

function sp(params: SearchParams, key: string): string {
  const v = params[key];
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

function buildProductFilters(params: SearchParams): string {
  const parts: string[] = ["status==published", "isAuction==false"];
  const condition = sp(params, "condition");
  if (condition) {
    const values = condition.split("|").filter(Boolean);
    if (values.length === 1) parts.push(`condition==${values[0]}`);
    else if (values.length > 1) parts.push(`condition==${values.join("|")}`);
  }
  const minPrice = sp(params, "minPrice");
  const maxPrice = sp(params, "maxPrice");
  if (minPrice) parts.push(`price>=${minPrice}`);
  if (maxPrice) parts.push(`price<=${maxPrice}`);
  const sellerId = sp(params, "seller");
  if (sellerId) parts.push(`sellerId==${sellerId}`);
  const freeShipping = sp(params, "freeShipping");
  if (freeShipping === "true") parts.push("freeShipping==true");
  return parts.join(",");
}

export interface ProductsIndexPageViewProps {
  searchParams?: SearchParams;
}

export async function ProductsIndexPageView({ searchParams = {} }: ProductsIndexPageViewProps) {
  const sort = sp(searchParams, "sort") || "-createdAt";
  const page = Number(sp(searchParams, "page")) || 1;
  const pageSize = Number(sp(searchParams, "pageSize")) || 24;
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
          <Heading level={1} className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            Products
          </Heading>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Discover amazing products and deals
          </p>
          <div className="mt-3">
            <a
              href={ROUTES.PUBLIC.AUCTIONS}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary-700 dark:text-primary-400 hover:bg-primary/15 transition-colors"
            >
              🏷️ Looking for unique deals? Browse Auctions →
            </a>
          </div>
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
