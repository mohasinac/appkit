/**
 * Market Price Index — the COMPUTED asking-price band for one leaf.
 *
 * The third collection in a deliberate trio, and the three are not
 * interchangeable:
 *
 *   `priceObservations`  one dated sighting          (raw, append-only)
 *   `marketPriceIndex`   what asks cluster on        (derived, this file)
 *   `priceIndex`         what SOLD here              (derived, our own orders)
 *
 * 🛑 The second and third are never blended, and the rule predates this file:
 * *"They are rendered side by side and never averaged. The gap between them is
 * the most useful thing we can tell a seller."* An ask is not a sale — 76–93%
 * of crawled competitor listings are sold out without ever converting — so a
 * blended figure would describe neither event and could not be unpicked later.
 *
 * ## 🛑 Why this is not written onto `categories`
 *
 * Same reason as its two siblings, and it is a measured one rather than a
 * stylistic preference: `onCategoryWrite` is a `documentWritten` trigger on
 * `categories`, and Root Cause #92 is a trigger that wrote back to the
 * collection it watched producing **1,017,548 invocations in 24 hours**.
 * `notifyRevalidate` also fires on every category write, so a nightly band
 * write would drop each category page's ISR entry on a project that has
 * already been paused once for ISR-write overage.
 *
 * ## 🛑 It does NOT replace the seeded band — it OUTRANKS it
 *
 * `CategoryPriceGuidance.market` stays exactly as seeded. A computed band wins
 * where one exists, and where one does not the seeded generation band still
 * shows, clearly labelled as the generation's. Overwriting the seed would mean
 * a single bad import could erase the only evidence ~60 leaves have, with no
 * way back — the same trap as `priceIndexRollup` being forbidden from touching
 * `market`.
 *
 * @tag domain:price-index
 * @tag layer:repository
 * @tag pattern:repository
 * @tag access:server-only
 * @tag consumers:marketPriceRollup,price-guidance-resolve,price-index/market
 * @tag sideEffects:writes marketPriceIndex
 */

import { BaseRepository } from "../../../providers/db-firebase";
import type { PriceObservationKind } from "./price-observation.repository";

/** One computed band. Mirrors `MarketStats` plus its provenance. */
export interface MarketPriceBand {
  /**
   * The price sightings cluster on — the headline.
   *
   * 🛑 Optional, and the renderer must branch. Absent means no bucket held two
   * or more sightings, i.e. every observed price was different, so there is no
   * "most common" to report and `median` is shown under a different label. A
   * mode synthesised from a single sighting would be that sighting wearing a
   * word that implies consensus.
   */
  mode?: number;
  modeCount?: number;
  median: number;
  low: number;
  high: number;
  sampleSize: number;
  /**
   * 🛑 FALSE means low/high/mode describe ALL TIME, not the last six months —
   * the window held too little to stand alone. The renderer must relabel. A
   * figure drawn from a two-year-old crawl is indistinguishable from a current
   * one once printed, which is why this travels with the band rather than being
   * inferred from `computedAt`.
   */
  basedOnRecent: boolean;
  windowDays: number;
  /** Newest sighting in the set the band came from. Not the rollup time. */
  lastSeenAt: Date;
}

export interface MarketPriceIndexDocument {
  /** The leaf id — model, era, part group, whatever was observed. */
  id: string;
  currency: "INR";
  /**
   * Bands kept APART by event kind, never merged.
   *
   * Keyed by `PriceObservationKind`. `ask` is what shops list at; `sale` is
   * what we have evidence changed hands at elsewhere. Most leaves will only
   * ever have `ask`, and that is an honest state rather than a gap.
   */
  byKind: Partial<Record<PriceObservationKind, MarketPriceBand>>;
  computedAt: Date;
}

export const MARKET_PRICE_INDEX_COLLECTION = "marketPriceIndex";

export class MarketPriceIndexRepository extends BaseRepository<MarketPriceIndexDocument> {
  constructor() {
    super(MARKET_PRICE_INDEX_COLLECTION);
  }

  /**
   * Bands for several leaves in ONE round trip.
   *
   * 🛑 `db.getAll`, not N `findById` calls — the same decision, for the same
   * reason, as `PriceIndexRepository.getManyForLeaves`: the tool resolves up to
   * `PRICE_INDEX_SEARCH_LIMIT` leaves per lookup and N sequential reads is N
   * round trips against Rule #6's ~3-per-request budget.
   *
   * A missing document is OMITTED, never returned as an empty band — "no
   * computed band here" and "this leaf does not exist" are different answers,
   * and a zeroed band renders as a confident ₹0.
   */
  async getManyForLeaves(leafIds: readonly string[]): Promise<Map<string, MarketPriceIndexDocument>> {
    const ids = [...new Set(leafIds.filter(Boolean))];
    const out = new Map<string, MarketPriceIndexDocument>();
    if (ids.length === 0) return out;
    const refs = ids.map((id) => this.db.collection(MARKET_PRICE_INDEX_COLLECTION).doc(id));
    const snaps = await this.db.getAll(...refs);
    for (const snap of snaps) {
      if (!snap.exists) continue;
      out.set(snap.id, { ...(snap.data() as MarketPriceIndexDocument), id: snap.id });
    }
    return out;
  }

  /**
   * Write one leaf's bands.
   *
   * `byKind` is replaced WHOLESALE rather than merged: `update` merges, so a
   * kind whose observations were all retracted would keep its stale band
   * forever — the same reason `PriceIndexRepository.setForLeaf` passes the full
   * map rather than a patch.
   */
  async setForLeaf(leafId: string, byKind: MarketPriceIndexDocument["byKind"]): Promise<void> {
    const payload = { currency: "INR" as const, byKind, computedAt: new Date() };
    const existing = await this.findById(leafId);
    if (existing) await this.update(leafId, payload);
    else await this.createWithId(leafId, payload);
  }

  /**
   * Drop a leaf's bands entirely.
   *
   * Reachable state, not defensive coding: a leaf whose observations are all
   * retracted, or all fall below `MIN_BAND_OBSERVATIONS` after a retraction,
   * must stop publishing a band. Leaving the last computed one in place would
   * publish a figure derived from evidence that no longer exists.
   */
  async clearForLeaf(leafId: string): Promise<void> {
    const existing = await this.findById(leafId);
    if (existing) await this.delete(leafId);
  }
}

export const marketPriceIndexRepository = new MarketPriceIndexRepository();
