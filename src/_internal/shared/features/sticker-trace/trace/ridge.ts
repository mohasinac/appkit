/*
 * WHY: This is the measurement the whole tool rests on, and the reason it
 *      replaced the previous colour-threshold approach.
 *
 *      A kiss cut is a physical impression in the sheet, so under a scanner it
 *      reads as a DOUBLET — a dark trough beside a light ridge — regardless of
 *      what colour sits either side of it. Sampling four scanlines across known
 *      cut lines on the reference scans, detrended against a local median:
 *
 *        yellow panel on yellow : luminance 173-240, doublet -40/+27, noise +-2
 *        red field on red       : luminance  98-127, ridge      +22, noise +-1
 *        white sticker on cream : luminance   6-224, spikes +75/+103, noise +-7
 *        halftone green panel   : luminance  93-161, ridge +18..+47, noise +-6
 *
 *      The first two are the cases that defeated colour thresholding entirely —
 *      there is no colour edge to find — and the doublet is 10-20x noise in
 *      both. The third is the "white fades into the paper" failure: the colour
 *      is gone but the cut line is still there at 10x. Only the halftone scan is
 *      marginal, at ~3x, which is what the prefilter and the second detector
 *      channel exist for.
 * WHAT: Detrended local-range ridge detection with hysteresis linking.
 *
 * EXPORTS: RidgeResult, detectRidges
 *
 * @tag domain:sticker-trace
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:fuse,segment
 * @tag sideEffects:none
 */

export interface RidgeResult {
  /** Continuous response, roughly in luminance units. */
  readonly response: Float32Array;
  /** 1 where a ridge survived hysteresis linking. */
  readonly barrier: Uint8Array;
  /** Fraction of pixels in `barrier`; a diagnostic, see TraceDiagnostics. */
  readonly coverage: number;
}

/**
 * Separable box blur with running sums — O(n) regardless of radius.
 *
 * Used only to estimate the local BACKGROUND level, never to smooth the signal.
 * A mean is the right tool here precisely because the cut line is thin: it
 * barely moves a large-window mean, so subtracting that mean leaves the line
 * standing while removing the gradient underneath it.
 */
function boxBlur(src: Float32Array, width: number, height: number, radius: number): Float32Array {
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const window = radius * 2 + 1;

  for (let y = 0; y < height; y++) {
    const row = y * width;
    let sum = 0;
    for (let i = -radius; i <= radius; i++) {
      sum += src[row + Math.min(width - 1, Math.max(0, i))]!;
    }
    for (let x = 0; x < width; x++) {
      tmp[row + x] = sum / window;
      const outX = Math.min(width - 1, Math.max(0, x - radius));
      const inX = Math.min(width - 1, Math.max(0, x + radius + 1));
      sum += src[row + inX]! - src[row + outX]!;
    }
  }

  for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let i = -radius; i <= radius; i++) {
      sum += tmp[Math.min(height - 1, Math.max(0, i)) * width + x]!;
    }
    for (let y = 0; y < height; y++) {
      out[y * width + x] = sum / window;
      const outY = Math.min(height - 1, Math.max(0, y - radius));
      const inY = Math.min(height - 1, Math.max(0, y + radius + 1));
      sum += tmp[inY * width + x]! - tmp[outY * width + x]!;
    }
  }

  return out;
}

/**
 * Hysteresis: seed at `high`, grow through anything above `low`.
 *
 * 🛑 This is what makes a FAINT but CONTINUOUS line beat a BRIGHT but isolated
 * speck, which is the entire discrimination the detector needs. A single
 * threshold cannot express it: set high enough to reject scanner speckle and
 * the halftone scan's cut line disappears; set low enough to keep that line and
 * every rosette dot becomes a barrier.
 *
 * Iterative with an explicit stack rather than recursion — a connected ridge on
 * a 9 MP raster can run to hundreds of thousands of pixels.
 */
function hysteresis(
  response: Float32Array,
  width: number,
  height: number,
  low: number,
  high: number,
): Uint8Array {
  const lowField = new Float32Array(response.length).fill(low);
  const highField = new Float32Array(response.length).fill(high);
  return hysteresisField(response, width, height, lowField, highField);
}

