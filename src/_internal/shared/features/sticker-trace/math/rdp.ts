/*
 * WHY: A traced ring from a 3000px raster carries ten thousand points, one per
 *      pixel crack. Emitting that as a cut path makes the blade chatter, bloats
 *      the SVG past what Design Space will open, and encodes scanner noise as
 *      geometry. Simplifying first is what makes the curve fit meaningful.
 * WHAT: Ramer-Douglas-Peucker, iterative.
 *
 * Iterative rather than recursive on purpose: a ten-thousand-point contour
 * recurses deep enough to blow the stack, and it does so only on the largest
 * stickers — i.e. in production, on the sheets that matter, having passed every
 * smaller test.
 *
 * EXPORTS: simplifyRdp
 *
 * @tag domain:sticker-trace
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:geometry,export/cricut-svg
 * @tag sideEffects:none
 */

import type { Point } from "../types";

/**
 * Drop points that lie within `epsilon` of the chord they sit on.
 *
 * `epsilon` is in the same units as the points — callers pass a millimetre
 * tolerance converted to pixels, so the tolerance means the same physical thing
 * at every scan resolution. That is why the Cricut exporter can re-simplify to
 * a node budget independently: both speak the same units.
 */
export function simplifyRdp(points: readonly Point[], epsilon: number): Point[] {
  const n = points.length;
  if (n < 3 || epsilon <= 0) return points.slice();

  const keep = new Uint8Array(n);
  keep[0] = 1;
  keep[n - 1] = 1;

  const stack: Array<[number, number]> = [[0, n - 1]];

  while (stack.length > 0) {
    const [i, j] = stack.pop()!;
    if (j <= i + 1) continue;

    const a = points[i]!;
    const b = points[j]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);

    let worst = -1;
    let worstIndex = -1;

    for (let k = i + 1; k < j; k++) {
      const p = points[k]!;
      // Perpendicular distance to the chord, written out rather than via a
      // cross-product helper: numpy's `cross` dropped 2-vector support and the
      // Python original had to be rewritten this way, which is a reminder that
      // the explicit form is the portable one.
      const d =
        len === 0
          ? Math.hypot(p.x - a.x, p.y - a.y)
          : Math.abs(dx * (p.y - a.y) - dy * (p.x - a.x)) / len;

      if (d > worst) {
        worst = d;
        worstIndex = k;
      }
    }

    if (worst > epsilon && worstIndex >= 0) {
      keep[worstIndex] = 1;
      stack.push([i, worstIndex], [worstIndex, j]);
    }
  }

  const out: Point[] = [];
  for (let i = 0; i < n; i++) {
    if (keep[i]) out.push(points[i]!);
  }
  return out;
}
