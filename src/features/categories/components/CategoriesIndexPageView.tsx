import { sieveFilter, SIEVE_OP } from "@mohasinac/appkit";

import React from "react";

import { Container, Heading, Main, Section } from "../../../ui";
import { AdSlot } from "../../homepage/components/AdSlot";
import { CategoriesIndexListing } from "./CategoriesIndexListing";
import { firstParam } from "../../../utils/search-params";
import type { SearchParamsRecord } from "../../../utils/search-params";

export interface CategoriesIndexPageViewProps {
  /**
   * @deprecated Accepted and ignored. Kept so the consumer page shim compiles
   * either way; remove once no caller passes it.
   */
  searchParams?: SearchParamsRecord;
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
