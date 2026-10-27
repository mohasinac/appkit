/**
 * Which public routes must not be served, given the admin flags and the
 * measured counts.
 *
 * ## Why this is one module and not copies at each reader
 *
 * Two places need these answers and they must never disagree:
 *
 *   · `buildSitemap` — decides which URLs are advertised.
 *   · `toPublicSiteSettings` → `src/proxy.ts` — decides which URLs 404.
 *
 * A disagreement is not cosmetic: the sitemap advertising a URL the edge 404s
 * is a crawl error on a page we told Google to fetch, and the reverse serves a
 * surface we have decided is closed. They were two hand-written copies of the
 * same two loops when this was extracted — and the disagreement showed up
 * anyway on the one axis only one of them read (see `closedSurfacePrefixes`).
 *
 * ## 🛑 TWO FUNCTIONS, because the MATCH RULE differs — and each rule is
 * load-bearing in the opposite direction
 *
 * | | rule | why the other rule would break it |
 * |---|---|---|
 * | `hiddenSurfaceRoutes` — listing-type browse pages | **exact path** | `art`, `stickers`, `spares` and `standard` all detail at `/products/{slug}`, so a prefix rule would 404 the whole standard catalogue the day `spares` emptied |
 * | `closedSurfacePrefixes` — browse sections, bundles, `disabledRoutes` | **prefix** | `/categories/{slug}` is owned by `categories` alone, and exact-only matching left all 4,698 of them serving a real 200 while `/categories` said 404 |
 *
 * Do not merge them. Picking either rule for both is a live defect one way or
 * the other, and both directions have now been observed in production.
 *
 * ## 🛑 A SHARED route survives while ANY of its types is visible
 *
 * `/art` spans `art` and `stickers`; `/products` spans `standard` plus several
 * others. Without `hiddenSurfaceRoutes`' second pass, hiding `stickers` alone
 * would close a page `art` still fills — and hiding `spares` alone would close
 * `/products`.
 *
 * @tag domain:products
 * @tag layer:shared
 * @tag access:isomorphic
 * @tag sideEffects:none
 */

import {
  ALL_BROWSE_PAGES,
  ALL_LISTING_TYPES,
  browsePagePrefixes,
  isBrowsePageEnabled,
  isCategoryTypeEnabled,
  isListingSurfaceVisible,
  type BrowsePageKey,
  type SurfaceCountSnapshot,
} from "./feature-flags";
import { pluginFor } from "./_registry";
import { ROUTES } from "../../../next/routing/route-map";

/** The snapshot shape `isListingSurfaceVisible` reads its admin flags from. */
interface SettingsSnapshot {
  listings?: {
    listingTypes?: Partial<Record<string, boolean>>;
    browsePages?: Partial<Record<BrowsePageKey, boolean>>;
    categoryTypes?: Partial<Record<string, boolean>>;
    closedPaths?: string[];
  };
  disabledRoutes?: string[];
}

export function hiddenSurfaceRoutes(
  settings: SettingsSnapshot | null | undefined,
  counts: SurfaceCountSnapshot | null | undefined,
): string[] {
  const hidden = new Set<string>();
  const routeOf = (type: (typeof ALL_LISTING_TYPES)[number]): string =>
    String(pluginFor(type).browseRoute ?? "");

  for (const type of ALL_LISTING_TYPES) {
    if (isListingSurfaceVisible(type, settings, counts)) continue;
    const route = routeOf(type);
    if (route) hidden.add(route);
  }

  /*
   * Second pass, deliberately not folded into the first: a route is only
   * hidden once EVERY type that browses there is hidden, and the first pass
   * cannot know that until it has seen them all.
   */
  for (const type of ALL_LISTING_TYPES) {
    if (isListingSurfaceVisible(type, settings, counts)) hidden.delete(routeOf(type));
  }

  return [...hidden];
}

