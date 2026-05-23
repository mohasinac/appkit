"use client";

import { useSiteSettings } from "../../core/hooks/useSiteSettings";

/**
 * W1-43 — useListingTypeFlags
 *
 * Returns the enabled-state for each listing type as configured in
 * `siteSettings.featureFlags.listingTypes`. Consumers should hide nav items,
 * filter TypeDropdown options, and reject API requests for disabled types.
 *
 * Defaults to all-enabled when settings haven't loaded yet — match the
 * permissive default used by `DEFAULT_SITE_SETTINGS_DATA` so first paint
 * doesn't briefly hide enabled features.
 */
export type ListingTypeFlagsShape = Partial<{
  standard: boolean;
  auction: boolean;
  "pre-order": boolean;
  "prize-draw": boolean;
  classified: boolean;
  "digital-code": boolean;
  live: boolean;
}>;

export interface ListingTypeFlags {
  standard: boolean;
  auction: boolean;
  "pre-order": boolean;
  "prize-draw": boolean;
  classified: boolean;
  "digital-code": boolean;
  live: boolean;
  /** True when the listing type is enabled (or the setting hasn't loaded yet). */
  isEnabled: (
    type:
      | "standard"
      | "auction"
      | "pre-order"
      | "prize-draw"
      | "classified"
      | "digital-code"
      | "live",
  ) => boolean;
}

export function useListingTypeFlags(): ListingTypeFlags {
  const { data } = useSiteSettings<{
    featureFlags?: { listingTypes?: ListingTypeFlagsShape };
  }>();

  const lt = data?.featureFlags?.listingTypes;

  const flags: Omit<ListingTypeFlags, "isEnabled"> = {
    standard: lt?.standard !== false,
    auction: lt?.auction !== false,
    "pre-order": lt?.["pre-order"] !== false,
    "prize-draw": lt?.["prize-draw"] !== false,
    classified: lt?.classified !== false,
    "digital-code": lt?.["digital-code"] !== false,
    live: lt?.live !== false,
  };

  return {
    ...flags,
    isEnabled: (type) => flags[type],
  };
}
