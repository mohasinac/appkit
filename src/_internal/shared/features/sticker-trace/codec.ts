/*
 * WHY: The tracing algorithm must be ONE implementation, but it has to run in a
 *      browser (live threshold tuning, ~1s per tweak) and in a Firebase Function
 *      (full-resolution render on save). Two implementations drift, and the one
 *      that drifts is always the one you are not currently looking at
 *      (CLAUDE.md Root Cause #59/#73). So the algorithm is shared and only the
 *      pixel I/O differs — this file is that seam, and it is the whole of it.
 * WHAT: The codec interface. Declaration only: no implementation, no imports, no
 *       dependency on sharp, canvas, node:* or providers/*. Keeping this tree
 *       import-free is what lets the browser bundle it at all (Root Cause #24),
 *       and `audit-sticker-trace-purity` enforces it.
 *
 * The division of labour is deliberate and worth stating, because getting it
 * wrong reintroduces the memory problem the design exists to avoid:
 *
 *   codec  — owns BYTES. Decodes, downscales, crops, encodes.
 *   core   — owns MATHS. Takes a DecodedRaster, returns geometry. Never resizes
 *            anything, never allocates at source resolution, never sees a file.
 *
 * EXPORTS:
 *   ImageCodec, DecodeOptions, PreviewOptions, ProbeResult
 *
 * @tag domain:sticker-trace
 * @tag layer:shared
 * @tag pattern:port
 * @tag access:isomorphic
 * @tag consumers:canvas-codec,sharp-codec,run,coordinator,shard
 * @tag sideEffects:none
 */

import type { DecodedRaster, EncodedImage, Rect } from "./types";

export interface ProbeResult {
  readonly width: number;
  readonly height: number;
  /**
   * The density the FILE declares, unvalidated. Five of the nine reference
   * scans say 72 or 96 — an encoder default, not a measurement — so a caller
   * must treat this as a suggestion to confirm, never as truth.
   */
  readonly dpi?: number;
}

export interface DecodeOptions {
  /**
   * The memory cap, enforced INSIDE the codec.
   *
   * This is the single most important line in the seam. sharp downscales in
   * native code during decode and canvas does it in `drawImage`, so a 34 MP
   * source never materialises as a JS buffer. If a codec implementation ignores
   * this and returns full-resolution pixels, every Float32Array downstream
   * scales with it and the Function runs out of memory — with no error that
   * points here.
   */
  readonly maxLongEdge: number;
}

export interface PreviewOptions {
  readonly maxLongEdge: number;
  readonly format: "png" | "webp";
}

export interface ImageCodec {
  /** Header-only. Must not decode pixels — it runs on the full upload. */
  probe(source: Uint8Array): Promise<ProbeResult>;

  /**
   * Decode, downscale to `maxLongEdge`, apply EXIF orientation, drop ICC.
   *
   * The last two matter for correctness, not tidiness: both codecs must hand
   * back the SAME pixels for the same file, or a path tuned in the browser
   * lands somewhere else when the Function re-renders it.
   */
  decode(source: Uint8Array, opts: DecodeOptions): Promise<DecodedRaster>;

  /**
   * Decode one tile at native resolution, for the `max` tier's tiled ridge pass.
   *
   * 🛑 Tiles must overlap by at least the ridge kernel radius. A cut line
   * crossing a seam with insufficient overlap is detected on neither side and
   * breaks silently — producing worse output than the cheaper `precise` tier,
   * which is the one way that tier can quietly be a downgrade.
   */
  decodeTile(source: Uint8Array, tile: Rect): Promise<DecodedRaster>;

  encodePng(raster: DecodedRaster): Promise<EncodedImage>;

  /**
   * Crop to `region` and apply `alpha` (length === region.width * region.height),
   * in one call.
   *
   * One call rather than crop-then-composite so that neither codec needs its own
   * pixel loop, and — the real reason — so a full-resolution part render never
   * materialises a full-resolution RGBA buffer. The caller rasterises that one
   * part's Bézier path into `alpha` over its own bounding box, and the codec
   * reads only that box out of the source file. Sixty parts therefore cost
   * sixty small allocations rather than one enormous one.
   */
  encodePngRegion(source: Uint8Array, region: Rect, alpha: Uint8Array): Promise<EncodedImage>;

  /** The ≤1 MB review image the UI loads instead of the scan. */
  encodePreview(source: Uint8Array, opts: PreviewOptions): Promise<EncodedImage>;

  /**
   * Pack already-encoded tiles into one sprite atlas.
   *
   * Exists because object COUNT is metered separately from bytes: sixty
   * thumbnail objects per run spend the Class A/B allowance sixty times faster
   * than one atlas of the same pixels, and the part list loads in one request
   * rather than sixty.
   */
  encodeAtlas(
    tiles: readonly { readonly raster: DecodedRaster; readonly ordinal: number }[],
    opts: { readonly maxLongEdge: number },
  ): Promise<{ readonly image: EncodedImage; readonly frames: Readonly<Record<number, Rect>> }>;
}