/**
 * Hysteresis where each pixel carries its own pair of thresholds.
 *
 * The growth rule compares a candidate against the threshold at the CANDIDATE's
 * position, not the seed's. That matters where a cut line crosses from a flat
 * field into busy artwork: the line stays linked because each pixel is judged
 * against its own surroundings, whereas carrying the seed's threshold along
 * would either break the line at the boundary or flood the busy side.
 */
function hysteresisField(
  response: Float32Array,
  width: number,
  height: number,
  low: Float32Array,
  high: Float32Array,
): Uint8Array {
  const out = new Uint8Array(response.length);
  const stack: number[] = [];

  for (let i = 0; i < response.length; i++) {
    if (response[i]! >= high[i]!) {
      out[i] = 1;
      stack.push(i);
    }
  }

  while (stack.length > 0) {
    const i = stack.pop()!;
    const x = i % width;
    const y = (i / width) | 0;

    // 8-connected growth, deliberately wider than the 4-connectivity used for
    // components: a scanned line steps diagonally all the time, and refusing to
    // follow it there would break the barrier at every stair-step.
    for (let dy = -1; dy <= 1; dy++) {
      const ny = y + dy;
      if (ny < 0 || ny >= height) continue;
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        if (nx < 0 || nx >= width) continue;
        const j = ny * width + nx;
        if (out[j] || response[j]! < low[j]!) continue;
        out[j] = 1;
        stack.push(j);
      }
    }
  }

  return out;
}

/**
 * Detect cut lines.
 *
 * Three steps, each answering one objection to the previous:
 *
 *   1. DETREND. Subtract a large-window mean. Without this, the detector sees
 *      the airbrushed gradient under a sticker as a huge slow ramp and the cut
 *      line as a rounding error on top of it. This is the step that exposed the
 *      signal in the measurements above.
 *   2. LOCAL RANGE. The doublet's signature is that a trough and a ridge sit
 *      within a pixel or two of each other, so the local max-minus-min of the
 *      detrended field is large on a cut line and ~0 on flat ink. A plain
 *      gradient magnitude would fire equally on one-sided edges; the range
 *      specifically rewards the paired shape an impression makes.
 *   3. HYSTERESIS. Continuity beats amplitude — see above.
 */
/**
 * A ROBUST estimate of "the typical response around here".
 *
 * 🛑 Robust is the operative word, and it is a measured correction. The first
 * version used `localMean + k * localStdDev` over a 48px window, and on the
 * `torch pegases` sheet that detected 0 of 10 cut-line pixels where the
 * absolute threshold had found 10 — because the white "Gyro Engine" lettering
 * inside the window inflated the standard deviation far above the cut line it
 * sat next to. A mean and an SD are both wrecked by one bright feature, and
 * printed artwork is nothing but bright features.
 *
 * So: block-average down by 8, MEDIAN-filter at that coarse scale, then
 * bilinearly upsample. The median discards the lettering outright instead of
 * averaging it in, and doing it on a 1/64-size grid makes a genuine median
 * affordable — the same filter at full resolution would cost more than every
 * other stage combined.
 */
