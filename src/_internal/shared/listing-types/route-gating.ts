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
 * ## The rule, and the one case that makes it non-obvious
 *
 * A href is disabled when EVERY listing type that claims its route is
 * disabled. Not "any" — `art` and `stickers` share `/art`, so a site that
 * sells art but not stickers must keep `/art` reachable. Treating one disabled
 * claimant as enough would silently delete a working destination.
 *
 * ## What it deliberately does NOT match
 *
 * Editorial pages that merely have a type's name in the path — `/help/auctions`,
 * `/how-auctions-work`, `/seller-guide/prize-draws`. None of them starts with
 * `/auctions`, so prefix matching excludes them for free, and that is correct:
 * an explainer about auctions is still honest reading when auctions are off.
 * A substring test would have eaten all three.
 *
 * Store tabs (`/stores/{slug}/auctions`) are also out of scope — those are
 * resolved by `resolveStoreTabs`, which owns its own visibility, and a second
 * owner is how a mirror drifts (Root Cause #42).
 */

import { LISTING_TYPE_REGISTRY } from "./_registry";
import { ALL_LISTING_TYPES, isListingTypeEnabled } from "./feature-flags";
import type { ListingType } from "../../../features/products/types/index";

interface ListingFlagSnapshot {
  listings?: {
    listingTypes?: Partial<Record<ListingType, boolean>>;
  };
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
 * `true` when `href` points at a listing type's browse page (or any page
 * beneath it) and every type that browses there is disabled.
 *
 * Fails OPEN on anything it cannot classify: an unknown path, an external URL
 * or a missing settings document all return `false`. A settings read that
 * errored must not strip working destinations out of the homepage — the same
 * reasoning as the suggestions endpoint's TTL cache and `src/proxy.ts`'s
 * disabled-routes gate.
 */
export function isDisabledListingHref(
  href: string | undefined | null,
  settings: ListingFlagSnapshot | null | undefined,
): boolean {
  const path = normalisePath(href);
  if (!path) return false;

  for (const [route, types] of TYPES_BY_BROWSE_ROUTE) {
    // The browse page itself, or a detail page under it. `startsWith(route)`
    // alone would match `/live` against `/livestream`, so the boundary is
    // explicit.
    if (path !== route && !path.startsWith(`${route}/`)) continue;
    return types.every((type) => !isListingTypeEnabled(type, settings));
  }
  return false;
}
