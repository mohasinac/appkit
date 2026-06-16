/**
 * Media context guardrails — shared by /api/media/sign and the legacy
 * /api/media/upload routes. Validates per-context index caps + image-only
 * vs PDF-only context affinity.
 *
 * Returns either an `{ ok: true }` payload with the derived filename + ext,
 * or `{ ok: false, error, status, details? }` for an error response.
 *
 * Pure logic — no Firebase SDK calls, no `Buffer` work — so it's safe to
 * import from any server route.
 */

import {
  classifyMime,
  MIME_TO_EXT,
  type AllowedMime,
} from "../../../shared/media/limits";
import {
  generateMediaFilename,
  validateMediaFilename,
  type MediaFilenameContext,
} from "../../../../utils/id-generators";
import type { FirestoreDocument } from "@mohasinac/appkit";

/**
 * W1-51 — validate the generated filename before returning ok:true so a
 * malformed name can never enter signed-URL storage. Generators producing
 * unexpected output fail-closed with a 500.
 */
function okWithFilename(
  ctx: MediaFilenameContext,
  filename: string,
  ext: string,
):
  | { ok: true; filename: string; ext: string }
  | { ok: false; status: 500; error: string; details: FirestoreDocument } {
  if (validateMediaFilename(filename)) return { ok: true, filename, ext };
  return {
    ok: false,
    status: 500,
    error: "Generated media filename failed validation",
    details: { context: ctx.type, filename },
  };
}

// Per-context limits — mirrored from the previous inline constants in
// /api/media/upload. Adjust here, not at the call site.
export const CONTEXT_LIMITS = {
  PRODUCT_IMAGE_MAX: 5,
  PRODUCT_VIDEO_MAX: 1,
  REVIEW_IMAGE_MAX: 5,
  REVIEW_VIDEO_MAX: 1,
  AUCTION_IMAGE_MAX: 5,
  PREORDER_IMAGE_MAX: 5,
  EVENT_COVER_MAX: 1,
  EVENT_IMAGE_MAX: 10,
  EVENT_WINNER_IMAGE_MAX: 5,
  EVENT_ADDITIONAL_IMAGE_MAX: 10,
  BLOG_COVER_MAX: 1,
  BLOG_CONTENT_IMAGE_MAX: 10,
  BLOG_ADDITIONAL_IMAGE_MAX: 5,
  RICH_TEXT_IMAGE_MAX: 20,
} as const;

// Contexts that accept both image and PDF (proof documents).
const IMAGE_OR_PDF_CONTEXTS = ["shipping-proof", "refund-proof"] as const;
type ImageOrPdfContextType = (typeof IMAGE_OR_PDF_CONTEXTS)[number];

const PDF_ONLY_CONTEXTS = ["invoice", "payout-doc"] as const;
type PdfOnlyContextType = (typeof PDF_ONLY_CONTEXTS)[number];

const IMAGE_ONLY_CONTEXT_TYPES = new Set([
  "store-logo",
  "store-banner",
  "user-avatar",
  "event-cover",
  "event-image",
  "event-winner-image",
  "event-additional-image",
  "blog-cover",
  "blog-content-image",
  "blog-additional-image",
]);

export interface GuardError {
  ok: false;
  error: string;
  status: number;
  details?: FirestoreDocument;
}

export interface GuardSuccess {
  ok: true;
  filename: string;
  ext: string;
}

export type GuardResult = GuardError | GuardSuccess;

interface GuardInput {
  detectedMime: AllowedMime | string;
  context: MediaFilenameContext;
}

function indexGuard(
  receivedIndex: number,
  max: number,
  errorMessage: string,
): GuardError | null {
  if (receivedIndex < 1 || receivedIndex > max) {
    return {
      ok: false,
      status: 400,
      error: errorMessage,
      details: { maxImages: max, receivedIndex },
    };
  }
  return null;
}

/**
 * Apply per-context guardrails to a parsed MediaFilenameContext and
 * derive the SEO filename. Mirrors the inline logic that used to live
 * in /api/media/upload.
 */
