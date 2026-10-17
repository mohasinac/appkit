/*
 * WHY: The pipeline from pixels to "here are the N stickers" has to be ONE
 *      ordered sequence, because several of its steps are only correct in a
 *      particular order and each ordering mistake fails silently.
 * WHAT: paper -> prefilter -> quantise -> ridge(+assist) -> flood -> clean ->
 *       label -> filter.
 *
 * 🛑 Fusion is implemented as the ridge detector's `assist` parameter rather
 * than a separate `fuse` stage. A standalone module would have had to
 * re-derive the ridge's own local-background field to know what "lower the
 * bar" means, and two copies of that estimate is the drift this codebase keeps
 * paying for (Root Cause #42/#75). The POLICY is documented at the assist
 * branch in trace/ridge; this file only decides whether to supply it.
 *
 * EXPORTS: SegmentResult, segmentSheet
 *
 * @tag domain:sticker-trace
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:index,geometry,cluster
 * @tag sideEffects:none
 */

import { labelComponents, type ComponentStats } from "../math/label";
import { close, curvatureSmooth } from "../math/morphology";
import type { DecodedRaster, TraceDiagnostics, TraceParams } from "../types";
import type { Rect } from "../types";
import { backgroundLikeMask, estimatePaper } from "./paper";
import { sameMaterialScore } from "./cross-profile";
import { floodFromBorder } from "./flood";
import { mergeWeakBoundaries } from "./merge";
import { applyPrefilter, toLuminance } from "./prefilter";
import { quantiseBoundaries } from "./quantise";
import { detectRidges } from "./ridge";

/**
 * Re-derive per-component stats after a merge.
 *
 * The merge renumbers labels but cannot cheaply maintain areas and boxes — two
 * merged regions' boxes are not the union of their stats unless you track it,
 * and tracking it through union-find is more code than one more linear pass
 * over a buffer already in cache.
 */
function recomputeStats(
  labels: Int32Array,
  count: number,
  width: number,
  height: number,
): { labels: Int32Array; count: number; stats: ComponentStats[] } {
  const area = new Int32Array(count + 1);
  const minX = new Int32Array(count + 1).fill(width);
  const minY = new Int32Array(count + 1).fill(height);
  const maxX = new Int32Array(count + 1).fill(-1);
  const maxY = new Int32Array(count + 1).fill(-1);
  const border = new Uint8Array(count + 1);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const l = labels[y * width + x]!;
      if (l === 0) continue;
      area[l] = area[l]! + 1;
      if (x < minX[l]!) minX[l] = x;
      if (y < minY[l]!) minY[l] = y;
      if (x > maxX[l]!) maxX[l] = x;
      if (y > maxY[l]!) maxY[l] = y;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) border[l] = 1;
    }
  }

  const stats: ComponentStats[] = [];
  for (let l = 1; l <= count; l++) {
    if (area[l] === 0) continue;
    const bbox: Rect = {
      x: minX[l]!,
      y: minY[l]!,
      width: maxX[l]! - minX[l]! + 1,
      height: maxY[l]! - minY[l]! + 1,
    };
    stats.push({ label: l, area: area[l]!, bbox, touchesBorder: border[l] === 1 });
  }

  return { labels, count, stats };
}

export interface SegmentResult {
  /** Per-pixel component id; 0 is background. */
  readonly labels: Int32Array;
  /** Surviving components, in label order. */
  readonly parts: readonly ComponentStats[];
  readonly diagnostics: TraceDiagnostics;
}

/**
 * A component covering more than this fraction of the raster is the SHEET, not
 * a sticker — it means the flood never got in, usually because the barrier
 * sealed the border or the scan has no background at all.
 *
 * Dropping it is right, and reporting it is what makes the failure legible:
 * without the count in diagnostics, "the flood failed" and "this sheet has no
 * stickers" look identical downstream.
 */
const MAX_PART_FRACTION = 0.6;

