/**
 * Listing-type / category-type feature flag helpers — SB-UNI-X4 2026-05-13.
 *
 * Reads from `siteSettings.listings.{listingTypes,categoryTypes}` and collapses
 * missing fields to a "type is enabled" default. The capability registry
 * decides what each type CAN do; these decide whether the site exposes the type
 * at all.
 *
 * Moved out of `featureFlags` on 2026-08-29 when that group was deleted — 11 of
 * its 14 keys had no readers, and these two were never flags: "we don't sell
 * live animals" is a standing catalogue decision, not a switch around
 * unfinished work.
 *
 * Consumer pattern:
 *   const settings = await siteSettingsRepository.findById("global");
 *   if (!isListingTypeEnabled("classified", settings)) return null;
 *
 * Future-expansion Pattern 5. Slots with Phase 7 (CTA registry consults the
 * same flag to hide actions for disabled types).
 */

import type { ListingType } from "../../../features/products/types/index";
import type { CategoryType } from "../../../features/categories/types/index";
// Route-map only — a pure constants module with no firebase-admin in its
// import chain, so this stays safe in the client bundle (appkit Export Rules).
import { ROUTES } from "../../../next/routing/route-map";

interface FeatureFlagSnapshot {
  listings?: {
    listingTypes?: Partial<Record<ListingType, boolean>>;
    categoryTypes?: Partial<Record<CategoryType, boolean>>;
    browsePages?: Partial<Record<BrowsePageKey, boolean>>;
  };
}

/**
 * A public BROWSE SECTION that can be withdrawn as a whole.
 *
 * 🛑 This is a THIRD axis, not a rename of either of the two above, and the
 * distinction is what stops it becoming a duplicate control:
 *
 *   `listingTypes`  — what the marketplace SELLS (is there such a thing as an
 *                     auction here?)
 *   `categoryTypes` — what a taxonomy ROW may be (may a category row be a
 *                     brand?)
 *   `browsePages`   — whether a public ENTRY POINT is open (is there a /brands
 *                     directory to walk?)
 *
 * They are genuinely independent. `brand` rows still tag products and still
 * drive `BrandDetailPageView`'s query with `/brands` closed; closing the
 * directory withdraws the front door, it does not untag the catalogue. That is
 * why this cannot be folded into `categoryTypes` — and `categories`, `stores`
 * and `franchise` have no `categoryTypes` member to fold into at all.
 *
 * `stores` covers BOTH `/stores` and `/sellers`: they are two doors onto the
 * same directory (the footer lists them as "Stores" and "Verified Sellers"),
 * and leaving one open while closing the other publishes exactly what the
 * other was closed to hide.
 */
export type BrowsePageKey = "categories" | "brands" | "franchise" | "stores";

/**
 * Declared as `Record<BrowsePageKey, true>` for the same reason
 * `ALL_LISTING_TYPES_MAP` is: adding a key to the union without adding it here
 * is a COMPILE error rather than a section that silently can never be hidden.
 * Root Cause #61 — every hand-written enumeration of a union in this codebase
 * has drifted at least once.
 */
const ALL_BROWSE_PAGES_MAP: Record<BrowsePageKey, true> = {
  categories: true,
  brands: true,
  franchise: true,
  stores: true,
};

export const ALL_BROWSE_PAGES = Object.keys(
  ALL_BROWSE_PAGES_MAP,
) as BrowsePageKey[];

/**
 * `true` when the section is missing from the flag map OR explicitly enabled.
 *
 * Absent-means-enabled, matching its two siblings: a section has to be
 * EXPLICITLY `false` to close. An install that predates this setting keeps
 * every section open, so adding the field cannot take a site's navigation away
 * from it.
 */
export function isBrowsePageEnabled(
  page: BrowsePageKey,
  settings: FeatureFlagSnapshot | null | undefined,
): boolean {
  return settings?.listings?.browsePages?.[page] !== false;
}

export function enabledBrowsePages(
  settings: FeatureFlagSnapshot | null | undefined,
): BrowsePageKey[] {
  return ALL_BROWSE_PAGES.filter((p) => isBrowsePageEnabled(p, settings));
}

