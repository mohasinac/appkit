/**
 * Category adapters — the single allow-list projection for every public
 * category response.
 *
 * Every field of `CategoryDocument` is triaged into exactly one of
 * `PUBLIC_CATEGORY_FIELDS` (mapped into the returned literal) or
 * `PRIVATE_CATEGORY_FIELDS` (with a stated reason), mirroring the store and
 * site-settings adapters. A field added to the schema and to neither list
 * fails `scripts/audit-public-projection-parity.mjs`, so new fields are
 * private by default.
 *
 * Why this exists (2026-10-10): `GET /api/categories` returned `result.data`
 * raw — the whole document — on an unauthenticated, hour-edge-cached route.
 * That published `createdBy` (a uid), `createdByStoreId`, `createdByStoreName`
 * and, worst, `metrics.productIds[]` / `metrics.auctionIds[]`: two UNBOUNDED
 * arrays that grow with the catalogue. `CategoryInlineSelect` calls that route
 * with `pageSize=200` on every seller-form open, so the payload scaled with
 * both the number of categories and the number of products in each.
 *
 * 🛑 There is an older `CATEGORIES_PUBLIC_FIELDS` in
 * `features/categories/schemas/firestore.ts`. It has ZERO runtime consumers,
 * predates `categoryType` / `highlights` / `faqs` / `itemCode` / the brand and
 * bundle fields, and is a `.select()`-style dot-path list rather than a
 * projection. It is deliberately not reused here; this module is the one the
 * route actually calls.
 */
import type { CategoryDocument } from "../../../../features/categories/schemas/firestore";
import type { CategoryItem } from "../../../../features/categories/types/index";

/**
 * Document fields that may reach an unauthenticated client. Keep in sync with
 * the object literal in `toCategoryListItem` — the audit asserts both
 * directions.
 */
export const PUBLIC_CATEGORY_FIELDS = [
  "id",
  "name",
  "slug",
  "description",
  // Structure. The client builds its own tree and breadcrumbs from these.
  "rootId",
  "parentIds",
  "childrenIds",
  "tier",
  "path",
  "order",
  "isLeaf",
  "ancestors",
  // Discriminator — public because every consumer must tell a listing
  // category apart from a brand/bundle/sublisting row, and a plain category
  // OMITS the field, so the test can only be done client-side.
  "categoryType",
  "itemCode",
  // Presentation.
  "isFeatured",
  "featuredPriority",
  "seo",
  "display",
  // Read by `AdminCategoriesView`'s Status column off this very route.
  "isActive",
  // Editorial copy — already rendered publicly by
  // `CategoryHighlightsAndFaqSection` on the category and brand pages.
  "highlights",
  "faqs",
  // Brand-row fields, rendered in the "About this brand" panel.
  "brandWebsite",
  "brandCountry",
  "brandFounded",
  // Rollup counts only — see `metrics` in the private list.
  "metrics",
  "createdAt",
  "updatedAt",
] as const;

/**
 * Fields withheld, each with the reason. Never remove one without replacing
 * the reason — "it seemed unused" is how a field ends up public by accident.
 */
