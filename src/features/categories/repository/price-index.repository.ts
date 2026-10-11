/**
 * Price Index Repository — what things actually SOLD for here, per leaf.
 *
 * ## 🛑 Why this is its own collection and not a field on `categories`
 *
 * The obvious design is `categories/{leafId}.productDefaults.priceGuidance.sold`,
 * beside the seed-owned `market` band it is shown next to. That design is a
 * runaway-trigger hazard and it is not a theoretical one.
 *
 * `onCategoryWrite` is a `documentWritten` trigger on `categories`, so a job
 * writing a price band there re-triggers it once per document. That is exactly
 * the shape of Root Cause #92, where `onShipmentHeaderWrite` wrote back to the
 * collection it watched and produced **1,017,548 invocations in 24 hours**
 * against a 2M/month allowance, blocked `firebase deploy` with a billing
 * denial, and degraded production.
 *
 * It is also worse than that here, because `notifyRevalidate` fires on every
 * category write — so each nightly price write would drop that category page's
 * ISR entry, on a project that was paused for exceeding ISR writes by 15.5×.
 *
 * A sibling collection removes the self-write entirely. It costs one extra
 * read on the surface that shows the band, and buys immunity.
 *
 * ## Shape
 *
 *   priceIndex/{leafId}                 the current band
 *   priceIndex/{leafId}/daily/{YYYYMMDD}  one point per day, for a series
 *
 * 🛑 NO `soldPrices: number[]` on the document. `CategoryDocument.metrics`
 * already carries two unbounded arrays and a third is the 1 MiB trap. The
 * samples stay in job memory and only the summary is written.
 */

import { BaseRepository } from "../../../providers/db-firebase";

/** Which acquisition path a sale came through. Counts, not amounts. */
export interface PriceIndexByPath {
  standard?: number;
  auction?: number;
  offer?: number;
}

export interface PriceIndexDocument {
  /** The LEAF category id. A sale rolls up to exactly one leaf. */
  id: string;
  currency: "INR";
  /**
   * Scoped by listing type WITHIN the leaf.
   *
   * 🛑 Load-bearing. A named-model leaf holds every listing type for that
   * model — the bey, its stickers, its spare parts, a used one as a classified
   * — because `listingType` and `categorySlugs` are independent axes. A ₹399
   * sticker sheet and a ₹1,299 bey under one leaf would blend into a
   * meaningless band, so the band is per type and the UI shows the one the
   * seller is listing.
   */
  byListingType: Record<string, PriceIndexBand>;
  /** How many days of completed sales the bands cover. */
  windowDays: number;
  computedAt: Date;
}

export interface PriceIndexBand {
  min: number;
  median: number;
  max: number;
  /**
   * The arithmetic MEAN, carried alongside the median rather than instead of
   * it.
   *
   * 🛑 They are different quantities and the gap between them is information,
   * so neither substitutes for the other — the same discipline the market-vs-
   * sold pair is held to. On a collectibles leaf the two routinely diverge:
   * nine ₹900 sales and one ₹9,000 grail give a median of ₹900 and a mean of
   * ₹1,710, and a buyer told only the mean concludes the item costs ₹1,710,
   * while a seller told only the median prices a mint example like a loose one.
   *
   * Which is "the average" depends on the question, which is exactly why the
   * renderer shows both and labels them rather than picking.
   */
  mean: number;
  /**
   * 🛑 The confidence signal, and the UI must render a small one as a sample
   * size with NO headline number — the same discipline as `truncated`
   * rendering "50+" rather than a false total. A median of two sales is a coin
   * flip presented as data.
   */
  sampleSize: number;
  byPath?: PriceIndexByPath;
  /**
   * Per-CONDITION bands within this listing type.
   *
   * 🛑 The single most requested breakdown and the one the blended band hides.
   * Condition is the dominant price variable in collectibles — the crawl
   * measured WHS keeping midfake/damaged/incomplete stock in a separate
   * Clearance category precisely because it cannot be priced with the rest, and
   * hobson's "Without Box" group runs at a ₹599 median against ₹4,499 for the
   * same boxed figures. A leaf band spanning `new` and `poor` is an average of
   * two different markets.
   *
   * Keyed by `ProductDocument.condition`. Absent when no sale in the window
   * recorded one — NOT zeroed, and not back-filled with a guess: "we do not
   * know what condition these sold in" is a different statement from "they sold
   * in unknown condition", and only the first is true.
   */
  byCondition?: Record<string, PriceIndexConditionBand>;
  lastSold?: { amount: number; at: Date; via?: "standard" | "auction" | "offer" };
}

