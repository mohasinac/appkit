/*
 * WHY: A cut path is Bézier geometry, but a part's PNG needs an alpha mask —
 *      and the mask has to agree with the cut file exactly, or the printed
 *      sticker and the blade disagree about where its edge is.
 * WHAT: Flatten cubics to a polyline, then scanline-fill with coverage alpha.
 *
 * TWO DECISIONS THE CUT QUALITY DEPENDS ON, both made here and stated:
 *
 * 🛑 1. FILL RULE: NONZERO.
 *
 * A kiss cut is one closed outer boundary with no interior holes — cutting a
 * hole would make the sticker fall apart on the backing — so on today's data
 * nonzero and even-odd are IDENTICAL. Nonzero is chosen anyway because it is
 * SVG's default, and the cut SVG exporter will emit these same paths: if the
 * two rules ever disagreed (a self-intersecting trace, or a future part that
 * genuinely has a hole), the mask and the cut file must still describe the same
 * region. Picking the renderer's rule means they cannot drift.
 *
 * 🛑 2. EDGES ARE ANTI-ALIASED, by coverage.
 *
 * A hard 0/255 mask leaves visible stair-stepping along every diagonal and
 * curve — on a printed sticker that reads as a jagged edge, and it is exactly
 * the artifact a Bézier trace exists to avoid. So each pixel's alpha is the
 * FRACTION of it inside the path: vertical supersampling across sub-scanlines
 * plus exact horizontal span ends. Costs ~4x the scanline work for an edge
 * that survives printing.
 *
 * Pure: no codec, no node, no DOM. Enforced by audit-sticker-trace-purity.
 *
 * EXPORTS: flattenPath, rasterizePathAlpha, rasterisePartToBox,
 *   FLATTEN_TOLERANCE_PX, SUBSAMPLES_PER_ROW
 *
 * @tag domain:sticker-trace
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:shard,canvas-codec
 * @tag sideEffects:none
 */

import type { CutPath, Point, Rect } from "../types";

/**
 * Max deviation between the curve and its polyline, in DESTINATION pixels.
 *
 * 🛑 MEASURED, and the first value chosen here was wrong. A circle of r=8 has
 * a known area (pi*r^2 = 201.06), so the fill can be checked against it:
 *
 *     tol 0.25   17 pts   area 196.09   -2.47%
 *     tol 0.10   33 pts   area 200.02   -0.52%
 *     tol 0.05   57 pts   area 200.74   -0.16%   <- chosen
 *     tol 0.01  129 pts   area 201.18   +0.06%
 *     tol 0.002 257 pts   area 201.25   +0.10%
 *
 * A polyline inscribed in a convex curve always UNDER-covers — chords cut
 * corners — so the bias is one-directional and shrinks the sticker rather than
 * growing it. At 0.25 that is a systematic 2.5% area loss, which is far more
 * than anti-aliasing can hide. 0.05 costs 57 points against 17 and lands inside
 * a fifth of a percent; 0.01 buys another 0.1pp for 2.3x the points, which the
 * cut cannot express.
 */
export const FLATTEN_TOLERANCE_PX = 0.05;

/**
 * Sub-scanlines per pixel row.
 *
 * 🛑 This knob does NOT control accuracy, and I assumed it did. Measured on the
 * same circle, area error barely moves and moves the WRONG way — S=1 -1.96%,
 * S=4 -2.47%, S=16 -2.54%, S=32 -2.55% — because total coverage is set by the
 * polyline, not by how finely the rows are sampled. The earlier claim here that
 * "16 was measurably no better" was written before any of this was measured;
 * it happened to be true and was not evidence.
 *
 * What subsampling actually buys is edge SMOOTHNESS, which an area total cannot
 * see at all: a stair-stepped edge and a smooth one can sum to the same
 * coverage. 4 gives five distinguishable levels from vertical coverage while the
 * horizontal span ends stay exact, so a near-vertical edge is continuous and a
 * near-horizontal one is quantised to fifths. Raising it is cheap if a printed
 * part ever shows banding on shallow diagonals — judge that by eye, not by this
 * area check.
 */
export const SUBSAMPLES_PER_ROW = 4;

