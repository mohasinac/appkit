/*
 * WHY: A Cricut Joy 2's Print-Then-Cut area on A4 is a ~78mm column, and
 *      several stickers on a typical Beyblade sheet are wider than that. The
 *      alternatives are refusing to export them, silently scaling them — which
 *      yields stickers the wrong physical size — or splitting them.
 * WHAT: Split an oversized part into tiles with a bleed overlap, choosing the
 *       seam through the least-detailed column rather than the midpoint.
 *
 * 🛑 THIS IS A COMPROMISE AND THE UI MUST SAY SO. A seam through sticker
 * artwork is visible on the finished article. That is unavoidable, not a
 * tuning failure — and the honest alternative, which the tool also offers, is
 * to send the part to the print-shop profile where no width limit applies.
 *
 * 🛑 The seam is MEASURED from the artwork, never assumed. Splitting at the
 * midpoint lands the join wherever the midpoint happens to be — through a face,
 * through lettering — and those are exactly the places a human objects to.
 *
 * EXPORTS: TileSpec, TilePlan, planPartTiles, seamCostProfile
 *
 * @tag domain:sticker-trace
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:sticker-trace/export,PrintLayoutModal
 * @tag sideEffects:none
 */

import type { Rect } from "../types";

/** Default join allowance. Enough to butt or lap without a white line. */
export const DEFAULT_BLEED_MM = 2;

export interface TileSpec {
  /** `#03a`, `#03b`, … — the suffix an operator reads off the printed sheet. */
  label: string;
  /** This tile's slice of the part, in the part's own mm space. */
  regionMm: Rect;
  /** Where the seam sits, as a fraction of the part's split axis. */
  seamFraction: number;
}

export interface TilePlan {
  ordinal: number;
  name: string;
  /** Which axis was cut. */
  axis: "x" | "y";
  tiles: TileSpec[];
  bleedMm: number;
  /** True when even the tiles exceed the limit — the part cannot be tiled to fit. */
  stillOversized: boolean;
}

/**
 * Per-column "detail" cost, for choosing where to cut.
 *
 * Cost is the count of alpha EDGES in a column — pixels whose opacity differs
 * from their neighbour. A column through flat colour or empty space scores
 * near zero; a column through lettering or a face scores high.
 *
 * 🛑 Edges, not opacity. Summing opacity finds the EMPTIEST column, which on a
 * sticker is usually just outside the artwork — i.e. a seam that misses the
 * part entirely and splits nothing. Counting transitions finds the quietest
 * column that is still inside it.
 */
export function seamCostProfile(
  alpha: Uint8Array,
  width: number,
  height: number,
  axis: "x" | "y",
): Float32Array {
  const n = axis === "x" ? width : height;
  const cost = new Float32Array(n);

  if (axis === "x") {
    for (let x = 0; x < width; x++) {
      let edges = 0;
      for (let y = 1; y < height; y++) {
        const a = alpha[y * width + x] ?? 0;
        const b = alpha[(y - 1) * width + x] ?? 0;
        if (Math.abs(a - b) > 8) edges++;
      }
      cost[x] = edges;
    }
  } else {
    for (let y = 0; y < height; y++) {
      let edges = 0;
      for (let x = 1; x < width; x++) {
        const a = alpha[y * width + x] ?? 0;
        const b = alpha[y * width + (x - 1)] ?? 0;
        if (Math.abs(a - b) > 8) edges++;
      }
      cost[y] = edges;
    }
  }
  return cost;
}

/**
 * Pick the cheapest seam within the window the width limit allows.
 *
 * 🛑 The search window is CONSTRAINED, not the whole part. A seam must leave
 * both halves under the limit, so it can only sit between `size - limit` and
 * `limit`. Searching the whole part and then clamping is how you get a seam
 * reported at the quietest column and applied somewhere else.
 */
