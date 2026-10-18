/*
 * WHY: Scans and artifacts are private bytes that must never be watermarked,
 *      never be publicly addressable, and never traverse Vercel.
 * WHAT: Paths, the signed upload/read pair, magic-byte finalize, and tree
 *       deletion.
 *
 * 🛑 THREE RULES, each closing a failure this project has already paid for.
 *
 * 1. NOT through /api/media/[...slug]. That route applies NO authentication —
 *    deliberately, because its job is public product photography — and it
 *    ALWAYS watermarks (`resolveWatermarkConfig` has no skip path), which would
 *    ruin a cut-out and make the printed mosaic unusable. See § "Digital
 *    Content Delivery" for the same decision made for purchased assets.
 *
 * 2. NO `mediaAssets` row. That row IS the public `/media/{shortId}` slug — the
 *    resolver looks up `mediaAssets/{slug}` to find `storagePath` — so no row
 *    means no public URL exists at all. Object names are RANDOM, against the
 *    SEO-slug convention used everywhere else, because media filenames here are
 *    content-derived and therefore guessable, and guessable is the one property
 *    a private asset must not have.
 *
 * 3. VERCEL RETURNS JSON, NEVER BYTES. Every binary is fetched by the browser
 *    straight from GCS with a 5-minute signed URL; the route returns
 *    `{ url, expiresAt }`. Vercel's Fast Origin Transfer allowance is 10 GB and
 *    exceeding it PAUSED this project once already — 52.52 GB against that 10 GB
 *    (Root Cause #104). Cloud Storage's own egress allowance is ten times
 *    larger and is not a cliff.
 *
 *    Accepted residue, stated rather than hidden: a signed URL is a 5-minute
 *    bearer token. Acceptable here because an admin's own scan is not a paid
 *    good — which was the precise reason `digital-content` refused this and
 *    streams through its route instead.
 *
 * EXPORTS: SCAN_ROOT, runPrefix, signScanUpload, finalizeScanUpload,
 *   signedReadUrl, writeRunArtifact, deleteRunTree, deleteSheetTree,
 *   measureSheetBytes
 *
 * @tag domain:sticker-trace
 * @tag layer:server
 * @tag pattern:none
 * @tag access:server
 * @tag consumers:api/admin/sticker-sheets,functions/sticker-trace
 * @tag sideEffects:storage
 */

import { normalizeError } from "../../../../errors/normalize";
import { serverLogger } from "../../../../monitoring";
import { getAdminStorage } from "../../../../providers/db-firebase";

/** Nothing under here is reachable without a signed URL minted by this module. */
export const SCAN_ROOT = "private/sticker-sheets";

/** How long a read URL lives. Long enough to fetch, short enough to be useless if leaked. */
const READ_TTL_MS = 5 * 60 * 1000;
/** An upload may take a while on a 79 MB PNG over a domestic uplink. */
const UPLOAD_TTL_MS = 15 * 60 * 1000;

/** Magic-byte families a scan may legitimately be. */
const ALLOWED_SCAN_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/tiff",
  "image/bmp",
]);

export function runPrefix(sheetId: string, runId: string): string {
  return `${SCAN_ROOT}/${sheetId}/${runId}`;
}

/**
 * A random object name, with the caller's extension preserved for tooling only.
 *
 * `crypto.randomUUID` rather than a slug: see rule 2 in the header. The
 * original name is NOT used — a human-supplied filename is both guessable and
 * a path-traversal surface.
 */
function randomObjectName(extension: string): string {
  const ext = /^[a-z0-9]{1,5}$/i.test(extension) ? extension.toLowerCase() : "bin";
  return `${globalThis.crypto.randomUUID()}.${ext}`;
}

export interface SignedUpload {
  /** PUT here with the exact `contentType`, or the signature will not match. */
  uploadUrl: string;
  /** Hand back to `finalizeScanUpload`. Never returned to a client afterwards. */
  assetPath: string;
  expiresAt: Date;
}

