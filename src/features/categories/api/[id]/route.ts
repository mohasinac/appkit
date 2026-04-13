/**
 * feat-categories — GET / PATCH / DELETE /api/categories/[id]
 *
 * Pure stub:
 * ```ts
 * // app/api/categories/[id]/route.ts
 * export { categoryItemGET as GET, categoryItemPATCH as PATCH, categoryItemDELETE as DELETE }
 *   from "@mohasinac/feat-categories";
 * ```
 */

import { NextResponse } from "next/server.js";
import { z } from "zod";
import { getProviders } from "../../../../contracts";
import { createRouteHandler } from "../../../../next";
import type { CategoryItem } from "../../types/index";

// ──── GET /api/categories/[id] ────────────────────────────────────────────────

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

    const repo = db.getRepository<CategoryItem>("categories");
    const category = await repo.findById(id);
    if (!category) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    console.error("[feat-categories] GET /api/categories/[id] failed", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch category" },
      { status: 500 },
    );
  }
}

export { GET as categoryItemGET };

// ──── PATCH /api/categories/[id] ──────────────────────────────────────────────

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
    imageUrl: z.string().url().optional(),
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
        { success: false, error: "Category not found" },
        { status: 404 },
      );

    const updated = await repo.update(id, {
      ...(body as object),
      updatedAt: new Date().toISOString(),
    } as Partial<CategoryItem>);
    return NextResponse.json({ success: true, data: updated });
  },
});

// ──── DELETE /api/categories/[id] ────────────────────────────────────────────

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
        { success: false, error: "Category not found" },
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
