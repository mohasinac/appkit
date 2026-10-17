/*
 * WHY: Measured on the reference corpus, the art-background sheets came back
 *      with 209 parts against ~12 real ones, and a threshold sweep showed it
 *      was structural: even at 1.0% barrier coverage the count stayed 3x too
 *      high, monotonically, with no minimum. Thresholds cannot fix it because
 *      the extra regions are not noise — they are the sheet's own ARTWORK
 *      fragmenting the waste matrix into pieces.
 *
 *      The physical fact the fix rests on: between the stickers there is ONE
 *      continuous piece of backing. Artwork printed across it does not cut it.
 *      So regions separated by a weak boundary belong together, and the matrix
 *      reunifies into a single large region — which the sheet-fraction rule
 *      then drops on its own.
 * WHAT: A region-adjacency merge driven by BOUNDARY STRENGTH rather than by
 *       region appearance.
 *
 * Strength, not length or shape. A long artwork edge is still an artwork edge,
 * and a short cut line is still a cut. The question "did somebody's blade go
 * through here" is answered by how hard the ridge detector saw that specific
 * boundary — which is a number this already has, per pixel, and was throwing
 * away by reducing the response to a binary barrier.
 *
 * EXPORTS: mergeWeakBoundaries
 *
 * @tag domain:sticker-trace
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:segment
 * @tag sideEffects:none
 */

import { edtWithIndices } from "../math/edt";

export interface MergeResult {
  /** Region id per pixel after merging; 0 stays background/barrier. */
  readonly labels: Int32Array;
  readonly regionCount: number;
  readonly mergesApplied: number;
  /** Median boundary strength across the graph — the scale the cut is judged against. */
  readonly medianStrength: number;
}

interface Edge {
  a: number;
  b: number;
  sum: number;
  count: number;
}

/**
 * Merge adjacent regions whose shared boundary is weak.
 *
 * `strengthFactor` is a multiple of the MEDIAN boundary strength in this
 * sheet's own graph, not an absolute response value — for the same reason the
 * ridge thresholds are local (the response scale varies by two orders of
 * magnitude across the corpus). A boundary below that multiple is treated as
 * printing; at or above it, as a cut.
 *
 * 🛑 Single-pass greedy, not true hierarchical merging. Pair strengths are
 * computed once and never recomputed as regions combine, so a chain of weak
 * links can merge two regions whose own shared boundary was never measured.
 * That is acceptable HERE and would not be in general: the thing those chains
 * reunify is precisely the waste matrix, which is the outcome wanted. A proper
 * recomputing merge would cost a priority queue and a rebuild per step for a
 * result that is the same on this corpus — revisit only if a real sheet shows
 * two stickers merging through a chain.
 */
