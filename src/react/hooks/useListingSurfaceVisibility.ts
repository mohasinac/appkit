"use client";

import { useSiteSettings } from "../../core/hooks/useSiteSettings";
import type { ListingType } from "../../features/products/types/index";
import {
  ALL_LISTING_TYPES,
  isListingSurfaceVisible,
  isCountedSurfaceVisible,
  type SurfaceCountSnapshot,
} from "../../_internal/shared/listing-types/feature-flags";

/**
 * Which public browse surfaces should be LINKED — the admin flag, minus the
 * ones measured as having nothing in them.
 *
 * ## 🛑 Why this is not a change to `useListingTypeFlags`
 *
 * That hook answers a different question — *"does this marketplace sell X?"* —
 * and its main consumer is the seller's type dropdown. A seller must still be
 * able to list the first spare part when there are zero spares, so folding
 * emptiness into it would make the catalogue unfillable the moment it emptied:
 * the only control that could add stock would disappear for want of stock.
 * Same split as `enabledListingTypes` vs `visibleListingTypes`.
 *
 * So: `useListingTypeFlags` for anything AUTHORING, this for anything
 * BROWSING.
 *
 * ## 🛑 Defaults to VISIBLE while settings load
 *
 * Same reasoning as `useBrowsePageFlags`, and it bites harder here. This hook
 * decides whether a nav entry renders, and `surfaceCounts` is absent from the
 * payload until the rollup has run at least once — so a restrictive default
 * would blank most of the navbar on every cold load, and would blank it
 * permanently on an install whose job has never run.
 *
 * `isListingSurfaceVisible` encodes the rule (absent count → visible); this
 * hook only supplies it with data. Do not re-derive the comparison here.
 */
export type ListingSurfaceVisibility = Record<ListingType, boolean> & {
  /** True when the type's browse surface should be linked. */
  isVisible: (type: ListingType) => boolean;
  /**
   * True when a non-listing-type surface (`"reviews"`) should be linked.
   * Absent measurement → true.
   */
  isSurfaceVisible: (surface: string) => boolean;
  /**
   * True when a link may be shown — it points at no listing-type surface, or
   * at one that is visible. Pass an href straight from a nav/footer constant,
   * together with the href→types map the caller owns.
   */
  allowsTypes: (types: readonly ListingType[] | undefined) => boolean;
};

export function useListingSurfaceVisibility(): ListingSurfaceVisibility {
  const { data } = useSiteSettings<{
    listings?: { listingTypes?: Partial<Record<ListingType, boolean>> };
    surfaceCounts?: SurfaceCountSnapshot;
  }>();

  const settings = { listings: { listingTypes: data?.listings?.listingTypes } };
  const counts = data?.surfaceCounts;

  const flags = Object.fromEntries(
    ALL_LISTING_TYPES.map((t) => [t, isListingSurfaceVisible(t, settings, counts)]),
  ) as Record<ListingType, boolean>;

  return {
    ...flags,
    isVisible: (type) => flags[type],
    isSurfaceVisible: (surface) => isCountedSurfaceVisible(surface, counts),
    /*
     * ANY of the types, not every — matching the existing footer rule, whose
     * comment states it: "/art stays reachable when stickers are off and art
     * is on." A shared page is empty only when every type it spans is.
     */
    allowsTypes: (types) => !types || types.length === 0 || types.some((t) => flags[t]),
  };
}
