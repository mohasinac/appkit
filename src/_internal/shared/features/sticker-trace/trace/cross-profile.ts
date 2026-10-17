/*
 * WHY: Two measured failures pointed at the same wrong assumption.
 *
 *      (1) On art sheets a threshold sweep never converged — 209 parts at 31%
 *          barrier coverage, still 36 at 1.0%, monotonic with no minimum.
 *      (2) The colour-quantisation assist made torch-pegases WORSE (209 -> 257
 *          at default, 182 vs 36 at high threshold).
 *
 *      Both follow from treating AMPLITUDE as the discriminator. It is not.
 *      The cut line on torch-pegases measured +22 against +-1 noise — moderate
 *      — while the sheet's own lettering and logos are far higher contrast. So
 *      raising the bar removes cuts and keeps artwork, which is exactly
 *      backwards, and a colour-boundary detector marks precisely the artwork.
 *
 *      The physics gives the real discriminator. A kiss cut is a groove
 *      pressed into ONE piece of material: the scanner sees a shadow/highlight
 *      doublet, and then the colour RETURNS to what it was. An artwork edge
 *      separates two different colours and does not return.
 * WHAT: Keep a barrier pixel only when the material either side of it matches.
 *
 * This also inverts the quantisation channel's role on art sheets: a colour
 * boundary is EVIDENCE AGAINST a cut, not for one. The plan's "fusion must
 * help, never hurt" check is what surfaced that, by running the corpus with
 * the channel off and on rather than assuming a second signal can only add.
 *
 * EXPORTS: keepSameMaterialBarrier
 *
 * @tag domain:sticker-trace
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:segment
 * @tag sideEffects:none
 */

import type { DecodedRaster } from "../types";

function colourDistance(
  d: Uint8Array,
  p: number,
  q: number,
): number {
  const dr = d[p]! - d[q]!;
  const dg = d[p + 1]! - d[q + 1]!;
  const db = d[p + 2]! - d[q + 2]!;
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);
}

/**
 * Filter a barrier to the pixels whose two sides are the same material.
 *
 * `probe` must clear the line's own width — it is sampled from the UNFILTERED
 * raster, so landing inside the groove reads the shadow rather than the
 * material and every cut would look like an edge. 4px is comfortable for a
 * 1-3px kiss cut at the working resolution.
 *
 * `tolerance` is a weighted colour distance. Generous on purpose: the two
 * sides of a real groove differ slightly from lighting and scanner noise, and
 * a tight tolerance rejects genuine cuts on any gradient — which is most of
 * this corpus.
 */
/**
 * 🛑 This returns a per-pixel SCORE, and must not be used to filter the
 * barrier directly. That was tried and measured: hard-dropping every barrier
 * pixel whose sides differ breaks a cut loop wherever it happens to cross a
 * colour boundary, the complement stops being enclosed, and the whole sheet
 * collapses into one region — 0 parts on four of five art scans.
 *
 * The score is instead fed to the region merge as its boundary strength, where
 * a broken run costs a little evidence rather than the entire outline.
 */
export function sameMaterialScore(
  raster: DecodedRaster,
  barrier: Uint8Array,
  luma: Float32Array,
  tolerance: number,
  probe = 4,
): { score: Float32Array; meanScore: number } {
  const { width, height, data } = raster;
  const score = new Float32Array(barrier.length);
  let total = 0;
  let n = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!barrier[i]) continue;

      // Local gradient gives the direction ACROSS the line. Central
      // differences on the already-prefiltered luminance, which is smooth
      // enough that a 3-tap estimate is stable.
      const xm = Math.max(0, x - 1);
      const xp = Math.min(width - 1, x + 1);
      const ym = Math.max(0, y - 1);
      const yp = Math.min(height - 1, y + 1);
      const gx = luma[y * width + xp]! - luma[y * width + xm]!;
      const gy = luma[yp * width + x]! - luma[ym * width + x]!;

      const mag = Math.hypot(gx, gy);
      if (mag < 1e-3) {
        // No orientation to sample across — score it neutral-positive rather
        // than guessing. A barrier pixel with no local gradient is usually the
        // interior of a thick linked run, which carries no evidence either way.
        score[i] = 0.5;
        total += 0.5;
        n++;
        continue;
      }

      const nx = gx / mag;
      const ny = gy / mag;

      const ax = Math.round(x + nx * probe);
      const ay = Math.round(y + ny * probe);
      const bx = Math.round(x - nx * probe);
      const by = Math.round(y - ny * probe);

      // A probe leaving the raster cannot be judged, so keep rather than drop —
      // stickers that run to the sheet edge are common and must not lose their
      // outline to a sampling artefact.
      if (ax < 0 || ay < 0 || bx < 0 || by < 0 || ax >= width || ay >= height || bx >= width || by >= height) {
        score[i] = 0.5;
        total += 0.5;
        n++;
        continue;
      }

      const dist = colourDistance(data, (ay * width + ax) * 4, (by * width + bx) * 4);

      // 1 = the two sides are the same material (a groove), 0 = plainly
      // different colours (an artwork boundary). Continuous rather than a
      // threshold so a boundary that is mostly groove still outweighs one that
      // is mostly print when the two are averaged along a shared edge.
      const v = Math.max(0, 1 - dist / Math.max(1, tolerance));
      score[i] = v;
      total += v;
      n++;
    }
  }

  return { score, meanScore: n > 0 ? total / n : 0 };
}
