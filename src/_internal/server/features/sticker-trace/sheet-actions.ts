/*
 * WHY: A scan has to exist in the bucket before anything can trace it, and the
 *      upload is the one hop where a client supplies a storage path. Getting
 *      that hop wrong is not a cosmetic bug — the bucket's own rule is
 *      `allow read: if true`, so path containment is enforced here or nowhere.
 * WHAT: Create a sheet, attach its verified scan, resolve an asset to a
 *       short-lived signed URL, and measure what it all costs.
 *
 * 🛑 Separate from `actions.ts` on purpose. That file is the RUN lifecycle
 * (start, retry, list) and this one is the SHEET lifecycle; they share nothing
 * but the repositories. One file would also have meant appending imports into
 * the middle of an existing module, which is how an import block stops being
 * readable.
 *
 * 🛑 Plain objects and thrown errors, not an `ActionResult` envelope — same
 * reasoning as `actions.ts`, and Root Cause #98 is what it costs to get wrong.
 *
 * EXPORTS: STICKER_SHEET_MAX_BYTES, STICKER_ASSET_KINDS, StickerAssetKind,
 *   createStickerSheet, attachStickerSheetScan, resolveStickerAssetUrl,
 *   measureStickerStorage, SheetUsageRow
 *
 * @tag domain:sticker-trace
 * @tag layer:server
 * @tag pattern:none
 * @tag access:server
 * @tag consumers:api/admin/sticker-sheets
 * @tag sideEffects:firestore,storage
 */

import { ValidationError } from "../../../../errors/validation-error";
import { stickerSheetsRepository } from "../../../../features/sticker-trace/repository/sticker-sheets.repository";
import { stickerTraceRunsRepository } from "../../../../features/sticker-trace/repository/sticker-trace-runs.repository";
import type { StickerSheetDocument } from "../../../../features/sticker-trace/schemas/firestore";
import type { DpiSource } from "../../../../features/sticker-trace/schemas/firestore";
import type { ScanType } from "../../../shared/features/sticker-trace/types";
import {
  finalizeScanUpload,
  measureSheetBytes,
  runPrefix,
  signScanUpload,
  signedReadUrl,
  type SignedUpload,
} from "./storage";

/**
 * The storage segment a sheet's own scan lives under.
 *
 * 🛑 The literal `"source"`, in the slot `runPrefix` fills with a run id. A
 * scan is uploaded BEFORE any run exists, so there is no run id to key it on —
 * and filing it under the first run's id would mean deleting that run deletes
 * the scan every later run reads. Run ids carry a `stickerrun-`-shaped prefix
 * and a random suffix, so this cannot collide with one.
 */
const SOURCE_SEGMENT = "source";

/**
 * 100 MB.
 *
 * Measured against the reference corpus rather than picked: `@ShayBlader Scan
 * 18` is 79 MB, the largest of the nine, and it is a legitimate scan rather
 * than an outlier to design against. The cap exists because scans are stored
 * AS UPLOADED — no re-encode, because compression artefacts measured ±7 on the
 * JPEG samples and the halftone scan's cut-line signal is only ~3x noise, so
 * transcoding would attack the exact signal the detector needs.
 */
export const STICKER_SHEET_MAX_BYTES = 100 * 1024 * 1024;

/** Title text is mandatory everywhere in this feature. */
function requireTitle(raw: string): string {
  const title = (raw ?? "").trim();
  if (title.length === 0) {
    throw new ValidationError("A name is required.", {
      title: "Give this sheet a name you will recognise later.",
    });
  }
  return title.slice(0, 160);
}

export interface CreateStickerSheetInput {
  /** 🛑 Mandatory — see `requireTitle`. */
  title: string;
  scanType?: ScanType;
  contentType: string;
  extension: string;
}

export interface CreateStickerSheetResult {
  sheetId: string;
  upload: SignedUpload;
}

/**
 * Create the sheet row and mint the write URL for its scan, in one call.
 *
 * 🛑 The ROW comes first and the bytes second, which is the opposite of what
 * feels natural. The object path contains the sheet id, so an upload signed
 * before the row exists has nowhere to go — and a bucket object with no
 * document pointing at it is unreachable AND unmeterable: it costs storage
 * forever with nothing in any UI to delete it from. A document whose upload
 * never completes is the harmless direction: `traceStatus` stays `queued`,
 * `sourceScan.bytes` is 0, and the list can say so.
 *
 * 🛑 `widthPx`/`heightPx` are 0 until `attachStickerSheetScan`. appkit cannot
 * probe an image — the codec is injected, which is what Root Cause #24 is
 * about — so the only party that already knows the dimensions is the browser
 * that just decoded it for live tuning. Guessing them here would put two
 * numbers on the document that nothing measured.
 */
