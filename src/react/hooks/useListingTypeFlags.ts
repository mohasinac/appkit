"use client";

import { useSiteSettings } from "../../core/hooks/useSiteSettings";
import type { ListingType } from "../../features/products/types/index";
import {
  ALL_LISTING_TYPES,
  isListingTypeEnabled,
  isListingTypeListed,
  flagValueToChoice,
  type FlagChoice,
  type FlagValue,
} from "../../_internal/shared/listing-types/feature-flags";

/**
 * W1-43 — useListingTypeFlags
 *
 * Reads `siteSettings.listings.listingTypes` and answers, per listing type,
 * the TWO different questions that flag can be asked.
 *
 * Defaults to all-enabled/all-listed when settings haven't loaded yet — match
 * the permissive default used by `DEFAULT_SITE_SETTINGS_DATA` so first paint
 * doesn't briefly hide enabled features.
 *
 * KEYED ON THE UNION, NOT A HAND-WRITTEN LIST (2026-08-21). Both types below
 * used to enumerate seven types by hand and had never been updated for `art`
 * and `stickers` (then two separate members) — so `isEnabled("art")` didn't
 * even typecheck, and the seller
 * TypeDropdown (its main consumer) could not offer either type. Deriving from
 * `ListingType` makes a missing member a compile error, matching the same
 * decision made for `ALL_LISTING_TYPES_MAP` in `feature-flags.ts`.
 *
 * ## 🛑 THREE STORED STATES, TWO DIFFERENT ANSWERS — read this before using it
 *
 * The flag is `true | "unlisted" | false`, and this hook used to collapse it
 * with a single `lt?.[type] !== false`. **`"unlisted" !== false` is `true`**,
 * so every consumer read an unlisted type as fully available and the third
 * state did nothing at all — a link that had been correctly hidden came back,
 * and unlisted types stayed in the `/products` type tabs and type filter.
 * That was a real regression, found by review, and it is why a boolean is no
 * longer the only thing this hook hands out.
 *
 * | stored | `isEnabled` | `isListed` | means |
 * |---|---|---|---|
 * | `true` / absent | ✅ | ✅ | sold and advertised |
 * | `"unlisted"`    | ✅ | ❌ | **still sold and still serves its pages** — withdrawn from nav, footer, sitemap, type tabs and type filters |
 * | `false`         | ❌ | ❌ | not sold; the surface 404s |
 *
 * **Which one do I want?**
 *
 * - **AUTHORING / operating on a type** → `isEnabled`. A seller must be able to
 *   list, edit and filter their own unlisted-type stock, and a form section for
 *   a type the site still sells must keep rendering. Unlisting withdraws
 *   DISCOVERY, never the ability to transact.
 * - **DISCOVERY — any link, tab, chip, filter option or nav entry that offers a
 *   browsing visitor a way INTO the type** → `isListed`.
 *
 * The indexed form (`flags["collector-drop"]`) is `isEnabled`, kept because
 * that is what the authoring consumers want and what they already read. If you
 * are gating something a visitor CLICKS, use `isListed` explicitly.
 *
 * Audited consumers (2026-11-07, after the regression above):
 *
 * | consumer | gates | reads |
 * |---|---|---|
 * | `ProductForm` | seller form sections per type | `isEnabled` |
 * | `SellerProductsView` TypeDropdown | seller's own stock filter | `isEnabled` |
 * | `AppLayoutShell` | the "collector drops won" profile stat | `isEnabled` |
 * | `ProductsIndexListing` query span | which types the page queries | `isEnabled` |
 * | `ProductsIndexListing` tabs + filter chips | discovery | **`isListed`** |
 * | `UserBidsView` "Browse collector drops" | discovery | **`isListed`** |
 *
 * `useListingSurfaceVisibility` is the stricter sibling for nav/footer: listed
 * AND measured non-empty. Use it when an empty surface should also drop out.
 */
export type ListingTypeFlagsShape = Partial<Record<ListingType, FlagValue>>;

export type ListingTypeFlags = Record<ListingType, boolean> & {
  /**
   * Does this marketplace SELL the type at all? True for `"unlisted"`.
   * The right question for authoring and for operating on existing stock.
   */
  isEnabled: (type: ListingType) => boolean;
  /**
   * May a visitor be OFFERED a way into the type — a link, tab, chip or
   * filter option? False for `"unlisted"` as well as `false`.
   */
  isListed: (type: ListingType) => boolean;
  /** The raw three-state value, for anything that must tell all three apart. */
  choiceFor: (type: ListingType) => FlagChoice;
};

export function useListingTypeFlags(): ListingTypeFlags {
  const { data } = useSiteSettings<{
    listings?: { listingTypes?: ListingTypeFlagsShape };
  }>();

  const settings = { listings: { listingTypes: data?.listings?.listingTypes } };

  /*
   * 🛑 Both maps go through the SHARED predicates in `feature-flags.ts` rather
   * than re-deriving a comparison here. The regression this file is annotated
   * for was a locally re-derived `!== false`; one authority for the three
   * states is what stops the next copy drifting the same way.
   */
  const enabled = Object.fromEntries(
    ALL_LISTING_TYPES.map((type) => [type, isListingTypeEnabled(type, settings)]),
  ) as Record<ListingType, boolean>;

  const listed = Object.fromEntries(
    ALL_LISTING_TYPES.map((type) => [type, isListingTypeListed(type, settings)]),
  ) as Record<ListingType, boolean>;

  return {
    ...enabled,
    isEnabled: (type) => enabled[type],
    isListed: (type) => listed[type],
    choiceFor: (type) => flagValueToChoice(data?.listings?.listingTypes?.[type]),
  };
}
