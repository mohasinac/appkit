/*
 * WHY: A labelled component is a bag of pixels; a cutter needs one closed
 *      curve. This is the conversion, and it is also where every millimetre
 *      figure is either computed honestly or withheld.
 * WHAT: Per component — isolate, offset by the cut border, trace, simplify,
 *       fit cubics, and measure.
 *
 * Each component is processed inside its own PADDED bounding box rather than
 * over the whole raster. On a 9 MP sheet with sixty stickers the full-raster
 * form would allocate sixty 9 MP masks; this allocates sixty small ones. The
 * padding exists because the border offset and the contour both need room to
 * step outside the component, and a contour clipped by the box edge is an open
 * path — which is a cut the machine starts and never finishes.
 *
 * EXPORTS: buildPartGeometry
 *
 * @tag domain:sticker-trace
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:index
 * @tag sideEffects:none
 */

import { catmullRomToBezier } from "../math/catmull-rom";
import type { ComponentStats } from "../math/label";
import { traceContours } from "../math/marching-squares";
import { dilate, minFeatureRadius } from "../math/morphology";
import { simplifyRdp } from "../math/rdp";
import type { PartGeometry, Point, Rect, TraceParams } from "../types";

/**
 * Extract one component into its own buffer, padded on every side.
 *
 * Padding must exceed the border offset, or the dilation runs into the box
 * wall and the outline comes back with a flat edge where the sticker is
 * actually round.
 */
function isolate(
  labels: Int32Array,
  width: number,
  height: number,
  label: number,
  bbox: Rect,
  pad: number,
): { mask: Uint8Array; w: number; h: number; originX: number; originY: number } {
  const x0 = Math.max(0, bbox.x - pad);
  const y0 = Math.max(0, bbox.y - pad);
  const x1 = Math.min(width, bbox.x + bbox.width + pad);
  const y1 = Math.min(height, bbox.y + bbox.height + pad);

  const w = x1 - x0;
  const h = y1 - y0;
  const mask = new Uint8Array(w * h);

  for (let y = 0; y < h; y++) {
    const src = (y0 + y) * width + x0;
    const dst = y * w;
    for (let x = 0; x < w; x++) {
      if (labels[src + x] === label) mask[dst + x] = 1;
    }
  }

  return { mask, w, h, originX: x0, originY: y0 };
}

export function buildPartGeometry(
  labels: Int32Array,
  width: number,
  height: number,
  stat: ComponentStats,
  ordinal: number,
  params: TraceParams,
  pxPerMm: number | null,
  subPixel: boolean,
): PartGeometry | null {
  const borderPx = pxPerMm ? params.borderMm * pxPerMm : 0;
  const pad = Math.max(3, Math.ceil(borderPx) + 3);

  const { mask, w, h, originX, originY } = isolate(
    labels,
    width,
    height,
    stat.label,
    stat.bbox,
    pad,
  );

  // The CUT outline, which is the silhouette offset outward by the white
  // border the sticker is meant to carry. With borderMm at 0 this is the
  // silhouette itself — cut exactly on the art edge.
  const cutMask = borderPx > 0 ? dilate(mask, w, h, borderPx) : mask;

  /*
   * Sub-pixel tracing needs a CONTINUOUS field to interpolate; on a binary mask
   * every crossing lands at the midpoint and the "sub-pixel" tier buys nothing.
   * A light blur is what makes the iso-crossing meaningful — which is why the
   * precise/max tiers blur before tracing rather than tracing harder.
   */
  const field = subPixel ? softenForSubPixel(cutMask, w, h) : cutMask;

  const rings = traceContours(field, w, h, 0.5);
  if (rings.length === 0) return null;

  // Outer boundary only. A kiss-cut sheet never cuts interior holes — doing so
  // would drop the middle out of every ring-shaped sticker — so the largest
  // ring by absolute area is the one and only path.
  let outer = rings[0]!;
  for (const ring of rings) {
    if (Math.abs(ring.signedArea) > Math.abs(outer.signedArea)) outer = ring;
  }
  if (!outer.closed || outer.points.length < 8) return null;

  const simplifyPx = pxPerMm ? params.simplifyMm * pxPerMm : 0.6;
  const simplified = simplifyRdp(outer.points, simplifyPx);

  // Translate back into raster coordinates before fitting, so the emitted path
  // is in the same space as everything else and no consumer has to know this
  // function worked in a local box.
  const absolute: Point[] = simplified.map((p) => ({
    x: p.x + originX,
    y: p.y + originY,
  }));

  const path = catmullRomToBezier(absolute);
  if (!path) return null;

  const featurePx = minFeatureRadius(cutMask, w, h) * 2;

  const bboxPx: Rect = stat.bbox;

  return {
    ordinal,
    groupIndex: 0,
    bboxPx,
    areaPx: stat.area,
    bboxMm: pxPerMm
      ? {
          x: bboxPx.x / pxPerMm,
          y: bboxPx.y / pxPerMm,
          width: bboxPx.width / pxPerMm,
          height: bboxPx.height / pxPerMm,
        }
      : null,
    areaMm2: pxPerMm ? stat.area / (pxPerMm * pxPerMm) : null,
    minFeatureMm: pxPerMm ? featurePx / pxPerMm : null,
    path,
  };
}

/**
 * A 3x3 binary-average, turning a hard mask into a field whose 0.5 crossing
 * sits between pixels rather than on one. Deliberately tiny: a wider kernel
 * would start moving the edge rather than merely locating it more precisely.
 */
function softenForSubPixel(mask: Uint8Array, width: number, height: number): Float32Array {
  const out = new Float32Array(mask.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const sy = y + dy;
        if (sy < 0 || sy >= height) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const sx = x + dx;
          if (sx < 0 || sx >= width) continue;
          sum += mask[sy * width + sx]!;
          n++;
        }
      }
      out[y * width + x] = n > 0 ? sum / n : 0;
    }
  }
  return out;
}
