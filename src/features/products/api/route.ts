/**
 * feat-products — Next.js App Router API handlers (GET /api/products, POST /api/products)
 *
 * These handlers are exported so consuming projects can create 2-line stubs:
 *
 * ```ts
 * // app/api/products/route.ts
 * export { GET, POST } from "@mohasinac/feat-products";
 * ```
 *
 * The db provider must be registered via providers.config.ts before the first
 * request is handled.  Every read/write goes through the IRepository<ProductItem>
 * resolved from `getProviders().db.getRepository("products")`.
 */

import { NextResponse } from "next/server.js";
import { z } from "zod";
import { getProviders } from "@mohasinac/contracts";
import { createRouteHandler } from "@mohasinac/next";
import type { ProductItem, ProductListResponse } from "../types/index.js";

type ProductRecord = ProductItem & {
  sellerId?: string;
  sellerName?: string;
};

// ─── Mutation schemas ─────────────────────────────────────────────────────────
// Minimal schemas for secured mutations — consumer apps can extend as needed.

const productMutateSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(10000).optional(),
    price: z.number().positive().optional(),
    originalPrice: z.number().positive().optional(),
    currency: z.string().length(3).optional(),
    category: z.string().optional(),
    status: z
      .enum([
        "draft",
        "published",
        "archived",
        "sold",
        "discontinued",
        "out_of_stock",
      ])
      .optional(),
    mainImage: z.string().optional(),
    images: z.array(z.any()).optional(),
    tags: z.array(z.string()).optional(),
    featured: z.boolean().optional(),
    isPromoted: z.boolean().optional(),
    isAuction: z.boolean().optional(),
    isPreOrder: z.boolean().optional(),
    sellerId: z.string().optional(),
    sellerName: z.string().optional(),
    sellerEmail: z.string().email().optional(),
    slug: z.string().optional(),
  })
  .passthrough();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function param(url: URL, key: string): string | null {
  return url.searchParams.get(key);
}

function numParam(url: URL, key: string, fallback: number): number {
  const v = url.searchParams.get(key);
  const n = v !== null ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

/** Public fields callers may filter on via the ?filters= param. */
const SAFE_PRODUCT_FILTER_FIELDS = new Set([
  "status",
  "category",
  "brand",
  "condition",
  "sellerId",
  "title",
  "price",
  "isAuction",
  "isPreOrder",
  "featured",
  "isPromoted",
  "stockQuantity",
  "availableQuantity",
  "tags",
]);

/**
 * Validates a raw Sieve filter string against an allowlist of safe fields.
 * Drops any clause whose field name is not in the allowlist.
 */
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

function buildFilters(url: URL): string {
  const parts: string[] = [];
  const status = param(url, "status");
  if (status) parts.push(`status==${status}`);
  const category = param(url, "category");
  if (category) parts.push(`category==${category}`);
  const brand = param(url, "brand");
  if (brand) parts.push(`brand==${brand}`);
  const condition = param(url, "condition");
  if (condition) parts.push(`condition==${condition}`);
  const sellerId = param(url, "sellerId");
  if (sellerId) parts.push(`sellerId==${sellerId}`);
  const q = param(url, "q");
  if (q) parts.push(`title@=*${q}`);
  const minPrice = param(url, "minPrice");
  if (minPrice !== null && !Number.isNaN(Number(minPrice)))
    parts.push(`price>=${minPrice}`);
  const maxPrice = param(url, "maxPrice");
  if (maxPrice !== null && !Number.isNaN(Number(maxPrice)))
    parts.push(`price<=${maxPrice}`);
  const inStock = param(url, "inStock");
  if (inStock === "true") parts.push("stockQuantity>0");
  const isAuction = param(url, "isAuction");
  if (isAuction !== null) parts.push(`isAuction==${isAuction}`);
  const isPreOrder = param(url, "isPreOrder");
  if (isPreOrder !== null) parts.push(`isPreOrder==${isPreOrder}`);
  const featured = param(url, "featured");
  if (featured === "true") parts.push("featured==true");
  // Merge validated Sieve filters — only safe public fields allowed
  const raw = param(url, "filters");
  if (raw) {
    const safe = validateSieveFilters(raw, SAFE_PRODUCT_FILTER_FIELDS);
    if (safe) parts.push(safe);
  }
  return parts.join(",");
}

// ─── GET /api/products ────────────────────────────────────────────────────────

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const page = numParam(url, "page", 1);
    const pageSize = numParam(url, "pageSize", 20);
    const sort = param(url, "sorts") ?? param(url, "sort") ?? "-createdAt";
    const filters = buildFilters(url);

    const { db } = getProviders();
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Database provider not registered" },
        { status: 503 },
      );
    }

    const repo = db.getRepository<ProductRecord>("products");
    const result = await repo.findAll({
      filters,
      sort,
      page,
      perPage: pageSize,
    });

    const totalPages = Math.max(1, Math.ceil(result.total / pageSize));
    const body: ProductListResponse = {
      items: result.data,
      total: result.total,
      page: result.page,
      pageSize,
      totalPages,
      hasMore: result.page < totalPages,
    };

    const response = NextResponse.json({ success: true, data: body });
    response.headers.set(
      "Cache-Control",
      "public, max-age=60, s-maxage=120, stale-while-revalidate=60",
    );
    return response;
  } catch (error) {
    console.error("[feat-products] GET /api/products failed", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch products" },
      { status: 500 },
    );
  }
}

// ─── POST /api/products ───────────────────────────────────────────────────────
// Requires seller, moderator, or admin role.

export const POST = createRouteHandler({
  auth: true,
  roles: ["seller", "moderator", "admin"],
  schema: productMutateSchema,
  handler: async ({ user, body }) => {
    const payload = body as Record<string, unknown>;
    const userRecord = (user ?? {}) as Record<string, unknown>;
    const { db } = getProviders();
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Database provider not registered" },
        { status: 503 },
      );
    }
    const repo = db.getRepository<ProductItem>("products");
    const data: Partial<ProductItem> = {
      ...(payload as Partial<ProductRecord>),
      status: "draft",
      sellerId:
        typeof payload.sellerId === "string"
          ? payload.sellerId
          : typeof userRecord.uid === "string"
            ? userRecord.uid
            : undefined,
      sellerName:
        typeof payload.sellerName === "string"
          ? payload.sellerName
          : typeof userRecord.displayName === "string"
            ? userRecord.displayName
            : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const created = await repo.create(data as Omit<ProductItem, "id">);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  },
});
