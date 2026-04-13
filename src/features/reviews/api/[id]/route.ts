/**
 * feat-reviews — GET / PATCH / DELETE /api/reviews/[id]
 *
 * Pure stub:
 * ```ts
 * // app/api/reviews/[id]/route.ts
 * export { reviewItemGET as GET, reviewItemPATCH as PATCH, reviewItemDELETE as DELETE }
 *   from "@mohasinac/feat-reviews";
 * ```
 */

import { NextResponse } from "next/server.js";
import { z } from "zod";
import { getProviders } from "../../../../contracts";
import { createRouteHandler } from "../../../../next";
import type { Review } from "../../types/index";

// ──── GET /api/reviews/[id] ───────────────────────────────────────────────────

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

    const repo = db.getRepository<Review>("reviews");
    const review = await repo.findById(id);
    if (!review) {
      return NextResponse.json(
        { success: false, error: "Review not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: review });
  } catch (error) {
    console.error("[feat-reviews] GET /api/reviews/[id] failed", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch review" },
      { status: 500 },
    );
  }
}

export { GET as reviewItemGET };

// ──── PATCH /api/reviews/[id] ─────────────────────────────────────────────────

const reviewUpdateSchema = z
  .object({
    rating: z
      .union([
        z.literal(1),
        z.literal(2),
        z.literal(3),
        z.literal(4),
        z.literal(5),
      ])
      .optional(),
    title: z.string().min(1).max(100).optional(),
    comment: z.string().min(1).max(2000).optional(),
    images: z.array(z.string().url()).max(10).optional(),
    video: z.string().url().optional(),
    status: z.enum(["pending", "approved", "rejected"]).optional(),
  })
  .passthrough();

export const reviewItemPATCH = createRouteHandler({
  auth: true,
  schema: reviewUpdateSchema,
  handler: async ({ request, user, body }) => {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 1];

    const { db } = getProviders();
    if (!db)
      return NextResponse.json(
        { success: false, error: "DB not configured" },
        { status: 503 },
      );

    const repo = db.getRepository<Review>("reviews");
    const review = await repo.findById(id);
    if (!review)
      return NextResponse.json(
        { success: false, error: "Review not found" },
        { status: 404 },
      );

    const isOwner = review.userId === user!.uid;
    const isModerator = user!.role === "moderator";
    const isAdmin = user!.role === "admin";

    if (!isOwner && !isModerator && !isAdmin) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    // Owners can only edit content fields, not status
    const patch =
      isOwner && !isModerator && !isAdmin
        ? { ...(body as object), status: review.status }
        : (body as object);

    const updated = await repo.update(id, {
      ...patch,
      updatedAt: new Date().toISOString(),
    } as Partial<Review>);
    return NextResponse.json({ success: true, data: updated });
  },
});

// ──── DELETE /api/reviews/[id] ────────────────────────────────────────────────

export const reviewItemDELETE = createRouteHandler({
  auth: true,
  handler: async ({ request, user }) => {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 1];

    const { db } = getProviders();
    if (!db)
      return NextResponse.json(
        { success: false, error: "DB not configured" },
        { status: 503 },
      );

    const repo = db.getRepository<Review>("reviews");
    const review = await repo.findById(id);
    if (!review)
      return NextResponse.json(
        { success: false, error: "Review not found" },
        { status: 404 },
      );

    const isOwner = review.userId === user!.uid;
    const isModerator = user!.role === "moderator";
    const isAdmin = user!.role === "admin";

    if (!isOwner && !isModerator && !isAdmin) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    await repo.delete(id);
    return NextResponse.json({ success: true });
  },
});
