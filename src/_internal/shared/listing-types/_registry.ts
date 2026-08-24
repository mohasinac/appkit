/**
 * Listing-type plugin registry — SB-UNI X2.
 *
 * Adding a new listing type later means:
 *   1. Add a folder `<type>/{config,schema,ctas,og,seed-factory}.ts`
 *   2. Add a row to `LISTING_TYPE_CAPABILITIES` in `./capabilities.ts`
 *   3. Add a row to `ALL_LISTING_TYPES_MAP` in `./feature-flags.ts`
 *   4. Add the import + entry below
 *
 * No grep-the-codebase sweep required. Future-expansion Pattern 3.
 *
 * BROWSE CHROME (2026-08-21) — the plugin also carries the tab/sort/filter
 * metadata every listing surface needs, so tab bars, chip groups, sort
 * dropdowns and filter drawers are DERIVED from this one map instead of
 * hand-copied. Before this, at least nine independent "list every listing
 * type" arrays existed (tab constants, admin type-filter maps, the seller
 * TypeDropdown, useListingTypeFlags, SORT_OPTIONS_BY_LISTING_TYPE, …) and
 * they had silently drifted: `art` and `stickers` were missing from most of
 * them, `bundle` — which stopped being a listingType in SB-UNI-D — was still
 * present in others, and the public /products chips offered only 4 of 9
 * types. `scripts/audit-listing-type-tab-coverage.mjs` now blocks any array
 * that doesn't cover the full union.
 */

import * as standard from "./standard/config";
import * as auction from "./auction/config";
import * as preOrder from "./pre-order/config";
import * as prizeDraw from "./prize-draw/config";
// SB-UNI-F 2026-05-13 — Phase 2 union extension.
import * as classified from "./classified/config";
import * as digitalCode from "./digital-code/config";
import * as live from "./live/config";
// EMI/art-stickers session — printed-only physical-goods types.
import * as art from "./art/config";
import * as stickers from "./stickers/config";

import { LISTING_TYPE_CAPABILITIES } from "./capabilities";
import {
  baseAvailable,
  type AvailabilityRow,
  type UnavailableClause,
} from "./availability";
import type { ListingType } from "../../../features/products/types/index";
import type { SortOption } from "../../../features/products/constants/sieve";
import {
  AVAILABILITY_VALUES,
  type AvailabilityFilter,
} from "../../../constants/field-names";

/**
 * Which "Show X" quick-filter a listing type's browse surfaces default to
 * hiding. Drives both the toolbar toggle label and the SSR default filter,
 * which MUST agree or the first paint disagrees with the first refetch
 * (Root Cause #30).
 *
 *   "sold"   — hide rows with no stock            (`inStock`)
 *   "ended"  — hide rows whose end date has passed (`dateFrom` = now)
 *   "closed" — hide rows that stopped accepting entries/orders
 */
export type ListingHideDefault = "sold" | "ended" | "closed";

export interface ListingTypePlugin {
  listingType: ListingType;
  slugPrefix: string;
  cartLine: "single-product" | "blocked" | "bundle-expand";
  /** Public detail-page href builder — replaces the ad-hoc per-type href pickers duplicated across card/link components. */
  detailRoute: (idOrSlug: string) => string;
  /** Card-grid badge shown for time-sensitive/action-required types (auction/pre-order); undefined = no badge. */
  badge?: { label: string; className: string };
  /** Seller create/edit form price-field label. */
  priceLabel: string;
  /** Human label for the listing type (breadcrumbs/titles). */
  typeLabel: string;
  /** Whether the seller create/edit form shows a Stock Quantity field. */
  showsStockQuantity: boolean;

  // ── Browse chrome — the fields every tab bar / sort dropdown / filter
  //    drawer derives from, instead of maintaining its own copy. ──────────

