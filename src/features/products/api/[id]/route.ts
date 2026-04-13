/**
 * feat-products — single-item route handlers (GET/PATCH/DELETE /api/products/[id])
 *
 * Consuming projects can create a 2-line stub:
 *
 * ```ts
 * // app/api/products/[id]/route.ts
 * export { productItemGET as GET, productItemPATCH as PATCH, productItemDELETE as DELETE }
 *   from "@mohasinac/feat-products";
 * ```
 */

import { NextResponse } from "next/server.js";
import { z } from "zod";
import { getProviders } from "../../../../contracts";
import { createRouteHandler } from "../../../../next";
import type { ProductItem } from "../../types/index";
import { mediaFieldSchema } from "../../../media/types/index";

type RouteContext = { params: Promise<{ id: string }> };

type ProductRecord = ProductItem & {
  sellerId?: string;
};

function getRepo() {
  const { db } = getProviders();
  if (!db) return null;
  return db.getRepository<ProductRecord>("products");
}

const productUpdateSchema = z
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
    listingType: z
      .enum(["fixed", "standard", "auction", "pre-order"])
      .optional(),
    media: z.array(mediaFieldSchema).optional(),
  })
  .passthrough();

// ─── GET /api/products/[id] ───────────────────────────────────────────────────

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    const repo = getRepo();
    if (!repo) {
      return NextResponse.json(
        { success: false, error: "Database provider not registered" },
        { status: 503 },
      );
    }

    // Support both Firestore document ID and URL slug
    let item = await repo.findById(id);
    if (!item) {
      // Slug fallback: search by slug==id, status==published
      const slugResult = await repo.findAll({
        filters: `slug==${id},status==published`,
        perPage: 1,
      });
      item = slugResult.data[0] ?? null;
    }
    if (!item) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    console.error("[feat-products] GET /api/products/[id] failed", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch product" },
      { status: 500 },
    );
  }
}

// ─── PATCH /api/products/[id] ─────────────────────────────────────────────────
// Auth required; the caller must be the owner, a moderator, or an admin.

export const PATCH = createRouteHandler<
  z.infer<typeof productUpdateSchema>,
  { id: string }
>({
  auth: true,
  schema: productUpdateSchema,
  handler: async ({ user, body, params }) => {
    const { id } = params!;
    const repo = getRepo();
    if (!repo) {
      return NextResponse.json(
        { success: false, error: "Database provider not registered" },
        { status: 503 },
      );
    }

    const product = await repo.findById(id);
    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 },
      );
    }

    const isOwner = product.sellerId === user?.uid;
    const isModerator = user?.role === "moderator";
    const isAdmin = user?.role === "admin";

    if (!isOwner && !isModerator && !isAdmin) {
      return NextResponse.json(
        { success: false, error: "Not authorized to update this product" },
        { status: 403 },
      );
    }

    const updated = await repo.update(id, {
      ...(body as Partial<ProductItem>),
      updatedAt: new Date().toISOString(),
    });
    return NextResponse.json({ success: true, data: updated });
  },
});

// ─── DELETE /api/products/[id] ────────────────────────────────────────────────
// Soft-delete (sets status to "discontinued"). Auth required.

export const DELETE = createRouteHandler<never, { id: string }>({
  auth: true,
  handler: async ({ user, params }) => {
    const { id } = params!;
    const repo = getRepo();
    if (!repo) {
      return NextResponse.json(
        { success: false, error: "Database provider not registered" },
        { status: 503 },
      );
    }

    const product = await repo.findById(id);
    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 },
      );
    }

    const isOwner = product.sellerId === user?.uid;
    const isModerator = user?.role === "moderator";
    const isAdmin = user?.role === "admin";

    if (!isOwner && !isModerator && !isAdmin) {
      return NextResponse.json(
        { success: false, error: "Not authorized to delete this product" },
        { status: 403 },
      );
    }

    await repo.update(id, {
      status: "discontinued" as ProductItem["status"],
      updatedAt: new Date().toISOString(),
    });
    return NextResponse.json({ success: true });
  },
});

export {
  GET as productItemGET,
  PATCH as productItemPATCH,
  DELETE as productItemDELETE,
};