/** Flat-enough test: the control points' distance from the chord. */
function isFlatEnough(p0: Point, c1: Point, c2: Point, p1: Point, tol: number): boolean {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) {
    // Degenerate chord: fall back to control-point spread, or a cusp would
    // recurse to the depth cap and emit a needlessly dense polyline.
    return Math.hypot(c1.x - p0.x, c1.y - p0.y) + Math.hypot(c2.x - p1.x, c2.y - p1.y) < tol;
  }
  const d1 = Math.abs((c1.x - p0.x) * dy - (c1.y - p0.y) * dx) / len;
  const d2 = Math.abs((c2.x - p0.x) * dy - (c2.y - p0.y) * dx) / len;
  return Math.max(d1, d2) <= tol;
}

function subdivide(
  p0: Point,
  c1: Point,
  c2: Point,
  p1: Point,
  tol: number,
  depth: number,
  out: Point[],
): void {
  /*
   * Depth 16 is a guard, not a tuning knob. Adaptive subdivision terminates on
   * real curves; the cap exists so a NaN or an infinity in the geometry cannot
   * spin forever — which would hang a shard rather than fail it.
   */
  if (depth >= 16 || isFlatEnough(p0, c1, c2, p1, tol)) {
    out.push(p1);
    return;
  }
  const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const p01 = mid(p0, c1);
  const p12 = mid(c1, c2);
  const p23 = mid(c2, p1);
  const p012 = mid(p01, p12);
  const p123 = mid(p12, p23);
  const m = mid(p012, p123);
  subdivide(p0, p01, p012, m, tol, depth + 1, out);
  subdivide(m, p123, p23, p1, tol, depth + 1, out);
}

/**
 * Flatten a cut path into a closed polyline, transformed into mask space.
 *
 * `scale` maps the working raster the path was traced on to full resolution,
 * and `origin` is the part's bbox corner — so the returned points are already
 * relative to the mask's own (0,0). Doing the transform HERE rather than per
 * sample is what keeps the inner scanline loop free of it.
 */
export function flattenPath(
  path: CutPath,
  scale: number,
  origin: { x: number; y: number },
): Point[] {
  const tx = (p: Point): Point => ({ x: p.x * scale - origin.x, y: p.y * scale - origin.y });
  const pts: Point[] = [tx(path.start)];
  let current = path.start;
  for (const seg of path.segments) {
    subdivide(
      tx(current),
      tx(seg.c1),
      tx(seg.c2),
      tx(seg.to),
      FLATTEN_TOLERANCE_PX,
      0,
      pts,
    );
    current = seg.to;
  }
  return pts;
}

interface Edge {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** +1 downward, -1 upward — the winding contribution for the nonzero rule. */
  dir: number;
}

function buildEdges(points: readonly Point[]): Edge[] {
  const edges: Edge[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    // Horizontal edges contribute no crossings and would divide by zero.
    if (a.y === b.y) continue;
    edges.push(
      a.y < b.y
        ? { x0: a.x, y0: a.y, x1: b.x, y1: b.y, dir: 1 }
        : { x0: b.x, y0: b.y, x1: a.x, y1: a.y, dir: -1 },
    );
  }
  return edges;
}

/**
 * Rasterise one closed path into an alpha mask of `size`.
 *
 * Returns `width * height` bytes, 0..255, row-major — the shape
 * `encodePngRegion` writes straight into the alpha channel.
 */
export function rasterizePathAlpha(
  points: readonly Point[],
  size: { width: number; height: number },
): Uint8Array {
  const { width, height } = size;
  const alpha = new Uint8Array(width * height);
  const edges = buildEdges(points);
  if (edges.length === 0) return alpha;

  // Float accumulator per row: coverage sums across sub-scanlines before the
  // single rounding at the end. Rounding per sub-scanline would quantise four
  // times and lose most of the anti-aliasing.
  const cov = new Float32Array(width);
  const xs: { x: number; dir: number }[] = [];

  for (let y = 0; y < height; y++) {
    cov.fill(0);

    for (let s = 0; s < SUBSAMPLES_PER_ROW; s++) {
      const sy = y + (s + 0.5) / SUBSAMPLES_PER_ROW;
      xs.length = 0;

      for (const e of edges) {
        // Half-open [y0, y1): a vertex shared by two edges is counted once, so
        // a crossing exactly on a sub-scanline cannot double-count and punch a
        // hole in the fill.
        if (sy < e.y0 || sy >= e.y1) continue;
        const t = (sy - e.y0) / (e.y1 - e.y0);
        xs.push({ x: e.x0 + t * (e.x1 - e.x0), dir: e.dir });
      }
      if (xs.length < 2) continue;
      xs.sort((a, b) => a.x - b.x);

      // NONZERO: accumulate winding, and a span is inside wherever it is != 0.
      let winding = 0;
      for (let i = 0; i < xs.length - 1; i++) {
        winding += xs[i]!.dir;
        if (winding === 0) continue;
        addSpan(cov, xs[i]!.x, xs[i + 1]!.x, width);
      }
    }

    const row = y * width;
    for (let x = 0; x < width; x++) {
      const v = cov[x]! / SUBSAMPLES_PER_ROW;
      alpha[row + x] = v <= 0 ? 0 : v >= 1 ? 255 : Math.round(v * 255);
    }
  }

  return alpha;
}

