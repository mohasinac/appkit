"use client";

/*
 * WHY: Live tuning needs the SAME trace the Function runs, at ~1s per tweak and
 *      with no network. That is only possible because the core takes a
 *      DecodedRaster and never decodes anything itself.
 * WHAT: The browser half of the ImageCodec seam, on OffscreenCanvas.
 *
 * Mirrors functions/src/sticker-trace/sharp-codec.ts method for method. 🛑 When
 * either changes, change both — two codecs behind one port is exactly the
 * drift the port exists to prevent, and the pure core cannot tell them apart.
 *
 * 🛑 `maxLongEdge` IS ENFORCED INSIDE decode, via createImageBitmap's own
 * `resizeWidth`/`resizeHeight`. That is the seam's most important property: the
 * browser scales during decode in native code, so a 34 MP scan never
 * materialises as a JS buffer. Decoding full size and scaling afterwards would
 * allocate ~136 MB per Float32Array downstream and kill the tab.
 *
 * EXPORTS: canvasCodec
 *
 * @tag domain:sticker-trace
 * @tag layer:client
 * @tag pattern:adapter
 * @tag access:client
 * @tag consumers:sticker-trace/components
 * @tag sideEffects:none
 */

import type {
  DecodeOptions,
  ImageCodec,
  PreviewOptions,
  ProbeResult,
} from "../../../shared/features/sticker-trace/codec";
import type {
  DecodedRaster,
  EncodedImage,
  Rect,
} from "../../../shared/features/sticker-trace/types";

/*
 * One message, three throw sites. A 2d context is only ever null when the
 * browser refuses the canvas outright (memory pressure, or a hardened
 * environment), so all three mean the same thing and should read the same.
 */
const NO_CONTEXT = "OffscreenCanvas 2d context unavailable";

/** RGBA out of a canvas, in exactly the layout DecodedRaster promises. */
function toRaster(bitmap: ImageBitmap, dpi?: number): DecodedRaster {
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error(NO_CONTEXT);
  ctx.drawImage(bitmap, 0, 0);
  const data = ctx.getImageData(0, 0, bitmap.width, bitmap.height).data;
  bitmap.close();
  return {
    width: canvas.width,
    height: canvas.height,
    data: new Uint8Array(data.buffer),
    ...(dpi !== undefined ? { dpi } : {}),
  };
}

async function encode(
  canvas: OffscreenCanvas,
  format: "png" | "webp",
): Promise<EncodedImage> {
  const type = format === "webp" ? "image/webp" : "image/png";
  const blob = await canvas.convertToBlob({ type, ...(format === "webp" ? { quality: 0.82 } : {}) });
  return { bytes: new Uint8Array(await blob.arrayBuffer()), contentType: type };
}