export function mergeWeakBoundaries(
  labels: Int32Array,
  regionCount: number,
  response: Float32Array,
  width: number,
  height: number,
  strengthFactor: number,
): MergeResult {
  if (regionCount < 2) {
    return { labels, regionCount, mergesApplied: 0, medianStrength: 0 };
  }

  // Accumulate, per adjacent region PAIR, the ridge response along the barrier
  // that separates them. A barrier pixel is attributed to every pair of
  // distinct regions it touches, so a junction where three regions meet feeds
  // all three pairs rather than being dropped for ambiguity.
  const edges = new Map<number, Edge>();

  const key = (a: number, b: number): number => (a < b ? a * 1e6 + b : b * 1e6 + a);

  const touch = (a: number, b: number, strength: number): void => {
    if (a === 0 || b === 0 || a === b) return;
    const k = key(a, b);
    const e = edges.get(k);
    if (e) {
      e.sum += strength;
      e.count++;
    } else {
      edges.set(k, { a: Math.min(a, b), b: Math.max(a, b), sum: strength, count: 1 });
    }
  };

  /*
   * 🛑 Territory assignment, not a look-across.
   *
   * The first version sampled `labels[i-1]` and `labels[i+1]` either side of
   * each barrier pixel. That records NOTHING whenever the barrier is more than
   * one pixel thick — both sides are themselves barrier, so both read 0 and the
   * pair is skipped. The barrier here is hysteresis-GROWN and therefore always
   * several pixels thick, so the edge set came out empty and the merge silently
   * performed zero merges on every sheet. It read as "the merge decided not
   * to" for four measured runs.
   *
   * Assigning every barrier pixel to its nearest region first — a watershed by
   * another name, using the exact EDT that already exists — makes adjacency a
   * plain neighbour test again, and it is correct for a barrier of any
   * thickness.
   */
  const regionMask = new Uint8Array(labels.length);
  for (let i = 0; i < labels.length; i++) regionMask[i] = labels[i] !== 0 ? 1 : 0;

  const { index } = edtWithIndices(regionMask, width, height);

  const owner = new Int32Array(labels.length);
  for (let i = 0; i < labels.length; i++) {
    owner[i] = labels[i] !== 0 ? labels[i]! : labels[index[i]!]!;
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const a = owner[i]!;
      if (a === 0) continue;

      // Strength is sampled from the BARRIER pixels only. A boundary's
      // evidence is what the detector saw on the line itself, not on the
      // territory either side of it, which carries no cut signal at all.
      const s = labels[i] === 0 ? response[i]! : 0;
      const weighted = labels[i] === 0;

      if (x < width - 1 && owner[i + 1] !== a && weighted) touch(a, owner[i + 1]!, s);
      if (y < height - 1 && owner[i + width] !== a && weighted) touch(a, owner[i + width]!, s);
    }
  }

  if (edges.size === 0) {
    return { labels, regionCount, mergesApplied: 0, medianStrength: 0 };
  }

  const list = [...edges.values()].map((e) => ({ ...e, strength: e.sum / e.count }));
  const sortedStrengths = list.map((e) => e.strength).sort((a, b) => a - b);
  const medianStrength = sortedStrengths[sortedStrengths.length >> 1]!;

  /*
   * 🛑 A multiple of the median is wrong when the median is ZERO, and it was
   * measured doing exactly that: with the same-material score most boundaries
   * sit at 0, so `median * factor` was 0, the first edge tripped
   * `strength >= threshold`, and the loop broke having merged nothing — a
   * silent no-op that looked like "the merge decided not to".
   *
   * A PERCENTILE of the edge distribution cannot degenerate that way: it always
   * names a real position in the list, whatever the values are. `factor` is
   * reinterpreted as that percentile (1 => merge the weakest half).
   */
  const quantile = Math.min(0.98, Math.max(0.02, strengthFactor * 0.5));

  list.sort((p, q) => p.strength - q.strength);

  /*
   * 🛑 Merge a COUNT of the weakest edges, not everything below a value.
   *
   * A value threshold still degenerates under TIES, and ties are the normal
   * case here: the same-material score is 0 for most boundaries, so the median
   * is 0, and `strength >= 0` tripped on the very first edge — measured as
   * 2271 -> 2271 regions with zero merges at the default factor, while the
   * same function at factor 1.9 collapsed 2271 -> 35. A fraction of the sorted
   * list cannot do that: it always dissolves exactly the weakest share asked
   * for, whatever the values are.
   */
  const mergeBudget = Math.floor(list.length * quantile);

  const parent = new Int32Array(regionCount + 1);
  for (let i = 0; i <= regionCount; i++) parent[i] = i;
  const find = (x: number): number => {
    let r = x;
    while (parent[r] !== r) {
      parent[r] = parent[parent[r]!]!;
      r = parent[r]!;
    }
    return r;
  };

  let merges = 0;
  let considered = 0;
  for (const e of list) {
    if (considered >= mergeBudget) break;
    considered++;
    const ra = find(e.a);
    const rb = find(e.b);
    if (ra !== rb) {
      parent[rb] = ra;
      merges++;
    }
  }

  // Renumber densely so downstream code can size arrays by the count.
  const remap = new Int32Array(regionCount + 1);
  let next = 0;
  for (let r = 1; r <= regionCount; r++) {
    const root = find(r);
    if (remap[root] === 0) {
      next++;
      remap[root] = next;
    }
    remap[r] = remap[root]!;
  }

  const out = new Int32Array(labels.length);
  for (let i = 0; i < labels.length; i++) {
    const l = labels[i]!;
    out[i] = l === 0 ? 0 : remap[l]!;
  }

  return { labels: out, regionCount: next, mergesApplied: merges, medianStrength };
}
