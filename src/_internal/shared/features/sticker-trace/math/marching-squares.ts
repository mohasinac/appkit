/*
 * WHY: A cut path is a closed outline, and the segmentation produces a raster
 *      mask. Turning one into the other has to be exact about closure: a ring
 *      that fails to close is a cut the machine starts and never finishes, and
 *      a ring that self-intersects is a nick in the sticker.
 * WHAT: Marching squares at an iso level, linked into guaranteed-closed rings.
 *
 * Linking is done by EDGE IDENTITY, not by coordinate proximity. Each cell
 * boundary crossing lands on one specific grid edge, and adjacent cells
 * produce the identical edge id — so chaining is exact integer bookkeeping
 * rather than "are these two floats close enough", which is the usual source
 * of a contour that almost closes.
 *
 * EXPORTS: Ring, traceContours
 *
 * @tag domain:sticker-trace
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:geometry
 * @tag sideEffects:none
 */

import type { Point } from "../types";

export interface Ring {
  readonly points: readonly Point[];
  /** Signed area; positive is counter-clockwise in image coordinates. */
  readonly signedArea: number;
  /** True when the ring closed back on itself, which every valid cut path must. */
  readonly closed: boolean;
}

/**
 * Grid edges are identified rather than located.
 *
 * A horizontal edge spans (x,y)->(x+1,y); a vertical edge spans (x,y)->(x,y+1).
 * Two cells sharing a boundary compute the SAME id, which is what makes ring
 * assembly exact.
 */
function hEdge(x: number, y: number, width: number): number {
  return (y * width + x) * 2;
}

function vEdge(x: number, y: number, width: number): number {
  return (y * width + x) * 2 + 1;
}

/**
 * Where the iso level crosses between two samples.
 *
 * On a binary mask this always returns the midpoint, which is the correct
 * half-pixel "crack" between set and unset. On a smoothed field it returns a
 * genuine sub-pixel position — which is the entire difference the `precise`
 * and `max` tiers buy, and why they blur before tracing rather than tracing
 * harder.
 */
