/*
 * WHY: The price tool showed a MEDIAN of a competitor crawl, taken once, at
 *      GENERATION level — so Dragoon MS and Strata Dragoon MS reported the
 *      same ₹3,999 (they are different beys), Dragoon G reported nothing at
 *      all (Engine Gear was never crawled), and a figure measured in October
 *      would still read as current a year later. The owner's ask was precise:
 *      the headline should be the price most sightings actually cluster on,
 *      the low and high should describe the LAST SIX MONTHS, and anything
 *      older should be used only when there is nothing recent.
 * WHAT: The pure statistics behind that — mode over price buckets, a recency
 *       window with an explicit historic fallback, and the provenance flags a
 *       renderer needs to avoid overclaiming.
 *
 * EXPORTS:
 *   RECENT_WINDOW_DAYS      — the six-month window, as days
 *   MIN_BAND_OBSERVATIONS   — below this there is no band at all
 *   MIN_MODE_OBSERVATIONS   — below this there is no mode, only a median
 *   PriceObservationSample  — the minimum a sighting must carry
 *   MarketStats             — one computed band
 *   priceBucketWidth        — the bucket a price falls in, by magnitude
 *   computeMarketStats      — samples -> a band, or null
 *
 * ## 🛑 Why MODE, and why it is bucketed
 *
 * A median answers "what is the middle of this list" and a mode answers "what
 * do people actually charge", and for a collectible those differ. Six sightings
 * at ₹6,500 and three clearance ones at ₹3,000 have a median of ₹6,500 only by
 * luck of the ordering; add two more cheap ones and the median drops to ₹3,000
 * while the going rate has not moved at all. The mode does not do that.
 *
 * 🛑 But an EXACT-VALUE mode is a trap on this data. Retail listings cluster on
 * round price points (₹999, ₹1,399, ₹2,999) where exact mode works perfectly —
 * and private resale does not (₹6,400, ₹6,500, ₹6,600 are one market and three
 * distinct values). An exact mode would report "no mode" for precisely the
 * second-hand market this tool exists to describe. So values are bucketed by
 * magnitude first.
 *
 * 🛑 The reported figure is the MEDIAN OF THE WINNING BUCKET, never the bucket
 * edge. A bucket boundary is an artefact of our arithmetic; quoting ₹6,500 when
 * the bucket is 6,250–6,750 and the sightings were 6,400/6,500/6,600 reports a
 * price somebody actually asked. Quoting the edge would invent one.
 *
 * ## 🛑 Recency is a MEASUREMENT, not a label
 *
 * `basedOnRecent` is false whenever the six-month window could not carry the
 * band on its own, and the renderer must say "all time" in that case. Printing
 * "last 6 months" over figures drawn from a three-year-old crawl is the exact
 * dishonesty this module was written to remove — and it is invisible, because a
 * stale number looks identical to a current one.
 *
 * ## 🛑 Why this is in `features/`, not `_internal/shared/`
 *
 * It needs THREE consumers — the scheduled rollup, the `price-observations`
 * CLI, and anything that later wants to restate a band — and `_internal/` is
 * not reachable from a standalone script through the package's export map. A
 * CLI that could not import it would have to re-derive "the mode, bucketed,
 * with a six-month window", which is Root Cause #75's exact shape: a rule
 * reachable only by copy-paste gets copied, and the copy never learns about the
 * branch added later. `lookup-target.ts` sits here for the same reason — pure,
 * shared, no React, no Firestore.
 *
 * @tag domain:price-index
 * @tag layer:feature
 * @tag pattern:pure-function
 * @tag access:isomorphic
 * @tag consumers:marketPriceRollup,price-observations CLI,PriceIndexToolView
 * @tag sideEffects:none
 */

/**
 * Six months, the window the owner specified for "recent".
 *
 * 182 rather than 180: it is half of 365, so a year's data splits into exactly
 * two windows and "the last six months" cannot quietly mean a different span
 * depending on which months they were.
 */
export const RECENT_WINDOW_DAYS = 182;

/**
 * Below this, NO band is published for a leaf.
 *
 * Three, matching `PRICE_INDEX_MIN_CONFIDENT_SAMPLES` on the sold half — the
 * two halves of this page must not disagree about what counts as evidence, and
 * the sold half's reasoning ("a median of two sales is a coin flip presented as
 * data") is about sample size, not about which side of the page it is on.
 */
export const MIN_BAND_OBSERVATIONS = 3;

/**
 * Below this, the band publishes a MEDIAN and no mode.
 *
 * A "most common price" derived from a bucket containing one sighting is not a
 * most-common anything — it is that one sighting, relabelled. Two is the
 * smallest number for which the word means what it says.
 */
export const MIN_MODE_OBSERVATIONS = 2;

/** The minimum a sighting must carry to be counted. */
export interface PriceObservationSample {
  /** Decimal rupees, tax-inclusive — the basis every price in this app is on. */
  amount: number;
  /** When it was SEEN. Not when we wrote the row. */
  seenAt: Date;
}

/** One computed band, plus everything a renderer needs to describe it. */
export interface MarketStats {
  /**
   * The headline: the price sightings cluster on.
   *
   * 🛑 `undefined` when no bucket reached `MIN_MODE_OBSERVATIONS` — every
   * sighting was a different price, so there is no cluster to report. The
   * renderer falls back to `median` and must change its label when it does.
   */
  mode?: number;
  /** How many sightings sat in the winning bucket. Absent with no mode. */
  modeCount?: number;
  /** Always present. The fallback headline, and context beside the mode. */
  median: number;
  low: number;
  high: number;
  sampleSize: number;
  /**
   * 🛑 FALSE means `low`/`high`/`mode` describe ALL TIME, because the
   * six-month window held too little to stand on its own. The renderer must
   * relabel rather than silently presenting old figures as current.
   */
  basedOnRecent: boolean;
  /** The span actually used — `RECENT_WINDOW_DAYS`, or the full data span. */
  windowDays: number;
  /** The most recent sighting in the set the band was computed from. */
  lastSeenAt: Date;
}

