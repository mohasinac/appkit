/**
 * feat-homepage — Next.js App Router API handlers (GET/POST /api/homepage-sections)
 *
 * Pure stub:
 * ```ts
 * // app/api/homepage-sections/route.ts
 * export { GET, POST } from "@mohasinac/feat-homepage";
 * ```
 */

import { NextResponse } from "next/server.js";
import { z } from "zod";
import { getProviders } from "../../../contracts";
import { createRouteHandler } from "../../../next";
import type { HomepageSection } from "../types/index";

/** Read `__session` cookie from request headers (HTTP cookie string). */
function getSessionCookie(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/(?:^|;\s*)__session=([^;]+)/);
  return match ? match[1] : null;
}

/** Returns the role from the session cookie, or null if invalid / no session provider. */
async function getRoleFromSession(request: Request): Promise<string | null> {
  try {
    const { session } = getProviders();
    if (!session) return null;
    const cookie = getSessionCookie(request);
    if (!cookie) return null;
    const payload = await session.verifySession(cookie);
    return payload.role ?? null;
  } catch {
    return null;
  }
}

// ─── GET /api/homepage-sections ───────────────────────────────────────────────

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const typeFilter = url.searchParams.get("type");
    const includeDisabled = url.searchParams.get("includeDisabled") === "true";

    // Admin auth guard for includeDisabled
    if (includeDisabled) {
      const role = await getRoleFromSession(request);
      if (role !== "admin") {
        return NextResponse.json(
          { success: false, error: "Admin access required" },
          { status: 403 },
        );
      }
    }

    const filterParts = includeDisabled ? [] : ["enabled==true"];
    if (typeFilter) filterParts.push(`type==${typeFilter}`);

    const { db } = getProviders();
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Database provider not registered" },
        { status: 503 },
      );
    }

    const repo = db.getRepository<HomepageSection>("homepageSections");
    const result = await repo.findAll({
      filters: filterParts.join(",") || undefined,
      sort: "order",
      order: "asc",
      perPage: 50,
    });

    const sections = result.data.sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );

    const res = NextResponse.json({ success: true, data: sections });
    res.headers.set(
      "Cache-Control",
      includeDisabled
        ? "private, no-cache"
        : "public, max-age=300, s-maxage=600, stale-while-revalidate=120",
    );
    return res;
  } catch (error) {
    console.error("[feat-homepage] GET /api/homepage-sections failed", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch homepage sections" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/homepage-sections — create a new section (admin only)
// ---------------------------------------------------------------------------

const homepageSectionCreateSchema = z
  .object({
    type: z.enum([
      "hero",
      "featured_categories",
      "featured_products",
      "banner",
      "testimonials",
      "promotions",
      "blog_posts",
      "sellers",
      "custom",
    ]),
    title: z.string().optional(),
    enabled: z.boolean().optional(),
    order: z.number().int().min(0).optional(),
    content: z
      .object({
        title: z.string().optional(),
        subtitle: z.string().optional(),
        ctaLabel: z.string().optional(),
        ctaUrl: z.string().optional(),
        imageUrl: z.string().url().optional(),
        videoUrl: z.string().url().optional(),
        itemIds: z.array(z.string()).optional(),
        html: z.string().optional(),
      })
      .optional(),
    mobile: z.object({}).passthrough().optional(),
  })
  .passthrough();

export const POST = createRouteHandler({
  auth: true,
  roles: ["admin"],
  schema: homepageSectionCreateSchema,
  handler: async ({ body }) => {
    const { db } = getProviders();
    if (!db) {
      return NextResponse.json(
        { success: false, error: "DB not configured" },
        { status: 503 },
      );
    }

    const repo = db.getRepository<HomepageSection>("homepageSections");

    // Auto-assign order: place at end of existing sections
    const existing = await repo.findAll({
      sort: "order",
      order: "desc",
      perPage: 1,
    });
    const maxOrder = existing.data[0]?.order ?? -1;

    const now = new Date().toISOString();
    const created = await repo.create({
      ...(body as object),
      order: (body as { order?: number }).order ?? maxOrder + 1,
      enabled: (body as { enabled?: boolean }).enabled ?? true,
      createdAt: now,
      updatedAt: now,
    } as unknown as HomepageSection);

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  },
});
