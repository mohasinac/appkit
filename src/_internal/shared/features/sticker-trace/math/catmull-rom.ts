/*
 * WHY: A simplified polyline is still a polyline, and a blade cutting one
 *      chatters audibly on every curve — these stickers are almost entirely
 *      curves. Fitting smooth cubics through the simplified points is what
 *      turns a traced raster into something a cutter follows cleanly.
 * WHAT: Uniform Catmull-Rom through the points, converted to cubic Béziers,
 *       with the control-arm clamp that keeps sharp corners from looping.
 *
 * EXPORTS: catmullRomToBezier
 *
 * @tag domain:sticker-trace
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:geometry,export/*
 * @tag sideEffects:none
 */

import type { CubicSegment, CutPath, Point } from "../types";

/**
 * Cap a control arm's length.
 *
 * 🛑 This is not a refinement, it is a correctness fix. Uniform Catmull-Rom
 * overshoots badly when neighbouring segments differ in length: at a sharp
 * corner — which every claw-shaped sticker on these sheets has — the arm grows
 * longer than the segment itself and the curve ties a small loop. A blade cuts
 * that loop as a nick in the sticker's edge.
 *
 * Capping at a third of the span is the standard guard and leaves collinear
 * runs perfectly straight, so nothing is lost on the flat sections.
 */
function clampArm(vx: number, vy: number, limit: number): { x: number; y: number } {
  const len = Math.hypot(vx, vy);
  if (len <= limit || len === 0) return { x: vx, y: vy };
  const s = limit / len;
  return { x: vx * s, y: vy * s };
}

/**
 * Fit a closed cubic path through `points`.
 *
 * Closed only — a kiss cut is always a closed outline, and an open path would
 * mean a sticker the machine cuts most of the way around and leaves attached.
 * The wrap-around indexing is what makes the seam between the last and first
 * point as smooth as every other joint; fitting open and then closing the gap
 * leaves a visible corner exactly where the path started.
 */
export function catmullRomToBezier(points: readonly Point[]): CutPath | null {
  const n = points.length;
  if (n < 3) return null;

  const segments: CubicSegment[] = [];

  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n]!;
    const p1 = points[i]!;
    const p2 = points[(i + 1) % n]!;
    const p3 = points[(i + 2) % n]!;

    const span = Math.hypot(p2.x - p1.x, p2.y - p1.y) / 3;

    const a1 = clampArm((p2.x - p0.x) / 6, (p2.y - p0.y) / 6, span);
    const a2 = clampArm((p3.x - p1.x) / 6, (p3.y - p1.y) / 6, span);

    segments.push({
      c1: { x: p1.x + a1.x, y: p1.y + a1.y },
      c2: { x: p2.x - a2.x, y: p2.y - a2.y },
      to: { x: p2.x, y: p2.y },
    });
  }

  return { start: points[0]!, segments };
}