export async function createStickerSheet(
  input: CreateStickerSheetInput,
): Promise<CreateStickerSheetResult> {
  const title = requireTitle(input.title);

  const sheet = await stickerSheetsRepository.create({
    title,
    scanType: input.scanType ?? "auto",
    widthPx: 0,
    heightPx: 0,
    sourceScan: { assetPath: "", contentType: input.contentType, bytes: 0 },
  });

  const upload = await signScanUpload({
    sheetId: sheet.id,
    runId: SOURCE_SEGMENT,
    contentType: input.contentType,
    extension: input.extension,
  });

  return { sheetId: sheet.id, upload };
}

export interface AttachScanInput {
  sheetId: string;
  assetPath: string;
  widthPx: number;
  heightPx: number;
  dpi?: number;
  dpiSource?: DpiSource;
  scanType?: ScanType;
  /** A dedupe hint the browser computed. Never trusted — see `StoredAsset`. */
  sha256?: string;
}

export type AttachScanResult =
  | { ok: true; bytes: number }
  | { ok: false; code: string; message: string };

/**
 * Verify the uploaded bytes and record them on the sheet.
 *
 * 🛑 The caller's `assetPath` is CONTAINED to this sheet's own prefix before
 * anything reads it. Every other field here is merely wrong if wrong; this one
 * is a capability — `readScanBytes` will later fetch whatever it names, and a
 * path naming another sheet would turn this endpoint into a cross-sheet read
 * primitive. `readScanBytes` has its own `SCAN_ROOT` check, which is the second
 * layer, not the first: by the time it runs the path is already on a document.
 *
 * 🛑 `finalizeScanUpload` DELETES the object on a magic-byte mismatch, so a
 * failure leaves nothing behind in the bucket. That is why the mismatch RETURNS
 * rather than throwing: the sheet row survives and the operator re-uploads into
 * it, instead of starting again with a fresh row and orphaning the first.
 */
export async function attachStickerSheetScan(
  input: AttachScanInput,
): Promise<AttachScanResult> {
  await stickerSheetsRepository.findByIdOrFail(input.sheetId);

  const expected = `${runPrefix(input.sheetId, SOURCE_SEGMENT)}/`;
  if (!input.assetPath.startsWith(expected)) {
    throw new ValidationError("That upload does not belong to this sheet.", {
      assetPath: "Path is outside this sheet's storage prefix.",
    });
  }

  const sized =
    Number.isInteger(input.widthPx) &&
    input.widthPx > 0 &&
    Number.isInteger(input.heightPx) &&
    input.heightPx > 0;
  if (!sized) {
    throw new ValidationError("The scan's pixel dimensions are required.", {
      widthPx: "Decode the image and send its real size.",
    });
  }

  const result = await finalizeScanUpload(input.assetPath, STICKER_SHEET_MAX_BYTES);
  if (!result.ok) return { ok: false, code: result.code, message: result.message };

  const patch: Partial<StickerSheetDocument> = {
    widthPx: input.widthPx,
    heightPx: input.heightPx,
    sourceScan: {
      assetPath: input.assetPath,
      contentType: result.contentType,
      bytes: result.bytes,
      ...(input.sha256 ? { sha256: input.sha256 } : {}),
    },
  };
  if (input.scanType) patch.scanType = input.scanType;
  /*
   * dpi is written ONLY when one was supplied. An absent dpi is the documented
   * signal that millimetre output must be WITHHELD (`bboxMm: null`), so
   * defaulting it — to 72, which five of the nine reference scans falsely
   * declare — would manufacture confident mm figures from a number the encoder
   * wrote rather than anything about the scanner. A fabricated millimetre on a
   * cut file is a physical production error, not a cosmetic one.
   */
  if (input.dpi) {
    patch.dpi = input.dpi;
    patch.dpiSource = input.dpiSource ?? "embedded";
  }

  await stickerSheetsRepository.update(input.sheetId, patch);
  return { ok: true, bytes: result.bytes };
}

/**
 * The asset kinds a client may ask for.
 *
 * 🛑 A KIND, never a path, and this is the whole security shape of the asset
 * endpoint: the client names WHAT it wants and the server looks the path up on
 * the document. Accepting an `assetPath` instead would make the endpoint a
 * signed-URL mint for any object in the bucket — including another admin's
 * scans and, since the same bucket holds them, `private/digital-content/`.
 * It is also what keeps every `*Path` field off the wire entirely, which is the
 * property `PRIVATE_STICKER_SHEET_FIELDS` declares and
 * audit-public-projection-parity enforces.
 */
