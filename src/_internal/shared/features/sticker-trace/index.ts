/*
 * WHY: One entry point, so the browser's live-tuning loop and the Firebase
 *      Function's full-resolution render provably run the same algorithm rather
 *      than two implementations that agree today (CLAUDE.md Root Cause #59/#73).
 * WHAT: `traceStickerSheet(raster, params)` — synchronous, codec-free, pure.
 *
 * It takes decoded pixels and returns geometry. It never decodes, never
 * resizes, never writes, and never touches a file: the memory cap lives in the
 * codec's `decode`, so by the time anything here runs the raster is already
 * bounded. That is what keeps a 34 MP scan from becoming a 136 MB Float32Array
 * inside the maths.
 *
 * EXPORTS: traceStickerSheet
 *
 * @tag domain:sticker-trace
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:run,canvas-codec,probe-sticker-trace
 * @tag sideEffects:none
 */

import { TIER_PRESETS } from "./config";
import { clusterParts } from "./trace/cluster";
import { buildPartGeometry } from "./trace/geometry";
import { segmentSheet } from "./trace/segment";
import type { DecodedRaster, PartGeometry, TraceParams, TraceResult } from "./types";

export function traceStickerSheet(
  raster: DecodedRaster,
  params: TraceParams,
  sourceWidth?: number,
): TraceResult {
  const pxPerMm = raster.dpi ? raster.dpi / 25.4 : null;
  const subPixel = TIER_PRESETS[params.tier].subPixelContours;

  const segmented = segmentSheet(raster, params);

  const geometry: PartGeometry[] = [];
  let ordinal = 1;

  for (const stat of segmented.parts) {
    if (geometry.length >= params.maxParts) break;

    const part = buildPartGeometry(
      segmented.labels,
      raster.width,
      raster.height,
      stat,
      ordinal,
      params,
      pxPerMm,
      subPixel,
    );

    // A component whose contour would not close is DROPPED rather than emitted
    // open. An open cut path is a sticker the machine slices most of the way
    // around and leaves attached — worse than one it never cut at all, because
    // the sheet is now damaged.
    if (part) {
      geometry.push(part);
      ordinal++;
    }
  }

  const { clusters, assigned } = clusterParts(geometry, pxPerMm, params.clusterGapMm);

  return {
    parts: assigned,
    clusters,
    diagnostics: segmented.diagnostics,
    pxPerMm,
    /*
     * The scale a caller multiplies this geometry by to reach the SOURCE image.
     * Carrying vectors rather than masks is what makes that multiplication
     * exact — a mask would have to be upsampled, and an upsampled mask has
     * stair-steps the blade would trace.
     */
    sourceScale: sourceWidth && raster.width > 0 ? sourceWidth / raster.width : 1,
  };
}
