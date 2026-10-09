import { sieveFilter, SIEVE_OP } from "@mohasinac/appkit";
import { sortBy } from "../../../constants/sort";
import { CATEGORY_FIELDS } from "../../../constants/field-names";
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
  /**
   * @deprecated Accepted and ignored. Kept so the consumer page shim compiles
   * either way; remove once no caller passes it.
   */
  searchParams?: SearchParams;
}

/**
 * The categories index.
 *
 * 🛑 This view deliberately performs NO Firestore read.
 *
 * It used to fetch `pageSize: 200` and hand the result to
 * `CategoriesIndexListing` as `initialData` — which destructured it as
 * `initialData: _` and threw it away, then fetched `/api/categories?flat=true`
 * regardless. So the read was 200 documents per render, on a route that
 * regenerated every 300s, rendering nothing. Measured 2026-10-09 while tracing
 * 2.1M Firestore reads/week against a 50K/day free tier.
 *
 * Deleting it also removes this page from Root Cause #30's blast radius
 * entirely: you cannot freeze the wrong data under a `staleTime: Infinity` key
 * you never seeded. The long "MUST MATCH CategoriesIndexListing's DEFAULT_SORT"
 * warning that used to live here is now moot for the same reason — there is no
 * second parser to keep in sync.
 *
 * Unlike the other listing pages, making this one static costs no SEO: its grid
 * was already client-rendered, so there was never a server-rendered grid to
 * lose (contrast `/products`, where the grid IS in the SSR HTML and must stay).
 */
export async function CategoriesIndexPageView(_props: CategoriesIndexPageViewProps = {}) {
  return (
    <Main>
      <Section padding="y-2xl">
        <Container size="xl">
          <Heading level={1} className="mb-8" color="primary" size="3xl" weight="semibold">
            Categories
          </Heading>
          <AdSlot id="listing-sidebar-top" className="mb-6" />
          <CategoriesIndexListing />
          <AdSlot id="listing-sidebar-bottom" className="mt-8" />
        </Container>
      </Section>
    </Main>
  );
}