export function applyMediaContextGuards({
  detectedMime,
  context: ctx,
}: GuardInput): GuardResult {
  const kind = classifyMime(detectedMime);
  if (!kind) {
    return {
      ok: false,
      status: 400,
      error: "Unsupported MIME type",
      details: { detected: detectedMime },
    };
  }
  const isVideo = kind === "video";
  const isPdf = kind === "pdf";

  if (ctx.type === "product-image") {
    const idx = ctx.index ?? 1;
    const err = indexGuard(
      idx,
      CONTEXT_LIMITS.PRODUCT_IMAGE_MAX,
      "Product image index exceeds max allowed",
    );
    if (err) return err;
  }

  if (ctx.type === "product-video") {
    const idx = ctx.index ?? 1;
    const err = indexGuard(
      idx,
      CONTEXT_LIMITS.PRODUCT_VIDEO_MAX,
      "Only one product video is allowed",
    );
    if (err) return err;
  }

  if (ctx.type === "review-image") {
    const idx = ctx.index ?? 1;
    const err = indexGuard(
      idx,
      CONTEXT_LIMITS.REVIEW_IMAGE_MAX,
      "Review image index exceeds max allowed",
    );
    if (err) return err;
  }

  if (ctx.type === "review-video" && !isVideo) {
    return {
      ok: false,
      status: 400,
      error: "review-video context requires a video file",
    };
  }

  if (ctx.type === "auction-image") {
    const idx = ctx.index ?? 1;
    const err = indexGuard(
      idx,
      CONTEXT_LIMITS.AUCTION_IMAGE_MAX,
      "Auction image index exceeds max allowed",
    );
    if (err) return err;
  }

  if (ctx.type === "preorder-image") {
    const idx = ctx.index ?? 1;
    const err = indexGuard(
      idx,
      CONTEXT_LIMITS.PREORDER_IMAGE_MAX,
      "Pre-order image index exceeds max allowed",
    );
    if (err) return err;
  }

  if (ctx.type === "event-cover") {
    const idx = ctx.index ?? 1;
    const err = indexGuard(
      idx,
      CONTEXT_LIMITS.EVENT_COVER_MAX,
      "Only one event cover image is allowed",
    );
    if (err) return err;
  }

  if (ctx.type === "event-image") {
    const idx = ctx.index ?? 1;
    const err = indexGuard(
      idx,
      CONTEXT_LIMITS.EVENT_IMAGE_MAX,
      "Event image index exceeds max allowed",
    );
    if (err) return err;
  }

  if (ctx.type === "event-winner-image") {
    const idx = ctx.index ?? 1;
    const err = indexGuard(
      idx,
      CONTEXT_LIMITS.EVENT_WINNER_IMAGE_MAX,
      "Event winner image index exceeds max allowed",
    );
    if (err) return err;
  }

  if (ctx.type === "event-additional-image") {
    const idx = ctx.index ?? 1;
    const err = indexGuard(
      idx,
      CONTEXT_LIMITS.EVENT_ADDITIONAL_IMAGE_MAX,
      "Event additional image index exceeds max allowed",
    );
    if (err) return err;
  }

  if (ctx.type === "blog-cover") {
    const idx = ctx.index ?? 1;
    const err = indexGuard(
      idx,
      CONTEXT_LIMITS.BLOG_COVER_MAX,
      "Only one blog cover image is allowed",
    );
    if (err) return err;
  }

  if (ctx.type === "blog-content-image") {
    const idx = ctx.index ?? 1;
    const err = indexGuard(
      idx,
      CONTEXT_LIMITS.BLOG_CONTENT_IMAGE_MAX,
      "Blog content image index exceeds max allowed",
    );
    if (err) return err;
  }

  if (ctx.type === "blog-additional-image") {
    const idx = ctx.index ?? 1;
    const err = indexGuard(
      idx,
      CONTEXT_LIMITS.BLOG_ADDITIONAL_IMAGE_MAX,
      "Blog additional image index exceeds max allowed",
    );
    if (err) return err;
  }

  if (ctx.type === "rich-text-image") {
    if (isVideo) {
      return {
        ok: false,
        status: 400,
        error: "rich-text-image context requires an image file",
      };
    }
    const idx = ctx.index ?? 1;
    const err = indexGuard(
      idx,
      CONTEXT_LIMITS.RICH_TEXT_IMAGE_MAX,
      "Rich text image index exceeds max allowed",
    );
    if (err) return err;
  }

  if (IMAGE_ONLY_CONTEXT_TYPES.has(ctx.type) && isVideo) {
    return {
      ok: false,
      status: 400,
      error: `${ctx.type} must be an image file, not a video`,
    };
  }

  const isPdfOnlyContext = (
    c: MediaFilenameContext,
  ): c is Extract<MediaFilenameContext, { type: PdfOnlyContextType }> =>
    (PDF_ONLY_CONTEXTS as readonly string[]).includes(c.type);

  const isImageOrPdfContext = (
    c: MediaFilenameContext,
  ): c is Extract<MediaFilenameContext, { type: ImageOrPdfContextType }> =>
    (IMAGE_OR_PDF_CONTEXTS as readonly string[]).includes(c.type);

  const ext = MIME_TO_EXT[detectedMime] ?? "bin";

  if (isPdfOnlyContext(ctx)) {
    if (!isPdf) {
      return {
        ok: false,
        status: 400,
        error: `${ctx.type} context requires a PDF file`,
        details: { context: ctx.type, detected: detectedMime },
      };
    }
    return okWithFilename(ctx, generateMediaFilename(ctx), ext);
  }

  if (isImageOrPdfContext(ctx)) {
    // shipping-proof and refund-proof accept images or PDFs, not video.
    if (isVideo) {
      return {
        ok: false,
        status: 400,
        error: `${ctx.type} must be an image or PDF, not a video`,
      };
    }
    return okWithFilename(ctx, generateMediaFilename(ctx), ext);
  }

  if (isPdf) {
    return {
      ok: false,
      status: 400,
      error: "PDF uploads are only allowed for invoice, payout-doc, shipping-proof, or refund-proof contexts",
      details: { context: ctx.type, detected: detectedMime },
    };
  }

  return okWithFilename(ctx, generateMediaFilename({ ...ctx, ext }), ext);
}
