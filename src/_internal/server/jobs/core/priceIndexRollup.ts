/**
 * Core: the realised-price index — what things actually SOLD for here.
 *
 * ## Why this exists
 *
 * Every price signal we show a seller today is an ASK: the seeded `market`
 * band is a competitor's listed price, and a competitor's sold-out row proves
 * the item is GONE, not that it sold at that figure. With 76–93% of listings
 * across the crawled catalogues never selling, the gap between an ask and a
 * realised price is the single most useful thing we can tell a seller — and we
 * are the only party who can measure it on our own sales.
 *
 * A seeded blog post already tells sellers to *"check what similar items sold
 * for on LetItRip in the last 30 days"*, which has never been possible.
 *
 * ## 🛑 `market` and `sold` are NEVER blended
 *
 * They answer different questions and the gap IS the information. Averaging
 * them would launder an inference into a measurement. This job writes only the
 * sold half, into its own collection, and never touches the seeded band.
 *
 * ## The authoritative field
 *
 * **`OrderDocument.items[].unitPrice`** — and specifically not:
 *
 *   `OrderDocument.unitPrice`  the FIRST line's price (`unitPriceFor(items[0])`),
 *                              wrong for every other line
 *   `OrderDocument.totalPrice` folds in GST, platform fee, shipping and add-ons
 *   `BidDocument.status==won`  its own comment: `orderId` is absent on a
 *                              won-but-unpaid bid
 *   `OfferDocument==accepted`  an agreement, not a sale. `paid` is the sale
 *   `product.currentBid`       a display mirror a pending buyout never writes
 *
 * Won auctions and accepted offers arrive through the same field via
 * `lockedPrice`, so one field covers all six acquisition paths and
 * `sourceContext` labels each for free.
 *
 * ## Why daily and never live
 *
 * A live index would scan orders per request — the unbounded-per-request
 * pattern that paused this project on Hobby caps. One pre-computed read per
 * row, with a visible "prices as of {date}". Deliberately one day stale.
 */

import { orderRepository, productRepository } from "../../../../repositories";
import {
  priceIndexRepository,
  type PriceIndexBand,
  type PriceIndexByPath,
  type PriceIndexConditionBand,
} from "../../../../features/categories/repository/price-index.repository";
import type { JobContext } from "../runtime/types";

/** How far back a band looks. */
export const PRICE_INDEX_WINDOW_DAYS = 90;

/**
 * Hard ceiling on the products scan.
 *
 * The scan exists only to build `productId → categorySlugs[0]`, and that join
 * disappears for future orders once `categorySlugs[0]` is snapshotted onto the
 * order item (done in the same change as this job). So the cap is a guard
 * against a catalogue that grows faster than the snapshot backfills, not a
 * permanent design limit — and it is logged when it bites rather than
 * truncating silently.
 */
const PRODUCT_SCAN_LIMIT = 5000;

interface SaleSample {
  amount: number;
  at: Date;
  via: "standard" | "auction" | "offer";
  /**
   * The condition this unit was in when it sold, or `undefined` when nothing
   * recorded it.
   *
   * 🛑 `undefined` is carried rather than defaulted to anything. Bucketing an
   * unknown condition under `"used"` — or under a synthetic `"unknown"` that
   * then renders as a band — would publish a figure for a market nobody
   * measured. A sample with no condition still counts toward the parent band,
   * because its AMOUNT is a real sale; it is only the per-condition slice it
   * cannot inform.
   */
  condition?: string;
}

/** An order item as this job reads it. Structural, because documents vary. */
interface OrderItemLike {
  productId?: string;
  unitPrice?: number;
  quantity?: number;
  cancelledQuantity?: number;
  /** Snapshotted leaf (new orders). Absent on anything written before it. */
  categorySlug?: string;
  listingType?: string;
  /** Snapshotted condition (new orders); falls back to the product map. */
  condition?: string;
}

interface OrderLike {
  id?: string;
  status?: string;
  paymentStatus?: string;
  refunds?: unknown[];
  items?: OrderItemLike[];
  createdAt?: Date | string;
  orderDate?: Date | string;
  orderType?: string;
  sourceContext?: { path?: string };
}

function toDate(v: Date | string | undefined): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Which acquisition path produced this sale.
 *
 * `sourceContext.path` is the richer signal — it distinguishes a settled
 * auction win from a buy-now, which `orderType` cannot (both are `"auction"`).
 * Falls back to `orderType`, then to `standard`.
 */