export const PRIVATE_CATEGORY_FIELDS = [
  // Internal DFS coordinates. Useful only to `onCategoryWrite` and
  // `positionsReconcile`; publishing them invites a client to depend on an
  // ordering we renumber on every reseed.
  "position",
  "subtreeSize",
  // Operator identity. `createdBy` is a raw uid.
  "createdBy",
  "createdByType",
  "createdByStoreId",
  "createdByStoreName",
  // Analytics, not content.
  "viewCount",
  // @deprecated duplicate of `categoryType === "brand"`.
  "isBrand",
  /*
   * The next four are withheld NOT because they are sensitive but because
   * no client reads them off THIS route — verified by grep, per consumer:
   *
   *   showOnHomepage  — homepage curation runs server-side; `CategoryItem`
   *                     declares no such field and nothing reads one.
   *   isSearchable    — a query-time flag. No client branches on it.
   *   brandSlug       — a bundle's own brand tag. Its two readers are
   *                     `AdminBundleEditorView` (via ADMIN_ENDPOINTS.BUNDLES,
   *                     a different route) and `BrandDetailPageView` (which
   *                     holds the raw `CategoryDocument` server-side).
   *   bundle*         — same story: every bundle surface is fed by
   *                     ADMIN_ENDPOINTS.BUNDLES or by a server-side read.
   *
   * 🛑 If a bundle card is ever fed from `/api/categories`, promote the
   * bundle fields HERE and add them to `CategoryItem` — do not reach for a
   * cast at the call site, which is Root Cause #70's exact mechanism.
   */
  "showOnHomepage",
  "isSearchable",
  /*
   * The prefix-expanded search index. Withheld for two reasons, not one:
   *
   *   - No client reads it. Searching is a SERVER concern — the term is pushed
   *     down as an `array-contains` on `CATEGORY_FIELDS.SEARCH_TXT`; a browser
   *     has no use for the token array.
   *   - It is 53–160 tokens per row (measured, cap 600). Publishing it would
   *     roughly double this payload on a route `CategoryInlineSelect` hits
   *     with `pageSize=200` on every seller-form open — the exact cost
   *     Root Cause #104 was about.
   */
  "searchTxt",
  "brandSlug",
  "bundleKind",
  "bundlePrice",
  "bundleStockStatus",
  "bundleProductIds",
  "bundleCategorySlugs",
  "bundleOriginalTotal",
  "bundleItemDetails",
  /*
   * ── Category-owned content (B3) ──────────────────────────────────────────
   *
   * All three are PRIVATE on this route and that is a payload decision, not a
   * secrecy one — they are genuinely public content, just not from here.
   *
   * This is the LIST projection, and `CategoryInlineSelect` calls it with
   * `pageSize=200` on every seller-form open. `contentBody` alone is 400–900
   * chars of HTML per row, so publishing it here would add ~180 KB to a
   * response whose only job is to fill a picker — the Fast-Origin-Transfer
   * shape of Root Cause #104, on the resource this project is most over on.
   *
   * Each has exactly one real reader and neither is this route:
   *
   *   contentBody          — the category DETAIL page, which holds the raw
   *                          CategoryDocument server-side (getCategoryBySlug).
   *   descriptionTemplates — the seller form, via the narrow
   *                          /api/categories/[id]/description-template
   *                          endpoint (C2), one category at a time, edge-cached
   *                          for an hour.
   *   productDefaults      — `deriveTaxonomy`, server-side, on the product
   *                          write path; plus the same narrow endpoint for the
   *                          seller-facing price hint.
   *
   * 🛑 If a surface ever needs one of these from the list route, promote it
   * here AND add it to `CategoryItem` AND to the literal in
   * `toCategoryListItem` — do not cast at the call site, which is Root Cause
   * #70's exact mechanism.
   */
  "contentBody",
  "descriptionTemplates",
  "productDefaults",
  // Test-data plumbing. `hidePublicTestData()` filters on these server-side;
  // a client has no business branching on them.
  "isTestData",
  "testDataExpiresAt",
  // The rule that resolves a dynamic bundle's members. Publishing it hands
  // out the query, and the resolved `bundleProductIds` is already public.
  "bundleQueryRule",
  "bundleQueryResolvedAt",
] as const;

/**
 * Rollup counters only.
 *
 * 🛑 `metrics.productIds[]` and `metrics.auctionIds[]` are deliberately
 * dropped. They are unbounded arrays — one entry per product in the category
 * — and they were the bulk of the raw payload. Nothing client-side reads them
 * that a query cannot answer, and a category page already fetches its own
 * products.
 */
function toPublicMetrics(m: CategoryDocument["metrics"] | undefined) {
  return {
    productCount: m?.productCount ?? 0,
    auctionCount: m?.auctionCount ?? 0,
    totalProductCount: m?.totalProductCount ?? 0,
    totalAuctionCount: m?.totalAuctionCount ?? 0,
    totalItemCount: m?.totalItemCount ?? 0,
  };
}

/**
 * Project a stored category into the public shape.
 *
 * Built by NAMING each field, never by spreading and deleting — a deny-list
 * publishes every field nobody thought to remove, including ones the
 * interface does not declare (Root Cause #70).
 */
export function toCategoryListItem(doc: CategoryDocument): CategoryItem {
  /*
   * No `as CategoryItem` on the literal below, on purpose. The cast is what
   * lets a shape drift silently; without it tsc checks every key, and it
   * already caught `createdAt` being a Date where the contract wants a
   * string.
   */
  return {
    id: doc.id,
    name: doc.name,
    slug: doc.slug,
    description: doc.description,

    rootId: doc.rootId,
    parentIds: doc.parentIds,
    childrenIds: doc.childrenIds,
    tier: doc.tier,
    path: doc.path,
    order: doc.order,
    isLeaf: doc.isLeaf,
    ancestors: doc.ancestors,

    categoryType: doc.categoryType,
    itemCode: doc.itemCode,

    isFeatured: doc.isFeatured,
    featuredPriority: doc.featuredPriority,
    seo: doc.seo,
    display: doc.display,
    isActive: doc.isActive,

    highlights: doc.highlights,
    faqs: doc.faqs,

    brandWebsite: doc.brandWebsite,
    brandCountry: doc.brandCountry,
    brandFounded: doc.brandFounded,

    metrics: toPublicMetrics(doc.metrics),

    // 🛑 `CategoryDocument` stores Dates; `CategoryItem` declares strings —
    // this projection is also the serialisation boundary. Converting here
    // rather than casting is deliberate: `as unknown as CategoryItem` has no
    // runtime effect and would have shipped raw `Timestamp`/`Date` objects
    // into an RSC payload, which is Root Cause #70's exact mechanism.
    createdAt: toIsoString(doc.createdAt),
    updatedAt: toIsoString(doc.updatedAt),
  };
}

/** Firestore hands back `Date`; the client contract is an ISO string. */
function toIsoString(value: Date | string | undefined): string | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : String(value);
}
