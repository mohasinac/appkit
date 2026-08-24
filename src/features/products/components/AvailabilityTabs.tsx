"use client";
/*
 * WHY: Every listing surface used to carry a "Show sold" / "Show ended" /
 *      "Show closed" pill that WIDENED the list — flipping it mixed dead rows
 *      into the live ones, so there was no way to browse the archive on its
 *      own, and no way to be sure the default view was clean. Three URL
 *      spellings of one intent had also accumulated, and each listing page
 *      hand-built its own toggle array, so the label and the SSR default
 *      drifted apart per page.
 *
 * WHAT: One three-tab scope bar — Available / <Sold & Ended> / All — shared by
 *       the public browse pages, the store tabs, the category and brand
 *       panels, and the admin/seller dashboards. The middle label is DERIVED
 *       from each listing type's `hideDefault`, so /auctions reads "Ended",
 *       /art reads "Sold", and /products reads "Sold & Ended".
 *
 * EXPORTS: AvailabilityTabs, AvailabilityTabsProps
 *
 * @tag domain:products
 * @tag layer:ui
 * @tag pattern:none
 * @tag access:client
 * @tag consumers:ProductsIndexListing,AuctionsIndexListing,PreOrdersIndexListing,PrizeDrawsIndexListing,Store*Listing,CategoryProductsListing,Seller*View,Admin*View
 * @tag sideEffects:url-mutation
 */

import React, { useMemo } from "react";
import { Tabs, TabsList, TabsTrigger } from "../../../ui";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { TABLE_KEYS } from "../../../constants/table-keys";
import { AVAILABILITY_VALUES } from "../../../constants/field-names";
import { availabilityTabsFor } from "../../../_internal/shared/listing-types/_registry";
import type { ListingType } from "../types";

export interface AvailabilityTabsProps {
  /**
   * The listing types the surface spans. Drives the middle tab's wording only
   * — the scope itself means the same thing for every type.
   */
  types: readonly ListingType[];
  className?: string;
}

export function AvailabilityTabs({ types, className }: AvailabilityTabsProps) {
  const table = useUrlTable();
  const tabs = useMemo(() => availabilityTabsFor(types), [types]);

  // An absent param is the Available scope — the same default every SSR
  // filter-builder resolves through `defaultAvailabilityForListingTypes`.
  // Reading a different default here is precisely how SSR and the first
  // refetch end up permanently disagreeing (Root Cause #30).
  const active = table.get(TABLE_KEYS.AVAILABILITY) || AVAILABILITY_VALUES.AVAILABLE;

  return (
    <Tabs
      value={active}
      // A single `set`, never followed by `setPage`. `useUrlTable.set` already
      // resets the page for any key outside NON_RESETTING_KEYS, and a
      // follow-up call would read stale searchParams and overwrite this one
      // (Root Cause #13).
      onChange={(next) => table.set(TABLE_KEYS.AVAILABILITY, next)}
      className={className}
    >
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