function pathOf(order: OrderLike): SaleSample["via"] {
  const p = order.sourceContext?.path ?? order.orderType;
  if (p === "auction-won" || p === "auction-buy-now" || p === "auction") return "auction";
  if (p === "offer-accepted" || p === "offer") return "offer";
  return "standard";
}

/**
 * 🛑 Completed means delivered AND paid AND not refunded.
 *
 * The repo's convention elsewhere is `delivered` alone, and **nothing
 * currently excludes a delivered-then-refunded order** — whose realised price
 * is zero. Including one would publish a sale that was undone as evidence of
 * what things sell for.
 */
function isCompleted(order: OrderLike): boolean {
  if (order.status !== "delivered") return false;
  if (order.paymentStatus !== "paid") return false;
  return !(order.refunds && order.refunds.length > 0);
}

function median(sorted: number[]): number {
  const n = sorted.length;
  if (n === 0) return 0;
  const mid = Math.floor(n / 2);
  const raw = n % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
  return Math.round(raw * 100) / 100;
}

/**
 * The arithmetic mean, to the paisa.
 *
 * 🛑 Not a substitute for the median — see `PriceIndexBand.mean`. Both are
 * computed and both are stored, because on a collectibles leaf one grail sale
 * moves the mean and not the median, and the gap is the thing worth seeing.
 */
function mean(amounts: number[]): number {
  if (amounts.length === 0) return 0;
  const total = amounts.reduce((s, a) => s + a, 0);
  return Math.round((total / amounts.length) * 100) / 100;
}

/** The newest sample, or null for an empty set. */
function latestOf(samples: SaleSample[]): SaleSample | null {
  return samples.reduce<SaleSample | null>((best, s) => (!best || s.at > best.at ? s : best), null);
}

function toConditionBand(samples: SaleSample[]): PriceIndexConditionBand {
  const amounts = samples.map((s) => s.amount).sort((a, b) => a - b);
  const latest = latestOf(samples);
  return {
    min: amounts[0]!,
    median: median(amounts),
    max: amounts[amounts.length - 1]!,
    mean: mean(amounts),
    sampleSize: samples.length,
    ...(latest ? { lastSold: { amount: latest.amount, at: latest.at } } : {}),
  };
}

function toBand(samples: SaleSample[]): PriceIndexBand {
  const amounts = samples.map((s) => s.amount).sort((a, b) => a - b);
  const byPath: PriceIndexByPath = {};
  for (const s of samples) byPath[s.via] = (byPath[s.via] ?? 0) + 1;
  const latest = latestOf(samples);

  /*
   * The per-condition slice.
   *
   * 🛑 Samples with no recorded condition are SKIPPED here while still counting
   * toward the parent band above — their amount is a real sale, but they cannot
   * tell us what condition sold for what. Bucketing them anywhere would invent
   * a market.
   *
   * 🛑 And the key is omitted entirely rather than written as `{}` when nothing
   * qualifies. An empty object renders as "we measured conditions and found
   * none", which is false; absence renders as "no breakdown available", which
   * is true. Same reasoning as `undefined` vs `0` on a count (Root Cause #72).
   */
  const byConditionSamples = new Map<string, SaleSample[]>();
  for (const s of samples) {
    if (!s.condition) continue;
    const bucket = byConditionSamples.get(s.condition) ?? [];
    bucket.push(s);
    byConditionSamples.set(s.condition, bucket);
  }
  const byCondition: Record<string, PriceIndexConditionBand> = {};
  for (const [condition, bucket] of byConditionSamples) {
    byCondition[condition] = toConditionBand(bucket);
  }

  return {
    min: amounts[0]!,
    median: median(amounts),
    max: amounts[amounts.length - 1]!,
    mean: mean(amounts),
    sampleSize: samples.length,
    byPath,
    ...(Object.keys(byCondition).length > 0 ? { byCondition } : {}),
    ...(latest ? { lastSold: { amount: latest.amount, at: latest.at, via: latest.via } } : {}),
  };
}

/** `YYYYMMDD` in UTC, so the id is stable regardless of where the job runs. */
function utcDateKey(d: Date): string {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
}

