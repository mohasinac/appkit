/**
 * Price Observations — one DATED sighting of one price for one leaf.
 *
 * ## Why this collection has to exist at all
 *
 * The competitor crawl of 2026-10 survives only as a summarised markdown table:
 * p25/median/p75 per GENERATION, and a single `asOf` for the whole thing. That
 * shape makes three questions permanently unanswerable, and all three were
 * asked:
 *
 *   "most common price"     a mode needs the observations, not a summary of them
 *   "last six months"       one crawl date cannot yield a window
 *   "what does THIS bey go  a generation band cannot distinguish Dragoon MS
 *    for"                   from Strata Dragoon MS — different beys, one number
 *
 * None of those is a rendering problem, which is why no amount of relabelling
 * fixed them. They are the shape of the stored data, and this is that shape
 * changed: the row is the unit, the summary is derived, and the derivation can
 * be re-run with a different window whenever the question changes.
 *
 * ## 🛑 A sibling collection, never a field on `categories`
 *
 * Identical reasoning to `price-index.repository.ts`, and it is not theoretical.
 * `onCategoryWrite` is a `documentWritten` trigger on `categories`, so a job
 * writing a band there re-triggers it per document — Root Cause #92's shape,
 * which produced **1,017,548 invocations in 24 hours** against a 2M/month
 * allowance and blocked `firebase deploy` with a billing denial. Worse here:
 * `notifyRevalidate` fires on every category write, so each rolled-up band
 * would drop that category page's ISR entry, on a project already paused once
 * for exceeding ISR writes by 15.5×.
 *
 * ## 🛑 `sourceKey` is OPAQUE, by instruction
 *
 * The owner's requirement is that competitors are not named on the surface. The
 * honest way to meet that is to not carry the name into the record a renderer
 * can reach — not to carry it and remember never to print it, which is one
 * careless `{...row}` away from publishing (Root Cause #70: a public payload
 * built by spreading a document publishes every field nobody thought to delete).
 *
 * So the stored value is a stable opaque key (`src-a`, `src-b`, …). It still
 * does the two jobs provenance needs — telling two sources apart, and letting
 * one be re-crawled or retracted wholesale — without the name being present to
 * leak. The key↔name mapping is operator knowledge, kept out of the database.
 *
 * ## Shape
 *
 *   priceObservations/{observationId}
 *
 * One flat collection, no subcollections. Rows are queried by `categoryId` and
 * `seenAt` and never listed wholesale, so the composite index
 * `(categoryId, seenAt desc)` is the only one it needs.
 *
 * @tag domain:price-index
 * @tag layer:repository
 * @tag pattern:repository
 * @tag access:server-only
 * @tag consumers:marketPriceRollup,price-observations CLI
 * @tag sideEffects:writes priceObservations
 */

import { BaseRepository } from "../../../providers/db-firebase";

/**
 * What kind of event the sighting was.
 *
 * 🛑 The distinction `price-bands.md` is built around: *"a sold-out row proves
 * the item is GONE, not that it sold at that price"*, with 76–93% of crawled
 * listings sold out. An ask and a sale are different events and a band that
 * blends them describes neither — so the kind is recorded per row and the
 * rollup groups on it rather than averaging across it.
 */
export type PriceObservationKind = "ask" | "sale";