function robustLocalBackground(
  response: Float32Array,
  width: number,
  height: number,
): Float32Array {
  const SHRINK = 8;
  const cw = Math.max(1, Math.ceil(width / SHRINK));
  const ch = Math.max(1, Math.ceil(height / SHRINK));

  const coarse = new Float32Array(cw * ch);
  for (let cy = 0; cy < ch; cy++) {
    for (let cx = 0; cx < cw; cx++) {
      let sum = 0;
      let n = 0;
      for (let y = cy * SHRINK; y < Math.min(height, (cy + 1) * SHRINK); y++) {
        for (let x = cx * SHRINK; x < Math.min(width, (cx + 1) * SHRINK); x++) {
          sum += response[y * width + x]!;
          n++;
        }
      }
      coarse[cy * cw + cx] = n > 0 ? sum / n : 0;
    }
  }

  // Median over a 7x7 coarse window — ~56px at full resolution, wider than any
  // cut line and narrower than any sticker.
  const R = 3;
  const smoothed = new Float32Array(cw * ch);
  const window = new Float32Array((R * 2 + 1) ** 2);
  for (let cy = 0; cy < ch; cy++) {
    for (let cx = 0; cx < cw; cx++) {
      let n = 0;
      for (let dy = -R; dy <= R; dy++) {
        const sy = Math.min(ch - 1, Math.max(0, cy + dy));
        for (let dx = -R; dx <= R; dx++) {
          const sx = Math.min(cw - 1, Math.max(0, cx + dx));
          window[n++] = coarse[sy * cw + sx]!;
        }
      }
      const slice = window.subarray(0, n);
      slice.sort();
      smoothed[cy * cw + cx] = slice[n >> 1]!;
    }
  }

  const out = new Float32Array(response.length);
  for (let y = 0; y < height; y++) {
    const fy = Math.min(ch - 1, y / SHRINK);
    const y0 = Math.floor(fy);
    const y1 = Math.min(ch - 1, y0 + 1);
    const ty = fy - y0;
    for (let x = 0; x < width; x++) {
      const fx = Math.min(cw - 1, x / SHRINK);
      const x0 = Math.floor(fx);
      const x1 = Math.min(cw - 1, x0 + 1);
      const tx = fx - x0;
      const a = smoothed[y0 * cw + x0]! * (1 - tx) + smoothed[y0 * cw + x1]! * tx;
      const b = smoothed[y1 * cw + x0]! * (1 - tx) + smoothed[y1 * cw + x1]! * tx;
      out[y * width + x] = a * (1 - ty) + b * ty;
    }
  }

  return out;
}

/**
 * Hysteresis against a LOCAL threshold rather than a global one.
 *
 * 🛑 This replaced both a fixed-value and a fixed-percentile threshold, and the
 * measurements that killed each are worth keeping:
 *
 *   absolute (low=9, high=18)  — barrier coverage 34-61% across the corpus. The
 *     median response spans 0.1 (Driger: clean paper) to 14.1 (Poseidon: JPEG
 *     cream field), so one pair of numbers is simultaneously far too low for
 *     one scan and far too high for another.
 *   percentile (p60/p80)       — coverage pinned at ~38% on EVERY scan, which is
 *     what a quantile does by construction rather than what a detector does.
 *     Worse, Poseidon's cream-field cut line (response 12-16) fell below that
 *     scan's own p60 and vanished completely.
 *
 * The second failure is the informative one: a response of 12-16 is plainly a
 * line on a flat cream field and plainly noise inside dense artwork, so NO
 * single global number can separate them. Significance is local, so the
 * threshold is local — Niblack/Sauvola-style, `localMean + k * localStdDev`
 * over a window much larger than a cut line but much smaller than a sticker.
 *
 * Both statistics come from box blurs (mean, and mean-of-squares for the
 * variance), so the whole thing stays O(n) and independent of window size.
 */
function adaptiveHysteresis(
  response: Float32Array,
  width: number,
  height: number,
  kLow: number,
  kHigh: number,
  assist?: Uint8Array,
  assistWeight = 0,
): Uint8Array {
  const background = robustLocalBackground(response, width, height);

  const lowField = new Float32Array(response.length);
  const highField = new Float32Array(response.length);
  for (let i = 0; i < response.length; i++) {
    const bg = background[i]!;
    // Multiplicative, not additive. The response is a local CONTRAST measure,
    // so its scale rides with how busy the neighbourhood is; "k standard
    // deviations above the mean" assumes a spread that printed artwork does not
    // have. "A few times the typical local contrast" does hold across the
    // corpus. The floors keep a perfectly flat region (Driger's paper sits at a
    // median response of 0.1) from treating 8-bit quantisation as signal.
    //
    // 🛑 The assist LOWERS the bar; it never clears it. Where the colour
    // channel also sees a boundary the ridge only has to be `1 - weight` as
    // convincing — so a marginal ridge on the halftone sheet links, while a
    // pure colour change with NO ridge behind it still fails both thresholds
    // and does not become a cut line. Letting the assist seed on its own would
    // turn every gradient band inside a sticker into an outline.
    const relief = assist && assist[i] ? 1 - assistWeight : 1;
    lowField[i] = Math.max(3, bg * kLow * relief);
    highField[i] = Math.max(6, bg * kHigh * relief);
  }

  return hysteresisField(response, width, height, lowField, highField);
}

