import { sieveFilter, SIEVE_OP } from "@mohasinac/appkit";
import React from "react";
import { categoriesRepository } from "../../../repositories";
import { Container, Heading, Main, Section } from "../../../ui";
import { AdSlot } from "../../homepage/components/AdSlot";
import { CategoriesIndexListing } from "./CategoriesIndexListing";
import type { CategoryItem } from "../types";
import { safeRead } from "../../../errors/safe-read";
import { hidePublicTestData } from "../../../_internal/server/features/tester/visibility";

type SearchParams = Record<string, string | string[]>;

function sp(params: SearchParams, key: string): string {
  const v = params[key];
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

function buildCategoryFilters(params: SearchParams): string {
  const parts: string[] = [];
  const isFeatured = sp(params, "isFeatured");
  if (isFeatured === "true") parts.push("isFeatured==true");
  const isBrand = sp(params, "isBrand");
  if (isBrand === "true") parts.push("isBrand==true");
  const rootOnly = sp(params, "rootOnly");
  if (rootOnly === "true") parts.push("tier==0");
  const minItemCount = sp(params, "minItemCount");
  const maxItemCount = sp(params, "maxItemCount");
  if (minItemCount) parts.push(sieveFilter("metrics.totalItemCount", SIEVE_OP.GTE, minItemCount));
  if (maxItemCount) parts.push(sieveFilter("metrics.totalItemCount", SIEVE_OP.LTE, maxItemCount));
  const tier = sp(params, "tier");
  if (tier) {
    const values = tier.split("|").filter(Boolean);
    if (values.length === 1) parts.push(sieveFilter("tier", SIEVE_OP.EQ, values[0]));
    else if (values.length > 1) parts.push(sieveFilter("tier", SIEVE_OP.EQ, values.join("|")));
  }
  return parts.join(",");
}

export interface CategoriesIndexPageViewProps {
  searchParams?: SearchParams;
}

export async function CategoriesIndexPageView({ searchParams = {} }: CategoriesIndexPageViewProps) {
  const sort = sp(searchParams, "sort") || "name";
  const page = Number(sp(searchParams, "page")) || 1;
  const filters = buildCategoryFilters(searchParams);

  const result = await safeRead(
    () =>
      categoriesRepository.list({
        page,
        pageSize: 200,
        sorts: sort,
        ...(filters ? { filters } : {}),
      }),
    { route: "/categories", key: "categories.list", fallback: null },
  );

  /*
   * This one page carries THREE entity kinds — categories, brands and bundles
   * are all `CategoryDocument` rows discriminated by `categoryType` — so a
   * single unfiltered read published sandbox fixtures of all three.
   */
  const initialData = hidePublicTestData(
    (result?.items ?? []) as unknown as (CategoryItem & { isTestData?: boolean })[],
  ) as unknown as CategoryItem[];

  return (
    <Main>
      <Section padding="y-2xl">
        <Container size="xl">
          <Heading level={1} className="mb-8" color="primary" size="3xl" weight="semibold">
            Categories
          </Heading>
          <AdSlot id="listing-sidebar-top" className="mb-6" />
          <CategoriesIndexListing initialData={initialData} />
          <AdSlot id="listing-sidebar-bottom" className="mt-8" />
        </Container>
      </Section>
    </Main>
  );
}
