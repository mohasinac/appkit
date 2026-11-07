/**
 * feat-categories — GET / PATCH / DELETE /api/categories/[id]
 *
 * Pure stub:
 * ```ts
 * // app/api/categories/[id]/route.ts
 * export { categoryItemGET as GET, categoryItemPATCH as PATCH, categoryItemDELETE as DELETE }
 * from "@mohasinac/feat-categories";
 * ```
 */

import { NextResponse } from "next/server.js";
import { z } from "zod";
import { mediaUrlSchema } from "../../../../validation/schemas";
import { getProviders } from "../../../../contracts";
import { createRouteHandler } from "../../../../next/api/routeHandler";
import type { CategoryItem } from "../../types/index";
import { normalizeError } from "../../../../errors/normalize";
import { categoriesRepository } from "../../repository/categories.repository";
import { toCategoryListItem } from "../../../../_internal/server/features/categories/adapters";

const ERR_CATEGORY_NOT_FOUND = "Category not found";

// ---- GET /api/categories/[id] ------------------------------------------------

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    const { db } = getProviders();
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Database provider not registered" },
        { status: 503 },
      );
    }

    /*
     * 🛑 Uses the TYPED repository + the public projection, not the generic
     * `db.getRepository("categories")` this route used to call.
     *
     * The generic path returned the RAW Firestore document — every field,
     * unprojected, on an unauthenticated route. That is the exact leak the
     * adapters module records fixing for the LIST route on 2026-10-10, when
     * `GET /api/categories` was publishing `createdBy` (a uid),
     * `createdByStoreId`, `createdByStoreName` and — worst — the UNBOUNDED
     * `metrics.productIds[]` / `metrics.collectorDropIds[]` arrays. The detail
     * route was never converted alongside it.
     *
     * Routing through `categoriesRepository` also picks up its `mapDoc`
     * normalisation, so the 2026-11-07 `hasbroName` → `altRegionName` rename
     * is applied here too; the generic repository bypassed that as well.
     */
    const category = await categoriesRepository.findById(id);
    if (!category) {
      return NextResponse.json(
        { success: false, error: ERR_CATEGORY_NOT_FOUND },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: toCategoryListItem(category) });
  } catch (error) {
    void normalizeError(error);
    console.error("[feat-categories] GET /api/categories/[id] failed", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch category" },
      { status: 500 },
    );
  }
}

export { GET as categoryItemGET };

// ---- PATCH /api/categories/[id] ----------------------------------------------

const categoryUpdateSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    slug: z.string().min(1).max(200).optional(),
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
    isActive: z.boolean().optional(),
  })
  .passthrough();

export const categoryItemPATCH = createRouteHandler({
  auth: true,
  roles: ["admin"],
  schema: categoryUpdateSchema,
  handler: async ({ request, body }) => {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 1];

    const { db } = getProviders();
    if (!db)
      return NextResponse.json(
        { success: false, error: "DB not configured" },
        { status: 503 },
      );

    const repo = db.getRepository<CategoryItem>("categories");
    const category = await repo.findById(id);
    if (!category)
      return NextResponse.json(
        { success: false, error: ERR_CATEGORY_NOT_FOUND },
        { status: 404 },
      );

    const updated = await repo.update(id, {
      ...(body as object),
      updatedAt: new Date().toISOString(),
    } as Partial<CategoryItem>);
    return NextResponse.json({ success: true, data: updated });
  },
});

// ---- DELETE /api/categories/[id] --------------------------------------------

export const categoryItemDELETE = createRouteHandler({
  auth: true,
  roles: ["admin"],
  handler: async ({ request }) => {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 1];

    const { db } = getProviders();
    if (!db)
      return NextResponse.json(
        { success: false, error: "DB not configured" },
        { status: 503 },
      );

    const repo = db.getRepository<CategoryItem>("categories");
    const category = await repo.findById(id);
    if (!category)
      return NextResponse.json(
        { success: false, error: ERR_CATEGORY_NOT_FOUND },
        { status: 404 },
      );

    // Guard: refuse to delete if it has children
    if (category.childrenIds?.length) {
      return NextResponse.json(
        { success: false, error: "Cannot delete a category that has children" },
        { status: 409 },
      );
    }

    await repo.delete(id);
    return NextResponse.json({ success: true });
  },
});