/**
 * Add one horizontal span's coverage, with EXACT fractional ends.
 *
 * This is what makes a near-vertical edge smooth: the partial pixels at each
 * end get their real fraction rather than being rounded in or out, so the
 * horizontal resolution is continuous even though the vertical is sampled.
 */
function addSpan(cov: Float32Array, xStart: number, xEnd: number, width: number): void {
  let a = xStart;
  let b = xEnd;
  if (b <= a) return;
  if (b <= 0 || a >= width) return;
  if (a < 0) a = 0;
  if (b > width) b = width;

  const first = Math.floor(a);
  const last = Math.ceil(b) - 1;

  if (first === last) {
    cov[first] = cov[first]! + (b - a);
    return;
  }
  cov[first] = cov[first]! + (first + 1 - a);
  for (let x = first + 1; x < last; x++) cov[x] = cov[x]! + 1;
  cov[last] = cov[last]! + (b - last);
}

/**
 * Rasterise one part's path into an alpha mask covering `bbox`.
 *
 * This matches `ShardDeps.rasterise` exactly: `(path, bbox)`, no ordinal and
 * no scale.
 *
 * 🛑 The scale is DERIVED from the path's own extent onto `bbox`, and that is
 * the only self-consistent option available. The path is in working-raster
 * coordinates while `bbox` is already full-resolution, so a mapping is
 * unavoidable — and the two candidates were: take `scale` as a fourth argument,
 * or derive it. Taking it would mean the shard computes
 * `sheet.widthPx / workingSize.width` and the binding computes it again from
 * its own copy of the geometry, which is two derivations of one number and
 * exactly the drift Root Cause #75 is about. Deriving it here also guarantees
 * the mask FILLS the region it was given, which is what the caller needs:
 * `bbox` comes from the component mask while the path comes from marching
 * squares, so the two can differ by a fraction of a pixel and a mask that
 * merely scaled by a shared factor could leave an empty row at one edge.
 *
 * 🛑 A FIRST DRAFT of this was `makePartRasteriser(geometry)`, keyed on
 * ordinal. It was written against a stale signature and deleted: the real
 * contract hands over the path, and its own comment explains why — an ordinal
 * "could only be implemented by re-reading geometry.json for every part, sixty
 * extra downloads per shard for data the caller already holds."
 */
export async function rasterisePartToBox(
  path: CutPath,
  bbox: Rect,
): Promise<Uint8Array> {
  if (bbox.width <= 0 || bbox.height <= 0) return new Uint8Array(0);

  // The path's extent in its own (working) coordinates.
  const raw = flattenPath(path, 1, { x: 0, y: 0 });
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of raw) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  if (!(spanX > 0) || !(spanY > 0)) return new Uint8Array(bbox.width * bbox.height);

  /*
   * ONE uniform factor, from the larger span. A per-axis fit would stretch the
   * sticker to fill its own bounding box, which is wrong by up to a pixel on a
   * part whose bbox was rounded outward — and a stretched cut outline no longer
   * matches the artwork it was traced from.
   */
  const scale = Math.max(bbox.width / spanX, bbox.height / spanY);

  // Centre the scaled path inside the box, so any rounding slack is split
  // between the two edges rather than all landing on one.
  const originX = minX * scale - (bbox.width - spanX * scale) / 2;
  const originY = minY * scale - (bbox.height - spanY * scale) / 2;

  const points = flattenPath(path, scale, { x: originX, y: originY });
  return rasterizePathAlpha(points, { width: bbox.width, height: bbox.height });
}