/**
 * Mint a one-object write URL for a scan.
 *
 * 🛑 `contentType` is BOUND INTO THE SIGNATURE. A client that PUTs different
 * bytes than it declared gets a 403 from GCS rather than a stored lie — which
 * is the cheap half of the guarantee. The expensive half is `finalizeScanUpload`
 * below, because a matching header still proves nothing about the content.
 */
export async function signScanUpload(input: {
  sheetId: string;
  runId: string;
  contentType: string;
  extension: string;
}): Promise<SignedUpload> {
  const assetPath = `${runPrefix(input.sheetId, input.runId)}/${randomObjectName(input.extension)}`;
  const expiresAt = new Date(Date.now() + UPLOAD_TTL_MS);
  const [uploadUrl] = await getAdminStorage()
    .bucket()
    .file(assetPath)
    .getSignedUrl({
      version: "v4",
      action: "write",
      expires: expiresAt,
      contentType: input.contentType,
    });
  return { uploadUrl, assetPath, expiresAt };
}

export type FinalizeResult =
  | { ok: true; contentType: string; bytes: number }
  | { ok: false; code: "MISSING" | "MIME_MISMATCH" | "TOO_LARGE"; message: string };

/**
 * Prove the uploaded object is the image it claims to be.
 *
 * 🛑 The DECLARED type is not evidence, and a mismatch DELETES the object.
 * Leaving it would mean an arbitrary file sitting in our bucket at a path our
 * own code will later hand a signed URL for. The same magic-byte discipline as
 * `/api/media/finalize`, which emits a structured 422 for exactly this.
 *
 * Reads only the first 4 KB — magic bytes live in the first few, and
 * downloading a 79 MB scan into a Vercel function to inspect its header would
 * be the egress mistake this module exists to prevent.
 */
export async function finalizeScanUpload(
  assetPath: string,
  maxBytes: number,
): Promise<FinalizeResult> {
  const file = getAdminStorage().bucket().file(assetPath);

  let bytes = 0;
  try {
    const [meta] = await file.getMetadata();
    bytes = Number(meta.size ?? 0);
  } catch (err) {
    const n = normalizeError(err);
    serverLogger.warn("Sticker scan finalize: object missing", { assetPath, message: n.message });
    return { ok: false, code: "MISSING", message: "The upload did not complete." };
  }

  if (bytes > maxBytes) {
    await deleteObject(assetPath);
    return {
      ok: false,
      code: "TOO_LARGE",
      message: `That scan is ${(bytes / 1_048_576).toFixed(1)} MB; the limit is ${(maxBytes / 1_048_576).toFixed(0)} MB.`,
    };
  }

  try {
    const [head] = await file.download({ start: 0, end: 4095 });
    const { fileTypeFromBuffer } = await import("file-type");
    const detected = await fileTypeFromBuffer(head);
    if (!detected || !ALLOWED_SCAN_MIMES.has(detected.mime)) {
      await deleteObject(assetPath);
      return {
        ok: false,
        code: "MIME_MISMATCH",
        message: "That file is not a readable image. Upload a JPEG, PNG, WebP, TIFF or BMP scan.",
      };
    }
    return { ok: true, contentType: detected.mime, bytes };
  } catch (err) {
    const n = normalizeError(err);
    serverLogger.error("Sticker scan finalize: magic-byte read failed", {
      assetPath,
      message: n.message,
    });
    // 🛑 Fails CLOSED and deletes. An object we could not verify must not stay
    // at a path this module will later sign a URL for.
    await deleteObject(assetPath);
    return { ok: false, code: "MIME_MISMATCH", message: "The upload could not be verified." };
  }
}

