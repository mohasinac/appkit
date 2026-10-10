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
   * 🛑 The confidence signal, and the UI must render a small one as a sample
   * size with NO headline number — the same discipline as `truncated`
   * rendering "50+" rather than a false total. A median of two sales is a coin
   * flip presented as data.
   */
  sampleSize: number;
  byPath?: PriceIndexByPath;
  lastSold?: { amount: number; at: Date; via?: "standard" | "auction" | "offer" };
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