function lerp(a: number, b: number, iso: number): number {
  const d = b - a;
  if (Math.abs(d) < 1e-9) return 0.5;
  const t = (iso - a) / d;
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/**
 * Cases 5 and 10 are the SADDLES: two diagonal corners inside, two outside.
 *
 * Both have two geometrically valid pairings, and the one chosen decides
 * whether the two regions pinch together at this cell or stay apart. Choosing
 * inconsistently across neighbouring cells produces rings that cross
 * themselves, which survives every later stage — RDP simplifies it, the Bézier
 * fit smooths it, and it emerges as a cut path that doubles back.
 *
 * Resolve by the cell's MEAN, which keeps the choice continuous with the
 * surrounding field instead of arbitrary.
 *
 * 🛑 The two codes take OPPOSITE pairings for the same centre value — they are
 * mirror configurations. Sharing one branch without the inversion would join
 * the wrong corners on half of all saddles, and the output would still be a
 * plausible set of closed rings.
 *
 * Extracted from the switch rather than inlined: at that depth it tripped
 * `audit-code-quality`'s DEEP_NESTING, and the two cases had independently
 * re-derived the same mean.
 *
 * 🛑 MEASURED 2026-10-18: this branch is NOT REACHED by any of the reference
 * scans, at `standard` or at `precise`. Inverting the rule on purpose changed
 * nothing — not part counts, not total Bézier node counts, not closure — on
 * five scans at both tiers. The reason is upstream: `close` and
 * `curvatureSmooth` eliminate the checkerboard-like local patterns a true
 * diagonal saddle requires, and `softenForSubPixel`'s blur removes what little
 * survives.
 *
 * So the correctness of the inversion rests on INSPECTION (all four
 * code×centre combinations hand-checked), never on measurement. Do not read
 * the corpus harness agreeing with itself as evidence about this function.
 * It is kept because a future tier that traces a less-smoothed field, or any
 * path that skips the cleaning stages, reaches it immediately — and because
 * the failure it prevents is a self-crossing cut path, which survives RDP and
 * the Bézier fit and emerges looking like a plausible outline.
 */
function connectSaddle(
  code: 5 | 10,
  corners: { tl: number; tr: number; br: number; bl: number },
  iso: number,
  edges: { top: number; right: number; bottom: number; left: number },
  connect: (a: number, b: number) => void,
): void {
  const mean = (corners.tl + corners.tr + corners.br + corners.bl) / 4;
  const centreInside = mean >= iso;
  const joinLeftToTop = code === 5 ? centreInside : !centreInside;
  if (joinLeftToTop) {
    connect(edges.left, edges.top);
    connect(edges.bottom, edges.right);
  } else {
    connect(edges.left, edges.bottom);
    connect(edges.top, edges.right);
  }
}

/**
 * Extract every closed ring at `iso`.
 *
 * `field` may be the binary mask itself or a blurred copy; both are read as
 * numbers, and the iso level decides. Rings shorter than 8 points are dropped —
 * at this scale they are single-pixel speckle, never a sticker.
 */
export function traceContours(
  field: Uint8Array | Float32Array,
  width: number,
  height: number,
  iso = 0.5,
): Ring[] {
  // edge id -> the interpolated point on that edge
  const points = new Map<number, Point>();
  // edge id -> the edge ids it is connected to (at most 2)
  const links = new Map<number, number[]>();

  const connect = (a: number, b: number): void => {
    const la = links.get(a);
    if (la) la.push(b);
    else links.set(a, [b]);
    const lb = links.get(b);
    if (lb) lb.push(a);
    else links.set(b, [a]);
  };

  const at = (x: number, y: number): number => field[y * width + x]!;

  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const tl = at(x, y);
      const tr = at(x + 1, y);
      const br = at(x + 1, y + 1);
      const bl = at(x, y + 1);

      const code =
        (tl >= iso ? 8 : 0) | (tr >= iso ? 4 : 0) | (br >= iso ? 2 : 0) | (bl >= iso ? 1 : 0);

      if (code === 0 || code === 15) continue;

      const top = hEdge(x, y, width);
      const right = vEdge(x + 1, y, width);
      const bottom = hEdge(x, y + 1, width);
      const left = vEdge(x, y, width);

      if (!points.has(top)) points.set(top, { x: x + lerp(tl, tr, iso), y });
      if (!points.has(right)) points.set(right, { x: x + 1, y: y + lerp(tr, br, iso) });
      if (!points.has(bottom)) points.set(bottom, { x: x + lerp(bl, br, iso), y: y + 1 });
      if (!points.has(left)) points.set(left, { x, y: y + lerp(tl, bl, iso) });

      switch (code) {
        case 1:
        case 14:
          connect(left, bottom);
          break;
        case 2:
        case 13:
          connect(bottom, right);
          break;
        case 3:
        case 12:
          connect(left, right);
          break;
        case 4:
        case 11:
          connect(top, right);
          break;
        case 6:
        case 9:
          connect(top, bottom);
          break;
        case 7:
        case 8:
          connect(left, top);
          break;
        /*
         * The two saddles — see `connectSaddle` for why they are not one case.
         *
         * Split rather than shared so each passes a LITERAL: `code` is a
         * `number` here (it comes out of a bitwise OR), so a shared
         * `case 5: case 10:` would not narrow it and the helper would have to
         * accept `number` — making 7 a representable argument for a function
         * that has no correct answer for it.
         */
        case 5:
          connectSaddle(5, { tl, tr, br, bl }, iso, { top, right, bottom, left }, connect);
          break;
        case 10:
          connectSaddle(10, { tl, tr, br, bl }, iso, { top, right, bottom, left }, connect);
          break;
        default:
          break;
      }
    }
  }

  const visited = new Set<number>();
  const rings: Ring[] = [];

  for (const startEdge of links.keys()) {
    if (visited.has(startEdge)) continue;

    const chain: Point[] = [];
    let current = startEdge;
    let previous = -1;
    let closed = false;

    for (;;) {
      visited.add(current);
      const p = points.get(current);
      if (p) chain.push(p);

      const neighbours = links.get(current);
      if (!neighbours) break;

      let nextEdge = -1;
      for (const n of neighbours) {
        if (n === previous) continue;
        if (n === startEdge && chain.length > 2) {
          closed = true;
          break;
        }
        if (!visited.has(n)) {
          nextEdge = n;
          break;
        }
      }

      if (closed || nextEdge === -1) break;
      previous = current;
      current = nextEdge;
    }

    if (chain.length < 8) continue;

    rings.push({ points: chain, signedArea: shoelace(chain), closed });
  }

  return rings;
}

function shoelace(points: readonly Point[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}
