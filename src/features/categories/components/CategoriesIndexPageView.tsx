import { sieveFilter, SIEVE_OP } from "@mohasinac/appkit";
import React from "react";
import { categoriesRepository } from "../../../repositories";
import { Container, Heading, Main, Section } from "../../../ui";
import { AdSlot } from "../../homepage/components/AdSlot";
import { CategoriesIndexListing } from "./CategoriesIndexListing";
import type { CategoryItem } from "../types";

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

  const result = await categoriesRepository
    .list({
      page,
      pageSize: 200,
      sorts: sort,
      ...(filters ? { filters } : {}),
    })
    .catch(() => null);

  const initialData = (result?.items ?? []) as unknown as CategoryItem[];

  return (
    <Main>
      <Section className="py-10">
        <Container size="xl">
          <Heading level={1} className="mb-8 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
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
