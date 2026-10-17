/*
 * WHY: One scan can hold several physical sheets — the 4948x6955 reference scan
 *      does. Presenting sixty parts as one flat list loses the fact that they
 *      came off four different sheets, which is exactly what someone cutting
 *      them needs to know.
 * WHAT: Single-link clustering of part bounding boxes by gap distance.
 *
 * Gap, not centre distance. Two large stickers can have centres far apart while
 * touching, and two small ones can have close centres while sitting on
 * different sheets. The physical question is "how much bare space is between
 * these", and that is the gap between their boxes.
 *
 * EXPORTS: clusterParts
 *
 * @tag domain:sticker-trace
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:index
 * @tag sideEffects:none
 */

import type { PartGeometry, Rect, SheetCluster } from "../types";

/** Axis-aligned gap; 0 when the boxes overlap or touch. */
function boxGap(a: Rect, b: Rect): number {
  const dx = Math.max(0, Math.max(a.x - (b.x + b.width), b.x - (a.x + a.width)));
  const dy = Math.max(0, Math.max(a.y - (b.y + b.height), b.y - (a.y + a.height)));
  return Math.hypot(dx, dy);
}

/**
 * Group parts into physical sheets.
 *
 * Single-link (transitive) on purpose: stickers on one sheet form a chain of
 * near neighbours rather than a tight blob, so requiring every pair in a
 * cluster to be close would split one sheet into several. The risk of
 * single-link — a chain of intermediate items merging two genuine groups —
 * does not arise here, because the gap between sheets is physical empty space
 * with nothing in it.
 *
 * 🛑 With no DPI there is no millimetre, so clustering is SKIPPED and every
 * part lands in group 0. A pixel threshold would mean something different on
 * every scan, and a wrong split reads as a fact about the sheet rather than as
 * a missing measurement.
 */
export function clusterParts(
  parts: readonly PartGeometry[],
  pxPerMm: number | null,
  gapMm: number,
): { clusters: SheetCluster[]; assigned: PartGeometry[] } {
  if (parts.length === 0) {
    return { clusters: [], assigned: [] };
  }

  if (!pxPerMm) {
    return {
      clusters: [
        {
          index: 0,
          bboxPx: unionBox(parts.map((p) => p.bboxPx)),
          partOrdinals: parts.map((p) => p.ordinal),
        },
      ],
      assigned: parts.map((p) => ({ ...p, groupIndex: 0 })),
    };
  }

  const threshold = gapMm * pxPerMm;
  const n = parts.length;
  const parent = new Int32Array(n);
  for (let i = 0; i < n; i++) parent[i] = i;

  const find = (x: number): number => {
    let r = x;
    while (parent[r] !== r) {
      parent[r] = parent[parent[r]!]!;
      r = parent[r]!;
    }
    return r;
  };

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (boxGap(parts[i]!.bboxPx, parts[j]!.bboxPx) <= threshold) {
        const a = find(i);
        const b = find(j);
        if (a !== b) parent[b] = a;
      }
    }
  }

  const groupOf = new Map<number, number>();
  const members = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    let g = groupOf.get(root);
    if (g === undefined) {
      g = groupOf.size;
      groupOf.set(root, g);
      members.set(g, []);
    }
    members.get(g)!.push(i);
  }

  // Order groups top-to-bottom, then left-to-right — reading order, so "sheet 1"
  // is the one a human would call the first.
  const order = [...members.entries()].sort((a, b) => {
    const ba = unionBox(a[1].map((i) => parts[i]!.bboxPx));
    const bb = unionBox(b[1].map((i) => parts[i]!.bboxPx));
    return ba.y - bb.y || ba.x - bb.x;
  });

  const clusters: SheetCluster[] = [];
  const assigned: PartGeometry[] = [];

  order.forEach(([, idxs], index) => {
    const boxes = idxs.map((i) => parts[i]!.bboxPx);
    clusters.push({
      index,
      bboxPx: unionBox(boxes),
      partOrdinals: idxs.map((i) => parts[i]!.ordinal),
    });
    for (const i of idxs) assigned.push({ ...parts[i]!, groupIndex: index });
  });

  assigned.sort((a, b) => a.ordinal - b.ordinal);
  return { clusters, assigned };
}

function unionBox(boxes: readonly Rect[]): Rect {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const b of boxes) {
    if (b.x < x0) x0 = b.x;
    if (b.y < y0) y0 = b.y;
    if (b.x + b.width > x1) x1 = b.x + b.width;
    if (b.y + b.height > y1) y1 = b.y + b.height;
  }
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}