  /**
   * URL-facing tab slug — the segment in `/stores/{slug}/<tabSlug>` and the
   * `id` of every route-backed tab bar (category, brand, store, seller).
   *
   * DELIBERATELY NOT the same id space as `listingType`: these slugs are
   * plural-kebab ("pre-orders", "digital-codes") and are baked into live URLs
   * and bookmarks, whereas `listingType` is the canonical singular value that
   * goes straight into a Firestore `==` filter. Tab bars key on `tabSlug`;
   * filter chips key on `listingType`. Conflating them either breaks existing
   * URLs or silently returns zero rows (Root Cause #33).
   */
  tabSlug: string;
  /**
   * Plural browse label ("Pre-Orders", "Digital Codes"). Used for tab bars
   * and page headings, where `typeLabel`'s singular reads wrong.
   */
  pluralLabel: string;
  /** Short label for the dense type-chip row on /products and /admin/products. */
  chipLabel: string;
  /**
   * Dedicated public browse page for this type, or `null` when it browses on
   * `/products` (art and stickers — see CLAUDE.md's Listing Types Reference).
   * A non-null value also drives the "full <type> filters →" link shown on
   * /products when exactly this type is selected.
   */
  browseRoute: string | null;
  /**
   * Which "Show X" default this type's browse surfaces apply. Since 2026-08-24
   * this drives the LABEL of the availability tab bar's middle tab
   * (`availabilityTabsFor`) rather than a toggle pill's wording.
   */
  hideDefault: ListingHideDefault;
  /**
   * Is this row still buyable / biddable / enterable? Type-specific checks
   * ONLY — `baseAvailable` (isSold / availableQuantity / stockQuantity) is
   * applied to every type by `isListingRowAvailable` before this runs, so a
   * type with no extra rule returns `true`.
   *
   * Must stay pure and client-safe: the same predicate runs inside the SSR
   * query, the homepage fetch and the related-items carousel.
   */
  isAvailable: (row: AvailabilityRow, now: Date) => boolean;
  /**
   * The query half of the same question — see `UnavailableClause`. Used to
   * front-load the "Sold & Ended" scope, which is sparse and therefore
   * expressible as an OR of equalities, unlike "available", which is dense and
   * negation-shaped and stays an in-memory predicate.
   */
  unavailableClauses: readonly UnavailableClause[];
  /** Sort set offered on admin/seller dashboards for this type. */
  sortOptions: readonly SortOption[];
  /** Narrower sort set offered on public browse surfaces for this type. */
  publicSortOptions: readonly SortOption[];
  /**
   * `TABLE_KEYS` values for facets that only make sense for this type
   * (auction bid range, classified meetup city, live-item species, …). The
   * shared product facets (category/brand/price/condition) are implicit.
   */
  extraFacetKeys: readonly string[];
}

// SB-UNI-D — bundle entry removed; bundles are a categoryType, not a listingType.
// SB-UNI-F 2026-05-13 — classified / digital-code / live added.
// EMI/art-stickers session — art / stickers added.
export const LISTING_TYPE_REGISTRY: Record<ListingType, ListingTypePlugin> = {
  standard: standard.config,
  auction: auction.config,
  "pre-order": preOrder.config,
  "prize-draw": prizeDraw.config,
  classified: classified.config,
  "digital-code": digitalCode.config,
  live: live.config,
  art: art.config,
  stickers: stickers.config,
};

export function pluginFor(type: ListingType): ListingTypePlugin {
  return LISTING_TYPE_REGISTRY[type];
}

/**
 * Infer a listing type from a product slug/id by matching its registered
 * `slugPrefix` — replaces ad-hoc `id.startsWith("auction-")` chains in
 * contexts (guest carts, unauthenticated payloads) that don't carry an
 * explicit `listingType` field. Falls back to "standard" when no prefix matches.
 */
export function detectListingTypeFromSlug(slug: string): ListingType {
  for (const plugin of Object.values(LISTING_TYPE_REGISTRY)) {
    if (plugin.slugPrefix && slug.startsWith(plugin.slugPrefix)) return plugin.listingType;
  }
  return "standard";
}

// ---------------------------------------------------------------------------
// Derived browse-chrome lookups
// ---------------------------------------------------------------------------
//
// Everything below is COMPUTED from LISTING_TYPE_REGISTRY. Never hand-write a
// parallel map — that is the exact drift this section exists to end.

/**
 * Sort options for a listing type. Replaces the hand-written
 * `SORT_OPTIONS_BY_LISTING_TYPE` that used to live in
 * `features/products/constants/sieve.ts`, which was missing five of the nine
 * types and still carried a `bundle` key that stopped being a listingType in
 * SB-UNI-D.
 */
export function sortOptionsFor(
  type: ListingType,
  variant: "admin" | "public" = "admin",
): readonly SortOption[] {
  const plugin = LISTING_TYPE_REGISTRY[type];
  return variant === "public" ? plugin.publicSortOptions : plugin.sortOptions;
}

/**
 * Sort options common to EVERY type in `types` — what a multi-type selection
 * (or the unfiltered "all types" view) can safely offer, since a sort field
 * only valid for one type would silently no-op (or trip FAILED_PRECONDITION)
 * on the others.
 *
 * With a single type this returns that type's own set, so the caller doesn't
 * need to special-case "exactly one selected".
 */