/**
 * Closed routes that must take their DESCENDANTS with them.
 *
 * ## Why this is a second function and not more entries in the first
 *
 * `hiddenSurfaceRoutes` above is exact-path-only, and its docstring explains
 * why it has to be: `art`, `stickers`, `spares` and `standard` all detail at
 * `/products/{slug}`, so a prefix rule there would 404 the whole standard
 * catalogue the day `spares` emptied.
 *
 * A closed BROWSE PAGE has the opposite property. `/categories/{slug}` belongs
 * to `categories` and to nothing else — no open surface details underneath it
 * — so there is no shared-route hazard, and exact-only matching leaves the
 * interesting half of the section served.
 *
 * 🛑 THIS WAS MEASURED OPEN IN PRODUCTION, 2026-10-27. All four browse pages
 * had been `false` in `listings.browsePages` since 2026-10-24 and:
 *
 * ```
 * /categories                     200   body = "404 — Page not found"
 * /categories/category-beyblade-x 200   a real, fully-rendered category page
 * /stores/store-beyblade-arena    200   a real, fully-rendered store page
 * ```
 *
 * The index was a SOFT 404 (`guardBrowsePage` throws `notFound()` after the
 * shell has streamed, which cannot set the status — see the site-wide soft-404
 * note) and the 4,698 detail pages were never guarded at all. So "the section
 * is closed" meant "the front door says 404 while every room stays open and
 * indexable".
 *
 * ## `disabledRoutes` is folded in here, not left to the proxy
 *
 * The proxy already prefix-matches `disabledRoutes`, so including it changes
 * nothing at the edge. It is here because the SITEMAP needs the same list and
 * did not have it: measured the same day, the sitemap advertised 17 `/blog`
 * URLs and one `/reviews` URL, every one of which the edge already 404s. That
 * is a crawl error on a page we asked Google to fetch — Root Cause #81's
 * host/sitemap disagreement in miniature, and the precise reason
 * `hiddenSurfaceRoutes` was extracted into one definition in the first place.
 *
 * One list, two readers, no way for them to disagree:
 *   · `toPublicSiteSettings` → `src/proxy.ts` — which paths 404.
 *   · `buildSitemap`                          — which paths are advertised.
 *
 * Fails OPEN on a missing settings document: every `isBrowsePageEnabled` call
 * returns `true` and the list is empty, so a transient Firestore error cannot
 * withdraw the catalogue (Root Cause #72).
 */
export function closedSurfacePrefixes(
  settings: SettingsSnapshot | null | undefined,
): string[] {
  const closed = new Set<string>();

  for (const page of ALL_BROWSE_PAGES) {
    if (isBrowsePageEnabled(page, settings)) continue;
    for (const prefix of browsePagePrefixes(page)) {
      if (prefix) closed.add(prefix);
    }
  }

  /*
   * Bundles — a CATEGORY type, not a listing type and not a browse page, so it
   * reaches neither loop above.
   *
   * `listings.categoryTypes.bundle` is the control that already exists for it,
   * and `HOMEPAGE_SECTION_CATEGORY_TYPE` in `MarketplaceHomepageView` already
   * drops the bundles rail from it — so until this line the flag hid the rail
   * while `/bundles` and every `/bundles/{slug}` went on serving. That is the
   * same half-closed door the browse pages had.
   *
   * Prefix rather than exact for the same reason as a browse page: `/bundles`
   * is owned by bundles alone, with no open surface detailing underneath it.
   */
  if (!isCategoryTypeEnabled("bundle", settings)) {
    closed.add(String(ROUTES.PUBLIC.BUNDLES));
  }

  /*
   * Admin-set feature withdrawals — `/seller-guide`, `/fees`, `/scams`, …
   *
   * 🛑 A SEPARATE FIELD from `disabledRoutes` below, not a duplicate of it.
   * That array is DERIVED from `navConfig` and fully recomputed on every nav
   * toggle, so a non-nav path appended there is wiped by the next admin save.
   * Anything footer-only — which is most of a marketplace's explainer
   * surfaces — has no nav item and can only live here.
   */
  for (const path of settings?.listings?.closedPaths ?? []) {
    if (typeof path === "string" && path.startsWith("/")) closed.add(path);
  }

  for (const route of settings?.disabledRoutes ?? []) {
    if (typeof route === "string" && route.startsWith("/")) closed.add(route);
  }

  return [...closed];
}

/**
 * Does `path` sit on or under one of `prefixes`?
 *
 * 🛑 A `/`-delimited boundary, never a bare `startsWith`. `/store` is the
 * SELLER DASHBOARD and `/stores` is the public directory, so a substring test
 * would 404 a signed-in seller's own dashboard the moment an admin closed the
 * public storefronts — a different surface, a different audience, one
 * character apart. Same rule, same reason, as `browsePageForPath`.
 */
export function isUnderClosedPrefix(
  path: string,
  prefixes: readonly string[],
): boolean {
  const normalised = path.replace(/\/+$/, "") || "/";
  return prefixes.some((p) => normalised === p || normalised.startsWith(`${p}/`));
}