/**
 * Bucket width by magnitude.
 *
 * Proportional rather than fixed, because a ₹50 bucket is three separate
 * buckets across ₹99–₹249 part pricing and a rounding error on a ₹9,999 grail.
 * The widths are ~2–5% of the value throughout, so "the same price" means the
 * same thing at every price point.
 */
export function priceBucketWidth(amount: number): number {
  if (amount < 500) return 25;
  if (amount < 1_000) return 50;
  if (amount < 5_000) return 100;
  if (amount < 20_000) return 250;
  return 1_000;
}

/** The inclusive-lower bucket key a price falls in. */
function bucketOf(amount: number): number {
  const width = priceBucketWidth(amount);
  return Math.floor(amount / width) * width;
}

function medianOf(sorted: readonly number[]): number {
  const n = sorted.length;
  if (n === 0) return 0;
  const mid = n >> 1;
  // Even n averages the two middles, which can land between two real prices.
  // That is correct for a median and is why it is never the headline figure.
  return n % 2 === 1 ? (sorted[mid] as number) : (((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2);
}

/** Whole rupees. Every price in this system is a decimal rupee amount. */
function round(n: number): number {
  return Math.round(n);
}

/**
 * The band for one leaf, or `null` when there is not enough to say anything.
 *
 * 🛑 `null`, never a zeroed band. A band of ₹0 renders as a real figure meaning
 * "this sells for nothing", which is strictly worse than silence — the same
 * rule `CategoryPriceGuidance.sold` is held to ("absent until there are some —
 * never zeroed").
 *
 * The recency decision happens ONCE here and is reported in `basedOnRecent`, so
 * the job, the CLI and the renderer cannot each arrive at a different answer
 * about which window a figure came from.
 */
export function computeMarketStats(
  samples: readonly PriceObservationSample[],
  now: Date = new Date(),
): MarketStats | null {
  const usable = samples.filter(
    (s) => Number.isFinite(s.amount) && s.amount > 0 && s.seenAt instanceof Date && !Number.isNaN(s.seenAt.getTime()),
  );
  if (usable.length < MIN_BAND_OBSERVATIONS) return null;

  const cutoff = now.getTime() - RECENT_WINDOW_DAYS * 86_400_000;
  const recent = usable.filter((s) => s.seenAt.getTime() >= cutoff);

  /*
   * 🛑 The whole fallback, in one decision. The six-month window is used when
   * it can carry a band ALONE; otherwise the full history is, and the caller is
   * told. A blend of the two would be neither — and would be undetectable,
   * since the result is a number either way.
   */
  const basedOnRecent = recent.length >= MIN_BAND_OBSERVATIONS;
  const set = basedOnRecent ? recent : usable;

  const amounts = set.map((s) => s.amount).sort((a, b) => a - b);
  const lastSeenAt = set.reduce(
    (max, s) => (s.seenAt.getTime() > max.getTime() ? s.seenAt : max),
    set[0]!.seenAt,
  );

  /*
   * Buckets, with their members kept — the reported mode is the median of the
   * winning bucket's real prices, so the members cannot be discarded for a
   * count alone.
   */
  const buckets = new Map<number, number[]>();
  for (const amount of amounts) {
    const key = bucketOf(amount);
    const existing = buckets.get(key);
    if (existing) existing.push(amount);
    else buckets.set(key, [amount]);
  }

  let bestMembers: number[] | undefined;
  for (const members of buckets.values()) {
    if (members.length < MIN_MODE_OBSERVATIONS) continue;
    if (!bestMembers || members.length > bestMembers.length) {
      bestMembers = members;
      continue;
    }
    /*
     * 🛑 A tie breaks toward the DEARER bucket, deliberately. The two failure
     * directions are not symmetric: a seller shown too low a figure leaves
     * money on the table on a sale that still happens, while a buyer shown too
     * low a figure arrives at the listing expecting a price that does not
     * exist. Breaking toward the cheaper bucket optimises for the second.
     */
    if (members.length === bestMembers.length && (members[0] as number) > (bestMembers[0] as number)) {
      bestMembers = members;
    }
  }

  const median = round(medianOf(amounts));

  return {
    ...(bestMembers
      ? {
          // The median of the winning bucket's members — a price somebody
          // actually asked, not the arithmetic edge of our own bucket.
          mode: round(medianOf(bestMembers)),
          modeCount: bestMembers.length,
        }
      : {}),
    median,
    low: round(amounts[0] as number),
    high: round(amounts[amounts.length - 1] as number),
    sampleSize: set.length,
    basedOnRecent,
    windowDays: basedOnRecent ? RECENT_WINDOW_DAYS : spanDays(set),
    lastSeenAt,
  };
}

/**
 * The real span of a sample set, for the historic-fallback case.
 *
 * Reported rather than left as `RECENT_WINDOW_DAYS`, because "all time" has to
 * mean a measurable number of days for the renderer to say anything honest
 * about it — "over the 14 months we have data for" is a statement; "all time"
 * alone is not.
 */
function spanDays(set: readonly PriceObservationSample[]): number {
  let min = set[0]!.seenAt.getTime();
  let max = min;
  for (const s of set) {
    const t = s.seenAt.getTime();
    if (t < min) min = t;
    if (t > max) max = t;
  }
  return Math.max(1, Math.round((max - min) / 86_400_000));
}
