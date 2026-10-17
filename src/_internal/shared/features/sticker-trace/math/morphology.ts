/*
 * WHY: The old Python tracer used scipy's structuring elements, and the two
 *      operations that mattered most — the bleed offset and the curvature
 *      smoothing — were both documented there as needing a TRUE disc rather
 *      than a square kernel, because a blade rounds convex corners the way a
 *      circle does and not the way a 3x3 box does.
 * WHAT: Morphology expressed as distance-transform thresholds, which gives an
 *       exact disc of any radius at no extra cost and in O(n) regardless of
 *       radius — a separable box kernel cannot do the first and a naive disc
 *       kernel cannot do the second.
 *
 * The identity this file rests on: dilate(mask, r) is exactly "every pixel
 * within r of a set pixel", i.e. edt(¬mask) <= r. Erosion is the dual on the
 * complement. Open and close are then the usual compositions, and because the
 * radius never enters a loop bound, a 20px disc costs the same as a 2px one.
 *
 * EXPORTS: dilate, erode, open, close, curvatureSmooth, minFeatureRadius
 *
 * @tag domain:sticker-trace
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:segment,geometry,ridge,flood
 * @tag sideEffects:none
 */

import { edtSquared } from "./edt";

function invert(mask: Uint8Array): Uint8Array {
  const out = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) out[i] = mask[i] ? 0 : 1;
  return out;
}

/** Outward offset by a true Euclidean radius, in pixels. */
export function dilate(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  if (radius <= 0) return mask.slice();
  const dist = edtSquared(mask, width, height);
  const r2 = radius * radius;
  const out = new Uint8Array(mask.length);
  for (let i = 0; i < out.length; i++) out[i] = dist[i]! <= r2 ? 1 : 0;
  return out;
}

/**
 * Inward offset. Note this erodes against the mask's complement, so pixels
 * outside the raster count as background — a component touching the edge
 * erodes inward from that edge too, which is what the de-halo pass wants.
 */
export function erode(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  if (radius <= 0) return mask.slice();
  const dist = edtSquared(invert(mask), width, height);
  const r2 = radius * radius;
  const out = new Uint8Array(mask.length);
  for (let i = 0; i < out.length; i++) out[i] = dist[i]! > r2 ? 1 : 0;
  return out;
}

/** Erode then dilate — removes speckle smaller than the disc. */
export function open(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  if (radius <= 0) return mask.slice();
  return dilate(erode(mask, width, height, radius), width, height, radius);
}

/**
 * Dilate then erode — bridges channels narrower than 2*radius.
 *
 * This is how a sticker that thresholding split in two is rejoined: a white
 * band reaching the sticker's outer edge is not an enclosed hole, so no
 * hole-filling can recover it, and the sticker would otherwise arrive as two
 * components with two cut paths. The radius must sit between the widest
 * intra-sticker band and the narrowest real gap between neighbours — measure
 * both before changing it.
 */
export function close(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  if (radius <= 0) return mask.slice();
  return erode(dilate(mask, width, height, radius), width, height, radius);
}

/**
 * Curvature-smooth a silhouette.
 *
 * A scan rings at every ink/paper boundary, and thresholding that gradient
 * freezes the ringing into the mask as comb teeth a few tenths of a millimetre
 * deep. A blade traces every one of them.
 *
 * 🛑 This is NOT an open/close pair at the same radius, and the difference is
 * the point. Blurring then re-thresholding at 0.5 is a curvature flow: it
 * erases high-frequency teeth while leaving the edge where it was. An
 * open/close pair at the same radius rounds REAL corners much harder for the
 * same despeckling — on these sheets that visibly blunts the points of every
 * claw-shaped sticker.
 */
export function curvatureSmooth(
  mask: Uint8Array,
  width: number,
  height: number,
  radius: number,
): Uint8Array {
  if (radius < 0.5) return mask.slice();

  const pre = open(mask, width, height, radius * 0.5);
  const blurred = gaussianBlur(pre, width, height, radius);

  const out = new Uint8Array(mask.length);
  for (let i = 0; i < out.length; i++) out[i] = blurred[i]! >= 0.5 ? 1 : 0;
  return out;
}

/**
 * Separable Gaussian over a binary mask, returning floats in 0..1.
 *
 * Separable because a 2-D kernel at radius 6 is 169 multiplies per pixel
 * against 26 for two 1-D passes, and on a 9 MP raster that is the difference
 * between a noticeable pause and none.
 */
function gaussianBlur(
  mask: Uint8Array,
  width: number,
  height: number,
  sigma: number,
): Float32Array {
  const radius = Math.max(1, Math.ceil(sigma * 3));
  const kernel = new Float32Array(radius * 2 + 1);
  const denom = 2 * sigma * sigma;
  let sum = 0;
  for (let i = -radius; i <= radius; i++) {
    const v = Math.exp(-(i * i) / denom);
    kernel[i + radius] = v;
    sum += v;
  }
  for (let i = 0; i < kernel.length; i++) kernel[i] = kernel[i]! / sum;

  const tmp = new Float32Array(width * height);
  const out = new Float32Array(width * height);

  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      let acc = 0;
      for (let k = -radius; k <= radius; k++) {
        // Clamp at the edge rather than wrapping or zero-padding: zero-padding
        // pulls the silhouette inward at the raster border, which on a scan
        // whose sheet runs to the edge would shave the outermost stickers.
        const sx = Math.min(width - 1, Math.max(0, x + k));
        acc += mask[row + sx]! * kernel[k + radius]!;
      }
      tmp[row + x] = acc;
    }
  }

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let acc = 0;
      for (let k = -radius; k <= radius; k++) {
        const sy = Math.min(height - 1, Math.max(0, y + k));
        acc += tmp[sy * width + x]! * kernel[k + radius]!;
      }
      out[y * width + x] = acc;
    }
  }

  return out;
}

/**
 * The radius of the largest disc that fits inside the component — i.e. half its
 * narrowest neck.
 *
 * Cricut's minimum reliable detail is 0.25in; a part whose neck is below that
 * tears rather than cuts. Measuring it is one EDT over the component mask and
 * a max, so it is cheap enough to report for every part rather than only on
 * request.
 */
export function minFeatureRadius(mask: Uint8Array, width: number, height: number): number {
  const dist = edtSquared(invert(mask), width, height);
  let max = 0;
  for (let i = 0; i < dist.length; i++) {
    if (mask[i] && dist[i]! > max) max = dist[i]!;
  }
  return Math.sqrt(max);
}
