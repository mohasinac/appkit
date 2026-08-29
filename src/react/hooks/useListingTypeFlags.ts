"use client";

import { useSiteSettings } from "../../core/hooks/useSiteSettings";
import type { ListingType } from "../../features/products/types/index";
import { ALL_LISTING_TYPES } from "../../_internal/shared/listing-types/feature-flags";

/**
 * W1-43 — useListingTypeFlags
 *
 * Returns the enabled-state for each listing type as configured in
 * `siteSettings.listings.listingTypes`. Consumers should hide nav items,
 * filter TypeDropdown options, and reject API requests for disabled types.
 *
 * Defaults to all-enabled when settings haven't loaded yet — match the
 * permissive default used by `DEFAULT_SITE_SETTINGS_DATA` so first paint
 * doesn't briefly hide enabled features.
 *
 * KEYED ON THE UNION, NOT A HAND-WRITTEN LIST (2026-08-21). Both types below
 * used to enumerate seven types by hand and had never been updated for `art`
 * and `stickers` — so `isEnabled("art")` didn't even typecheck, and the seller
 * TypeDropdown (its main consumer) could not offer either type. Deriving from
 * `ListingType` makes a missing member a compile error, matching the same
 * decision made for `ALL_LISTING_TYPES_MAP` in `feature-flags.ts`.
 */
export type ListingTypeFlagsShape = Partial<Record<ListingType, boolean>>;

export type ListingTypeFlags = Record<ListingType, boolean> & {
  /** True when the listing type is enabled (or the setting hasn't loaded yet). */
  isEnabled: (type: ListingType) => boolean;
};

export function useListingTypeFlags(): ListingTypeFlags {
  const { data } = useSiteSettings<{
    listings?: { listingTypes?: ListingTypeFlagsShape };
  }>();

  const lt = data?.listings?.listingTypes;

  // A type is disabled only when EXPLICITLY set to false — a missing flag (or
  // settings that haven't loaded) means enabled.
  const flags = Object.fromEntries(
    ALL_LISTING_TYPES.map((type) => [type, lt?.[type] !== false]),
  ) as Record<ListingType, boolean>;

  return {
    ...flags,
    isEnabled: (type) => flags[type],
  };
}
