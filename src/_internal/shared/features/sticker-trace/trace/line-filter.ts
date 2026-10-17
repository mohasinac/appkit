/*
 * WHY: Four measured attempts at art-background sheets all failed the same
 *      way, and the reason was the primitive rather than its constants. The
 *      local-range detector in trace/ridge is an EDGE detector, and on an art
 *      sheet the strongest edges are the artwork — torch-pegases' cut line
 *      measured +22 against +-1 noise while that sheet's own lettering is far
 *      higher contrast. No threshold on an edge detector separates the two.
 * WHAT: A Hessian line filter, which asks a different question entirely.
 *
 * The distinction is geometric, not photometric:
 *
 *   a LINE (a kiss cut — a groove a few pixels wide) has a large second
 *   derivative ACROSS it, maximal exactly at its centre;
 *
 *   a STEP (an artwork boundary between two printed colours) has a second
 *   derivative with a ZERO CROSSING at the edge — large on the flanks either
 *   side, ~0 on the edge itself.
 *
 * So evaluating curvature at the feature centre keeps cuts and suppresses
 * artwork boundaries, which is exactly inverted from what amplitude does.
 * That is why this is a different detector and not a retuned one.
 *
 * EXPORTS: LineFilterResult, detectLines
 *
 * @tag domain:sticker-trace
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:segment
 * @tag sideEffects:none
 */

export interface LineFilterResult {
  /** Line-ness per pixel. Large on a groove, ~0 on a step edge or flat ink. */
  readonly response: Float32Array;
  readonly maxResponse: number;
}

/** Separable Gaussian. Scale sets which line WIDTH the filter is tuned to. */
function gaussian(
  src: Float32Array,
  width: number,
  height: number,
  sigma: number,
): Float32Array {
  const radius = Math.max(1, Math.ceil(sigma * 3));
  const k = new Float32Array(radius * 2 + 1);
  const denom = 2 * sigma * sigma;
  let sum = 0;
  for (let i = -radius; i <= radius; i++) {
    const v = Math.exp(-(i * i) / denom);
    k[i + radius] = v;
    sum += v;
  }
  for (let i = 0; i < k.length; i++) k[i] = k[i]! / sum;

  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);

  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      let acc = 0;
      for (let d = -radius; d <= radius; d++) {
        const sx = Math.min(width - 1, Math.max(0, x + d));
        acc += src[row + sx]! * k[d + radius]!;
      }
      tmp[row + x] = acc;
    }
  }
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let acc = 0;
      for (let d = -radius; d <= radius; d++) {
        const sy = Math.min(height - 1, Math.max(0, y + d));
        acc += tmp[sy * width + x]! * k[d + radius]!;
      }
      out[y * width + x] = acc;
    }
  }
  return out;
}

/**
 * Line-ness at one scale.
 *
 * The Hessian eigenvalues are ordered |l1| <= |l2|. For an ideal line l2 is
 * large and l1 ~ 0; for a blob both are large and similar; for flat ink both
 * are ~0. So `|l2| * (1 - |l1/l2|)` rewards elongation and penalises
 * blob-likeness, which is the Frangi criterion reduced to the single term that
 * matters here — the full vesselness adds exponentials whose constants would
 * be two more numbers to tune for no gain on this corpus.
 *
 * 🛑 Both polarities are kept. A kiss cut scans as a doublet — a shadow beside
 * a highlight — so along one edge of the groove the line is DARK and along the
 * other it is BRIGHT. Keeping only one sign finds half of every outline, which
 * reads as a detector that nearly works and produces open paths.
 */
function lineness(
  luma: Float32Array,
  width: number,
  height: number,
  sigma: number,
): Float32Array {
  const g = gaussian(luma, width, height, sigma);
  const out = new Float32Array(luma.length);

  // Normalise by sigma^2 so responses at different scales are comparable —
  // required for the multi-scale max below to mean anything.
  const norm = sigma * sigma;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const c = g[i]!;

      const dxx = g[i + 1]! - 2 * c + g[i - 1]!;
      const dyy = g[i + width]! - 2 * c + g[i - width]!;
      const dxy =
        (g[i + width + 1]! - g[i + width - 1]! - g[i - width + 1]! + g[i - width - 1]!) / 4;

      // Closed-form eigenvalues of [[dxx, dxy], [dxy, dyy]].
      const tr = dxx + dyy;
      const diff = dxx - dyy;
      const root = Math.sqrt(diff * diff + 4 * dxy * dxy);
      const ea = (tr + root) / 2;
      const eb = (tr - root) / 2;

      const absA = Math.abs(ea);
      const absB = Math.abs(eb);
      const l1 = Math.min(absA, absB);
      const l2 = Math.max(absA, absB);

      if (l2 < 1e-6) continue;

      out[i] = norm * l2 * (1 - l1 / l2);
    }
  }

  return out;
}

/**
 * Multi-scale line detection.
 *
 * A scan's cut lines are not all one width — resolution, paper and how hard
 * the die pressed all vary — so a single scale finds the ones it is tuned to
 * and misses the rest, producing exactly the broken outlines that make a
 * region partition collapse. Taking the per-pixel maximum across a few scales
 * is the standard answer and costs one Gaussian per scale.
 */
export function detectLines(
  luma: Float32Array,
  width: number,
  height: number,
  scales: readonly number[] = [1, 1.6, 2.4],
): LineFilterResult {
  const response = new Float32Array(luma.length);

  for (const sigma of scales) {
    const r = lineness(luma, width, height, sigma);
    for (let i = 0; i < response.length; i++) {
      if (r[i]! > response[i]!) response[i] = r[i]!;
    }
  }

  let max = 0;
  for (let i = 0; i < response.length; i++) if (response[i]! > max) max = response[i]!;

  return { response, maxResponse: max };
}