function canvasOf(raster: { width: number; height: number; data: Uint8Array }): OffscreenCanvas {
  const canvas = new OffscreenCanvas(raster.width, raster.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error(NO_CONTEXT);
  ctx.putImageData(
    new ImageData(new Uint8ClampedArray(raster.data), raster.width, raster.height),
    0,
    0,
  );
  return canvas;
}

export const canvasCodec: ImageCodec = {
  /**
   * 🛑 `declaredDpi` is ALWAYS absent here, and that is the one real asymmetry
   * with the sharp codec.
   *
   * sharp reads the file's density header; a browser exposes no such API, and
   * parsing EXIF/pHYs by hand would be a second metadata implementation whose
   * disagreements with sharp nobody would notice. So the browser reports
   * dimensions only — which costs nothing, because the operator confirms dpi
   * anyway (five of the nine reference scans declare 72 or 96, an encoder
   * default rather than a measurement) and a sheet with no trustworthy dpi
   * already renders `bboxMm: null` rather than a fabricated figure.
   *
   * Also NOT header-only, unlike sharp's: `createImageBitmap` decodes. A
   * browser cannot read a header without decoding, so this is dimensions at
   * the cost of a decode — acceptable for one file the user just picked, and
   * the reason the server probe exists for the upload path.
   */
  async probe(source: Uint8Array): Promise<ProbeResult> {
    const bitmap = await createImageBitmap(new Blob([source as BlobPart]));
    const result = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return result;
  },

  async decode(source: Uint8Array, opts: DecodeOptions): Promise<DecodedRaster> {
    const blob = new Blob([source as BlobPart]);
    // Probe dimensions first so the resize preserves aspect ratio and never
    // ENLARGES — upscaling would invent sub-pixel detail the ridge detector
    // would then find cut lines in.
    const probe = await createImageBitmap(blob);
    const longEdge = Math.max(probe.width, probe.height);
    probe.close();

    if (longEdge <= opts.maxLongEdge) {
      return toRaster(await createImageBitmap(blob));
    }
    const k = opts.maxLongEdge / longEdge;
    return toRaster(
      await createImageBitmap(blob, {
        resizeWidth: Math.max(1, Math.round(probe.width * k)),
        resizeHeight: Math.max(1, Math.round(probe.height * k)),
        resizeQuality: "high",
      }),
    );
  },

  /**
   * No resize — a tile is already bounded by the caller, and the `max` tier
   * tiles precisely so it can read native pixels.
   */
  async decodeTile(source: Uint8Array, tile: Rect): Promise<DecodedRaster> {
    return toRaster(
      await createImageBitmap(new Blob([source as BlobPart]), {
        sx: tile.x,
        sy: tile.y,
        sw: tile.width,
        sh: tile.height,
      } as ImageBitmapOptions),
    );
  },

  async encodePng(raster: DecodedRaster): Promise<EncodedImage> {
    return encode(canvasOf(raster), "png");
  },

  async encodePngRegion(
    source: Uint8Array,
    region: Rect,
    alpha: Uint8Array,
  ): Promise<EncodedImage> {
    const expected = region.width * region.height;
    if (alpha.length !== expected) {
      // Loud, matching the sharp codec: a silent mismatch yields a part with a
      // plausible outline and the wrong transparency, invisible until it is cut.
      throw new Error(
        `alpha mask is ${alpha.length} px, expected ${expected} for ${region.width}x${region.height}`,
      );
    }
    const raster = await this.decodeTile(source, region);
    const px = raster.data;
    for (let i = 0; i < expected; i++) px[i * 4 + 3] = alpha[i]!;
    return encode(canvasOf({ width: region.width, height: region.height, data: px }), "png");
  },

  async encodePreview(source: Uint8Array, opts: PreviewOptions): Promise<EncodedImage> {
    const raster = await this.decode(source, { maxLongEdge: opts.maxLongEdge });
    return encode(canvasOf(raster), opts.format);
  },

  /**
   * Uniform-cell grid, identical in layout to the sharp codec's — the frames
   * map is a contract the review UI reads, so the two must agree on geometry
   * even though they agree on nothing about how they draw.
   */
  async encodeAtlas(
    tiles: readonly { readonly raster: DecodedRaster; readonly ordinal: number }[],
    opts: { readonly maxLongEdge: number },
  ): Promise<{ image: EncodedImage; frames: Record<number, Rect> }> {
    if (tiles.length === 0) {
      // A zero-part run is a real outcome; a valid 1x1 beats throwing.
      return {
        image: await encode(new OffscreenCanvas(1, 1), "png"),
        frames: {},
      };
    }

    const cols = Math.ceil(Math.sqrt(tiles.length));
    const rows = Math.ceil(tiles.length / cols);
    const cell = Math.max(
      1,
      Math.min(
        Math.floor(opts.maxLongEdge / cols),
        ...tiles.map((t) => Math.max(t.raster.width, t.raster.height)),
      ),
    );

    const canvas = new OffscreenCanvas(cols * cell, rows * cell);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error(NO_CONTEXT);

    const frames: Record<number, Rect> = {};
    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i]!;
      const left = (i % cols) * cell;
      const top = Math.floor(i / cols) * cell;
      // `fit: inside` equivalent — preserve aspect, never enlarge.
      const k = Math.min(cell / t.raster.width, cell / t.raster.height, 1);
      const w = Math.max(1, Math.round(t.raster.width * k));
      const h = Math.max(1, Math.round(t.raster.height * k));
      ctx.drawImage(canvasOf(t.raster), left, top, w, h);
      // The frame is the tile's ACTUAL size, not the cell: a wide sticker does
      // not fill a square cell, and a client slicing by `cell` would include
      // its neighbours' padding.
      frames[t.ordinal] = { x: left, y: top, width: w, height: h };
    }

    return { image: await encode(canvas, "png"), frames };
  },
};