export function commonSortOptionsFor(
  types: readonly ListingType[],
  variant: "admin" | "public" = "admin",
): readonly SortOption[] {
  if (types.length === 0) return sortOptionsFor("standard", variant);
  if (types.length === 1) return sortOptionsFor(types[0], variant);

  const [first, ...rest] = types;
  const restSets = rest.map((t) => new Set(sortOptionsFor(t, variant).map((o) => o.value)));
  const shared = sortOptionsFor(first, variant).filter((option) =>
    restSets.every((set) => set.has(option.value)),
  );
  // Every type derives from BASE_SORT_OPTIONS, so the intersection is never
  // empty in practice — but fall back rather than render a sortless toolbar.
  return shared.length > 0 ? shared : sortOptionsFor("standard", variant);
}

/**
 * Which "Show X" quick-filter applies to a set of listing types. A mixed
 * selection can need more than one toggle (auctions end, products sell out),
 * so this returns every distinct default across the set.
 */
export function hideDefaultsFor(types: readonly ListingType[]): ListingHideDefault[] {
  const seen = new Set<ListingHideDefault>();
  for (const type of types) seen.add(LISTING_TYPE_REGISTRY[type].hideDefault);
  return [...seen];
}

// ---------------------------------------------------------------------------
// Availability scope
// ---------------------------------------------------------------------------

/**
 * The user-facing noun for each hide-default. "ended" and "closed" are one
 * query mechanic and one word to a buyer — an auction that ended and a prize
 * draw that closed are both simply over.
 *
 * `Record<ListingHideDefault, …>` on purpose: adding a fourth hide-default is
 * then a compile error rather than a tab that silently renders `undefined`.
 */
const HIDE_DEFAULT_NOUN: Record<ListingHideDefault, "Sold" | "Ended"> = {
  sold: "Sold",
  ended: "Ended",
  closed: "Ended",
};

export interface AvailabilityTab {
  id: AvailabilityFilter;
  label: string;
}

/**
 * The three-tab availability bar for a set of listing types.
 *
 * The middle label is derived, not a constant: `/auctions` reads "Ended",
 * `/art` reads "Sold", and `/products` — which spans both kinds — reads
 * "Sold & Ended". Ordering is fixed rather than set-iteration order so the
 * label can never flip to "Ended & Sold" between renders.
 */
export function availabilityTabsFor(types: readonly ListingType[]): AvailabilityTab[] {
  const nouns = new Set(
    (types.length > 0 ? types : (Object.keys(LISTING_TYPE_REGISTRY) as ListingType[])).map(
      (t) => HIDE_DEFAULT_NOUN[LISTING_TYPE_REGISTRY[t].hideDefault],
    ),
  );
  const unavailableLabel =
    (["Sold", "Ended"] as const).filter((n) => nouns.has(n)).join(" & ") || "Sold";

  return [
    { id: AVAILABILITY_VALUES.AVAILABLE, label: "Available" },
    { id: AVAILABILITY_VALUES.UNAVAILABLE, label: unavailableLabel },
    { id: AVAILABILITY_VALUES.ALL, label: "All" },
  ];
}

/**
 * THE definition of "this listing is still available", shared by the listing
 * query, the homepage fetch and the related-items carousel. Before this there
 * were four partial versions of it and they disagreed — see the header of
 * `./availability`.
 *
 * An unrecognised `listingType` falls back to `standard` rather than throwing:
 * these rows come from Firestore and a bad value must degrade to the base
 * checks, not blank the page.
 */
export function isListingRowAvailable(row: AvailabilityRow, now: Date): boolean {
  if (!baseAvailable(row)) return false;
  const raw = row.listingType;
  const type: ListingType =
    typeof raw === "string" && raw in LISTING_TYPE_REGISTRY ? (raw as ListingType) : "standard";
  return LISTING_TYPE_REGISTRY[type].isAvailable(row, now);
}

/**
 * Every distinct `UnavailableClause` across a set of listing types, deduped by
 * field+op+value. `/products` (all nine types) collapses to five clauses, so
 * the "Sold & Ended" scope costs five bounded queries, not nine.
 */
export function unavailableClausesFor(
  types: readonly ListingType[],
): UnavailableClause[] {
  const effective = types.length > 0 ? types : (Object.keys(LISTING_TYPE_REGISTRY) as ListingType[]);
  const seen = new Map<string, UnavailableClause>();
  for (const type of effective) {
    for (const clause of LISTING_TYPE_REGISTRY[type].unavailableClauses) {
      seen.set(`${clause.field}|${clause.op}|${String(clause.value)}`, clause);
    }
  }
  return [...seen.values()];
}

// Re-export the capability map so consumers can pull both surfaces from
// the same module path.
export { LISTING_TYPE_CAPABILITIES };