/** Narrow an untrusted string — a route param, a form value — to the union. */
export function isBrowsePageKey(value: unknown): value is BrowsePageKey {
  return typeof value === "string" && value in ALL_BROWSE_PAGES_MAP;
}

/**
 * The public path prefixes each section owns.
 *
 * 🛑 `/sellers` maps to `stores` — see the `BrowsePageKey` note. Two doors,
 * one directory, one flag.
 */
const BROWSE_PAGE_PREFIXES: ReadonlyArray<readonly [string, BrowsePageKey]> = [
  [String(ROUTES.PUBLIC.CATEGORIES), "categories"],
  [String(ROUTES.PUBLIC.BRANDS), "brands"],
  [String(ROUTES.PUBLIC.FRANCHISE), "franchise"],
  [String(ROUTES.PUBLIC.STORES), "stores"],
  [String(ROUTES.PUBLIC.SELLERS), "stores"],
];

/**
 * The path prefixes a given section owns — the inverse of `browsePageForPath`.
 *
 * 🛑 Exported so `closedSurfacePrefixes` can build the edge-gate list from the
 * SAME table `browsePageForPath` matches against. It is one key to five paths
 * (`stores` owns both `/stores` and `/sellers`), so a caller that re-derived
 * "the path for a key" from `ROUTES` would get four entries and leave
 * `/sellers` served — the exact half-closed door the `BrowsePageKey` docstring
 * above exists to forbid. Root Cause #61: every hand-written second copy of an
 * enumeration in this codebase has drifted at least once.
 */
export function browsePagePrefixes(page: BrowsePageKey): string[] {
  return BROWSE_PAGE_PREFIXES.filter(([, key]) => key === page).map(([prefix]) => prefix);
}

/**
 * Which browse section a link points into, or `null` for a link that is not in
 * one. Used to drop nav, sidebar, mobile-sheet and footer entries for a closed
 * section.
 *
 * 🛑 Matches on an EXACT path or a `/`-delimited descendant, never a bare
 * `startsWith`. `/store` is the SELLER DASHBOARD and `/stores` is the public
 * directory, so a prefix test would hide a signed-in seller's own dashboard
 * link the moment an admin closed the public storefronts — a different
 * surface, a different audience, one character apart.
 *
 * Query strings and hashes are tolerated because footer and nav hrefs are
 * hand-authored and some carry them.
 */
