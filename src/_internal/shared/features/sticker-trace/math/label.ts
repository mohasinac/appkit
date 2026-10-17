/*
 * WHY: Segmentation ends with "which pixels belong to the same sticker". That is
 *      connected-component labelling, and it is needed three times — once for
 *      the parts themselves, once to find the background region the flood
 *      reached, and once to cluster parts into physical sheets.
 * WHAT: Two-pass CCL over a binary mask with union-find, returning labels plus
 *       per-component area and bounding box in one walk.
 *
 * 4-connectivity, deliberately. Under 8-connectivity two stickers touching at a
 * single diagonal pixel — which a hysteresis-linked ridge map produces fairly
 * often — merge into one component and therefore one cut path, and the sheet
 * leaves the cutter in one piece. Losing a genuine 1px diagonal bridge inside a
 * sticker is the cheaper error, and the bridge closing (see trace/segment)
 * repairs that case on purpose.
 *
 * EXPORTS: LabelResult, ComponentStats, labelComponents
 *
 * @tag domain:sticker-trace
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:segment,cluster,flood,geometry
 * @tag sideEffects:none
 */

import type { Rect } from "../types";

export interface ComponentStats {
  readonly label: number;
  readonly area: number;
  readonly bbox: Rect;
  /** True when the component touches the raster edge — see trace/segment. */
  readonly touchesBorder: boolean;
}

export interface LabelResult {
  /** 0 = background; components are 1..count. */
  readonly labels: Int32Array;
  readonly count: number;
  readonly stats: readonly ComponentStats[];
}

/**
 * Union-find with path halving and union by size.
 *
 * Path halving rather than full compression because it is a single extra array
 * write in the find loop and gets the same near-constant amortised behaviour —
 * on a 9 MP raster the difference in allocation churn is worth more than the
 * theoretical constant.
 */
class UnionFind {
  private readonly parent: Int32Array;
  private readonly size: Int32Array;

  constructor(capacity: number) {
    this.parent = new Int32Array(capacity);
    this.size = new Int32Array(capacity);
  }

  make(x: number): void {
    this.parent[x] = x;
    this.size[x] = 1;
  }

  find(x: number): number {
    let root = x;
    while (this.parent[root] !== root) {
      this.parent[root] = this.parent[this.parent[root]!]!;
      root = this.parent[root]!;
    }
    return root;
  }

  union(a: number, b: number): void {
    let ra = this.find(a);
    let rb = this.find(b);
    if (ra === rb) return;
    if (this.size[ra]! < this.size[rb]!) {
      const t = ra;
      ra = rb;
      rb = t;
    }
    this.parent[rb] = ra;
    this.size[ra] = this.size[ra]! + this.size[rb]!;
  }
}

export function labelComponents(mask: Uint8Array, width: number, height: number): LabelResult {
  const labels = new Int32Array(width * height);
  // Worst case is a checkerboard: every other pixel its own provisional label.
  const uf = new UnionFind(Math.ceil((width * height) / 2) + 2);
  let next = 1;

  // Pass 1 — provisional labels, recording equivalences.
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      const i = row + x;
      if (!mask[i]) continue;

      const left = x > 0 && mask[i - 1] ? labels[i - 1]! : 0;
      const up = y > 0 && mask[i - width] ? labels[i - width]! : 0;

      if (left && up) {
        labels[i] = left;
        if (left !== up) uf.union(left, up);
      } else if (left) {
        labels[i] = left;
      } else if (up) {
        labels[i] = up;
      } else {
        uf.make(next);
        labels[i] = next;
        next++;
      }
    }
  }

  // Pass 2 — resolve to roots, renumber densely, and accumulate stats in the
  // same walk. A separate stats pass would be a second full traversal of a
  // 9 MP buffer for numbers we already have in hand.
  const remap = new Int32Array(next);
  const areas: number[] = [];
  const minX: number[] = [];
  const minY: number[] = [];
  const maxX: number[] = [];
  const maxY: number[] = [];
  const border: boolean[] = [];
  let count = 0;

  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      const i = row + x;
      if (!labels[i]) continue;

      const root = uf.find(labels[i]!);
      let dense = remap[root]!;
      if (dense === 0) {
        count++;
        dense = count;
        remap[root] = dense;
        areas.push(0);
        minX.push(x);
        minY.push(y);
        maxX.push(x);
        maxY.push(y);
        border.push(false);
      }
      labels[i] = dense;

      const k = dense - 1;
      areas[k] = areas[k]! + 1;
      if (x < minX[k]!) minX[k] = x;
      if (y < minY[k]!) minY[k] = y;
      if (x > maxX[k]!) maxX[k] = x;
      if (y > maxY[k]!) maxY[k] = y;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) border[k] = true;
    }
  }

  const stats: ComponentStats[] = [];
  for (let k = 0; k < count; k++) {
    stats.push({
      label: k + 1,
      area: areas[k]!,
      bbox: {
        x: minX[k]!,
        y: minY[k]!,
        width: maxX[k]! - minX[k]! + 1,
        height: maxY[k]! - minY[k]! + 1,
      },
      touchesBorder: border[k]!,
    });
  }

  return { labels, count, stats };
}
