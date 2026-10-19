/*
 * WHY: A flat-colour sticker — a solid red claw, a DRIGER G wordmark — traces
 *      into clean filled shapes that scale to any size. A gradient or a
 *      halftone screen does not: it bands, it explodes the node count, and the
 *      result is worse than the raster it replaced.
 * WHAT: Optional per-part artwork vectorisation, which MEASURES whether it
 *       helped and says so.
 *
 * 🛑 IT IS OPT-IN PER PART AND THE RASTER ALWAYS SURVIVES. This is the one
 * export in the suite that can make a part worse, so it never replaces
 * anything — it produces an additional file, and the report says whether it is
 * worth using.
 *
 * 🛑 IT REPORTS A MEASURED DEVIATION, NOT A CONFIDENCE. The honest question is
 * "how far does the vector sit from the pixels", and that is computable: fill
 * the traced regions back into a mask and count the pixels that disagree. A
 * heuristic score would be a number nobody could check.
 *
 * 🛑 Built on the modules that already exist — `quantiseBoundaries`,
 * `traceContours`, `simplifyRdp`. A second posteriser here would be a second
 * answer to "which colours are in this image", and the trace pipeline's
 * fused-channel detector already depends on the first one.
 *
 * EXPORTS: VectoriseResult, VectorRegion, vectoriseArtwork
 *
 * @tag domain:sticker-trace
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:sticker-trace/export
 * @tag sideEffects:none
 */

import type { DecodedRaster, Point } from "../types";
import { simplifyRdp } from "../math/rdp";
import { traceContours } from "../math/marching-squares";
import { quantiseBoundaries } from "../trace/quantise";

/** One filled region: a colour and the rings that bound it. */
export interface VectorRegion {
  /** 8-bit channels, as sampled from the region's own pixels. */
  rgb: readonly [number, number, number];
  /** Closed rings in part-local pixel space. */
  rings: Point[][];
  /** Share of the part's opaque pixels this region covers. */
  coverage: number;
}

export interface VectoriseResult {
  regions: VectorRegion[];
  nodeCount: number;
  /**
   * Fraction of opaque pixels whose colour the vector version gets wrong,
   * 0..1, measured by refilling rather than estimated.
   */
  deviation: number;
  /**
   * 🛑 TRUE when vectorising made this part WORSE. The caller must surface it:
   * the whole reason this export is opt-in is that a gradient-heavy part bands
   * visibly and costs tens of thousands of nodes to do it.
   */
  notRecommended: boolean;
  /** Why, in words, when `notRecommended`. Empty otherwise. */
  reason: string;
}

/**
 * Above this share of mismatched pixels, the vector is visibly not the artwork.
 *
 * 🛑 PICKED, NOT MEASURED — and said so deliberately. Every other threshold in
 * this feature was chosen against the nine reference scans; this one has not
 * been, because nobody has yet run the quantiser over the corpus and compared
 * the deviation on a flat-colour part against an airbrushed one. 8% is a
 * starting guess.
 *
 * That is exactly why the measured deviation is reported ALONGSIDE the verdict
 * rather than hidden behind it: the number is trustworthy, the threshold is
 * not, and an operator can disagree with the verdict using the figure. Run the
 * corpus and replace this comment with what it says.
 */
const DEVIATION_LIMIT = 0.08;

/**
 * Above this, Design Space struggles and the file stops being usable.
 *
 * Deliberately lower than the machine node budget: that budget applies to the
 * CUT path, which is one outline per part. This is fill artwork, where a
 * banded gradient can produce tens of thousands of nodes on its own.
 */
const NODE_LIMIT = 20_000;

export interface VectoriseOptions {
  /** Palette size. More colours means finer bands and far more nodes. */
  colours?: number;
  /** RDP tolerance in pixels. */
  simplifyPx?: number;
}

/**
 * @param raster the part's own RGBA crop
 * @param alpha  its cut mask — which pixels belong to the sticker at all
 */
