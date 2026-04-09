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
import { getProviders } from "@mohasinac/contracts";
import { createRouteHandler } from "@mohasinac/next";
import type { CategoryItem } from "../types/index.js";

// ─── Tree node (CategoryItem extended with nested children) ───────────────────
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

function param(url: URL, key: string): string | null {
  return url.searchParams.get(key);
}

function numParam(url: URL, key: string): number | null {
  const v = url.searchParams.get(key);
  if (v === null) return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

const SAFE_CATEGORY_FILTER_FIELDS = new Set([
  "type", "parentIds", "isFeatured", "showOnHomepage",
  "tier", "isActive", "isLeaf", "isBrand", "isSearchable",
]);

function validateSieveFilters(
  raw: string,
  allowedFields: ReadonlySet<string>,
): string {
  return raw
    .split(",")
    .map((c) => c.trim())
    .filter((c) => {
      const m = c.match(/^([^<>=!@]+)\s*(?:==|!=|<=|>=|<|>|@=\*?)/);
      return m ? allowedFields.has(m[1].trim()) : false;
    })
    .join(",");
}

// ─── GET /api/categories ──────────────────────────────────────────────────────

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
    const tier = numParam(url, "tier");
    const pageSizeParam = numParam(url, "pageSize");

    const { db } = getProviders();
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Database provider not registered" },
        { status: 503 },
      );
    }

    const repo = db.getRepository<CategoryItem>("categories");

    // ── Single slug lookup ────────────────────────────────────────────────────
    if (slug) {
      const result = await repo.findAll({
        filters: `slug==${slug}`,
        perPage: 1,
      });
      const category = result.data[0] ?? null;
      if (!category) {
        return NextResponse.json(
          { success: false, error: "Category not found" },
          { status: 404 },
        );
      }
      return NextResponse.json({ success: true, data: category });
    }

    // ── Build Sieve filter string from query params ────────────────────────────
    const parts: string[] = [];
    if (type) parts.push(`type==${type}`);
    if (parentId) parts.push(`parentIds@=${parentId}`);
    if (featured === "true") parts.push("isFeatured==true");
    if (isBrand === "true") parts.push("type==brand");
    if (showOnHomepage === "true") parts.push("showOnHomepage==true");
    if (tier !== null) parts.push(`tier==${tier}`);
    if (rawFilters) {
      const safe = validateSieveFilters(rawFilters, SAFE_CATEGORY_FILTER_FIELDS);
      if (safe) parts.push(safe);
    }
    const filters = parts.join(",");

    // ── Filtered flat list modes ───────────────────────────────────────────────
    // If any filter is active, or ?flat=true → return flat array
    const isFiltered =
      flat === "true" ||
      parentId !== null ||
      featured === "true" ||
      isBrand === "true" ||
      showOnHomepage === "true" ||
      tier !== null ||
      type !== null;

    if (isFiltered) {
      const perPage =
        pageSizeParam !== null && pageSizeParam > 0 ? pageSizeParam : 200;
      const result = await repo.findAll({
        filters,
        sort: "order",
        order: "asc",
        perPage,
      });
      const items = result.data.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const res = NextResponse.json({ success: true, data: items });
      res.headers.set(
        "Cache-Control",
        "public, max-age=300, s-maxage=600, stale-while-revalidate=120",
      );
      return res;
    }

    // ── Tree mode (default or explicit ?tree=true) ────────────────────────────
    const allResult = await repo.findAll({
      filters,
      sort: "order",
      order: "asc",
      perPage: 500,
    });
    if (tree === "true" || !flat) {
      const treeNodes = buildTreeFromFlat(allResult.data, rootId);
      const res = NextResponse.json({ success: true, data: treeNodes });
      res.headers.set(
        "Cache-Control",
        "public, max-age=300, s-maxage=600, stale-while-revalidate=120",
      );
      return res;
    }

    // Explicit ?flat=true on full set (non-filtered path, shouldn't reach here
    // because isFiltered catches it, but kept for clarity)
    const res = NextResponse.json({
      success: true,
      data: allResult.data.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    });
    res.headers.set(
      "Cache-Control",
      "public, max-age=300, s-maxage=600, stale-while-revalidate=120",
    );
    return res;
  } catch (error) {
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
    imageUrl: z.string().url().optional(),
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
