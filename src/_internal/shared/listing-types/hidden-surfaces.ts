/**
 * Which public BROWSE ROUTES must not be served, given the admin flags and the
 * measured counts.
 *
 * ## Why this is one function and not two copies
 *
 * Two places need this answer and they must never disagree:
 *
 *   · `buildSitemap` — decides which browse URLs are advertised.
 *   · `toPublicSiteSettings` → `src/proxy.ts` — decides which browse URLs 404.
 *
 * A disagreement is not cosmetic: the sitemap advertising a URL the edge 404s
 * is a crawl error on a page we told Google to fetch, and the reverse serves a
 * surface we have decided is closed. They were two hand-written copies of the
 * same two loops when this was extracted.
 *
 * ## 🛑 EXACT PATHS, never prefixes
 *
 * `art`, `stickers`, `spares` and `standard` all detail at `/products/{slug}`,
 * so a prefix rule would delist — or 404 — the entire standard catalogue the
 * day `spares` emptied. An empty type contributes no detail URLs anyway, since
 * its own fetcher returns none, so the exact-path rule loses nothing real.
 *
 * ## 🛑 A SHARED route survives while ANY of its types is visible
 *
 * `/art` spans `art` and `stickers`; `/products` spans `standard` plus several
 * others. Without the second pass, hiding `stickers` alone would close a page
 * `art` still fills — and hiding `spares` alone would close `/products`.
 *
 * @tag domain:products
 * @tag layer:shared
 * @tag access:isomorphic
 * @tag sideEffects:none
 */

import {
  ALL_LISTING_TYPES,
  isListingSurfaceVisible,
  type SurfaceCountSnapshot,
} from "./feature-flags";
import { pluginFor } from "./_registry";

/** The snapshot shape `isListingSurfaceVisible` reads its admin flags from. */
interface SettingsSnapshot {
  listings?: {
    listingTypes?: Partial<Record<string, boolean>>;
  };
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