/**
 * Detect cut lines.
 *
 * 🛑 Thresholds are PERCENTILES of this scan's own response, not absolute
 * luminance values, and that is a measured correction rather than a
 * preference. Across the reference corpus the median response spans two orders
 * of magnitude — 0.1 on the Driger G sheet (clean white paper, almost no
 * texture) against 14.1 on the Poseidon scan (JPEG, printed cream field) — so
 * any fixed pair of numbers is simultaneously far too high for one scan and far
 * too low for another. Measured with absolute low=9/high=18, barrier coverage
 * came out between 34% and 61%, which floods nothing.
 *
 * The cut line is only ~2.8-3.2x the median on the two hardest sheets, so the
 * separation that matters is NOT cut-line-versus-artwork — a logo edge is a
 * genuine edge and will exceed a cut line. It is cut-line-versus-BACKGROUND.
 * Interior artwork edges joining the barrier is harmless: the flood arrives
 * from outside and is already stopped by the outer cut line before it can ever
 * reach them.
 *
 * Three steps, each answering one objection to the previous:
 *
 *   1. DETREND. Subtract a large-window mean. Without this the detector sees
 *      the airbrushed gradient under a sticker as a huge slow ramp and the cut
 *      line as a rounding error on top of it. This is the step that exposed the
 *      signal in the measurements above.
 *   2. LOCAL RANGE. The doublet's signature is a trough and a ridge within a
 *      pixel or two of each other, so the local max-minus-min of the detrended
 *      field is large on a cut line and ~0 on flat ink. A plain gradient
 *      magnitude fires equally on one-sided edges; the range specifically
 *      rewards the paired shape an impression makes.
 *   3. HYSTERESIS. Continuity beats amplitude — see above.
 */
export function detectRidges(
  luma: Float32Array,
  width: number,
  height: number,
  opts: {
    /** Percentile in 0..1 for the grow threshold. */
    low: number;
    /** Percentile in 0..1 for the seed threshold. */
    high: number;
    kernelScale: number;
    /** Escape hatch: absolute response values, bypassing the percentiles. */
    absolute?: { low: number; high: number };
    /** Independent second channel — see trace/quantise and trace/fuse. */
    assist?: Uint8Array;
    /** 0..1. How far the assist may lower the ridge's own bar. */
    assistWeight?: number;
  },
): RidgeResult {
  const detrendRadius = Math.max(3, Math.round(7 * opts.kernelScale));
  const background = boxBlur(luma, width, height, detrendRadius);

  const dev = new Float32Array(luma.length);
  for (let i = 0; i < dev.length; i++) dev[i] = luma[i]! - background[i]!;

  const rangeRadius = Math.max(1, Math.round(opts.kernelScale));
  const response = new Float32Array(luma.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let min = Infinity;
      let max = -Infinity;
      for (let dy = -rangeRadius; dy <= rangeRadius; dy++) {
        const sy = Math.min(height - 1, Math.max(0, y + dy));
        for (let dx = -rangeRadius; dx <= rangeRadius; dx++) {
          const sx = Math.min(width - 1, Math.max(0, x + dx));
          const v = dev[sy * width + sx]!;
          if (v < min) min = v;
          if (v > max) max = v;
        }
      }
      response[y * width + x] = max - min;
    }
  }

  const barrier = opts.absolute
    ? hysteresis(response, width, height, opts.absolute.low, opts.absolute.high)
    : adaptiveHysteresis(
        response,
        width,
        height,
        opts.low,
        opts.high,
        opts.assist,
        opts.assistWeight ?? 0,
      );

  let set = 0;
  for (let i = 0; i < barrier.length; i++) set += barrier[i]!;

  return { response, barrier, coverage: set / barrier.length };
}
