/*
 * WHY: The flood fill has to start somewhere it is certain is OUTSIDE every
 *      sticker, and it has to know what "outside" looks like so it can travel.
 *      Both answers come from the sheet's border band — the one region of a
 *      scan that is background by construction.
 * WHAT: Modal background colour from the border, plus a per-pixel
 *       "is this background-like" test in a perceptually sane colour space.
 *
 * 🛑 It estimates a MODE, not a mean. Averaging the border band over a scan
 * whose sheet runs near the edge mixes paper with sticker ink and yields a
 * colour that is neither — and then nothing matches it. A histogram peak is
 * unmoved by a minority of contaminating pixels, which is exactly the property
 * needed when "most of the border is background" is the only guarantee.
 *
 * EXPORTS: PaperEstimate, estimatePaper, backgroundLikeMask
 *
 * @tag domain:sticker-trace
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:flood,segment
 * @tag sideEffects:none
 */

import type { DecodedRaster, ScanType } from "../types";

export interface PaperEstimate {
  readonly colour: readonly [number, number, number];
  /**
   * Spread of the border band around that colour, in the same distance units
   * as `backgroundLikeMask`. A printed art sheet has a wide spread because its
   * border is artwork; bare paper has a narrow one.
   */
  readonly spread: number;
  /**
   * What the border band suggests this scan IS. Only consulted when the caller
   * asked for `auto` — an explicit choice always wins, because a human looking
   * at the sheet beats a statistic about its edge.
   */
  readonly detectedType: Exclude<ScanType, "auto">;
}

/**
 * Squared distance in a cheap perceptual weighting.
 *
 * Plain RGB Euclidean treats a blue shift as being as visible as a green one,
 * which it is not — so a tolerance loose enough to accept real paper variation
 * in green also accepts colours a human reads as plainly different. The 2/4/3
 * weighting is the standard low-cost approximation and costs two multiplies.
 */
function colourDistanceSq(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number,
): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return 2 * dr * dr + 4 * dg * dg + 3 * db * db;
}

/**
 * Sample the outermost band and take the modal colour.
 *
 * The band is 2% of the short edge, floored at 4px: wide enough to carry a
 * useful sample on a small scan, narrow enough that a sheet filling the frame
 * still contributes mostly its own margin rather than its artwork.
 */
export function estimatePaper(raster: DecodedRaster, requested: ScanType): PaperEstimate {
  const { width, height, data } = raster;
  const band = Math.max(4, Math.round(Math.min(width, height) * 0.02));

  // 5 bits per channel — 32768 bins. Fine enough to separate cream from white,
  // coarse enough that scanner noise lands in one bin rather than smearing the
  // peak across a dozen.
  const BITS = 5;
  const SHIFT = 8 - BITS;
  const SIZE = 1 << BITS;
  const hist = new Int32Array(SIZE * SIZE * SIZE);

  const samples: number[] = [];

  const visit = (x: number, y: number): void => {
    const p = (y * width + x) * 4;
    const r = data[p]!;
    const g = data[p + 1]!;
    const b = data[p + 2]!;
    const bin = ((r >> SHIFT) << (BITS * 2)) | ((g >> SHIFT) << BITS) | (b >> SHIFT);
    hist[bin] = hist[bin]! + 1;
    samples.push(p);
  };

  for (let y = 0; y < height; y++) {
    const edgeRow = y < band || y >= height - band;
    for (let x = 0; x < width; x++) {
      if (edgeRow || x < band || x >= width - band) visit(x, y);
    }
  }

  let peak = 0;
  let peakBin = 0;
  for (let i = 0; i < hist.length; i++) {
    if (hist[i]! > peak) {
      peak = hist[i]!;
      peakBin = i;
    }
  }

  // Refine: average the real pixels that fell in the winning bin, so the result
  // is a true colour rather than the bin's centre.
  const binR = (peakBin >> (BITS * 2)) & (SIZE - 1);
  const binG = (peakBin >> BITS) & (SIZE - 1);
  const binB = peakBin & (SIZE - 1);
  let sr = 0;
  let sg = 0;
  let sb = 0;
  let n = 0;
  for (const p of samples) {
    const r = data[p]!;
    const g = data[p + 1]!;
    const b = data[p + 2]!;
    if ((r >> SHIFT) === binR && (g >> SHIFT) === binG && (b >> SHIFT) === binB) {
      sr += r;
      sg += g;
      sb += b;
      n++;
    }
  }
  const colour: [number, number, number] =
    n > 0 ? [sr / n, sg / n, sb / n] : [binR << SHIFT, binG << SHIFT, binB << SHIFT];

  // Spread: median distance of the band from that colour. Median rather than
  // mean for the same reason the mode was chosen over the mean above — a
  // sticker intruding into the band must not widen the tolerance for everything.
  const distances = new Float64Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const p = samples[i]!;
    distances[i] = Math.sqrt(
      colourDistanceSq(data[p]!, data[p + 1]!, data[p + 2]!, colour[0], colour[1], colour[2]),
    );
  }
  distances.sort();
  const spread = distances.length > 0 ? distances[distances.length >> 1]! : 0;

  /*
   * A bare-paper scan has a tight border: most of it is the same colour, so the
   * modal bin dominates and the median distance from it is small. A printed
   * art sheet's border is artwork, so neither holds.
   *
   * The threshold is deliberately generous toward `art`. Misreading paper as
   * art costs some flood reach, which the ridge barrier still bounds; misreading
   * art as paper lets the flood treat a printed field as background and eat the
   * stickers sitting on it, which is the failure that has no recovery.
   */
  const dominance = samples.length > 0 ? peak / samples.length : 0;
  const detectedType: Exclude<ScanType, "auto"> =
    dominance > 0.25 && spread < 40 ? "paper" : "art";

  return {
    colour,
    spread,
    detectedType: requested === "auto" ? detectedType : requested,
  };
}

/**
 * Pixels the flood may travel through, on colour alone.
 *
 * `tolerance` is in the same weighted-distance units as `spread`, and the two
 * are added: a noisy scan earns a proportionally looser test rather than
 * needing the caller to notice and compensate.
 */
export function backgroundLikeMask(
  raster: DecodedRaster,
  paper: PaperEstimate,
  tolerance: number,
): Uint8Array {
  const { width, height, data } = raster;
  const out = new Uint8Array(width * height);
  const [pr, pg, pb] = paper.colour;

  const limit = tolerance + paper.spread;
  const limitSq = limit * limit * 9; // weights sum to 9; keep the comparison squared

  for (let i = 0, p = 0; i < out.length; i++, p += 4) {
    out[i] =
      colourDistanceSq(data[p]!, data[p + 1]!, data[p + 2]!, pr, pg, pb) <= limitSq ? 1 : 0;
  }

  return out;
}