/**
 * A condition slice. Deliberately NARROWER than `PriceIndexBand` — no
 * `byPath`, no nested `byCondition`, no recursion.
 *
 * Slicing a 90-day leaf window by both listing type and condition leaves
 * single-digit samples fast, so a third axis inside it would be arithmetic on
 * one sale. `sampleSize` is here for exactly that reason and the renderer must
 * gate on it with the same threshold as the parent.
 */
export interface PriceIndexConditionBand {
  min: number;
  median: number;
  max: number;
  mean: number;
  sampleSize: number;
  lastSold?: { amount: number; at: Date };
}

/** One day's point, for a series. */
export interface PriceIndexDailyPoint {
  id: string;
  /** `YYYYMMDD`, so the document id sorts chronologically on its own. */
  date: string;
  byListingType: Record<string, Pick<PriceIndexBand, "median" | "sampleSize">>;
  computedAt: Date;
}

export const PRICE_INDEX_COLLECTION = "priceIndex";
const DAILY_SUBCOLLECTION = "daily";

/**
 * Below this, a band renders as a sample size and no headline figure.
 *
 * Exported because the renderer and the job must agree: a threshold the job
 * applied and the UI did not would hide bands that exist, and the reverse
 * would publish a median of one sale as a market rate.
 */
export const PRICE_INDEX_MIN_CONFIDENT_SAMPLES = 3;

export class PriceIndexRepository extends BaseRepository<PriceIndexDocument> {
  constructor() {
    super(PRICE_INDEX_COLLECTION);
  }

  async getForLeaf(leafId: string): Promise<PriceIndexDocument | null> {
    return this.findById(leafId);
  }

  /**
   * Bands for several leaves in ONE round trip.
   *
   * 🛑 `db.getAll`, not N `findById` calls. The search tool resolves a query to
   * up to 8 candidate leaves and needs a band for each; eight sequential reads
   * is eight round trips against the ~3 Rule #6 budgets for a request, and it
   * is the exact shape `storeAnalytics.ts:94` is cited as the pattern NOT to
   * copy. `deriveTaxonomy`'s ancestor resolution made the same call for the
   * same reason.
   *
   * 🛑 A missing document is OMITTED from the map, never returned as an empty
   * band. A leaf with no completed sales must render "no sales recorded yet",
   * and a zeroed band would render "₹0" — a confident, wrong figure, which is
   * the failure mode the whole index is written to avoid (`market` vs `sold`,
   * never blended, never zeroed).
   */
  async getManyForLeaves(leafIds: readonly string[]): Promise<Map<string, PriceIndexDocument>> {
    const ids = [...new Set(leafIds.filter(Boolean))];
    const out = new Map<string, PriceIndexDocument>();
    if (ids.length === 0) return out;
    const refs = ids.map((id) => this.db.collection(PRICE_INDEX_COLLECTION).doc(id));
    const snaps = await this.db.getAll(...refs);
    for (const snap of snaps) {
      if (!snap.exists) continue;
      out.set(snap.id, { ...(snap.data() as PriceIndexDocument), id: snap.id });
    }
    return out;
  }

  /**
   * Write the current band for one leaf.
   *
   * `createWithId`/`update` rather than a blind `set`, matching every other
   * rollup repository here — and `update` merges, so a leaf whose band for one
   * listing type disappeared this run would keep the stale entry. Hence
   * `byListingType` is replaced wholesale by passing the full map.
   */
  async setForLeaf(
    leafId: string,
    data: Pick<PriceIndexDocument, "byListingType" | "windowDays">,
  ): Promise<void> {
    const payload = { currency: "INR" as const, ...data, computedAt: new Date() };
    const existing = await this.findById(leafId);
    if (existing) {
      await this.update(leafId, payload);
    } else {
      await this.createWithId(leafId, payload);
    }
  }

  /**
   * Append today's point.
   *
   * Keyed on the date, so a re-run on the same day OVERWRITES rather than
   * double-counting — the same idempotency `pageViewRollup`'s `throughDate`
   * buys, achieved here by the document id instead of a cursor.
   */
  async setDailyPoint(
    leafId: string,
    date: string,
    byListingType: PriceIndexDailyPoint["byListingType"],
  ): Promise<void> {
    await this.db
      .collection(PRICE_INDEX_COLLECTION)
      .doc(leafId)
      .collection(DAILY_SUBCOLLECTION)
      .doc(date)
      .set({ date, byListingType, computedAt: new Date() }, { merge: true });
  }
}

export const priceIndexRepository = new PriceIndexRepository();
