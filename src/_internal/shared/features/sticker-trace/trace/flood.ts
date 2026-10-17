/*
 * WHY: This is the inversion that fixes the reported bug. The previous tracer
 *      asked "is this pixel background-COLOURED?" and so made every region
 *      inside a sticker that happened to match the paper transparent. This asks
 *      "can the outside REACH this pixel?" — and an enclosed region cannot be
 *      reached whatever colour it is.
 * WHAT: A border-seeded flood through pixels that are background-like AND not
 *       barrier. Everything it fails to reach is sticker.
 *
 * The two failures this closes, stated as the properties that now hold:
 *
 *   1. A white sticker edge on white paper is still found, because the CUT LINE
 *      stops the flood even where the colour does not — the barrier is a ridge
 *      map, not a colour test.
 *   2. A paper-coloured region INSIDE a sticker stays opaque, because the flood
 *      would have to cross that sticker's outline to get there.
 *
 * EXPORTS: FloodResult, floodFromBorder
 *
 * @tag domain:sticker-trace
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:segment
 * @tag sideEffects:none
 */

export interface FloodResult {
  /** 1 where the outside reached. */
  readonly outside: Uint8Array;
  /** `!outside` — every pixel the flood could not reach. */
  readonly inside: Uint8Array;
  /** Fraction of the raster the flood reached; a diagnostic. */
  readonly reach: number;
}

/**
 * Flood inward from the raster border.
 *
 * Seeded from a BAND rather than the single outermost row: a scan frequently
 * has a dark or ragged outermost pixel line (the scanner lid edge, a crop
 * artefact), and seeding only there can start the flood on pixels that are not
 * background-like at all, so it never leaves the edge and the entire sheet is
 * reported as one sticker.
 *
 * Explicit stack, not recursion — a clean paper scan floods millions of pixels
 * in one connected region.
 */
export function floodFromBorder(
  backgroundLike: Uint8Array,
  barrier: Uint8Array,
  width: number,
  height: number,
  seedBand: number,
): FloodResult {
  const outside = new Uint8Array(width * height);
  const stack: number[] = [];

  const passable = (i: number): boolean => backgroundLike[i] === 1 && barrier[i] === 0;

  const seed = (x: number, y: number): void => {
    const i = y * width + x;
    if (outside[i] || !passable(i)) return;
    outside[i] = 1;
    stack.push(i);
  };

  const band = Math.max(1, seedBand);
  for (let y = 0; y < height; y++) {
    const edgeRow = y < band || y >= height - band;
    for (let x = 0; x < width; x++) {
      if (edgeRow || x < band || x >= width - band) seed(x, y);
    }
  }

  // 4-connectivity, matching the component labelling. 8-connectivity would let
  // the flood squeeze through a barrier that touches only diagonally — i.e.
  // through a cut line the ridge detector drew as a perfect stair-step, which
  // is most of them.
  while (stack.length > 0) {
    const i = stack.pop()!;
    const x = i % width;
    const y = (i / width) | 0;

    if (x > 0) {
      const j = i - 1;
      if (!outside[j] && passable(j)) {
        outside[j] = 1;
        stack.push(j);
      }
    }
    if (x < width - 1) {
      const j = i + 1;
      if (!outside[j] && passable(j)) {
        outside[j] = 1;
        stack.push(j);
      }
    }
    if (y > 0) {
      const j = i - width;
      if (!outside[j] && passable(j)) {
        outside[j] = 1;
        stack.push(j);
      }
    }
    if (y < height - 1) {
      const j = i + width;
      if (!outside[j] && passable(j)) {
        outside[j] = 1;
        stack.push(j);
      }
    }
  }

  const inside = new Uint8Array(width * height);
  let reached = 0;
  for (let i = 0; i < outside.length; i++) {
    if (outside[i]) reached++;
    else inside[i] = 1;
  }

  return { outside, inside, reach: reached / outside.length };
}
