/*
 * WHY: Design Space gives up past roughly 50,000 nodes. A `max`-tier trace at
 *      0.015mm across sixty parts can plausibly exceed that — so without a
 *      separate budget here, the most precise tier would produce a file the
 *      machine cannot open, making it strictly worse than `precise` at higher
 *      cost.
 * WHAT: Re-simplify an already-traced outline to a node budget, and REPORT the
 *       deviation that bought.
 *
 * 🛑 THIS IS A SECOND, INDEPENDENT BUDGET. The trace simplifies to whatever the
 * scan deserves; this simplifies to whatever the machine can open. Tying them
 * together is the mistake — and the reporting is half the point: an operator
 * told "simplified to 48,900 nodes, max deviation 0.08mm" can decide whether
 * that matters, where one told nothing cannot.
 *
 * 🛑 It only ever REMOVES nodes. A budget pass that moved a point would be
 * editing the traced geometry, and the deviation figure would then be a lie
 * about a shape nobody chose.
 *
 * EXPORTS: SimplifyResult, simplifyToBudget
 *
 * @tag domain:sticker-trace
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:sticker-trace/export
 * @tag sideEffects:none
 */

import type { CubicSegment, CutPath, Point } from "../types";

export interface SimplifyResult {
  paths: CutPath[];
  nodesBefore: number;
  nodesAfter: number;
  /**
   * Greatest distance any dropped control point sat from the curve that
   * replaced it, in millimetres. 0 when nothing was dropped.
   *
   * 🛑 A MEASURED worst case, not an average. An average hides the one place a
   * corner was rounded off, which is exactly the place a human would object to.
   */
  maxDeviationMm: number;
  /** True when the budget could not be met even at the coarsest pass. */
  overBudget: boolean;
}

function dist(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function nodeCount(paths: readonly CutPath[]): number {
  let n = 0;
  for (const p of paths) n += p.segments.length + 1;
  return n;
}

/**
 * Drop every Nth segment, splicing its neighbours together.
 *
 * Deliberately a uniform stride rather than a curvature-weighted pass: a
 * curvature pass keeps corners and eats smooth runs, which on a kiss-cut
 * outline means it removes exactly the long gentle arcs that make a sticker
 * look right, and keeps the scanner noise it mistook for detail. A uniform
 * stride degrades the whole outline evenly and predictably.
 */
function thinOnce(path: CutPath): { path: CutPath; deviation: number } {
  if (path.segments.length < 4) return { path, deviation: 0 };

  const kept: CubicSegment[] = [];
  let deviation = 0;
  let cursor: Point = path.start;

  for (let i = 0; i < path.segments.length; i++) {
    const seg = path.segments[i]!;
    const isLast = i === path.segments.length - 1;
    /*
     * Keep every other segment, and ALWAYS the last one so the outline still
     * returns to its start. Dropping the closing segment leaves a gap the SVG
     * writer's `Z` would bridge with a straight line — a visible flat edge on a
     * curved sticker.
     */
    if (i % 2 === 0 || isLast) {
      kept.push(seg);
      cursor = seg.to;
      continue;
    }
    // Merged away: the dropped endpoint's distance from the surviving one is
    // the error this pass introduced at that location.
    deviation = Math.max(deviation, dist(seg.to, cursor));
  }

  return { path: { start: path.start, segments: kept }, deviation };
}

/**
 * Simplify until the whole file fits `nodeBudget`.
 *
 * `null` budget means no ceiling — the print-shop profile — and returns the
 * input untouched with a deviation of 0, which is the truthful answer rather
 * than a no-op that still claims to have simplified.
 */
export function simplifyToBudget(
  paths: readonly CutPath[],
  nodeBudget: number | null,
  opts: { maxPasses?: number } = {},
): SimplifyResult {
  const nodesBefore = nodeCount(paths);

  if (nodeBudget === null || nodesBefore <= nodeBudget) {
    return {
      paths: [...paths],
      nodesBefore,
      nodesAfter: nodesBefore,
      maxDeviationMm: 0,
      overBudget: false,
    };
  }

  /*
   * Bounded. Each pass roughly halves the node count, so 12 passes can reduce
   * a 50,000-node file to single digits — far past any real budget. An
   * unbounded loop on a degenerate path is how a Function burns its 300s.
   */
  const maxPasses = opts.maxPasses ?? 12;
  let current = [...paths];
  let maxDeviation = 0;

  for (let pass = 0; pass < maxPasses; pass++) {
    if (nodeCount(current) <= nodeBudget) break;
    const next: CutPath[] = [];
    for (const p of current) {
      const { path, deviation } = thinOnce(p);
      next.push(path);
      maxDeviation = Math.max(maxDeviation, deviation);
    }
    /*
     * Stop if a pass achieved nothing — every path is already at its floor of
     * three segments. Continuing would spin for the remaining passes and still
     * report over-budget, just later.
     */
    if (nodeCount(next) === nodeCount(current)) {
      current = next;
      break;
    }
    current = next;
  }

  const nodesAfter = nodeCount(current);
  return {
    paths: current,
    nodesBefore,
    nodesAfter,
    maxDeviationMm: Math.round(maxDeviation * 1000) / 1000,
    /*
     * Reported rather than thrown. The operator may still want the file — to
     * split it across two exports, or to open it in something that is not
     * Design Space — and refusing to produce it takes that choice away.
     */
    overBudget: nodesAfter > nodeBudget,
  };
}