function cheapestSeam(cost: Float32Array, limitPx: number): number {
  const n = cost.length;
  const lo = Math.max(1, n - limitPx);
  const hi = Math.min(n - 1, limitPx);
  if (lo >= hi) return Math.floor(n / 2);

  let bestIndex = Math.floor((lo + hi) / 2);
  let bestCost = Number.POSITIVE_INFINITY;
  for (let i = lo; i <= hi; i++) {
    const c = cost[i] ?? 0;
    /*
     * Strictly-less-than keeps the FIRST cheapest column rather than the last.
     * With a flat run of equally quiet columns that puts the seam at the start
     * of the quiet region, which is stable: re-running on the same part gives
     * the same seam, so a preview an operator approved does not move.
     */
    if (c < bestCost) {
      bestCost = c;
      bestIndex = i;
    }
  }
  return bestIndex;
}

/**
 * Plan the tiles for one oversized part.
 *
 * `alpha` is the part's own mask at `maskWidth × maskHeight`; `bboxMm` is its
 * real size. Splitting runs along the part's NARROWEST axis, because that is
 * the one the width limit applies to and splitting the long axis would not help.
 */
export function planPartTiles(input: {
  ordinal: number;
  name: string;
  bboxMm: Rect;
  alpha: Uint8Array;
  maskWidth: number;
  maskHeight: number;
  limitMm: number;
  bleedMm?: number;
}): TilePlan {
  const bleed = input.bleedMm ?? DEFAULT_BLEED_MM;
  const { width: wMm, height: hMm } = input.bboxMm;

  // Split across the axis the limit actually binds.
  const axis: "x" | "y" = wMm >= hMm ? "x" : "y";
  const sizeMm = axis === "x" ? wMm : hMm;
  const maskN = axis === "x" ? input.maskWidth : input.maskHeight;

  const cost = seamCostProfile(
    input.alpha,
    input.maskWidth,
    input.maskHeight,
    axis,
  );
  const limitPx = Math.floor((input.limitMm / sizeMm) * maskN);
  const seamPx = cheapestSeam(cost, limitPx);
  const seamFraction = seamPx / maskN;
  const seamMm = seamFraction * sizeMm;

  /*
   * Each tile carries the bleed INTO its neighbour, so the two overlap rather
   * than abut. Without it the two printed pieces meet at a hairline the paper
   * shows through — the join is then visible as a white line rather than as a
   * slight doubling, and white is far more obvious.
   */
  const firstEnd = Math.min(sizeMm, seamMm + bleed);
  const secondStart = Math.max(0, seamMm - bleed);

  const tiles: TileSpec[] =
    axis === "x"
      ? [
          {
            label: `#${String(input.ordinal).padStart(2, "0")}a`,
            regionMm: { x: 0, y: 0, width: firstEnd, height: hMm },
            seamFraction,
          },
          {
            label: `#${String(input.ordinal).padStart(2, "0")}b`,
            regionMm: {
              x: secondStart,
              y: 0,
              width: sizeMm - secondStart,
              height: hMm,
            },
            seamFraction,
          },
        ]
      : [
          {
            label: `#${String(input.ordinal).padStart(2, "0")}a`,
            regionMm: { x: 0, y: 0, width: wMm, height: firstEnd },
            seamFraction,
          },
          {
            label: `#${String(input.ordinal).padStart(2, "0")}b`,
            regionMm: {
              x: 0,
              y: secondStart,
              width: wMm,
              height: sizeMm - secondStart,
            },
            seamFraction,
          },
        ];

  /*
   * 🛑 Reported, not silently re-split. A part more than twice the limit needs
   * three or more tiles, and this plans TWO — saying so is what lets the UI
   * offer the print-shop profile instead of handing over a plan that still does
   * not fit. Pretending otherwise is the scaling mistake in another costume.
   */
  const widest = Math.max(
    ...tiles.map((t) => (axis === "x" ? t.regionMm.width : t.regionMm.height)),
  );

  return {
    ordinal: input.ordinal,
    name: input.name,
    axis,
    tiles,
    bleedMm: bleed,
    stillOversized: widest > input.limitMm,
  };
}
