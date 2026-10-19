/*
 * WHY: The realised-price tool rendered "No completed sales recorded here yet"
 *      for every single lookup, because the only data it read was OUR completed
 *      sales and we have none for most leaves. Meanwhile the competitor crawl
 *      measured ~60 real bands (`MARKET_BANDS` in
 *      `seed/_helpers/category-content.ts`, evidence in
 *      `docs/research/competitor-crawl-2026-10/price-bands.md`) which were
 *      seeded onto the taxonomy and then read by exactly one surface — the
 *      seller form's hint. The tool had a starting point the whole time and
 *      never looked at it.
 * WHAT: The MARKET half of the tool, resolved by the shared nearest-first
 *       ancestor walk. Signed-in only — see the gate note below.
 *
 * EXPORTS:
 *   PriceIndexMarketRow           — one leaf's market band, API shape
 *   getPriceIndexMarketForIds     — N category ids -> their market bands
 *
 * ── 🛑 WHY THIS IS A SEPARATE, AUTHENTICATED ENDPOINT ───────────────────────
 *
 * The sold half (`searchPriceIndex`, `getPriceIndexBandsForIds`) is PUBLIC and
 * edge-cached, deliberately: a day-stale aggregate of our own completed sales
 * is the strongest content we can publish and is not what the guest price gate
 * protects. The market half is the opposite call, and the reasoning is already
 * written down at `categories/api/[id]/price-guidance/route.ts`: publishing a
 * competitor-derived band on an unauthenticated, publicly-cacheable response
 * "would be exactly the 'a neighbouring surface publishes the range' leak that
 * gate exists to close".
 *
 * So the two halves cannot share a response. Merging `market` into
 * `getPriceIndexBandsForIds` would either poison that public cache with
 * viewer-dependent content — one signed-in lookup populating the entry every
 * guest then reads, the exact failure `cachedPublicRead`'s rules exist to
 * prevent — or force the public half to go private and lose its cache. A
 * sibling endpoint keeps both postures correct, and it is the same split the
 * codebase already uses for `description-template` (public) against
 * `price-guidance` (gated).
 *
 * ── 🛑 WHAT IS NOT DONE HERE: the seller tax-basis conversion ───────────────
 *
 * The seller route restates the band on the caller's own `pricesIncludeGst`
 * basis. This one does not, for two reasons. The figures are tax-inclusive
 * (`PRICE_GUIDANCE_TAX_BASIS`) and so is every price a buyer sees anywhere on
 * the site, so for the tool's audience no conversion is the correct answer
 * rather than a missing feature. And the conversion needs a store read per
 * lookup, which on a tool that resolves up to eight leaves at a time would be
 * a per-request cost paid to restate a number most callers want as stored. The
 * renderer labels the basis instead.
 *
 * @tag domain:price-index
 * @tag layer:server
 * @tag pattern:projection
 * @tag access:server-only
 * @tag consumers:api/tools/price-index/market
 * @tag sideEffects:none
 */

import { resolveInheritedGuidanceMany } from "../categories/price-guidance-resolve";
import { PRICE_GUIDANCE_TAX_BASIS } from "../../../shared/features/categories/price-guidance";
import { PRICE_INDEX_SEARCH_LIMIT } from "./search";

export interface PriceIndexMarketRow {
  categoryId: string;
  /**
   * The typical ASK, not a transaction.
   *
   * 🛑 `median` is the only required figure, and the three optional ones are
   * optional because the crawl genuinely did not measure them everywhere — Hot
   * Wheels has a median over n=7,418 and a RANGE, never quartiles, and the
   * Beyblade-top table carries no per-leaf `n` at all. An absent field must
   * render as absent; filling one in to make the shape look complete is the
   * single thing `price-bands.md` warns about most.
   */
  median: number;
  p25?: number;
  p75?: number;
  sampleSize?: number;
  asOf?: string;
  /**
   * The share of competitor listings at this level that are SOLD OUT (0.85,
   * measured across the five largest catalogues).
   *
   * Carried because it is what stops the band being read as a clearing price:
   * most asks at this level did not convert. The renderer must say so.
   */
  soldOutShare?: number;
  /** Which crawl, and any caveat — pooling, a disagreeing source, a small n. */
  source?: string;
  /**
   * `true` when the band came from an ANCESTOR rather than this leaf.
   *
   * 🛑 Load-bearing, not decoration. `MARKET_BANDS` is keyed on era and part
   * leaves, never on the ~216 named-model leaves, so a model lookup resolves
   * its generation's band — "typical for Burst DB" is a true statement and
   * "typical for Rage Longinus" is not. The renderer names the source leaf so
   * the reader can tell which they are being told.
   */
  inherited: boolean;
  /** The ancestor the band actually came from, when `inherited`. */
  viaCategoryId?: string;
  viaName?: string;
  /** The basis every figure above is on. Always inclusive; stated, not assumed. */
  taxBasis: typeof PRICE_GUIDANCE_TAX_BASIS;
}

/**
 * Market bands for the leaves the client already resolved.
 *
 * Bounded by `PRICE_INDEX_SEARCH_LIMIT` — the same cap the public half uses, so
 * a crafted request cannot demand an unbounded read, and the two halves of one
 * lookup can never disagree about how many rows a lookup covers.
 *
 * A leaf with no band at any level is ABSENT from the result rather than
 * present with a null band. "We have no market evidence for this" and "this id
 * does not exist" are different answers and the caller renders them
 * differently; collapsing them is how a missing band becomes a confident ₹0.
 */
export async function getPriceIndexMarketForIds(
  rawIds: readonly string[],
): Promise<PriceIndexMarketRow[]> {
  const ids = [...new Set(rawIds.filter((id) => typeof id === "string" && id.length > 0))].slice(
    0,
    PRICE_INDEX_SEARCH_LIMIT,
  );
  if (ids.length === 0) return [];

  const guidanceById = await resolveInheritedGuidanceMany(ids);

  const rows: PriceIndexMarketRow[] = [];
  for (const id of ids) {
    const resolved = guidanceById.get(id);
    const market = resolved?.guidance.market;
    // No band anywhere up the chain. Omitted, never zeroed.
    if (!market || !resolved) continue;

    rows.push({
      categoryId: id,
      median: market.median,
      ...(market.p25 === undefined ? {} : { p25: market.p25 }),
      ...(market.p75 === undefined ? {} : { p75: market.p75 }),
      ...(market.sampleSize === undefined ? {} : { sampleSize: market.sampleSize }),
      ...(toIso(market.asOf) ? { asOf: toIso(market.asOf) } : {}),
      ...(market.soldOutShare === undefined ? {} : { soldOutShare: market.soldOutShare }),
      ...(market.source ? { source: market.source } : {}),
      inherited: resolved.inherited,
      /*
       * Only when inherited. Naming the leaf as its own source would be noise
       * on a card that is already headed by that leaf's name.
       */
      ...(resolved.inherited
        ? {
            viaCategoryId: resolved.fromCategoryId,
            ...(resolved.fromName ? { viaName: resolved.fromName } : {}),
          }
        : {}),
      taxBasis: PRICE_GUIDANCE_TAX_BASIS,
    });
  }
  return rows;
}

/** Firestore `Timestamp` | `Date` | ISO string -> ISO string. */
function toIso(v: unknown): string | undefined {
  if (!v) return undefined;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") return v;
  const t = v as { toDate?: () => Date };
  if (typeof t.toDate === "function") return t.toDate().toISOString();
  return undefined;
}
