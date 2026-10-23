/**
 * Server-side link lists for the taxonomy hub pages.
 *
 * Feeds `<TaxonomyLinkIndex>`, which renders them as real `<a href>`s in the
 * server HTML. See that component for why: measured 2026-10-24, `/categories`,
 * `/brands` and `/parts` each emitted ZERO outbound entity links because all
 * three filter client-side, so a crawler landing on a hub had nothing to
 * follow and the franchise detail pages were reachable by no link at all.
 *
 * 🛑 Every function FAILS OPEN with `[]`. These pages are statically rendered;
 * a Firestore hiccup at build time must degrade to "no index section" rather
 * than fail the build or 500 the page. An empty list makes
 * `<TaxonomyLinkIndex>` render nothing at all, which is the correct fallback —
 * the interactive grid above it is unaffected either way.
 *
 * 🛑 A read here does NOT make the hub dynamic. Only `searchParams`,
 * `cookies()` and `headers()` do (Root Cause #94); a Server Component awaiting
 * Firestore stays static and simply bakes the result in at build/ISR time.
 */

import { normalizeError } from "../../../../errors/normalize";
import { serverLogger } from "../../../../monitoring/server-logger";
import { ROUTES } from "../../../../next/routing/route-map";
import { categoriesRepository } from "../../../../features/categories/repository/categories.repository";
import type { CategoryDocument } from "../../../../features/categories/schemas/firestore";

export interface TaxonomyLink {
  href: string;
  label: string;
}

/** Alphabetical, so the list reads as an index rather than an arbitrary dump. */
function toLinks(rows: CategoryDocument[], href: (slug: string) => string): TaxonomyLink[] {
  return rows
    .filter((row) => Boolean(row.slug) && Boolean(row.name))
    .map((row) => ({ href: href(row.slug), label: row.name }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

async function safeLinks(
  label: string,
  load: () => Promise<TaxonomyLink[]>,
): Promise<TaxonomyLink[]> {
  try {
    return await load();
  } catch (err) {
    void normalizeError(err);
    serverLogger.error(`taxonomy link index "${label}" failed and rendered 0 links`, {
      section: label,
      error: err,
    });
    return [];
  }
}

/** Every active brand — 28 of them, and none was linked from `/brands`. */
export function brandLinks(): Promise<TaxonomyLink[]> {
  return safeLinks("brand", async () =>
    toLinks(await categoriesRepository.findActiveBrands(), (slug) =>
      String(ROUTES.PUBLIC.BRAND_DETAIL(slug)),
    ),
  );
}

/**
 * Active franchises only.
 *
 * 7 of the 8 are deliberately `isActive: false` because an unstocked facet
 * "renders as a card in the grid that opens an empty page" (`brand-rows.ts`
 * trap 3), so this list is short on purpose. Linking the inactive ones would
 * re-create exactly the empty-page problem the rest of this work removes.
 */
export function franchiseLinks(): Promise<TaxonomyLink[]> {
  return safeLinks("franchise", async () =>
    toLinks(await categoriesRepository.findActiveFranchises(), (slug) =>
      String(ROUTES.PUBLIC.FRANCHISE_DETAIL(slug)),
    ),
  );
}

/**
 * The tier-0 category roots — the six real entry points a visitor drills down
 * from, not the 4,698-row forest.
 *
 * `CategoryDetailPageView` already renders a root as a tier-grouped index of
 * its descendants, so a root is where a crawl of the taxonomy should start.
 * Listing every leaf here would put the 4,658 empty pages back in front of
 * Google by another route, which is the thing being undone.
 */
export function categoryRootLinks(): Promise<TaxonomyLink[]> {
  return safeLinks("category-root", async () => {
    const roots = await categoriesRepository.getRootCategories();
    /*
     * 🛑 `getRootCategories()` filters only on the DEPRECATED `isBrand` flag,
     * and brands, franchises and bundles are all tier-0 by design — they sit
     * outside the forest's numbering and are pointed AT rather than lived
     * under. A franchise row carries no `isBrand`, so it survives that filter
     * and would appear in a list captioned "categories".
     *
     * Rejecting any row that carries a `categoryType` is the same predicate
     * the /categories tab uses ("categoryType empty AND tier === 0"), and it
     * is the one that stays correct when a fifth discriminator is added.
     */
    const plain = roots.filter((row) => !row.categoryType);
    return toLinks(plain, (slug) => String(ROUTES.PUBLIC.CATEGORY_DETAIL(slug)));
  });
}