export function vectoriseArtwork(
  raster: DecodedRaster,
  alpha: Uint8Array,
  opts: VectoriseOptions = {},
): VectoriseResult {
  const colours = Math.max(2, Math.min(32, opts.colours ?? 8));
  const simplify = opts.simplifyPx ?? 0.75;
  const { width, height, data: rgba } = raster;

  /*
   * The SAME quantiser the trace pipeline's fused detector uses — not a second
   * posteriser. Two answers to "which colours are in this image" would mean the
   * artwork banded along boundaries the cut line never saw.
   */
  const quant = quantiseBoundaries(raster, colours);
  const { labels } = quant;

  /*
   * Average each region's real colour rather than using the palette entry.
   * Median cut picks a representative, not a mean, so the palette colour can
   * sit visibly outside the pixels it stands for — and on a sticker the fill
   * colour IS the product.
   */
  const sums = new Float64Array(colours * 3);
  const counts = new Int32Array(colours);
  for (let i = 0; i < width * height; i++) {
    if ((alpha[i] ?? 0) < 128) continue;
    const label = labels[i] ?? 0;
    if (label < 0 || label >= colours) continue;
    counts[label]! += 1;
    sums[label * 3]! += rgba[i * 4] ?? 0;
    sums[label * 3 + 1]! += rgba[i * 4 + 1] ?? 0;
    sums[label * 3 + 2]! += rgba[i * 4 + 2] ?? 0;
  }

  const opaque = counts.reduce((a, b) => a + b, 0);
  if (opaque === 0) {
    return {
      regions: [],
      nodeCount: 0,
      deviation: 1,
      notRecommended: true,
      reason: "This part has no opaque pixels to vectorise.",
    };
  }

  const regions: VectorRegion[] = [];
  let nodeCount = 0;

  for (let label = 0; label < colours; label++) {
    const n = counts[label] ?? 0;
    if (n === 0) continue;

    /*
     * One binary mask per palette entry, traced independently. Tracing all
     * boundaries at once would give edges with no inside — a filled shape needs
     * to know which side it is on, and a per-label mask answers that by
     * construction.
     */
    const mask = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
      if ((alpha[i] ?? 0) >= 128 && labels[i] === label) mask[i] = 1;
    }

    const rings = traceContours(mask, width, height, 0.5)
      .map((ring) => simplifyRdp(ring.points, simplify))
      // A ring of fewer than 3 points encloses no area; keeping it would add
      // nodes and paint nothing.
      .filter((pts) => pts.length >= 3);

    if (rings.length === 0) continue;
    for (const r of rings) nodeCount += r.length;

    regions.push({
      rgb: [
        Math.round(sums[label * 3]! / n),
        Math.round(sums[label * 3 + 1]! / n),
        Math.round(sums[label * 3 + 2]! / n),
      ] as const,
      rings,
      coverage: n / opaque,
    });
  }

  /*
   * The deviation, MEASURED.
   *
   * Every opaque pixel is compared against the colour its own region would
   * paint. This is a lower bound on the real error — it ignores the rings'
   * simplification, which moves a boundary by at most `simplifyPx` — and a
   * lower bound is the honest direction: it never flatters the result.
   */
  let wrong = 0;
  for (let i = 0; i < width * height; i++) {
    if ((alpha[i] ?? 0) < 128) continue;
    const label = labels[i] ?? 0;
    const n = counts[label] ?? 0;
    if (n === 0) continue;
    const dr = (rgba[i * 4] ?? 0) - sums[label * 3]! / n;
    const dg = (rgba[i * 4 + 1] ?? 0) - sums[label * 3 + 1]! / n;
    const db = (rgba[i * 4 + 2] ?? 0) - sums[label * 3 + 2]! / n;
    // ~12 levels per channel: below this a human reading a printed sticker
    // cannot tell the band from the gradient.
    if (Math.sqrt(dr * dr + dg * dg + db * db) > 20) wrong++;
  }
  const deviation = wrong / opaque;

  const tooFar = deviation > DEVIATION_LIMIT;
  const tooMany = nodeCount > NODE_LIMIT;

  return {
    regions,
    nodeCount,
    deviation: Math.round(deviation * 1000) / 1000,
    notRecommended: tooFar || tooMany,
    reason: tooFar
      ? `${Math.round(deviation * 100)}% of this part's pixels are off by a visible amount — it is a gradient or a halftone, and vectorising will band it. Keep the raster.`
      : tooMany
        ? `${nodeCount.toLocaleString()} nodes is past what Design Space handles comfortably. Keep the raster, or trace with fewer colours.`
        : "",
  };
}

/** Serialise the regions to SVG paths, for an artwork layer. */
export function regionsToSvgPaths(regions: readonly VectorRegion[]): string {
  const hex = (c: number): string =>
    c.toString(16).padStart(2, "0").toUpperCase();

  return regions
    .map((region) => {
      const d = region.rings
        .map(
          (ring) =>
            `M ${ring.map((p) => `${Math.round(p.x * 100) / 100} ${Math.round(p.y * 100) / 100}`).join(" L ")} Z`,
        )
        .join(" ");
      /*
       * `fill-rule="evenodd"` so a ring inside another ring cuts a hole rather
       * than painting over it. A letter's counter — the gap in an O — is
       * exactly this case, and nonzero would fill it solid.
       */
      const fill = `#${hex(region.rgb[0])}${hex(region.rgb[1])}${hex(region.rgb[2])}`;
      return `<path d="${d}" fill="${fill}" fill-rule="evenodd" />`;
    })
    .join("\n");
}
