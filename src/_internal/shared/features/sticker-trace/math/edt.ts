/*
 * WHY: Four separate things this tracer does are the same operation underneath —
 *      morphological dilate/erode by a true disc, the bleed ring, pushing solid
 *      colour outward into that ring, and measuring a sticker's narrowest neck.
 *      All four are "distance to the nearest set pixel", so there is one exact
 *      distance transform rather than four approximations.
 * WHAT: Felzenszwalb & Huttenlocher's exact Euclidean distance transform, O(n)
 *       per row and column, plus a variant that also reports WHICH seed pixel
 *       was nearest (the de-halo pass needs the index, not the distance).
 *
 * Exact matters here. A chamfer/approximate transform is off by a few percent,
 * which is invisible on a screen and is a real error on a 0.4 mm bleed ring —
 * and it rounds corners anisotropically, so a dilated outline comes out
 * subtly faceted in a way a blade traces.
 *
 * EXPORTS: edtSquared, edt, edtWithIndices
 *
 * @tag domain:sticker-trace
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:morphology,geometry,dehalo,segment
 * @tag sideEffects:none
 */

const INF = 1e20;

/**
 * Lower envelope of parabolas along one axis.
 *
 * `f` is the squared-distance cost at each position, `d` receives the result.
 * `v` (parabola vertices) and `z` (intersection boundaries) are scratch buffers
 * owned by the caller so the 2-D driver allocates them once rather than once
 * per row — on a 3000px raster that is the difference between 3000 small
 * allocations and none.
 */
function lowerEnvelope(
  f: Float64Array,
  d: Float64Array,
  v: Int32Array,
  z: Float64Array,
  n: number,
): void {
  let k = 0;
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;

  for (let q = 1; q < n; q++) {
    // Intersection of the parabola at q with the one currently on top.
    let s = (f[q]! + q * q - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!);
    while (s <= z[k]!) {
      k--;
      s = (f[q]! + q * q - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }

  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1]! < q) k++;
    const dx = q - v[k]!;
    d[q] = dx * dx + f[v[k]!]!;
  }
}

/**
 * Squared Euclidean distance from every pixel to the nearest `true` in `mask`.
 *
 * Squared because that is what the algorithm computes natively and because
 * every caller that only needs a comparison (`is this within r?`) can compare
 * against r*r and skip ~9 million square roots on a 3000px raster.
 */
export function edtSquared(mask: Uint8Array, width: number, height: number): Float32Array {
  const out = new Float32Array(width * height);

  const maxDim = Math.max(width, height);
  const f = new Float64Array(maxDim);
  const d = new Float64Array(maxDim);
  const v = new Int32Array(maxDim);
  const z = new Float64Array(maxDim + 1);

  // Columns first.
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      f[y] = mask[y * width + x] ? 0 : INF;
    }
    lowerEnvelope(f, d, v, z, height);
    for (let y = 0; y < height; y++) {
      out[y * width + x] = d[y]!;
    }
  }

  // Then rows, over the column result.
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      f[x] = out[row + x]!;
    }
    lowerEnvelope(f, d, v, z, width);
    for (let x = 0; x < width; x++) {
      out[row + x] = d[x]!;
    }
  }

  return out;
}

/** Euclidean distance in pixels. Prefer {@link edtSquared} when comparing. */
export function edt(mask: Uint8Array, width: number, height: number): Float32Array {
  const sq = edtSquared(mask, width, height);
  for (let i = 0; i < sq.length; i++) sq[i] = Math.sqrt(sq[i]!);
  return sq;
}

export interface EdtIndices {
  /** Squared distance to the nearest seed. */
  readonly dist: Float32Array;
  /** Flat index (y * width + x) of that nearest seed. */
  readonly index: Int32Array;
}

/**
 * Distance transform that also reports the nearest seed's index.
 *
 * The de-halo pass needs this rather than the distance: it repaints the bleed
 * ring with the colour of the nearest INTERIOR pixel, so it has to know which
 * pixel that was. Tracking the argmin through both passes is why this is a
 * separate function — carrying it costs an extra Int32Array and a second
 * envelope evaluation, which the three callers that only want distance should
 * not pay.
 */
export function edtWithIndices(mask: Uint8Array, width: number, height: number): EdtIndices {
  const dist = new Float32Array(width * height);
  const index = new Int32Array(width * height);

  const maxDim = Math.max(width, height);
  const f = new Float64Array(maxDim);
  const d = new Float64Array(maxDim);
  const v = new Int32Array(maxDim);
  const z = new Float64Array(maxDim + 1);
  // Nearest source position along the axis currently being processed.
  const srcAxis = new Int32Array(maxDim);
  // The y the column pass settled on, carried into the row pass.
  const colSrcY = new Int32Array(width * height);

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      f[y] = mask[y * width + x] ? 0 : INF;
    }
    lowerEnvelope(f, d, v, z, height);

    // Re-walk the envelope to recover which vertex each position resolved to.
    let k = 0;
    for (let y = 0; y < height; y++) {
      while (z[k + 1]! < y) k++;
      srcAxis[y] = v[k]!;
    }

    for (let y = 0; y < height; y++) {
      dist[y * width + x] = d[y]!;
      colSrcY[y * width + x] = srcAxis[y]!;
    }
  }

  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      f[x] = dist[row + x]!;
    }
    lowerEnvelope(f, d, v, z, width);

    let k = 0;
    for (let x = 0; x < width; x++) {
      while (z[k + 1]! < x) k++;
      srcAxis[x] = v[k]!;
    }

    for (let x = 0; x < width; x++) {
      const srcX = srcAxis[x]!;
      dist[row + x] = d[x]!;
      // The seed is at (srcX, the y the COLUMN pass chose for srcX) — not at
      // (srcX, y). Reading the current row here is the classic way to get a
      // plausible-looking but wrong nearest-neighbour field.
      index[row + x] = colSrcY[row + srcX]! * width + srcX;
    }
  }

  return { dist, index };
}
