/**
 * feat-homepage — GET / PATCH / DELETE /api/homepage-sections/[id]
 *
 * Pure stub:
 * ```ts
 * // app/api/homepage-sections/[id]/route.ts
 * export { homepageSectionItemGET as GET, homepageSectionItemPATCH as PATCH, homepageSectionItemDELETE as DELETE }
 *   from "@mohasinac/feat-homepage";
 * ```
 */

import { NextResponse } from "next/server.js";
import { z } from "zod";
import { getProviders } from "../../../../contracts";
import { createRouteHandler } from "../../../../next";
import type { HomepageSection } from "../../types/index";

// ──── GET /api/homepage-sections/[id] ────────────────────────────────────────

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

    const repo = db.getRepository<HomepageSection>("homepageSections");
    const section = await repo.findById(id);
    if (!section) {
      return NextResponse.json(
        { success: false, error: "Section not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: section });
  } catch (error) {
    console.error(
      "[feat-homepage] GET /api/homepage-sections/[id] failed",
      error,
    );
    return NextResponse.json(
      { success: false, error: "Failed to fetch homepage section" },
      { status: 500 },
    );
  }
}

export { GET as homepageSectionItemGET };

// ──── PATCH /api/homepage-sections/[id] ───────────────────────────────────

const homepageSectionUpdateSchema = z
  .object({
    type: z
      .enum([
        "hero",
        "featured_categories",
        "featured_products",
        "banner",
        "testimonials",
        "promotions",
        "blog_posts",
        "sellers",
        "custom",
      ])
      .optional(),
    title: z.string().optional(),
    enabled: z.boolean().optional(),
    isVisible: z.boolean().optional(),
    order: z.number().int().min(0).optional(),
    content: z.object({}).passthrough().optional(),
    mobile: z.object({}).passthrough().optional(),
  })
  .passthrough();

export const homepageSectionItemPATCH = createRouteHandler({
  auth: true,
  roles: ["admin"],
  schema: homepageSectionUpdateSchema,
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

    const repo = db.getRepository<HomepageSection>("homepageSections");
    const section = await repo.findById(id);
    if (!section)
      return NextResponse.json(
        { success: false, error: "Section not found" },
        { status: 404 },
      );

    const updated = await repo.update(id, {
      ...(body as object),
      updatedAt: new Date().toISOString(),
    } as Partial<HomepageSection>);
    return NextResponse.json({ success: true, data: updated });
  },
});

// ──── DELETE /api/homepage-sections/[id] ─────────────────────────────────

export const homepageSectionItemDELETE = createRouteHandler({
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

    const repo = db.getRepository<HomepageSection>("homepageSections");
    const section = await repo.findById(id);
    if (!section)
      return NextResponse.json(
        { success: false, error: "Section not found" },
        { status: 404 },
      );

    await repo.delete(id);
    return NextResponse.json({ success: true });
  },
});
