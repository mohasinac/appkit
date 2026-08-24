"use client";
/*
 * WHY: Wiring the availability scope into a `DataListingView` is the same four
 *      moves every time — read the URL param, default it to "available", put it
 *      on the wire as an extra param, and mount the tab bar in the
 *      `renderAboveContent` slot. Fourteen dashboard views need it, which is
 *      well past the Duplication Framework's Rule of Three; hand-copying it
 *      would also mean fourteen chances to get the default wrong, and a wrong
 *      default is Root Cause #30 in its purest form.
 *
 * WHAT: One hook returning exactly the three fields a `ListingViewConfig`
 *       needs to gain the scope bar.
 *
 * WHY `extraParams` AND NOT `filterKeys`: the scope is a tab, not a drawer
 *      facet. Registering it in `filterKeys` would inflate the filter-drawer
 *      badge for a tab selection and let the drawer's Clear button silently
 *      reset the scope. `buildExtraParams` is the documented seam for a filter
 *      Sieve cannot express as one clause — which this is, because "unavailable"
 *      means a different field per listing type.
 *
 * EXPORTS: useAvailabilityScope, AvailabilityScope
 *
 * @tag domain:products
 * @tag layer:hook
 * @tag pattern:none
 * @tag access:client
 * @tag consumers:Seller*View,Admin*View,buildListingTypeListingConfig
 * @tag sideEffects:none
 */

import React from "react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { TABLE_KEYS } from "../../../constants/table-keys";
import { AVAILABILITY_VALUES, type AvailabilityFilter } from "../../../constants/field-names";
import { AvailabilityTabs } from "../components/AvailabilityTabs";
import type { ListingType } from "../types";

export interface AvailabilityScope {
  availability: AvailabilityFilter;
  /** Spread into `ListingViewConfig.buildExtraParams`'s return value. */
  extraParams: { availability: AvailabilityFilter };
  /** Assign to `ListingViewConfig.renderAboveContent`. */
  renderAboveContent: () => React.ReactNode;
}

export function useAvailabilityScope(
  types: readonly ListingType[],
): AvailabilityScope {
  // A second, independent `useUrlTable()` against the same URL as
  // DataListingView's own instance. Safe by design — the hook holds no local
  // state, so both instances read the same searchParams and stay in sync.
  const table = useUrlTable();
  const availability =
    (table.get(TABLE_KEYS.AVAILABILITY) as AvailabilityFilter) ||
    AVAILABILITY_VALUES.AVAILABLE;

  return {
    availability,
    extraParams: { availability },
    renderAboveContent: () => <AvailabilityTabs types={types} />,
  };
}