export function segmentSheet(raster: DecodedRaster, params: TraceParams): SegmentResult {
  const { width, height } = raster;
  const pxPerMm = raster.dpi ? raster.dpi / 25.4 : null;

  const paper = estimatePaper(raster, params.scanType);

  const luma = toLuminance(raster);
  const filtered = applyPrefilter(
    luma,
    width,
    height,
    params.prefilter,
    params.prefilterRadius,
  );

  // Quantisation reads the PREFILTERED-era raster conceptually, but operates on
  // colour, so it takes the original pixels. The ordering that matters is that
  // the prefilter has already decided how much halftone survives into the
  // luminance channel the ridge reads; the colour channel is independent and
  // posterises the sheet's real flat regions either way.
  const quant = params.quantiseEnabled
    ? quantiseBoundaries(raster, params.quantiseColours)
    : null;

  const ridge = detectRidges(filtered, width, height, {
    low: params.ridgeHysteresisLow,
    high: params.ridgeHysteresisHigh,
    kernelScale: params.ridgeKernelScale,
    ...(quant ? { assist: quant.boundary, assistWeight: params.quantiseWeight } : {}),
  });

  /*
   * 🛑 TWO SEGMENTATION MODELS, and the choice is not a tuning preference.
   *
   * A PAPER sheet has real background: the flood starts outside every sticker
   * and anything it cannot reach is a sticker. Interior artwork edges are
   * harmless because the outer cut line stops the flood long before it reaches
   * them.
   *
   * An ART sheet has none. The printed field runs to the raster edge, so the
   * flood starts INSIDE the artwork, gets trapped in every pocket the artwork's
   * own edges enclose, and emits each pocket as a part. Measured: 209 parts
   * against ~12 real on torch-pegases, and a threshold sweep down to 1.0%
   * barrier coverage still gave 36 — monotonic, no minimum. The model is wrong
   * there, not the constants.
   *
   * So an art sheet is segmented by partitioning on the cut lines and then
   * merging back across the weak ones. See trace/merge.
   */
  let labelled: ReturnType<typeof labelComponents>;
  let beforeBridge: number;
  let merges = 0;
  let sameMaterialDropped = 0;

  if (paper.detectedType === "art") {
    // Keep only the barrier pixels whose two sides are the same material —
    // i.e. a groove, not a boundary between two printed colours. On this
    // corpus that is what separates a cut from the artwork; amplitude is not.
    const material = sameMaterialScore(
      raster,
      ridge.barrier,
      filtered,
      params.paperTolerance * 2,
    );
    sameMaterialDropped = Math.round(material.meanScore * 1000);

    const open = new Uint8Array(width * height);
    for (let i = 0; i < open.length; i++) open[i] = ridge.barrier[i] ? 0 : 1;

    const regions = labelComponents(open, width, height);
    beforeBridge = regions.count;

    const merged = mergeWeakBoundaries(
      regions.labels,
      regions.count,
      material.score,
      width,
      height,
      params.mergeStrengthFactor,
    );
    merges = merged.mergesApplied;

    labelled = recomputeStats(merged.labels, merged.regionCount, width, height);
  } else {
    const backgroundLike = backgroundLikeMask(raster, paper, params.paperTolerance);
    const flood = floodFromBorder(
      backgroundLike,
      ridge.barrier,
      width,
      height,
      params.seedBandPx,
    );

    // Clean in this order: smooth the silhouette first so the bridge closing is
    // not fighting comb teeth, then bridge. Reversing them bridges the teeth to
    // each other and fuses neighbours.
    let mask = curvatureSmooth(
      flood.inside,
      width,
      height,
      pxPerMm ? params.smoothMm * pxPerMm : 1,
    );

    beforeBridge = labelComponents(mask, width, height).count;
    if (params.bridgeMm > 0) {
      mask = close(mask, width, height, pxPerMm ? params.bridgeMm * pxPerMm : 2);
    }
    labelled = labelComponents(mask, width, height);
  }

  const minAreaPx = pxPerMm
    ? Math.max(16, params.minPartAreaMm2 * pxPerMm * pxPerMm)
    : // No DPI: fall back to a fraction of the raster so the filter still
      // removes speckle rather than being disabled entirely.
      Math.max(16, width * height * 0.00002);

  const maxAreaPx = width * height * MAX_PART_FRACTION;

  let droppedSmall = 0;
  let droppedSheet = 0;
  const parts: ComponentStats[] = [];

  for (const stat of labelled.stats) {
    if (stat.area > maxAreaPx) {
      droppedSheet++;
      continue;
    }
    if (stat.area < minAreaPx) {
      droppedSmall++;
      continue;
    }
    parts.push(stat);
  }

  // Largest first, so ordinal 1 is the most prominent sticker rather than
  // whichever happened to be scanned top-left. A human renaming parts works
  // down a list; starting with a 4mm registration dot reads as broken.
  parts.sort((a, b) => b.area - a.area);

  return {
    labels: labelled.labels,
    parts,
    diagnostics: {
      workingSize: { x: 0, y: 0, width, height },
      paperColour: paper.detectedType === "paper" ? paper.colour : null,
      ridgeCoverage: ridge.coverage,
      quantiseCoverage: quant?.coverage ?? 0,
      fusedCoverage: ridge.coverage,
      componentsFound: labelled.count,
      droppedBelowMinArea: droppedSmall,
      droppedTouchingBorder: droppedSheet,
      bridgedComponents: merges || Math.max(0, beforeBridge - labelled.count),
      artBackgroundUnsupported: paper.detectedType === "art",
    },
  };
}
