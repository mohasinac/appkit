/**
 * Core: the ASKING-price index — what a thing is currently going for, per leaf.
 *
 * ## Why this exists
 *
 * The price tool's market half was a single crawl, summarised to
 * p25/median/p75 per GENERATION and frozen at one `asOf` date. Three things
 * followed from that shape, none of which was fixable in the renderer:
 *
 *   · **Every model in an era showed the same number.** Dragoon MS and Strata
 *     Dragoon MS are different beys with different markets, and both reported
 *     ₹3,999 because both inherited the Hard Metal System band.
 *   · **Whole eras showed nothing.** Engine Gear was never crawled, so Dragoon
 *     G and Dranzer G — two of the better-known tops in the line — resolved to
 *     no band at any ancestor and rendered an empty card.
 *   · **Nothing could age.** One date for the entire dataset means a figure
 *     measured last October reads exactly like one measured yesterday.
 *
 * This job replaces the summary with a derivation over dated rows, so the
 * window is a parameter rather than a property of the data.
 *
 * ## 🛑 What it writes, and what it must never touch
 *
 * Writes `marketPriceIndex/{leafId}` ONLY. It does not write `categories`
 * (Root Cause #92's self-triggering write, plus an ISR drop per row) and it
 * does not write `priceIndex`, which is the SOLD half and belongs to
 * `priceIndexRollup`. The seeded `CategoryPriceGuidance.market` band is left
 * exactly as seeded and is outranked at read time, never overwritten — a bad
 * import must not be able to erase the only evidence ~60 leaves have.
 *
 * ## 🛑 Enumerates LEAVES, not observations
 *
 * Root Cause #102: a reconciler that tallies from the events that exist rather
 * than the entities that exist can only ever add, so a leaf whose last
 * observation was retracted keeps a band forever. The leaf list is built first,
 * and a leaf that no longer clears `MIN_BAND_OBSERVATIONS` has its band
 * CLEARED rather than skipped.
 *
 * ## Why daily and never live
 *
 * Same answer as the sold half: a live index would scan observations per
 * request, which is the unbounded-per-request pattern that paused this project
 * on Hobby caps. One pre-computed read per row, with the window and the
 * last-seen date travelling beside the figures.
 *
 * @tag domain:price-index
 * @tag layer:job
 * @tag pattern:rollup
 * @tag access:server-only
 * @tag consumers:scheduled.marketPriceRollup
 * @tag sideEffects:writes marketPriceIndex
 */

import {
  marketPriceIndexRepository,
  type MarketPriceBand,
  type MarketPriceIndexDocument,
} from "../../../../features/categories/repository/market-price-index.repository";
import {
  priceObservationRepository,
  type PriceObservationDocument,
  type PriceObservationKind,
} from "../../../../features/categories/repository/price-observation.repository";
import {
  computeMarketStats,
  MIN_BAND_OBSERVATIONS,
  RECENT_WINDOW_DAYS,
  type PriceObservationSample,
} from "../../../../features/price-index/market-stats";
import type { JobContext } from "../runtime/types";

/**
 * Firestore `Timestamp` | `Date` | ISO string -> `Date`.
 *
 * `mapDoc` hands back whatever the driver produced, and a `Timestamp` has no
 * `getTime`. `computeMarketStats` filters on `instanceof Date`, so an
 * unconverted value would be silently DROPPED from the sample set rather than
 * throwing — a band quietly computed over fewer rows than it had.
 */
function toDate(v: unknown): Date | null {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const t = v as { toDate?: () => Date } | null;
  if (t && typeof t.toDate === "function") {
    const d = t.toDate();
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * 🛑 Ask and sale are grouped SEPARATELY, never pooled.
 *
 * `price-bands.md`'s governing rule — *"a sold-out row proves the item is
 * GONE, not that it sold at that price"*, against 76–93% of crawled listings
 * being sold out. Pooling them would produce a figure describing neither event,
 * and the pooling would be undetectable afterwards because the result is a
 * number either way.
 */
function groupByKind(
  rows: readonly PriceObservationDocument[],
): Map<PriceObservationKind, PriceObservationSample[]> {
  const out = new Map<PriceObservationKind, PriceObservationSample[]>();
  for (const row of rows) {
    const seenAt = toDate(row.seenAt);
    if (!seenAt) continue;
    if (!Number.isFinite(row.amount) || row.amount <= 0) continue;
    const kind: PriceObservationKind = row.kind === "sale" ? "sale" : "ask";
    const bucket = out.get(kind) ?? [];
    bucket.push({ amount: row.amount, seenAt });
    out.set(kind, bucket);
  }
  return out;
}

/**
 * 🛑 Returns `void`, and the counts go to the LOG rather than to a caller.
 *
 * `ScheduleHandler` is `(ctx) => Promise<void>`, and matching it exactly is
 * what lets `marketPriceRollupHandler` be a bare alias instead of a wrapper
 * that discards a value — the same shape `priceIndexRollup` already has. A
 * result object with no reader would also be speculative infrastructure: the
 * only consumer today is an operator reading the run log, and
 * `ctx.logger.info` is what they read.
 */
export async function runMarketPriceRollup(ctx: JobContext): Promise<void> {
  const now = new Date();
  const leafIds = await priceObservationRepository.listLeafIdsWithObservations();

  let written = 0;
  let cleared = 0;
  let counted = 0;

  for (const leafId of leafIds) {
    const rows = await priceObservationRepository.findForLeaf(leafId);
    counted += rows.length;

    const byKind: MarketPriceIndexDocument["byKind"] = {};
    for (const [kind, samples] of groupByKind(rows)) {
      const stats = computeMarketStats(samples, now);
      // `null` means the kind did not clear MIN_BAND_OBSERVATIONS. Omitted,
      // never zeroed — a ₹0 band renders as a real price meaning "worthless".
      if (!stats) continue;
      byKind[kind] = stats as MarketPriceBand;
    }

    if (Object.keys(byKind).length === 0) {
      /*
       * 🛑 CLEARED, not skipped. This is the retraction path: a leaf whose
       * observations were removed, or which dropped below the threshold, must
       * stop publishing. Skipping would leave the last computed band standing
       * on evidence that no longer exists — and it would look identical to a
       * freshly computed one.
       */
      await marketPriceIndexRepository.clearForLeaf(leafId);
      cleared += 1;
      continue;
    }

    await marketPriceIndexRepository.setForLeaf(leafId, byKind);
    written += 1;
  }

  ctx.logger.info("marketPriceRollup: complete", {
    leavesScanned: leafIds.length,
    leavesWritten: written,
    leavesCleared: cleared,
    observationsCounted: counted,
    recentWindowDays: RECENT_WINDOW_DAYS,
    minObservations: MIN_BAND_OBSERVATIONS,
  });
}
