/*
 * WHY: four surfaces need to answer "is this row a browsable listing category,
 *      or is it a brand / bundle / sublisting sharing the collection?" — the
 *      sitemap, the filter-facet hook, the public categories route, and the
 *      catalogue editor's picker. Three of them had already hand-written the
 *      same Set, which is how the fourth got shipped without one.
 *
 * WHAT: one Set and one predicate. No imports, so it is safe in a client
 *       bundle (Root Cause #6) and safe in a server-only metadata path
 *       (Root Cause #76).
 *
 * 🛑 THE TEST CANNOT BE A FIRESTORE CLAUSE, and that is the whole reason this
 * exists as a predicate rather than a query filter. A plain listing category
 * **OMITS** `categoryType` entirely — that is the convention every seeded
 * listing category follows — so there is no value to match on and
 * `where("categoryType", "not-in", [...])` would exclude every real category
 * (a Firestore inequality drops documents that lack the field). It has to be
 * applied in memory, after the fetch.
 *
 * Measured cost of not doing this: the `/products` category facet offered 11
 * options of which **9 were not categories** — "Takara-Tomy", "Hasbro",
 * "Burst Battlers Pack", "X-Series Starter Set" — and the catalogue editor's
 * category picker offered "Original Collector's Set" and "Metal Fusion Duo".
 * It fails silently because a short list of plausible names is
 * indistinguishable from a correct one.
 *
 * @tag domain:categories
 * @tag layer:constants
 * @tag access:isomorphic
 * @tag sideEffects:none
 */

/**
 * `categoryType` values that are NOT browsable listing categories.
 *
 * - `brand`     — a manufacturer/publisher row, browsed at `/brands/{slug}`
 * - `bundle`    — a priced bundle, browsed at `/bundles/{slug}`
 * - `sublisting`— a grading/variant axis (`"PSA 10"`, `"105RF"`), never browsed
 */
export const NON_LISTING_CATEGORY_TYPES: ReadonlySet<string> = new Set([
  "brand",
  "bundle",
  "sublisting",
]);

/**
 * True when a category row is a real, browsable listing category.
 *
 * Structural parameter on purpose: callers hold `CategoryDocument` (server) or
 * `CategoryItem` (client) and neither should have to be imported here.
 */
export function isListingCategory(cat: { categoryType?: string | null }): boolean {
  const kind = cat.categoryType;
  return typeof kind !== "string" || !NON_LISTING_CATEGORY_TYPES.has(kind);
}
