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
import { getProviders } from "../../../contracts";
import { createRouteHandler } from "../../../next";
import type { ProductItem, ProductListResponse } from "../types/index";
import { mediaFieldSchema } from "../../media/types/index";
import { printMetaSchema } from "../schemas/index";
import { sanitizeProductsForPublic } from "../utils/sanitize";
import {
  listPublicProducts,
  parsePublicProductParams,
} from "../../../_internal/server/features/products/list-public";

import { normalizeError } from "../../../errors/normalize";
import type { JsonValue } from "../../../schemas/types";
type ProductRecord = ProductItem & {
  sellerId?: string;
  sellerName?: string;
};

// --- Mutation schemas ---------------------------------------------------------
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
        "in_review",
        "archived",
      ])
      .optional(),
    mainImage: z.string().optional(),
    images: z.array(z.union([z.string(), mediaFieldSchema])).optional(),
    tags: z.array(z.string()).optional(),
    featured: z.boolean().optional(),
    isPromoted: z.boolean().optional(),
    allowShipBeforeEmiComplete: z.boolean().optional(),
    printMeta: printMetaSchema.optional(),
    sellerId: z.string().optional(),
    sellerName: z.string().optional(),
    sellerEmail: z.string().email().optional(),
    slug: z.string().optional(),
    // `bundle` is deliberately absent: SB-UNI-D moved bundles onto
    // `categories` as a categoryType, so a product written with that value
    // would match no listing-type query anywhere.
    listingType: z
      .enum(["standard", "auction", "pre-order", "prize-draw", "classified", "digital-code", "live", "art", "stickers"])
      .optional(),
    media: z.array(mediaFieldSchema).optional(),
  })
  .passthrough();

// --- Helpers ------------------------------------------------------------------

function param(url: URL, key: string): string | null {
  return url.searchParams.get(key);
}

// --- GET /api/products --------------------------------------------------------

/**
 * Delegates to `listPublicProducts` — the single implementation shared with
 * every SSR listing view and with the reference consumer's own route.
 *
 * It used to be an independent copy: its own `buildFilters`, its own
 * `validateSieveFilters`, and its own filter allowlist that omitted
 * `auctionEndDate` / `preOrderDeliveryDate` / `prizeRevealStatus` — so on this
 * path an ended auction could not be filtered out even by a caller that asked
 * for it, and an `inStock=true` became a raw `stockQuantity>0` pushed straight
 * into Firestore, the FAILED_PRECONDITION shape Root Cause #59 documents.
 * Two implementations of one query is the drift itself; there is now one.
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const listingTypeParam = param(url, "listingType");
    const requestedTypes = (listingTypeParam ?? "").split("|").filter(Boolean);

    const result = await listPublicProducts(
      parsePublicProductParams(url.searchParams, {
        listingTypes: requestedTypes.length > 0 ? requestedTypes : undefined,
      }),
    );

    if (!result) {
      // Already logged loudly by listPublicProducts. Surfaced as an explicit
      // warning rather than a bare empty page, so a broken query stays
      // distinguishable from an empty catalogue.
      return NextResponse.json({
        success: true,
        data: {
          items: [],
          total: 0,
          page: 1,
          pageSize: 0,
          totalPages: 0,
          hasMore: false,
          warning: "Product search is temporarily unavailable.",
        } satisfies ProductListResponse,
      });
    }

    const body: ProductListResponse = {
      items: sanitizeProductsForPublic(
        result.items as Array<Record<string, JsonValue>>,
      ) as unknown as ProductItem[],
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
      hasMore: result.hasMore,
      truncated: result.truncated,
    };

    const response = NextResponse.json({ success: true, data: body });
    response.headers.set(
      "Cache-Control",
      "public, max-age=60, s-maxage=120, stale-while-revalidate=60",
    );
    return response;
  } catch (error) {
    void normalizeError(error);
    console.error("[feat-products] GET /api/products failed", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch products" },
      { status: 500 },
    );
  }
}

// --- POST /api/products -------------------------------------------------------
// Requires seller, moderator, or admin role.

export const POST = createRouteHandler({
  auth: true,
  roles: ["seller", "moderator", "admin"],
  schema: productMutateSchema,
  handler: async ({ body }) => {
    const payload = body as Record<string, JsonValue>;
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
      storeId:
        typeof payload.storeId === "string"
          ? payload.storeId
          : undefined,
      storeName:
        typeof payload.storeName === "string"
          ? payload.storeName
          : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const created = await repo.create(data as Omit<ProductItem, "id">);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  },
});