export function browsePageForPath(
  href: string | undefined | null,
): BrowsePageKey | null {
  if (typeof href !== "string" || href.length === 0) return null;
  const path = href.split(/[?#]/)[0]!.replace(/\/+$/, "") || "/";
  for (const [prefix, key] of BROWSE_PAGE_PREFIXES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return key;
  }
  return null;
}

/**
 * `true` when the type is missing from the flag map OR explicitly enabled.
 * Defaulting to enabled keeps legacy data working — a flag has to be
 * EXPLICITLY set to `false` to disable a type.
 */
export function isListingTypeEnabled(
  type: ListingType,
  settings: FeatureFlagSnapshot | null | undefined,
): boolean {
  const flag = settings?.listings?.listingTypes?.[type];
  return flag !== false;
}

export function isCategoryTypeEnabled(
  type: CategoryType,
  settings: FeatureFlagSnapshot | null | undefined,
): boolean {
  const flag = settings?.listings?.categoryTypes?.[type];
  return flag !== false;
}

/**
 * Every listing type, in canonical iteration order.
 *
 * Declared as `Record<ListingType, true>` rather than a plain array on purpose:
 * adding a member to the `ListingType` union without adding it here is then a
 * COMPILE error, not a silent omission. `art` / `stickers` were missing from
 * the old hand-written array for exactly that reason, which meant
 * `/api/products`' "strip disabled types" post-filter dropped every art and
 * sticker row from any call that didn't name a listingType explicitly
 * (homepage, search, related-items).
 */
const ALL_LISTING_TYPES_MAP: Record<ListingType, true> = {
  standard: true,
  spares: true,
  auction: true,
  "pre-order": true,
  "random-lots": true,
  classified: true,
  "digital-code": true,
  live: true,
  art: true,
  stickers: true,
};

export const ALL_LISTING_TYPES = Object.keys(
  ALL_LISTING_TYPES_MAP,
) as ListingType[];

/**
 * Narrow an untrusted string — a `?listingType=` param, a form value — to a
 * real member of the union. Backed by the same `Record<ListingType, true>` as
 * `ALL_LISTING_TYPES`, so it cannot fall behind the union the way a
 * hand-written list would (Root Cause #61).
 */
export function isListingType(value: unknown): value is ListingType {
  return typeof value === "string" && value in ALL_LISTING_TYPES_MAP;
}

/** Pull the full list of enabled listing types in canonical iteration order. */
export function enabledListingTypes(
  settings: FeatureFlagSnapshot | null | undefined,
): ListingType[] {
  return ALL_LISTING_TYPES.filter((t) => isListingTypeEnabled(t, settings));
}

// ---------------------------------------------------------------------------
// Auto-hide: a surface with nothing in it
// ---------------------------------------------------------------------------

/**
 * The measured counts, as the public site-settings payload carries them.
 *
 * Structurally typed rather than importing `SurfaceCountsDocument` so this
 * module stays a pure constants file with no feature import — the same reason
 * it imports only `ROUTES`.
 */
export interface SurfaceCountSnapshot {
  listingTypes?: Partial<Record<ListingType, number>>;
  surfaces?: Partial<Record<string, number>>;
}

/**
 * Should this listing type's public surface be shown at all?
 *
 * 🛑 THE PRECEDENCE, and why it is not just `count > 0`:
 *
 * | admin flag | measured count | result | because |
 * |---|---|---|---|
 * | `false`    | anything   | **hidden** | "we do not sell live animals" is a standing catalogue decision, not a statement about today's stock. An admin who closed a type must not see it reopen because someone listed one. |
 * | `true`     | `0`        | **hidden** | auto-hide: the thing this function exists for. |
 * | `true`     | `> 0`      | shown | |
 * | `true`     | **absent** | **shown** | 🛑 unknown is NOT zero. A fresh install, a failed job, or a type added since the last recompute must render exactly as it does today, never as hidden. Root Cause #72. |
 *
 * The flag therefore stays the authority and the count only ever SUBTRACTS
 * from what the flag already permits. Two mechanisms, one direction — which is
 * what stops them becoming two switches that disagree.
 */
export function isListingSurfaceVisible(
  type: ListingType,
  settings: FeatureFlagSnapshot | null | undefined,
  counts: SurfaceCountSnapshot | null | undefined,
): boolean {
  if (!isListingTypeEnabled(type, settings)) return false;
  const n = counts?.listingTypes?.[type];
  // `undefined` -> true. Written as an explicit test rather than `(n ?? 1) > 0`
  // so the unknown case is readable, and so nobody "simplifies" it into a
  // falsy check that folds 0 and undefined together — which is the bug.
  if (n === undefined) return true;
  return n > 0;
}

/**
 * The same question for a surface with no listing-type flag behind it
 * (`/reviews` today).
 *
 * No admin-flag half: these have no switch to consult, so emptiness is the
 * only input. Absent still means shown.
 */
export function isCountedSurfaceVisible(
  surface: string,
  counts: SurfaceCountSnapshot | null | undefined,
): boolean {
  const n = counts?.surfaces?.[surface];
  if (n === undefined) return true;
  return n > 0;
}

/**
 * Visible listing types — the flag list, minus the ones measured empty.
 *
 * This is what nav, footer and the sitemap filter on. `enabledListingTypes`
 * above is deliberately left alone: it answers "what does this marketplace
 * sell", which `/api/products`' post-filter and the seller forms still need
 * even for a type with zero rows today.
 */
export function visibleListingTypes(
  settings: FeatureFlagSnapshot | null | undefined,
  counts: SurfaceCountSnapshot | null | undefined,
): ListingType[] {
  return ALL_LISTING_TYPES.filter((t) => isListingSurfaceVisible(t, settings, counts));
}

export function enabledCategoryTypes(
  settings: FeatureFlagSnapshot | null | undefined,
): CategoryType[] {
  const all: CategoryType[] = ["category", "sublisting", "brand", "bundle"];
  return all.filter((t) => isCategoryTypeEnabled(t, settings));
}