/**
 * A short-lived read URL for one private object.
 *
 * 🛑 The CALLER is responsible for having authorised the request. This function
 * mints capability and checks nothing — it cannot, because it does not see the
 * session. Every call site must sit behind `createRouteHandler`'s admin gate.
 *
 * SVG is forced to `attachment`: it is deliberately excluded from
 * `ALLOWED_IMAGE_MIMES` as an XSS surface, and a signed GCS URL is still our
 * origin's data. The canvas draws cut lines from `geometry.json`, never by
 * rendering the SVG.
 */
export async function signedReadUrl(
  assetPath: string,
  opts?: { downloadAs?: string },
): Promise<{ url: string; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + READ_TTL_MS);
  const forceDownload = opts?.downloadAs || /\.svg$/i.test(assetPath);
  const [url] = await getAdminStorage()
    .bucket()
    .file(assetPath)
    .getSignedUrl({
      version: "v4",
      action: "read",
      expires: expiresAt,
      ...(forceDownload
        ? {
            responseDisposition: `attachment; filename="${(opts?.downloadAs ?? "cut.svg").replace(/"/g, "")}"`,
          }
        : {}),
    });
  return { url, expiresAt };
}

/** Save an artifact the tracer produced. Server-side only — never a client upload. */
export async function writeRunArtifact(input: {
  sheetId: string;
  runId: string;
  name: string;
  contentType: string;
  body: Buffer | Uint8Array;
}): Promise<{ assetPath: string; bytes: number }> {
  const assetPath = `${runPrefix(input.sheetId, input.runId)}/${input.name}`;
  const buffer = Buffer.isBuffer(input.body) ? input.body : Buffer.from(input.body);
  await getAdminStorage()
    .bucket()
    .file(assetPath)
    .save(buffer, { contentType: input.contentType, resumable: false });
  return { assetPath, bytes: buffer.byteLength };
}

async function deleteObject(assetPath: string): Promise<void> {
  try {
    await getAdminStorage().bucket().file(assetPath).delete({ ignoreNotFound: true });
  } catch (err) {
    const n = normalizeError(err);
    serverLogger.warn("Sticker trace object delete failed", { assetPath, message: n.message });
  }
}

/**
 * Delete everything one run wrote.
 *
 * `deleteFiles` pages internally, so this is safe on a `max`-tier run that
 * produced sixty parts plus exports — unlike a hand-batched delete, which is
 * the shape that died with `Transaction too big` on `categories`.
 */
export async function deleteRunTree(sheetId: string, runId: string): Promise<void> {
  await deletePrefix(`${runPrefix(sheetId, runId)}/`);
}

/** Delete a whole sheet: the scan, and every run under it. */
export async function deleteSheetTree(sheetId: string): Promise<void> {
  await deletePrefix(`${SCAN_ROOT}/${sheetId}/`);
}

async function deletePrefix(prefix: string): Promise<void> {
  /*
   * 🛑 The trailing slash is load-bearing. `prefix: "…/sheet-1"` also matches
   * `…/sheet-10`, so deleting one sheet would delete its numeric neighbours —
   * silently, and reported as success.
   */
  if (!prefix.startsWith(`${SCAN_ROOT}/`) || !prefix.endsWith("/")) {
    throw new Error(`Refusing to delete outside ${SCAN_ROOT}: ${prefix}`);
  }
  await getAdminStorage().bucket().deleteFiles({ prefix, force: true });
}

/**
 * Total stored bytes and object count under one sheet, for the usage meter.
 *
 * 🛑 A quota only discoverable in the GCP console is a quota nobody watches —
 * the same failure as Root Cause #104, where the first signal was a billing
 * page. This is what makes "keep every run" a safe default rather than a
 * deferred surprise.
 */
export async function measureSheetBytes(
  sheetId: string,
): Promise<{ bytes: number; objects: number }> {
  const [files] = await getAdminStorage()
    .bucket()
    .getFiles({ prefix: `${SCAN_ROOT}/${sheetId}/` });
  let bytes = 0;
  for (const f of files) bytes += Number(f.metadata?.size ?? 0);
  return { bytes, objects: files.length };
}
