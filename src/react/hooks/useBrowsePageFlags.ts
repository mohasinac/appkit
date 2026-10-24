"use client";

import { useSiteSettings } from "../../core/hooks/useSiteSettings";
import {
  ALL_BROWSE_PAGES,
  browsePageForPath,
  type BrowsePageKey,
} from "../../_internal/shared/listing-types/feature-flags";

/**
 * Which public browse sections are open, as configured in
 * `siteSettings.listings.browsePages`.
 *
 * The sibling of `useListingTypeFlags`, and built the same way on purpose:
 * keyed on the union via `ALL_BROWSE_PAGES` so a new section cannot be
 * silently missed, and DEFAULTING TO OPEN while settings load so the first
 * paint does not briefly hide navigation that is actually enabled.
 *
 * 🛑 The permissive default matters more here than it does for listing types.
 * This hook decides whether a nav entry RENDERS, so a `false` default would
 * blank the navbar on every cold load until the settings request resolved —
 * visible flicker on every page of the site rather than one empty browse tab.
 */
export type BrowsePageFlagsShape = Partial<Record<BrowsePageKey, boolean>>;

export type BrowsePageFlags = Record<BrowsePageKey, boolean> & {
  /** True when the section is open (or the setting has not loaded yet). */
  isEnabled: (page: BrowsePageKey) => boolean;
  /**
   * True when a link may be shown — i.e. it points at no browse section, or at
   * one that is open. Pass an href straight from a nav or footer constant.
   */
  allowsHref: (href: string | undefined | null) => boolean;
};

export function useBrowsePageFlags(): BrowsePageFlags {
  const { data } = useSiteSettings<{
    listings?: { browsePages?: BrowsePageFlagsShape };
  }>();

  const bp = data?.listings?.browsePages;

  // Closed only when EXPLICITLY false — a missing flag, or settings that have
  // not loaded, means open.
  const flags = Object.fromEntries(
    ALL_BROWSE_PAGES.map((page) => [page, bp?.[page] !== false]),
  ) as Record<BrowsePageKey, boolean>;

  return {
    ...flags,
    isEnabled: (page) => flags[page],
    allowsHref: (href) => {
      const page = browsePageForPath(href);
      return page === null || flags[page];
    },
  };
}
