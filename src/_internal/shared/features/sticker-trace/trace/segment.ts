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
import { backgroundLikeMask, estimatePaper } from "./paper";
import { floodFromBorder } from "./flood";
import { applyPrefilter, toLuminance } from "./prefilter";
import { quantiseBoundaries } from "./quantise";
import { detectRidges } from "./ridge";

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
   * On an `art` sheet there is no paper to match, so a colour test would admit
   * nothing and the flood would never start. Treating every non-barrier pixel
   * as passable is correct there: the cut lines alone decide what is enclosed,
   * which is exactly what an art-background sheet offers.
   */
  const backgroundLike =
    paper.detectedType === "art"
      ? new Uint8Array(width * height).fill(1)
      : backgroundLikeMask(raster, paper, params.paperTolerance);

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

  const beforeBridge = labelComponents(mask, width, height).count;
  if (params.bridgeMm > 0) {
    mask = close(mask, width, height, pxPerMm ? params.bridgeMm * pxPerMm : 2);
  }
  const labelled = labelComponents(mask, width, height);

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
      bridgedComponents: Math.max(0, beforeBridge - labelled.count),
    },
  };
}