export async function runPriceIndexRollup(ctx: JobContext): Promise<void> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - PRICE_INDEX_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  /*
   * One products scan into a MAP, never N `findById` calls.
   *
   * `storeAnalytics.ts:94` does the per-item lookup and it is the pattern not
   * to copy — an order with 4 items costs 4 reads there, so a 90-day window
   * over a growing order list is an unbounded read multiplier.
   */
  const products = await productRepository.list({
    page: 1,
    pageSize: PRODUCT_SCAN_LIMIT,
  });
  const rows = products.items ?? [];
  if (rows.length >= PRODUCT_SCAN_LIMIT) {
    ctx.logger.warn("priceIndexRollup: product scan saturated — the leaf join may be incomplete", {
      limit: PRODUCT_SCAN_LIMIT,
    });
  }
  const leafOf = new Map<string, string>();
  const typeOf = new Map<string, string>();
  const conditionOf = new Map<string, string>();
  for (const p of rows) {
    if (!p.id) continue;
    const leaf = p.categorySlugs?.[0];
    if (leaf) leafOf.set(p.id, leaf);
    if (p.listingType) typeOf.set(p.id, p.listingType);
    if (p.condition) conditionOf.set(p.id, p.condition);
  }

  const delivered = (await orderRepository.findByStatus("delivered")) as unknown as OrderLike[];

  /** leafId → listingType → samples */
  const byLeaf = new Map<string, Map<string, SaleSample[]>>();
  let considered = 0;
  let skippedNoLeaf = 0;

  for (const order of delivered) {
    if (!isCompleted(order)) continue;
    const at = toDate(order.orderDate) ?? toDate(order.createdAt);
    if (!at || at < cutoff) continue;
    const via = pathOf(order);

    for (const item of order.items ?? []) {
      const amount = Number(item.unitPrice ?? 0);
      if (!Number.isFinite(amount) || amount <= 0) continue;
      /*
       * A fully-cancelled line is not a sale. A partially-cancelled one is —
       * the units that shipped sold at that unit price, and the unit price is
       * what a band is made of, so the quantity does not weight it.
       */
      const live = (item.quantity ?? 1) - (item.cancelledQuantity ?? 0);
      if (live <= 0) continue;

      /*
       * The snapshot first, the join second. New orders carry
       * `categorySlug` and need no products read at all; older ones fall
       * back to the map. An item whose product has since been deleted
       * resolves to neither and is COUNTED AS SKIPPED rather than dropped
       * silently — a band missing sales is indistinguishable from a quiet
       * category unless somebody says so.
       */
      const leaf = item.categorySlug ?? (item.productId ? leafOf.get(item.productId) : undefined);
      if (!leaf) {
        skippedNoLeaf += 1;
        continue;
      }
      const listingType =
        item.listingType ?? (item.productId ? typeOf.get(item.productId) : undefined) ?? "standard";

      const types = byLeaf.get(leaf) ?? new Map<string, SaleSample[]>();
      /*
       * 🛑 The product's CURRENT condition is a fallback, not the answer.
       *
       * A seller who relists the same slug after refurbishing it changes
       * `product.condition`, which would retroactively re-file an old sale
       * under the new condition — the same class of lie as recomputing GST
       * from a changed tax code, which is why `hsnCode`/`gstRate`/`finalSale`
       * are all snapshotted on the order item. `condition` now is too, and
       * the map only answers for orders written before that.
       */
      const condition =
        item.condition ?? (item.productId ? conditionOf.get(item.productId) : undefined);

      const samples = types.get(listingType) ?? [];
      samples.push({ amount, at, via, ...(condition ? { condition } : {}) });
      types.set(listingType, samples);
      byLeaf.set(leaf, types);
      considered += 1;
    }
  }

  const dateKey = utcDateKey(now);
  let written = 0;

  for (const [leafId, types] of byLeaf) {
    const byListingType: Record<string, PriceIndexBand> = {};
    const point: Record<string, { median: number; sampleSize: number }> = {};
    for (const [listingType, samples] of types) {
      const band = toBand(samples);
      byListingType[listingType] = band;
      point[listingType] = { median: band.median, sampleSize: band.sampleSize };
    }
    /*
     * 🛑 Only leaves WITH sales are written, and nothing is ever zeroed.
     *
     * An absent band means "we have no sales here", which the UI renders as
     * silence. A zeroed one would render as "things sell here for ₹0", which
     * is worse than silence and is exactly what a defaulting write would
     * manufacture on the first quiet night. A refund removing the last sale in
     * a leaf therefore leaves a stale band for a day and then it ages out of
     * the window — which is the correct behaviour for a figure labelled "as
     * of" a date.
     */
    await priceIndexRepository.setForLeaf(leafId, {
      byListingType,
      windowDays: PRICE_INDEX_WINDOW_DAYS,
    });
    await priceIndexRepository.setDailyPoint(leafId, dateKey, point);
    written += 1;
  }

  ctx.logger.info("priceIndexRollup: complete", {
    deliveredScanned: delivered.length,
    salesCounted: considered,
    leavesWritten: written,
    skippedNoLeaf,
    windowDays: PRICE_INDEX_WINDOW_DAYS,
  });
}
