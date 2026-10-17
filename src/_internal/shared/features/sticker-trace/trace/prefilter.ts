/*
 * WHY: One of the nine reference scans is halftone-screened, and its cut-line
 *      signal measured only ~3x the scan noise against 10-20x on the others.
 *      The noise there is not random — it is a printing rosette, a regular
 *      high-frequency pattern — and a ridge detector run on it finds the
 *      rosette far more enthusiastically than the cut line.
 * WHAT: Two prefilters that suppress that pattern without blurring the cut line
 *       away with it.
 *
 * 🛑 Ordering is load-bearing: the prefilter must run BEFORE quantisation. A
 * halftone rosette posterises into hundreds of speckle regions, and the colour
 * channel then contributes noise rather than signal — making the fused map
 * worse than not having the second channel at all.
 *
 * EXPORTS: toLuminance, medianFilter, bilateralFilter, applyPrefilter
 *
 * @tag domain:sticker-trace
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:ridge,quantise,segment
 * @tag sideEffects:none
 */

import type { DecodedRaster, PrefilterKind } from "../types";

/**
 * Rec. 601 luma. The ridge detector works on a single channel because the
 * emboss signature is a brightness doublet — it appears in all three channels
 * at once, so running the detector three times would triple the cost to find
 * the same edge.
 */
export function toLuminance(raster: DecodedRaster): Float32Array {
  const { width, height, data } = raster;
  const out = new Float32Array(width * height);
  for (let i = 0, p = 0; i < out.length; i++, p += 4) {
    out[i] = 0.299 * data[p]! + 0.587 * data[p + 1]! + 0.114 * data[p + 2]!;
  }
  return out;
}

/**
 * Median over a (2r+1)^2 window.
 *
 * Median rather than mean because a rosette is an impulse pattern: the mean of
 * a dot and its surround is a grey that still carries the dot's energy, while
 * the median discards it outright. The cut line survives because it is a
 * CONTINUOUS feature — more than half the window sits on it when the window is
 * centred there — which is precisely the property a median preserves and a
 * blur does not.
 */
export function medianFilter(
  src: Float32Array,
  width: number,
  height: number,
  radius: number,
): Float32Array {
  if (radius < 1) return src.slice();

  const out = new Float32Array(src.length);
  const size = (radius * 2 + 1) ** 2;
  const window = new Float32Array(size);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let n = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        const sy = Math.min(height - 1, Math.max(0, y + dy));
        for (let dx = -radius; dx <= radius; dx++) {
          const sx = Math.min(width - 1, Math.max(0, x + dx));
          window[n++] = src[sy * width + sx]!;
        }
      }
      const slice = window.subarray(0, n);
      slice.sort();
      out[y * width + x] = slice[n >> 1]!;
    }
  }

  return out;
}

/**
 * Edge-preserving smoothing: weight neighbours by both distance and intensity
 * similarity.
 *
 * This is the `precise`/`max` choice because it suppresses the rosette like a
 * blur while refusing to average across a step — and the cut line IS a step.
 * A plain Gaussian at the radius needed to kill a rosette also halves the
 * doublet amplitude, which on the ~3x scan is the whole signal.
 */
export function bilateralFilter(
  src: Float32Array,
  width: number,
  height: number,
  radius: number,
  sigmaSpace = radius,
  sigmaRange = 12,
): Float32Array {
  if (radius < 1) return src.slice();

  const out = new Float32Array(src.length);
  const spatial = new Float32Array((radius * 2 + 1) ** 2);
  const ds = 2 * sigmaSpace * sigmaSpace;
  let k = 0;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      spatial[k++] = Math.exp(-(dx * dx + dy * dy) / ds);
    }
  }

  const dr = 2 * sigmaRange * sigmaRange;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const centre = src[y * width + x]!;
      let acc = 0;
      let weight = 0;
      let w = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        const sy = Math.min(height - 1, Math.max(0, y + dy));
        for (let dx = -radius; dx <= radius; dx++) {
          const sx = Math.min(width - 1, Math.max(0, x + dx));
          const v = src[sy * width + sx]!;
          const diff = v - centre;
          const g = spatial[w++]! * Math.exp(-(diff * diff) / dr);
          acc += v * g;
          weight += g;
        }
      }
      out[y * width + x] = weight > 0 ? acc / weight : centre;
    }
  }

  return out;
}

export function applyPrefilter(
  luma: Float32Array,
  width: number,
  height: number,
  kind: PrefilterKind,
  radius: number,
): Float32Array {
  switch (kind) {
    case "median":
      return medianFilter(luma, width, height, radius);
    case "bilateral":
      return bilateralFilter(luma, width, height, radius);
    case "none":
    default:
      return luma;
  }
}
