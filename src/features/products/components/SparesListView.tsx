/*
 * WHY: `spares` is kept out of the general catalogue, and the rule for that
 *      flag is nav reachability — a type excluded from `/products` must own a
 *      page the main nav links, or it is reachable from nowhere (Root Cause
 *      #61). This is that page.
 * WHAT: The public `/spares` browse page.
 *
 * 🛑 A REAL page, not a redirect shim like `/live`'s. A shim pointing back at
 * `/products` would re-open the exact hole `inGeneralCatalogue: false` creates,
 * while looking like it had closed it.
 *
 * 🛑 There is no TYPE filter chip row, deliberately — this page spans ONE
 * listing type, so a chip group would offer a single chip that changes nothing.
 * `/art` has one because it genuinely spans two.
 *
 * EXPORTS: SparesListView
 *
 * @tag domain:products
 * @tag layer:feature
 * @tag pattern:ssr-list
 * @tag access:server
 * @tag consumers:app/[locale]/spares
 * @tag sideEffects:none
 */

import React from "react";
import { Container, Heading, Main, Section, Text, TextLink } from "../../../ui";
import { AdSlot } from "../../homepage/components/AdSlot";
import { ProductsIndexListing } from "./ProductsIndexListing";
import { PRODUCT_FIELDS } from "../../../constants/field-names";
import { sortBy } from "../../../constants/sort";
import { ROUTES } from "../../../next/routing/route-map";
import type { ListingType } from "../types/index";
import {
  listPublicProducts,
  parsePublicProductParams,
  defaultAvailabilityForListingTypes,
} from "../../../_internal/server/features/products/list-public";

type SearchParams = Record<string, string | string[]>;

const DEFAULT_PAGE_SIZE = 24;
const DEFAULT_SORT = sortBy(PRODUCT_FIELDS.CREATED_AT);

/** The one type this page spans. Named so the two call sites cannot disagree. */
const SPARES_LISTING_TYPES: readonly ListingType[] = ["spares"];

export interface SparesListViewProps {
  searchParams?: SearchParams;
}

export async function SparesListView({ searchParams = {} }: SparesListViewProps) {
  /*
   * Filter semantics live in `listPublicProducts`, shared verbatim with
   * `/api/products`, so the SSR first paint and the client's refetch cannot
   * disagree about what the default view means. That matters more here than it
   * looks: every public listing hook sets `staleTime: Infinity` once given SSR
   * `initialData`, so a disagreement is FROZEN for that query key and no
   * refetch ever repairs it (Root Cause #30).
   */
  const result = await listPublicProducts(
    parsePublicProductParams(searchParams, {
      listingTypes: SPARES_LISTING_TYPES,
      pageSize: DEFAULT_PAGE_SIZE,
      sorts: DEFAULT_SORT,
      // Derived from the plugin's own `hideDefault`, so this page and
      // `ProductsIndexListing` cannot mirror two different literals.
      ...defaultAvailabilityForListingTypes(SPARES_LISTING_TYPES),
    }),
  );

  return (
    <Main>
      <Section border="bottom-subtle" paddingY="b-md" padding="t-xl">
        <Container size="xl">
          <Heading level={1} size="3xl" weight="bold" color="primary">
            Spares
          </Heading>
          <Text className="mt-1" color="muted" size="sm">
            Single components off disassembled tops — attack rings, weight disks,
            drivers, bits. Sellers list what they have spare; most are one of a
            kind.
          </Text>
          {/*
            * The glossary cross-link, on the page rather than only on each PDP.
            * A buyer who does not yet know whether they need a weight disk or a
            * disc has nothing to search for, and `/parts` is the page that
            * answers that — 752 classified components with what each one does.
            */}
          <Text className="mt-2" size="sm">
            Not sure which part you need?{" "}
            <TextLink href={String(ROUTES.PUBLIC.PARTS)}>
              Browse the parts glossary
            </TextLink>{" "}
            — every component, what it does, and which tops use it.
          </Text>
        </Container>
      </Section>

      <Container size="xl" padding="x-md">
        <AdSlot id="listing-sidebar-top" className="mb-4 mt-4" />
        <ProductsIndexListing
          // `undefined`, not `null` — React Query treats `null` as defined
          // data, so a failed query would freeze an empty grid forever under
          // `staleTime: Infinity`. Same reasoning as ProductsIndexPageView.
          initialData={result ?? undefined}
          listingTypes={SPARES_LISTING_TYPES}
          searchPlaceholder="Search spares by part, colour or model..."
        />
        <AdSlot id="listing-sidebar-bottom" className="mt-8" />
      </Container>
    </Main>
  );
}
