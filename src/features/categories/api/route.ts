/**
 * feat-categories — Next.js App Router API handler (GET/POST /api/categories)
 *
 * Pure stub:
 * ```ts
 * // app/api/categories/route.ts
 * export { GET, POST } from "@mohasinac/feat-categories";
 * ```
 *
 * Response shape:
 * - With filter params (`?flat`, `?isBrand`, `?tier`, `?parentId`, etc.) → data: CategoryItem[]
 * - With `?tree=true` or no params → data: CategoryTreeNode[] (nested tree)
 * - With `?slug=…` → data: CategoryItem (single)
 */

import { NextResponse } from "next/server.js";
import { z } from "zod";
import { mediaUrlSchema } from "../../../validation/schemas";
import { getProviders } from "../../../contracts";
import { createRouteHandler } from "../../../next/api/routeHandler";
import type { CategoryItem } from "../types/index";
import type { CategoryDocument } from "../schemas/firestore";
import { toCategoryListItem } from "../../../_internal/server/features/categories/adapters";
import { categoriesRepository } from "../repository/categories.repository";
import { isListingCategory } from "../constants/listing-categories";
import { planSearchTxt } from "../../../utils/search-txt-query";
import { matchesAllSearchTerms } from "../../../utils/search-txt";

import { normalizeError } from "../../../errors/normalize";
import { intParamOrNull, param } from "../../../utils/search-params";
import { validateSieveFilters } from "../../../utils/sieve-builder";
const CACHE_CONTROL_PUBLIC = "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400";

/**
 * Overlay the LIVE rolled-up count onto a projected page of categories.
 *
 * 🛑 Why this route and not the grid component: `/categories` renders entirely
 * client-side from this endpoint (its page.tsx does no Firestore read at all,
 * deliberately, so the route can stay static), so this is the only server-side
 * place the numbers it shows pass through. `metrics.totalProductCount` is
 * written by the nightly reconciler ALONE, so every multi-category surface was
 * up to a day behind the category's own page, which counts live.
 *
 * 🛑 An id with no counts document keeps its `metrics` value. It does NOT
 * become 0 — a category whose counter has never been written would otherwise
 * render a confident zero, which is the regression Root Cause #72 names and
 * would make this change worse than leaving it stale.
 *
 * Bounded by construction: the caller has already paginated, and
 * `getLiveCategoryCounts` hard-caps the batch at 200 ids in ONE `getAll`.
 */
async function withLiveTotals(items: CategoryItem[]): Promise<CategoryItem[]> {
  if (items.length === 0) return items;
  const live = await categoriesRepository.liveTotalsFor(items.map((i) => i.id));
  if (live.size === 0) return items;
  return items.map((item) => {
    const total = live.get(item.id);
    /*
     * `metrics` is optional on `CategoryItem`, and an item without it is left
     * exactly as it is rather than gaining a half-built one — a metrics object
     * carrying only `totalProductCount` would read as "0 products, N in
     * total", which is a worse answer than the absent object the renderer
     * already handles.
     */
    if (total === undefined || !item.metrics) return item;
    return { ...item, metrics: { ...item.metrics, totalProductCount: total } };
  });
}

// --- Tree node (CategoryItem extended with nested children) -------------------
interface CategoryTreeNode extends CategoryItem {
  children: CategoryTreeNode[];
}

function buildTreeFromFlat(
  items: CategoryItem[],
  rootId?: string | null,
): CategoryTreeNode[] {
  const byId = new Map<string, CategoryItem>(items.map((i) => [i.id, i]));

  // Roots: tier === 0 or no parentIds
  let roots = items.filter((i) => i.tier === 0 || !i.parentIds?.length);

  if (rootId) {
    const root = byId.get(rootId);
    roots = root ? [root] : [];
  }

  function nest(item: CategoryItem): CategoryTreeNode {
    const children = (item.childrenIds ?? [])
      .map((cid) => byId.get(cid))
      .filter((c): c is CategoryItem => c !== undefined)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map(nest);
    return { ...item, children };
  }

  return roots.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(nest);
}

