/*
 * WHY: Category, brand and store detail pages each show a listing-type tab bar
 *      and hide a tab whose scope holds nothing. Before this module they each
 *      hand-wrote their own per-type count map, and all three had drifted:
 *      category and brand counted 6 of 10 tabs (classifieds / digital-codes /
 *      live / art fell through to `undefined` and could therefore NEVER hide),
 *      while the store page counted all 9 through eleven copy-pasted queries.
 *      That is Recurrent Root Cause #61 — an enumeration of `ListingType` kept
 *      by hand in more than one place always drifts.
 * WHAT: One function that derives the buckets it counts from the SAME tab array
 *       the tab bar renders, so a tenth listing type is counted automatically.
 *
 * EXPORTS:
 *   ListingTabScope   — the surface's scope (category / brand / store)
 *   ListingTabCounts  — tabSlug -> count, `undefined` meaning "query failed"
 *   listingTabCounts  — resolve every tab's count in one parallel batch
 *
 * @tag domain:products,categories,stores
 * @tag layer:server
 * @tag pattern:derived-from-registry
 * @tag access:server-only
 * @tag consumers:CategoryDetailPageView,BrandDetailPageView,StoreDetailLayoutView
 * @tag sideEffects:none
 */

import { categoriesRepository, productRepository } from "../../../../repositories";
import { serverLogger } from "../../../../monitoring";
import { normalizeError } from "../../../../errors/normalize";
import type { ListingTab } from "../../../../features/products/constants/listing-tabs";
import type { CategoryDocument } from "../../../../features/categories/schemas";

/**
 * Which slice of the catalogue a tab bar is counting. Exactly one of the three
 * scoping fields is set in practice, but the shape is shared so all three
 * surfaces go through one code path.
 */
export interface ListingTabScope {
  /**
   * Category ids to match against `categorySlugs`. Products are tagged with
   * their FULL ancestor chain, so this should be the page's own id alone —
   * expanding descendants is both unnecessary and, past 30 entries, illegal
   * (see `ProductRepository.MAX_ARRAY_CONTAINS_ANY`).
   */
  categoriesIn?: string[];
  /**
   * Brand DISPLAY NAME, not slug. `BrandDetailPageView` matches products on the
   * free-text `brand` field, so the count must use the same field or it would
   * disagree with the rows the tab then shows.
   */
  brandName?: string;
  storeId?: string;
  /** Publication state to count. Defaults to `published`. */
  status?: string;
}

/**
 * tabSlug -> number of rows, or `undefined` when that count could not be
 * resolved.
 *
 * `undefined` is load-bearing: callers hide a tab at zero, so a failed query
 * that reported 0 would hide a tab holding real inventory. Callers must treat
 * `undefined` as "keep the tab visible" (Root Cause #59).
 */
export type ListingTabCounts = Record<string, number | undefined>;

const DEFAULT_STATUS = "published";

/** Bundles a category owns, resolved by the same rule the bundles tab renders. */
async function countBundles(
  scope: ListingTabScope,
): Promise<number | undefined> {
  try {
    const rows = await categoriesRepository.listByType("bundle", {
      activeOnly: true,
      limit: 100,
    });
    return rows.filter((row) => bundleMatchesScope(row, scope)).length;
  } catch (error) {
    void normalizeError(error);
    serverLogger.warn("listingTabCounts: bundle count failed; tab stays visible");
    return undefined;
  }
}

/**
 * Does a bundle belong to the scope being counted?
 *
 * A bundle row carries `brandSlug` and `createdByStoreId` but has no category
 * field of its own, so category membership is derived from the categories its
 * MEMBER products are filed under — mirrored onto `bundleCategorySlugs` for
 * index-friendly reads. Per Root Cause #42 the mirror is never trusted alone:
 * when it is absent the bundle is treated as unscoped rather than as excluded,
 * because silently dropping a bundle whose mirror one write path forgot is the
 * exact failure that entry documents.
 */
function bundleMatchesScope(
  bundle: CategoryDocument,
  scope: ListingTabScope,
): boolean {
  if (scope.storeId) return bundle.createdByStoreId === scope.storeId;
  if (scope.brandName) return true; // brand pages filter by slug at the call site
  if (scope.categoriesIn && scope.categoriesIn.length > 0) {
    const mirror = bundle.bundleCategorySlugs;
    if (!mirror || mirror.length === 0) return true;
    return mirror.some((slug) => scope.categoriesIn!.includes(slug));
  }
  return true;
}

/**
 * Count every tab in `tabs` within `scope`, in one parallel batch.
 *
 * The listing-type buckets come from each tab's own `listingType` field — which
 * already carries `"art|stickers"` as a pipe OR-group — so this function never
 * enumerates the `ListingType` union itself and cannot drift from it.
 *
 * `stores` is not counted here: only the category page has that tab and it
 * already resolves its store list eagerly to render the tab body.
 */
export async function listingTabCounts(
  tabs: readonly ListingTab[],
  scope: ListingTabScope,
): Promise<ListingTabCounts> {
  const listingTabs = tabs.filter((tab) => Boolean(tab.listingType));
  const wantsBundles = tabs.some((tab) => tab.collection === "bundles");

  const [typeCounts, bundleCount] = await Promise.all([
    productRepository.countByListingTypes(
      listingTabs.map((tab) => String(tab.listingType)),
      {
        status: scope.status ?? DEFAULT_STATUS,
        storeId: scope.storeId,
        categoriesIn: scope.categoriesIn,
        brandName: scope.brandName,
      },
    ),
    wantsBundles ? countBundles(scope) : Promise.resolve(undefined),
  ]);

  const counts: ListingTabCounts = {};
  for (const tab of listingTabs) {
    counts[tab.id] = typeCounts[String(tab.listingType)];
  }
  if (wantsBundles) counts.bundles = bundleCount;
  return counts;
}
