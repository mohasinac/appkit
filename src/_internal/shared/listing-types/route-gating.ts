/**
 * "Does this href lead somewhere the site has switched off?"
 *
 * ## Why this exists
 *
 * `listings.listingTypes` already hides a disabled type everywhere the type is
 * named — the nav, the `/products` chips, the admin tabs, the homepage
 * SECTIONS (`HOMEPAGE_SECTION_LISTING_TYPE` in `MarketplaceHomepageView`). But
 * a lot of this site's merchandising is free-text content that names a
 * destination by URL and never mentions a listing type at all: a carousel
 * slide's overlay button, a card's CTA, a promo-grid tile.
 *
 * Measured 2026-10-20 with `auction: false` live: the homepage hero carousel
 * still shipped a "Live auctions / Place a bid before the timer runs out"
 * CARD linking to `/auctions`, and a whole `slide-beyblade-auction` slide
 * whose overlay read "Win it at your price". Both are authored content, so no
 * type-keyed gate could see them — the only thing that identifies them is
 * where they point.
 *
 * ## Where the rules are written down
 *
 * On `isClosedHref` below — the three axes it reads (listing-type flags ANDed
 * with measured counts, closed browse sections, hand-disabled routes), what it
 * deliberately does not match, and the production measurement that forced each
 * one. Stated there and not restated here deliberately: two comments
 * disagreeing about what a gate matches is a defect this codebase keeps paying
 * for, and the only safe number of descriptions is one.
 *
 * Store tabs (`/stores/{slug}/auctions`) are out of scope — those are resolved
 * by `resolveStoreTabs`, which owns its own visibility, and a second owner is
 * how a mirror drifts (Root Cause #42).
 */

import { LISTING_TYPE_REGISTRY } from "./_registry";
import {
  ALL_LISTING_TYPES,
  isListingSurfaceVisible,
  type BrowsePageKey,
  type SurfaceCountSnapshot,
} from "./feature-flags";
import { closedSurfacePrefixes, isUnderClosedPrefix } from "./hidden-surfaces";
import type { ListingType } from "../../../features/products/types/index";

interface ListingFlagSnapshot {
  listings?: {
    listingTypes?: Partial<Record<ListingType, boolean>>;
    browsePages?: Partial<Record<BrowsePageKey, boolean>>;
  };
  disabledRoutes?: string[];
}

/**
 * browse route → every listing type that browses there.
 *
 * Built from the registry rather than hand-listed, so a tenth type joins it by
 * existing. `art` and `stickers` both resolve to `/art`, which is the entire
 * reason the value is an array.
 */
const TYPES_BY_BROWSE_ROUTE: ReadonlyMap<string, readonly ListingType[]> = (() => {
  const map = new Map<string, ListingType[]>();
  for (const type of ALL_LISTING_TYPES) {
    const route = normalisePath(LISTING_TYPE_REGISTRY[type].browseRoute);
    if (!route) continue;
    const existing = map.get(route);
    if (existing) existing.push(type);
    else map.set(route, [type]);
  }
  return map;
})();

/**
 * Reduce an authored href to a comparable path.
 *
 * Returns `""` for anything that is not an in-app path — an absolute URL to
 * another origin, a `mailto:`, an anchor. Those can never be a listing browse
 * route, and a caller must not filter them out.
 *
 * 🛑 The locale prefix is stripped. `ROUTES` values are unprefixed
 * (`/auctions`) and `next-intl` adds `/en` at navigation time, but an admin
 * pasting a URL out of the address bar stores the prefixed form — so a
 * comparison against the raw value matches the seed and misses the hand-typed
 * one, which is the half most likely to be wrong.
 */
