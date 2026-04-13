/**
 * feat-homepage — GET / PATCH / DELETE /api/carousel/[id]
 *
 * Pure stub:
 * ```ts
 * // app/api/carousel/[id]/route.ts
 * export { carouselItemGET as GET, carouselItemPATCH as PATCH, carouselItemDELETE as DELETE }
 *   from "@mohasinac/feat-homepage";
 * ```
 */

import { NextResponse } from "next/server.js";
import { z } from "zod";
import { getProviders } from "../../../../../contracts";
import { createRouteHandler } from "../../../../../next";
import type { CarouselSlide } from "../../../types/index";

// ──── GET /api/carousel/[id] ──────────────────────────────────────────────────

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

    const repo = db.getRepository<CarouselSlide>("carouselSlides");
    const slide = await repo.findById(id);
    if (!slide) {
      return NextResponse.json(
        { success: false, error: "Carousel slide not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: slide });
  } catch (error) {
    console.error("[feat-homepage] GET /api/carousel/[id] failed", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch carousel slide" },
      { status: 500 },
    );
  }
}

export { GET as carouselItemGET };

// ──── PATCH /api/carousel/[id] ─────────────────────────────────────────────────

const carouselSlideUpdateSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    order: z.number().int().min(0).optional(),
    active: z.boolean().optional(),
    media: z
      .object({
        type: z.enum(["image", "video"]),
        url: z.string().url(),
        alt: z.string(),
        thumbnail: z.string().url().optional(),
      })
      .optional(),
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

const MAX_ACTIVE_SLIDES = 5;

export const carouselItemPATCH = createRouteHandler({
  auth: true,
  roles: ["admin"],
  schema: carouselSlideUpdateSchema,
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

    const repo = db.getRepository<CarouselSlide>("carouselSlides");
    const slide = await repo.findById(id);
    if (!slide)
      return NextResponse.json(
        { success: false, error: "Slide not found" },
        { status: 404 },
      );

    // Guard: activating a slide must not exceed max
    const patch = body as { active?: boolean };
    if (patch.active === true && !slide.active) {
      const active = await repo.findAll({
        filters: "active==true",
        perPage: MAX_ACTIVE_SLIDES + 1,
      });
      if (active.data.length >= MAX_ACTIVE_SLIDES) {
        return NextResponse.json(
          {
            success: false,
            error: `Maximum ${MAX_ACTIVE_SLIDES} active slides allowed`,
          },
          { status: 409 },
        );
      }
    }

    const updated = await repo.update(id, {
      ...(body as object),
      updatedAt: new Date().toISOString(),
    } as Partial<CarouselSlide>);
    return NextResponse.json({ success: true, data: updated });
  },
});

// ──── DELETE /api/carousel/[id] ───────────────────────────────────────────────

export const carouselItemDELETE = createRouteHandler({
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

    const repo = db.getRepository<CarouselSlide>("carouselSlides");
    const slide = await repo.findById(id);
    if (!slide)
      return NextResponse.json(
        { success: false, error: "Slide not found" },
        { status: 404 },
      );

    await repo.delete(id);
    return NextResponse.json({ success: true });
  },
});
