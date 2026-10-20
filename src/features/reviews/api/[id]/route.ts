/**
 * feat-reviews — GET / PATCH / DELETE /api/reviews/[id]
 *
 * Pure stub:
 * ```ts
 * // app/api/reviews/[id]/route.ts
 * export { reviewItemGET as GET, reviewItemPATCH as PATCH, reviewItemDELETE as DELETE }
 * from "@mohasinac/feat-reviews";
 * ```
 */

import { NextResponse } from "next/server.js";
import { z } from "zod";
import { mediaUrlSchema } from "../../../../validation/schemas";
import { createRouteHandler } from "../../../../next/api/routeHandler";
/*
 * 🛑 The real repository, not `db.getRepository<Review>("reviews")`.
 *
 * The generic FirebaseRepository knows nothing about this collection, so every
 * read and write through it skipped ReviewRepository's overrides:
 *
 *   - `update` encrypts `userName` (PII) and rebuilds `searchTxt`. Writing
 *     through the generic repo left the tokens describing the OLD text, so an
 *     edited review was findable only by what it used to say.
 *   - `mapDoc` decrypts `userName` and strips `helpfulVoterIds`. Reading
 *     through the generic repo returned the name as raw `enc:v1:…` ciphertext
 *     and published the voter list.
 */
import { reviewRepository } from "../../repository/reviews.repository";
import type { ReviewDocument } from "../../schemas/firestore";
/*
 * The PLAINTEXT shape is what a caller supplies — `reviewRepository.update`
 * encrypts `userName` on the way in. Naming it keeps the cast honest instead
 * of asserting the stored (encrypted) shape and hiding the difference.
 */
import type { Plaintext } from "../../../../security/encrypted";
import { normalizeError } from "../../../../errors/normalize";
import { isAdminUser, isModeratorUser } from "../../../auth/role-predicates";

const ERR_REVIEW_NOT_FOUND = "Review not found";

// ---- GET /api/reviews/[id] ---------------------------------------------------

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    /*
     * Through `reviewRepository`, so `mapDoc` runs: `userName` is decrypted
     * and `helpfulVoterIds` is stripped. The generic repo did neither, so this
     * public endpoint returned the reviewer's name as raw `enc:v1:…`
     * ciphertext and published the list of everyone who had voted the review
     * helpful.
     */
    const review = await reviewRepository.findById(id);
    if (!review) {
      return NextResponse.json(
        { success: false, error: ERR_REVIEW_NOT_FOUND },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: review });
  } catch (error) {
    void normalizeError(error);
    console.error("[feat-reviews] GET /api/reviews/[id] failed", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch review" },
      { status: 500 },
    );
  }
}

export { GET as reviewItemGET };

// ---- PATCH /api/reviews/[id] -------------------------------------------------

/*
 * 🛑 `.strict()`, not `.passthrough()`.
 *
 * It was passthrough, so any unlisted key reached the write — including
 * `userId`, `verified`, `helpfulCount` and `featured`. A reviewer could have
 * marked their own review a verified purchase, or featured it on the homepage,
 * by adding one field to the request body. Nothing in the handler below looked
 * at the extra keys; they went straight into Firestore.
 *
 * `.strict()` rejects them with a 400 naming the field rather than silently
 * dropping them, which is the honest answer to a caller sending something this
 * endpoint does not own.
 */
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
    images: z.array(mediaUrlSchema).max(10).optional(),
    status: z.enum(["pending", "approved", "rejected"]).optional(),
  })
  .strict();

/*
 * 🛑 `video` is deliberately NOT accepted here, and that is a fix rather than
 * an omission.
 *
 * It used to be declared as a bare `mediaUrlSchema` — a URL string — while
 * `ReviewDocument.video` is a `ReviewVideoField` object. So a caller sending
 * the real shape failed validation, and a caller sending a string wrote a
 * string into a field every renderer reads as an object, leaving `video.url`
 * undefined and the player with nothing.
 *
 * Accepting the object instead would still be wrong on this route: the URL
 * would arrive as an unfinalised `tmp/` reference, because nothing here calls
 * `finalizeStagedMediaUrl`. `updateReview` (features/reviews/actions) is the
 * path that owns review media — it finalises the upload and builds the full
 * field — and `REVIEW_UPDATABLE_FIELDS` already documents the updatable set as
 * rating / title / comment / images, with no video in it.
 *
 * One owner for media writes, and this is not it.
 */

export const reviewItemPATCH = createRouteHandler({
  auth: true,
  schema: reviewUpdateSchema,
  handler: async ({ request, user, body }) => {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 1];

    const review = await reviewRepository.findById(id);
    if (!review)
      return NextResponse.json(
        { success: false, error: ERR_REVIEW_NOT_FOUND },
        { status: 404 },
      );

    const isOwner = review.userId === user!.uid;
    const isModerator = isModeratorUser(user);
    const isAdmin = isAdminUser(user);

    if (!isOwner && !isModerator && !isAdmin) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    /*
     * Owners edit content, not moderation state. Pinning `status` rather than
     * rejecting the field is deliberate and pre-existing: an approved review
     * edited by its author stays approved and is NOT sent back for
     * re-moderation.
     */
    const patch =
      isOwner && !isModerator && !isAdmin
        ? { ...(body as object), status: review.status }
        : (body as object);

    /*
     * 🛑 `hasImages` is DERIVED and has to move with `images`, or the two
     * disagree. It is a real queryable field (`hasImages` is `canFilter` in
     * SIEVE_FIELDS and backs the "with photos" review filter), so a review
     * whose last photo was removed stayed in that filter for ever, and one
     * that gained its first was absent from it.
     */
    const nextImages = body?.images;
    const derived =
      nextImages !== undefined ? { hasImages: nextImages.length > 0 } : {};

    /*
     * 🛑 A `Date`, not an ISO string. Everything else in this codebase writes
     * `Date` to `updatedAt`, and `reviewRepository`'s own Sieve config marks it
     * sortable — so a string here sorts lexicographically beside real
     * timestamps and silently orders wrong.
     */
    const updated = await reviewRepository.update(id, {
      ...patch,
      ...derived,
      updatedAt: new Date(),
    } as Partial<Plaintext<ReviewDocument>>);
    return NextResponse.json({ success: true, data: updated });
  },
});

// ---- DELETE /api/reviews/[id] ------------------------------------------------

export const reviewItemDELETE = createRouteHandler({
  auth: true,
  handler: async ({ request, user }) => {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 1];

    // Same repository as GET and PATCH — one collection, one repository.
    const review = await reviewRepository.findById(id);
    if (!review)
      return NextResponse.json(
        { success: false, error: ERR_REVIEW_NOT_FOUND },
        { status: 404 },
      );

    const isOwner = review.userId === user!.uid;
    const isModerator = isModeratorUser(user);
    const isAdmin = isAdminUser(user);

    if (!isOwner && !isModerator && !isAdmin) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    await reviewRepository.delete(id);
    return NextResponse.json({ success: true });
  },
});
