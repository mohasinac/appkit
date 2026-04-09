/**
 * feat-homepage — Next.js App Router API handler (GET/POST /api/carousel)
 *
 * Pure stub:
 * ```ts
 * // app/api/carousel/route.ts
 * export { carouselGET as GET, carouselPOST as POST } from "@mohasinac/feat-homepage";
 * ```
 */

import { NextResponse } from "next/server.js";
import { z } from "zod";
import { getProviders } from "@mohasinac/contracts";
import { createRouteHandler } from "@mohasinac/next";
import type { CarouselSlide } from "../../types/index.js";

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

const MAX_ACTIVE_SLIDES = 5;

// ─── GET /api/carousel ────────────────────────────────────────────────────────

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const includeInactive = url.searchParams.get("includeInactive") === "true";

    // Admin auth guard for includeInactive
    if (includeInactive) {
      const role = await getRoleFromSession(request);
      if (role !== "admin") {
        return NextResponse.json(
          { success: false, error: "Admin access required" },
          { status: 403 },
        );
      }
    }

    const { db } = getProviders();
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Database provider not registered" },
        { status: 503 },
      );
    }

    const repo = db.getRepository<CarouselSlide>("carouselSlides");

    let slides: CarouselSlide[];
    if (includeInactive) {
      const result = await repo.findAll({
        sort: "order",
        order: "asc",
        perPage: 100,
      });
      slides = result.data;
    } else {
      const result = await repo.findAll({
        filters: "active==true",
        sort: "order",
        order: "asc",
        perPage: MAX_ACTIVE_SLIDES,
      });
      slides = result.data.slice(0, MAX_ACTIVE_SLIDES);
    }

    const response = NextResponse.json({ success: true, data: slides });
    response.headers.set(
      "Cache-Control",
      includeInactive
        ? "private, no-cache"
        : "public, max-age=300, s-maxage=600, stale-while-revalidate=120",
    );
    return response;
  } catch (error) {
    console.error("[feat-homepage] GET /api/carousel failed", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch carousel slides" },
      { status: 500 },
    );
  }
}

export { GET as carouselGET };

// ---------------------------------------------------------------------------
// POST /api/carousel — create a new slide (admin only)
// ---------------------------------------------------------------------------

const carouselSlideCreateSchema = z
  .object({
    title: z.string().min(1).max(200),
    order: z.number().int().min(0).optional(),
    active: z.boolean().optional(),
    media: z.object({
      type: z.enum(["image", "video"]),
      url: z.string().url(),
      alt: z.string(),
      thumbnail: z.string().url().optional(),
    }),
    link: z
      .object({
        url: z.string().url(),
        openInNewTab: z.boolean(),
      })
      .optional(),
    mobileMedia: z
      .object({
        type: z.enum(["image", "video"]),
        url: z.string().url(),
        alt: z.string(),
      })
      .optional(),
    cards: z.array(z.object({}).passthrough()).optional(),
    overlay: z.object({}).passthrough().optional(),
  })
  .passthrough();

export const carouselPOST = createRouteHandler({
  auth: true,
  roles: ["admin"],
  schema: carouselSlideCreateSchema,
  handler: async ({ body }) => {
    const { db } = getProviders();
    if (!db) {
      return NextResponse.json(
        { success: false, error: "DB not configured" },
        { status: 503 },
      );
    }

    const repo = db.getRepository<CarouselSlide>("carouselSlides");

    // Guard: max 5 active slides
    const active = await repo.findAll({
      filters: "active==true",
      perPage: MAX_ACTIVE_SLIDES + 1,
    });
    const incoming = body as { active?: boolean };
    if (incoming.active !== false && active.data.length >= MAX_ACTIVE_SLIDES) {
      return NextResponse.json(
        {
          success: false,
          error: `Maximum ${MAX_ACTIVE_SLIDES} active slides allowed`,
        },
        { status: 409 },
      );
    }

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
      active: incoming.active ?? false,
      cards: (body as { cards?: unknown[] }).cards ?? [],
      createdAt: now,
      updatedAt: now,
    } as unknown as CarouselSlide);

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  },
});