const SAFE_CATEGORY_FILTER_FIELDS = new Set([
  "categoryType", "parentIds", "isFeatured", "showOnHomepage",
  "tier", "isActive", "isLeaf", "isBrand", "isSearchable",
]);

// --- GET /api/categories ------------------------------------------------------

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const url = new URL(request.url);

    const slug = param(url, "slug");
    const type = param(url, "type");
    const parentId = param(url, "parentId");
    const rootId = param(url, "rootId");
    const featured = param(url, "featured");
    const isBrand = param(url, "isBrand");
    const showOnHomepage = param(url, "showOnHomepage");
    const flat = param(url, "flat");
    const tree = param(url, "tree");
    const rawFilters = param(url, "filters");
    const tier = intParamOrNull(url, "tier");
    const pageSizeParam = intParamOrNull(url, "pageSize");
    /*
     * 🛑 `?page=` MEANS "give me a paged flat list", and reading it fixes two
     * live bugs rather than adding a feature.
     *
     * (a) `useAdminListingData` ALWAYS sends `page` and `pageSize`, so
     *     `/admin/categories` has been requesting `?flat=true&page=N` while
     *     this handler ignored `page` entirely — the pager advanced the URL
     *     and returned page 1's rows every time. It also returned a bare
     *     array with no `total`, so `extractCategoryTotal` fell back to
     *     `mappedRows.length`, making `totalPages` 1 and disabling Next. The
     *     list showed 50 of 58 categories with no way to reach the rest.
     *
     * (b) `loadOptionsFrom` (the catalogue editor's category and brand
     *     pickers) sends ONLY `page`/`pageSize`/`q` — none of which `isFiltered`
     *     tested — so it fell through to TREE mode and then read `.items` off
     *     a bare array of nested nodes. `data.items ?? []` meant both pickers
     *     were permanently empty. Same shape as the `useCategoryTree` bug:
     *     `isFiltered` did not include the params real callers send.
     */
    const pageParam = intParamOrNull(url, "page");
    const isPaged = pageParam !== null && pageParam > 0;
    /*
     * `?listingOnly=true` drops brand / bundle / sublisting rows.
     *
     * Applied in memory because the test cannot be a query clause — a plain
     * listing category OMITS `categoryType`, so there is no value to match
     * and an inequality would exclude every real category. See
     * `constants/listing-categories.ts`.
     *
     * Server-side rather than per-caller: three surfaces had hand-written the
     * same Set and the fourth (`loadCategoryOptions`, the catalogue editor's
     * category picker) shipped without one, offering "Takara-Tomy" and
     * "Original Collector's Set" as categories.
     */
    const listingOnly = param(url, "listingOnly") === "true";
    /*
     * `q` is read now that `searchTxt` exists.
     *
     * `loadOptionsFrom` has always sent it and this handler never read it, so
     * the catalogue editor's category picker returned the same unfiltered page
     * for every term — the search box accepted typing and changed nothing.
     * Root Cause #62's shape, and the second half of why that picker was
     * useless (the first being that it got a nested tree, §A1c).
     */
    const q = (param(url, "q") ?? "").trim();

    const { db } = getProviders();
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Database provider not registered" },
        { status: 503 },
      );
    }

    /*
     * 🛑 Typed as the DOCUMENT, not as `CategoryItem`.
     *
     * This was `getRepository<CategoryItem>`, which is a cast-by-generic: the
     * repository returns raw Firestore documents at runtime, so every return
     * site below was handing out `createdBy`, `createdByStoreId` and the
     * unbounded `metrics.productIds[]`/`collectorDropIds[]` while tsc believed the
     * payload was already projected. Naming the real shape is what makes the
     * missing `toCategoryListItem` calls a compile error instead of a leak.
     */
    const repo = db.getRepository<CategoryDocument>("categories");

    // -- Single slug lookup ----------------------------------------------------
    if (slug) {
      const result = await repo.findAll({
        filters: `slug==${slug}`,
        pageSize: 1,
      });
      const category = result.data[0] ?? null;
      if (!category) {
        return NextResponse.json(
          { success: false, error: "Category not found" },
          { status: 404 },
        );
      }
      return NextResponse.json({ success: true, data: toCategoryListItem(category) });
    }

    // -- Build Sieve filter string from query params ----------------------------
    const parts: string[] = [];
    if (type) parts.push(`categoryType==${type}`);
    if (parentId) parts.push(`parentIds@=${parentId}`);
    if (featured === "true") parts.push("isFeatured==true");
    if (isBrand === "true") parts.push("categoryType==brand");
    if (showOnHomepage === "true") parts.push("showOnHomepage==true");
    if (tier !== null) parts.push(`tier==${tier}`);
    if (rawFilters) {
      const safe = validateSieveFilters(rawFilters, SAFE_CATEGORY_FILTER_FIELDS);
      if (safe) parts.push(safe);
    }
    const filters = parts.join(",");

    // -- Filtered flat list modes -----------------------------------------------
    // If any filter is active, or ?flat=true → return flat array
    const isFiltered =
      flat === "true" ||
      isPaged ||
      parentId !== null ||
      featured === "true" ||
      isBrand === "true" ||
      showOnHomepage === "true" ||
      tier !== null ||
      type !== null;

    if (isFiltered) {
      const pageSize =
        pageSizeParam !== null && pageSizeParam > 0 ? pageSizeParam : 200;
      const page = pageParam ?? 1;

      /*
       * 🛑 `listingOnly` and `q` both force an in-memory window, and `total`
       * is the reason.
       *
       * Each removes rows AFTER the query, so the repository's own `total`
       * would be an over-count and `hasMore` would promise a "Load more" page
       * that renders empty. Rather than ship a number that is wrong in a
       * direction nobody can see, fetch one bounded window, filter it, and
       * paginate the result — so `total` is exact.
       *
       * Affordable because this collection is small and hard-capped at 500 by
       * `base.ts` anyway: 58 rows today, ~330 after the taxonomy seed. Past
       * the cap the window truncates, which is the same ceiling the sitemap
       * builder has and is tracked as its own item — it is not made worse
       * here.
       *
       * The MATCH uses `matchesAllSearchTerms` over the stored `searchTxt`,
       * not `name.includes()`, so this route and the admin route's real
       * push-down agree on what a term means: word prefixes, accent-folded,
       * all terms ANDed, lineage included via `ancestors[].name`. Two
       * different notions of "matches" across two pickers over one collection
       * is the drift this reuse avoids.
       */
      const plan = planSearchTxt(q);
      // A query that normalised to no usable token must return NOTHING.
      // Emitting no clause returns the whole collection and calls it a result.
      if (plan.empty) {
        const res = isPaged
          ? NextResponse.json({
              success: true,
              data: { items: [], total: 0, page, pageSize, totalPages: 0, hasMore: false },
            })
          : NextResponse.json({ success: true, data: [] });
        res.headers.set("Cache-Control", CACHE_CONTROL_PUBLIC);
        return res;
      }
      const terms = plan.head ? [plan.head, ...plan.rest] : [];
      const needsWindow = listingOnly || terms.length > 0;

      const windowed = needsWindow
        ? await repo.findAll({ filters, sort: "order", order: "asc", pageSize: 500 })
        : null;

      let items: CategoryItem[];
      let total: number;
      if (windowed) {
        const kept = windowed.data
          .filter((d) => (listingOnly ? isListingCategory(d) : true))
          .filter((d) => (terms.length ? matchesAllSearchTerms(d.searchTxt, terms) : true))
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        total = kept.length;
        const offset = (page - 1) * pageSize;
        items = (isPaged ? kept.slice(offset, offset + pageSize) : kept).map(toCategoryListItem);
      } else {
        const result = await repo.findAll({
          filters,
          sort: "order",
          order: "asc",
          page: pageParam ?? undefined,
          pageSize,
        });
        total = result.total;
        items = result.data
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map(toCategoryListItem);
      }

      items = await withLiveTotals(items);

      const totalPages = total === 0 ? 0 : Math.max(1, Math.ceil(total / pageSize));

      /*
       * Shape switches on `?page=`, deliberately, and only there.
       *
       * A paged caller gets an envelope carrying `total`/`totalPages`/`hasMore`
       * — without `total` the admin pager computes `totalPages = 1` from the
       * row count and disables Next, which is the "50 of 58 rows" bug. A
       * caller that sends no `page` keeps the bare array it has always had,
       * because `useCategories` and `useTopCategories` are TYPED as
       * `CategoryItem[]` and would throw on `.map` of an object (Root Cause
       * #20 — a public shape change must update its call sites, and these
       * callers never ask for paging, so the correct move is not to change
       * their shape at all).
       *
       * `hasMore` exists because `loadOptionsFrom` reads it for "Load more";
       * it used to read it off a bare array and always got `false`.
       */
      const res = isPaged
        ? NextResponse.json({
            success: true,
            data: { items, total, page, pageSize, totalPages, hasMore: page < totalPages },
          })
        : NextResponse.json({ success: true, data: items });
      res.headers.set(
        "Cache-Control",
        CACHE_CONTROL_PUBLIC,
      );
      return res;
    }

    // -- Tree mode (default or explicit ?tree=true) ----------------------------
    const allResult = await repo.findAll({
      filters,
      sort: "order",
      order: "asc",
      pageSize: 500,
    });
    // Project BEFORE nesting — `CategoryTreeNode extends CategoryItem`, so the
    // children carry the public shape too rather than being raw documents
    // reachable one level down.
    const allItems = await withLiveTotals(allResult.data.map(toCategoryListItem));
    if (tree === "true" || !flat) {
      const treeNodes = buildTreeFromFlat(allItems, rootId);
      const res = NextResponse.json({ success: true, data: treeNodes });
      res.headers.set(
        "Cache-Control",
        CACHE_CONTROL_PUBLIC,
      );
      return res;
    }

    // Explicit ?flat=true on full set (non-filtered path, shouldn't reach here
    // because isFiltered catches it, but kept for clarity)
    const res = NextResponse.json({
      success: true,
      data: allItems.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    });
    res.headers.set(
      "Cache-Control",
      CACHE_CONTROL_PUBLIC,
    );
    return res;
  } catch (error) {
    void normalizeError(error);
    console.error("[feat-categories] GET /api/categories failed", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch categories" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/categories — create a new category (admin only)
// ---------------------------------------------------------------------------

const categoryCreateSchema = z
  .object({
    name: z.string().min(1).max(200),
    slug: z.string().min(1).max(200),
    type: z.string().optional(),
    parentId: z.string().optional(),
    parentIds: z.array(z.string()).optional(),
    childrenIds: z.array(z.string()).optional(),
    tier: z.number().int().min(0).optional(),
    order: z.number().int().min(0).optional(),
    description: z.string().optional(),
    imageUrl: mediaUrlSchema.optional(),
    isFeatured: z.boolean().optional(),
    showOnHomepage: z.boolean().optional(),
  })
  .passthrough();

export const POST = createRouteHandler({
  auth: true,
  roles: ["admin"],
  schema: categoryCreateSchema,
  handler: async ({ body }) => {
    const { db } = getProviders();
    if (!db) {
      return NextResponse.json(
        { success: false, error: "DB not configured" },
        { status: 503 },
      );
    }

    const repo = db.getRepository<CategoryItem>("categories");
    const now = new Date().toISOString();

    const created = await repo.create({
      ...(body as object),
      createdAt: now,
      updatedAt: now,
    } as unknown as CategoryItem);

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  },
});