function normalisePath(href: string | undefined | null): string {
  if (typeof href !== "string") return "";
  const trimmed = href.trim();
  if (!trimmed || !trimmed.startsWith("/")) return "";
  // Drop query + hash: `/auctions?sort=ending` is still /auctions.
  const path = trimmed.split(/[?#]/)[0] ?? "";
  // `/en/auctions` → `/auctions`. Two-letter segment only, so a real route
  // whose first segment is short (there are none today, but `/ar` would be a
  // plausible future one) is the only thing this could over-match — and it
  // would have to collide with a locale code to do it.
  const delocalised = path.replace(/^\/[a-z]{2}(?=\/)/, "");
  // Trailing slash off, but never reduce "/" to "".
  return delocalised.length > 1 ? delocalised.replace(/\/+$/, "") : delocalised;
}

/**
 * Everything needed to answer "is this destination closed", resolved once.
 *
 * 🛑 A CONTEXT RATHER THAN THREE LOOSE ARGUMENTS, because the prefix list is
 * derived work and the callers are loops. The live homepage carries **34 links
 * to `/categories` alone** (measured 2026-10-27); rebuilding the closed-prefix
 * array inside the predicate would rebuild it 34 times for one render.
 */
export interface ClosedSurfaceContext {
  settings: ListingFlagSnapshot | null | undefined;
  counts: SurfaceCountSnapshot | null | undefined;
  /** Closed browse sections + `disabledRoutes`, pre-derived. */
  prefixes: string[];
}

export function closedSurfaceContext(
  settings: ListingFlagSnapshot | null | undefined,
  counts?: SurfaceCountSnapshot | null,
): ClosedSurfaceContext {
  return { settings, counts, prefixes: closedSurfacePrefixes(settings) };
}

/**
 * `true` when `href` leads somewhere this site has closed.
 *
 * ## THREE axes, because authored content can point at any of them
 *
 * This replaced `isDisabledListingHref`, which read `listings.listingTypes`
 * and nothing else — and the two axes it could not see were the two doing
 * visible damage. Measured on the live homepage, 2026-10-27:
 *
 *   · **counts.** `art` and `spares` had flag `true` and measured count `0`,
 *     so they were auto-hidden everywhere — `/art` and `/spares` both answered
 *     a real **404** at the edge — while the homepage went on shipping 3 links
 *     to each from the "Shop extras" cards. `isListingTypeEnabled` reads the
 *     flag only, so it called both of them enabled. `isListingSurfaceVisible`
 *     ANDs the flag with the count, which is the rule every other surface on
 *     the site already uses.
 *   · **browse sections.** All four had been `false` since 2026-10-24, and the
 *     homepage carried **34** `/categories` links across the welcome hero's
 *     secondary CTA, the 35-button systems matrix and the 4-banner generation
 *     promo grid.
 *
 * ## Deliberately link-based, never keyword-based
 *
 * Unchanged from the original, and still the point: nothing here reads copy.
 * "Win it at your price" names no type, so a word search would miss it, and it
 * would also eat the authenticity slide for saying "bid" in passing. A
 * destination is checkable; prose is not.
 *
 * ## What it still does NOT match
 *
 * Editorial pages that merely carry a name in the path — `/help/auctions`,
 * `/how-auctions-work`, `/seller-guide/random-lots`. None starts with
 * `/auctions`, so the `/`-delimited boundary excludes them for free, and that
 * is correct: an explainer about auctions is honest reading when auctions are
 * off.
 *
 * Fails OPEN on anything it cannot classify — an unknown path, an external
 * URL, a missing settings document. A settings read that errored must not
 * strip working destinations off the homepage (Root Cause #72).
 */
export function isClosedHref(
  href: string | undefined | null,
  ctx: ClosedSurfaceContext,
): boolean {
  const path = normalisePath(href);
  if (!path) return false;

  // Closed browse sections and hand-disabled routes, descendants included.
  if (isUnderClosedPrefix(path, ctx.prefixes)) return true;

  for (const [route, types] of TYPES_BY_BROWSE_ROUTE) {
    // The browse page itself, or a detail page under it. `startsWith(route)`
    // alone would match `/live` against `/livestream`, so the boundary is
    // explicit.
    if (path !== route && !path.startsWith(`${route}/`)) continue;
    /*
     * 🛑 `every`, not `some`, and `isListingSurfaceVisible`, not
     * `isListingTypeEnabled`.
     *
     * `every`: `art` and `stickers` share `/art`, so a site selling art but
     * not stickers must keep `/art` reachable. One closed claimant is not
     * enough — treating it as enough silently deletes a working destination.
     *
     * `isListingSurfaceVisible`: it ANDs the admin flag with the measured
     * count, which is what makes the auto-hidden-because-empty case visible
     * here. Reading the flag alone is exactly how the live homepage kept
     * advertising `/art` and `/spares` after both began 404ing.
     */
    return types.every((type) => !isListingSurfaceVisible(type, ctx.settings, ctx.counts));
  }
  return false;
}
