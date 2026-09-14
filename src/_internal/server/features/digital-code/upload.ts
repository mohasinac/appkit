/**
 * Upload for delivered digital content.
 *
 * 🛑 A SEPARATE PIPELINE FROM `/api/media/*`, ON PURPOSE.
 *
 * The public media pipeline ends by creating a `mediaAssets` row, and that row
 * IS the `/media/{shortId}` slug — which `GET /api/media/[...slug]` serves with
 * no authentication at all. Reusing it for paid content and then "remembering
 * not to publish the URL" is not a boundary; the slug exists the moment the row
 * does. So this writes to `private/digital-content/...`, mints no row, and the
 * bytes are only ever readable through `resolveCodeAssetForOrder`, which checks
 * that the caller owns the order.
 *
 * Everything else about the flow is deliberately identical to the public one —
 * a short-lived signed PUT so bytes never traverse the Next.js function (Rule
 * #6 caps a request body at 4.5 MB), then a server-side finalize that verifies
 * the file by its MAGIC BYTES rather than by what the client declared.
 */

import { randomUUID } from "node:crypto";
import { getAdminStorage } from "../../../../providers/db-firebase";
import { normalizeError } from "../../../../errors/normalize";
import { serverLogger } from "../../../../monitoring";
import { ValidationError } from "../../../../errors";
import {
  classifyMime,
  isAllowedMime,
  maxBytesFor,
  PDF_MAGIC,
  type MediaKind,
} from "../../../shared/media/limits";
import { DIGITAL_CONTENT_PREFIX } from "./pool";
import type { ProductCodeContentKind } from "../../../../features/products/schemas/firestore";

/** Signed-PUT lifetime. Long enough for a slow upload, short enough to matter. */
const SIGNED_URL_TTL_MS = 15 * 60 * 1000;

/** Magic bytes are read from the head of the object; 4 KB is ample for every type. */
const MAGIC_BYTE_WINDOW = 4096;

/** The content kind a declared MIME maps to. */
export function contentKindForMime(mime: string): ProductCodeContentKind {
  return classifyMime(mime) === "image" ? "image" : "file";
}

export interface SignDigitalContentInput {
  productId: string;
  fileName: string;
  contentType: string;
  size: number;
}

export interface SignedDigitalContent {
  uploadUrl: string;
  storagePath: string;
  contentKind: ProductCodeContentKind;
  expiresAt: string;
}

export async function signDigitalContentUpload(
  input: SignDigitalContentInput,
): Promise<SignedDigitalContent> {
  if (!isAllowedMime(input.contentType)) {
    throw new ValidationError(`Unsupported file type: ${input.contentType}`);
  }
  const kind = classifyMime(input.contentType) as MediaKind;
  if (kind === "video") {
    // Video as a delivered good is a different product with different economics
    // (egress on a 50 MB file, per download, on the Hobby tier). Refuse loudly
    // rather than accept it and discover the bill.
    throw new ValidationError("Video cannot be delivered as digital content.");
  }
  const max = maxBytesFor(input.contentType);
  if (!(input.size > 0)) throw new ValidationError("Empty file.");
  if (max !== null && input.size > max) {
    throw new ValidationError("File is too large.");
  }

  /*
   * A RANDOM object name, which is the opposite of the convention everywhere
   * else in this codebase. Public media filenames are content-derived for SEO —
   * and therefore guessable, which is precisely the property that must not hold
   * for a paid good. The private prefix already means Storage's world-read rule
   * cannot be reached through any app route, and an unguessable name means a
   * leaked path is not a leaked catalogue.
   */
  const safeName = input.fileName.replace(/[^\w.\-]+/g, "_").slice(-80) || "asset";
  const storagePath = `${DIGITAL_CONTENT_PREFIX}/${input.productId}/${randomUUID()}-${safeName}`;

  const expires = Date.now() + SIGNED_URL_TTL_MS;
  const [uploadUrl] = await getAdminStorage()
    .bucket()
    .file(storagePath)
    .getSignedUrl({
      version: "v4",
      action: "write",
      expires,
      contentType: input.contentType,
    });

  return {
    uploadUrl,
    storagePath,
    contentKind: contentKindForMime(input.contentType),
    expiresAt: new Date(expires).toISOString(),
  };
}

export interface FinalizedDigitalContent {
  storagePath: string;
  contentType: string;
  fileName: string;
  contentKind: ProductCodeContentKind;
  size: number;
}

/**
 * Verify an uploaded object and return the facts a pool entry needs.
 *
 * 🛑 THE DECLARED MIME IS NOT EVIDENCE. `finalize` on the public pipeline exists
 * for exactly this reason and returns a structured 422 `MIME_MISMATCH`; the same
 * rule has to hold here, and matters more, because the output is handed to a
 * paying buyer. A mismatch DELETES the object rather than leaving it in the
 * bucket for a later caller to reference.
 */
export async function finalizeDigitalContentUpload(
  storagePath: string,
  declaredContentType: string,
): Promise<FinalizedDigitalContent> {
  if (!storagePath.startsWith(`${DIGITAL_CONTENT_PREFIX}/`)) {
    throw new ValidationError("Not a digital-content upload path.");
  }
  const file = getAdminStorage().bucket().file(storagePath);

  const [exists] = await file.exists();
  if (!exists) throw new ValidationError("Upload not found.");

  const [meta] = await file.getMetadata();
  const size = Number(meta.size ?? 0);
  const declaredKind = classifyMime(declaredContentType);
  if (!declaredKind) {
    await file.delete({ ignoreNotFound: true });
    throw new ValidationError("Unsupported file type.");
  }
  const max = maxBytesFor(declaredContentType);
  if (size <= 0 || (max !== null && size > max)) {
    await file.delete({ ignoreNotFound: true });
    throw new ValidationError("File is empty or too large.");
  }

  const [head] = await file.download({ start: 0, end: MAGIC_BYTE_WINDOW - 1 });
  let detectedKind: MediaKind | null = null;
  try {
    const { fileTypeFromBuffer } = await import("file-type");
    const detected = await fileTypeFromBuffer(head);
    detectedKind = detected ? classifyMime(detected.mime) : null;
    if (!detectedKind && head.subarray(0, PDF_MAGIC.length).toString("latin1") === PDF_MAGIC) {
      detectedKind = "pdf";
    }
  } catch (err) {
    const normalized = normalizeError(err);
    /*
     * Detection FAILING is treated exactly like detection DISAGREEING — the
     * check below sees `detectedKind === null` and deletes the object. So this
     * catch cannot hide a bad upload; it only records why the prover gave up
     * (a corrupt head, or file-type failing to load). Logging it matters
     * because a systematic failure here would look like "every upload is
     * malformed" to the person uploading.
     */
    serverLogger.warn("digital-content: magic-byte detection failed", {
      error: normalized.message,
      storagePath,
    });
  }

  if (!detectedKind || detectedKind !== declaredKind) {
    await file.delete({ ignoreNotFound: true });
    throw new ValidationError(
      "The uploaded file is not the type it claims to be, so it was discarded.",
    );
  }

  const fileName = storagePath.split("/").pop()!.replace(/^[0-9a-f-]{36}-/, "");
  return {
    storagePath,
    contentType: declaredContentType,
    fileName,
    contentKind: contentKindForMime(declaredContentType),
    size,
  };
}