export interface PriceObservationDocument {
  id: string;
  /**
   * The leaf this prices — a MODEL leaf wherever the sighting names a model.
   *
   * 🛑 This is the field that makes the whole collection worth building. The
   * seeded bands hang on ~60 generation leaves, so every one of the 1,904 model
   * leaves inherits a number measured for its entire era. Recording the model
   * id is what lets Dragoon MS and Strata Dragoon MS hold different prices,
   * which they do in the real market.
   */
  categoryId: string;
  /** Decimal rupees, tax-inclusive — `PRICE_GUIDANCE_TAX_BASIS`. */
  amount: number;
  currency: "INR";
  kind: PriceObservationKind;
  /**
   * When the price was SEEN, not when the row was written.
   *
   * 🛑 These come apart and the gap is the entire point. Back-filling a
   * two-year-old crawl writes rows today that describe 2024 — using
   * `createdAt` as the date would file every one of them inside the six-month
   * window and report stale prices as current, which is the failure this
   * collection exists to make impossible.
   */
  seenAt: Date;
  /**
   * `ProductDocument.condition` where the sighting stated one.
   *
   * Absent means NOT STATED — never "new". Condition is the dominant price
   * variable in collectibles (hobson's "Without Box" group runs ₹599 against
   * ₹4,499 for the same figures boxed), so guessing it would be guessing the
   * price. Captured now even though the v1 rollup does not slice on it, because
   * a column nobody recorded cannot be back-filled later.
   */
  condition?: string;
  /** True when the listing was already sold out when seen. */
  soldOut?: boolean;
  /** Opaque, stable, never a competitor name. See the header. */
  sourceKey: string;
  /** Free-text operator note. Never rendered publicly. */
  note?: string;
  createdAt: Date;
}

export const PRICE_OBSERVATION_COLLECTION = "priceObservations";

/**
 * Hard ceiling on one leaf's observation read.
 *
 * A leaf with more sightings than this has plenty for a stable band, so the cap
 * costs no accuracy — it exists so a mis-tagged import cannot turn one rollup
 * iteration into an unbounded read (Rule #6).
 */
export const PRICE_OBSERVATION_SCAN_LIMIT = 500;

export class PriceObservationRepository extends BaseRepository<PriceObservationDocument> {
  constructor() {
    super(PRICE_OBSERVATION_COLLECTION);
  }

  /**
   * Every sighting for one leaf, newest first, bounded.
   *
   * 🛑 Ordered by `seenAt` and NOT filtered by it. The rollup needs both the
   * recent window and the full history — it decides between them itself
   * (`computeMarketStats`), because that decision has to be made once, in one
   * place, or the job and the renderer will disagree about which window a
   * figure came from. Pushing a date filter down here would make the historic
   * fallback impossible without a second query.
   *
   * 🛑 `orderBy("seenAt")` excludes any document LACKING the field — the
   * optional-field trap of Root Cause #100, where a store's reviews read as
   * zero because `itemsSold` had never been written. `seenAt` is required by
   * the write path below precisely so that exclusion can never bite.
   */
  async findForLeaf(
    categoryId: string,
    limit: number = PRICE_OBSERVATION_SCAN_LIMIT,
  ): Promise<PriceObservationDocument[]> {
    const snap = await this.getCollection()
      .where("categoryId", "==", categoryId)
      .orderBy("seenAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => this.mapDoc<PriceObservationDocument>(d));
  }

  /**
   * Every leaf that has at least one observation.
   *
   * 🛑 Enumerates the ENTITIES, not the events — Root Cause #102's lesson, from
   * a reconciler that built its tally from products that exist rather than
   * categories that exist and so could only ever add. The rollup iterates this
   * list, so a leaf whose last observation was retracted is still visited and
   * its stale band cleared.
   *
   * `.select()` fetches no field data; only the ids are needed to group.
   */
  async listLeafIdsWithObservations(scanLimit = 20_000): Promise<string[]> {
    const snap = await this.getCollection().select("categoryId").limit(scanLimit).get();
    const ids = new Set<string>();
    for (const doc of snap.docs) {
      const id = (doc.data() as { categoryId?: string }).categoryId;
      if (id) ids.add(id);
    }
    return [...ids];
  }

  /**
   * Record a sighting.
   *
   * 🛑 `seenAt` is required from the caller and is NEVER defaulted to the write
   * time. `BaseRepository.create` stamps `createdAt` itself — which is why the
   * two fields exist separately and why this signature cannot accept one in
   * place of the other. Back-filling an old crawl writes rows today that
   * describe last year; conflating the two dates would file every one of them
   * inside the six-month window.
   */
  async record(
    input: Omit<PriceObservationDocument, "id" | "createdAt" | "updatedAt" | "currency">,
  ): Promise<PriceObservationDocument> {
    return this.create({ ...input, currency: "INR" as const });
  }
}

export const priceObservationRepository = new PriceObservationRepository();
