/*
 * WHY: The ridge detector reads ONE signal — the emboss doublet a kiss cut
 *      leaves in the sheet. On the halftone-screened scan that signal measured
 *      only ~3x the noise, against 10-20x everywhere else. A second, INDEPENDENT
 *      signal is what rescues that case, and colour is independent: it fails
 *      exactly where the ridge succeeds and succeeds exactly where it fails.
 *
 *        torch pegases  (red on red)   ridge +22 strong   colour: nothing
 *        posiedon       (yellow/yellow) ridge -40/+27      colour: nothing
 *        Spark_dragoon  (halftone)      ridge ~3x MARGINAL colour: strong
 *                                       (green panel, yellow rect, purple grad)
 *
 * WHAT: Posterise to N colours, then mark pixels where the posterised label
 *       changes — the boundaries between flat colour regions.
 *
 * 🛑 It must run AFTER the prefilter. A halftone rosette posterises into
 * hundreds of speckle regions, and every speckle edge becomes a boundary — so
 * un-prefiltered, this channel contributes noise rather than signal and makes
 * the fused map WORSE than the ridge alone. That ordering is a named check in
 * the corpus harness rather than a comment anyone can drift from.
 *
 * EXPORTS: QuantiseResult, quantiseBoundaries
 *
 * @tag domain:sticker-trace
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:fuse,segment
 * @tag sideEffects:none
 */

import type { DecodedRaster } from "../types";

export interface QuantiseResult {
  /** Palette index per pixel. */
  readonly labels: Int32Array;
  /** 1 where the label differs from a 4-neighbour — i.e. a region boundary. */
  readonly boundary: Uint8Array;
  readonly paletteSize: number;
  readonly coverage: number;
}

/**
 * Median-cut palette selection.
 *
 * k-means would fit the colours better and is the obvious reach, but it is
 * iterative and its result depends on initialisation — so the same sheet traced
 * twice could posterise differently and move a cut line. Median cut is
 * deterministic and single-pass, which matters more here than palette fidelity:
 * the palette is never rendered, only differenced.
 */
function medianCutPalette(
  data: Uint8Array,
  sampleStride: number,
  targetColours: number,
): Array<[number, number, number]> {
  const pixels: Array<[number, number, number]> = [];
  for (let p = 0; p < data.length; p += 4 * sampleStride) {
    pixels.push([data[p]!, data[p + 1]!, data[p + 2]!]);
  }
  if (pixels.length === 0) return [[0, 0, 0]];

  let buckets: Array<Array<[number, number, number]>> = [pixels];

  while (buckets.length < targetColours) {
    // Split the bucket with the widest channel range — the one carrying the
    // most distinguishable colour, rather than simply the most pixels.
    let widest = -1;
    let widestRange = -1;
    let widestChannel = 0;

    for (let i = 0; i < buckets.length; i++) {
      const bucket = buckets[i]!;
      if (bucket.length < 2) continue;
      for (let c = 0; c < 3; c++) {
        let min = 255;
        let max = 0;
        for (const px of bucket) {
          const v = px[c]!;
          if (v < min) min = v;
          if (v > max) max = v;
        }
        if (max - min > widestRange) {
          widestRange = max - min;
          widest = i;
          widestChannel = c;
        }
      }
    }

    if (widest < 0 || widestRange <= 0) break;

    const bucket = buckets[widest]!;
    bucket.sort((a, b) => a[widestChannel]! - b[widestChannel]!);
    const mid = bucket.length >> 1;
    buckets = [
      ...buckets.slice(0, widest),
      bucket.slice(0, mid),
      bucket.slice(mid),
      ...buckets.slice(widest + 1),
    ];
  }

  return buckets
    .filter((b) => b.length > 0)
    .map((b) => {
      let r = 0;
      let g = 0;
      let bl = 0;
      for (const px of b) {
        r += px[0]!;
        g += px[1]!;
        bl += px[2]!;
      }
      return [r / b.length, g / b.length, bl / b.length] as [number, number, number];
    });
}

export function quantiseBoundaries(
  raster: DecodedRaster,
  colours: number,
): QuantiseResult {
  const { width, height, data } = raster;

  // Sample at most ~40k pixels to build the palette. Median cut sorts within
  // buckets, so feeding it 9 million pixels costs far more than the palette's
  // extra precision is worth when the output is a boolean boundary map.
  const stride = Math.max(1, Math.floor((width * height) / 40_000));
  const palette = medianCutPalette(data, stride, colours);

  const labels = new Int32Array(width * height);
  for (let i = 0, p = 0; i < labels.length; i++, p += 4) {
    const r = data[p]!;
    const g = data[p + 1]!;
    const b = data[p + 2]!;
    let best = 0;
    let bestDist = Infinity;
    for (let k = 0; k < palette.length; k++) {
      const c = palette[k]!;
      const dr = r - c[0];
      const dg = g - c[1];
      const db = b - c[2];
      const d = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
      if (d < bestDist) {
        bestDist = d;
        best = k;
      }
    }
    labels[i] = best;
  }

  const boundary = new Uint8Array(width * height);
  let set = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const l = labels[i]!;
      // 4-neighbour only. An 8-neighbour test marks both sides of every
      // diagonal step, doubling the width of a boundary that is supposed to be
      // a hairline and smearing the fused barrier.
      const differs =
        (x > 0 && labels[i - 1] !== l) ||
        (x < width - 1 && labels[i + 1] !== l) ||
        (y > 0 && labels[i - width] !== l) ||
        (y < height - 1 && labels[i + width] !== l);
      if (differs) {
        boundary[i] = 1;
        set++;
      }
    }
  }

  return {
    labels,
    boundary,
    paletteSize: palette.length,
    coverage: set / boundary.length,
  };
}