export const STICKER_ASSET_KINDS = [
  "scan",
  "preview",
  "overlay",
  "geometry",
  "cutSvg",
  "thumbAtlas",
] as const;
export type StickerAssetKind = (typeof STICKER_ASSET_KINDS)[number];

/**
 * Mint a short-lived read URL for one asset of one sheet or run.
 *
 * `runId` absent means the sheet's currently-accepted artifacts; present means
 * that specific run's, which is what makes two runs comparable side by side —
 * the reason runs keep their own artifacts rather than overwriting the sheet's.
 *
 * Returns `null` for "there is no such asset", which the route maps to a 404.
 * An absent artifact is the normal state of an unfinished or failed run, so it
 * must not read as an error.
 */
export async function resolveStickerAssetUrl(input: {
  sheetId: string;
  kind: StickerAssetKind;
  runId?: string;
}): Promise<{ url: string; expiresAt: Date } | null> {
  const sheet = await stickerSheetsRepository.findByIdOrFail(input.sheetId);

  if (input.kind === "scan") {
    return sheet.sourceScan?.assetPath ? signedReadUrl(sheet.sourceScan.assetPath) : null;
  }

  let path: string | undefined;

  if (input.runId) {
    const run = await stickerTraceRunsRepository.findByIdOrFail(input.runId);
    /*
     * The run must belong to THIS sheet. The run id is caller-supplied and the
     * sheet id is in the URL, so this is the only place the pairing can be
     * checked — without it, any run id from any sheet resolves and signs.
     */
    if (run.sheetId !== input.sheetId) return null;
    const a = run.artifacts ?? {};
    path =
      input.kind === "preview"
        ? a.previewPath
        : input.kind === "overlay"
          ? a.overlayPath
          : input.kind === "geometry"
            ? a.geometryPath
            : input.kind === "cutSvg"
              ? a.cutSvgPath
              : a.thumbAtlasPath;
  } else {
    const a = sheet.artifacts ?? {};
    /*
     * A sheet has no `thumbAtlasPath` — the atlas is a REVIEW artifact, which
     * only a run produces. Falling through to undefined is correct, and is why
     * this is not the same lookup as the run branch above.
     */
    path =
      input.kind === "preview"
        ? a.previewPath
        : input.kind === "overlay"
          ? a.overlayPath
          : input.kind === "geometry"
            ? a.geometryPath
            : input.kind === "cutSvg"
              ? a.cutSvgPath
              : undefined;
  }

  if (!path) return null;
  /*
   * The cut SVG is forced to `attachment`. SVG is deliberately excluded from
   * `ALLOWED_IMAGE_MIMES` as an XSS surface, and a signed GCS URL is still our
   * origin's data — the canvas draws cut lines from `geometry.json`, never by
   * rendering the SVG.
   */
  return signedReadUrl(path, input.kind === "cutSvg" ? { downloadAs: "cut.svg" } : undefined);
}

export interface SheetUsageRow {
  sheetId: string;
  title: string;
  bytes: number;
  objects: number;
}

export interface StickerStorageUsage {
  rows: SheetUsageRow[];
  totalBytes: number;
  totalObjects: number;
}

/**
 * Stored bytes and object count per sheet, biggest first.
 *
 * 🛑 Object COUNT is reported beside bytes because GCS meters them separately
 * (Class A writes, Class B reads). The sprite-atlas decision exists precisely
 * because sixty thumbnails per run would spend that budget sixty times faster
 * than the same pixels in one object — a meter showing only bytes would make
 * undoing that look free.
 *
 * 🛑 Retention is manual by design: nothing auto-prunes, so any past run's
 * overlay can still be opened and compared. That is only a safe default if the
 * cost is VISIBLE rather than discovered, which is what this is for — Root
 * Cause #104's first signal was a billing page.
 *
 * 🛑 One bucket listing per sheet, so this is deliberately NOT folded into the
 * sheet list. Twenty sheets would be twenty `getFiles` calls on every page
 * view; it is its own endpoint an operator opens.
 */
export async function measureStickerStorage(
  sheetIds: readonly string[],
): Promise<StickerStorageUsage> {
  const measured = await Promise.all(
    sheetIds.map(async (id) => {
      const sheet = await stickerSheetsRepository.findById(id);
      if (!sheet) return null;
      const { bytes, objects } = await measureSheetBytes(id);
      return { sheetId: id, title: sheet.title, bytes, objects };
    }),
  );

  const rows = measured.filter((r): r is SheetUsageRow => r !== null);
  rows.sort((a, b) => b.bytes - a.bytes);

  return {
    rows,
    totalBytes: rows.reduce((n, r) => n + r.bytes, 0),
    totalObjects: rows.reduce((n, r) => n + r.objects, 0),
  };
}
