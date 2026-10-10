/**
 * Price guidance, stated on the basis the SELLER is typing in.
 *
 * `CategoryPriceGuidance` is advisory — it renders as a hint beside the price
 * input and is never written to `price`. This module answers the one question
 * that hint cannot be rendered without: **inclusive of what?**
 *
 * ## The invariant
 *
 * 🛑 **Every figure in a guidance band is TAX-INCLUSIVE.** Both halves, for
 * different reasons, and neither is a choice we get to make:
 *
 *   `market` — competitor ASKS. An Indian storefront's displayed price is
 *              inclusive by market convention, and worldhobbyshop asserts it
 *              outright in its own JSON-LD (`valueAddedTaxIncluded: true`).
 *   `sold`   — our own completed sales, derived from `items[].unitPrice`, and
 *              every stored price in this system is tax-inclusive.
 *
 * So the basis is a documented property of the data rather than a per-row
 * field. A `basis: "inclusive"` column whose every value is the same string is
 * a field that cannot answer a question, and the first row to carry the other
 * value would be a bug rather than a variant.
 *
 * ## Why the hint still has to say so
 *
 * A seller with `pricesIncludeGst: false` types EX-TAX numbers. Their ₹999 and
 * an inclusive ₹999 band are **different quantities** — comparing them is off
 * by the rate, silently, in the direction that makes their listing look
 * cheaper than the market when it is dearer. The hint therefore converts the
 * band into the seller's own basis and labels which one it is on.
 *
 * Pure arithmetic and strings. No React, no Firestore.
 */

import {
  taxableFromInclusive,
  grossFromTaxable,
} from "../../fees/calculator";
import type { CategoryPriceGuidance } from "../../../../features/categories/schemas/category-content";

/**
 * The basis every stored and crawled guidance figure is on.
 *
 * Exported as a named constant so the claim is greppable from the places that
 * depend on it, and so a future change is one edit rather than an archaeology
 * exercise across the renderer, the seed helper and the rollup job.
 */
export const PRICE_GUIDANCE_TAX_BASIS = "inclusive" as const;

export interface PriceGuidanceBasis {
  /**
   * How the seller types prices — `StoreDocument.pricesIncludeGst`.
   *
   * 🛑 ABSENT means `true`, matching the schema default and the store route's
   * `?? true`. Three places now agree on that reading; a fourth that treated
   * absence as `false` would convert a band for a seller who never asked.
   */
  sellerIncludesGst?: boolean;
  /**
   * The rate that will be written onto this listing, resolved the same way
   * `deriveTaxonomy` resolves it (product → category tax code → default).
   *
   * `0` is a deliberate exemption and `undefined` is "we could not resolve
   * one" — and the two must not be collapsed here any more than anywhere else
   * in this codebase. See `describePriceGuidanceBasis`.
   */
  gstRate?: number;
}

/** Whether a conversion is needed at all, and possible. */
function shouldConvert(basis: PriceGuidanceBasis): boolean {
  const includes = basis.sellerIncludesGst ?? true;
  return !includes && typeof basis.gstRate === "number" && basis.gstRate > 0;
}

/**
 * One guidance amount, restated on the seller's basis.
 *
 * Inclusive seller, exempt item, or an unresolved rate → unchanged. The last
 * of those is deliberate: converting at `DEFAULT_GST_RATE` would be a guess
 * presented as arithmetic, and the label says so instead.
 */
export function priceGuidanceAmountOnSellerBasis(
  amount: number,
  basis: PriceGuidanceBasis,
): number {
  if (!shouldConvert(basis)) return amount;
  return taxableFromInclusive(amount, basis.gstRate as number);
}

/** The inverse — a seller's typed figure, restated as the band's basis. */
export function sellerAmountOnGuidanceBasis(
  amount: number,
  basis: PriceGuidanceBasis,
): number {
  if (!shouldConvert(basis)) return amount;
  return grossFromTaxable(amount, basis.gstRate as number);
}

/**
 * The whole guidance object, restated on the seller's basis.
 *
 * 🛑 `sampleSize`, `windowDays`, `soldOutShare` and `asOf` are NOT money and
 * pass through untouched. Mapping every numeric field would silently divide a
 * sample size by 1.05 — the kind of defect that produces a plausible number
 * nobody can trace, which is the failure mode this plan keeps finding.
 */
export function priceGuidanceOnSellerBasis(
  guidance: CategoryPriceGuidance,
  basis: PriceGuidanceBasis,
): CategoryPriceGuidance {
  if (!shouldConvert(basis)) return guidance;
  const on = (n: number) => priceGuidanceAmountOnSellerBasis(n, basis);
  return {
    ...guidance,
    market: guidance.market
      ? {
          ...guidance.market,
          median: on(guidance.market.median),
          ...(guidance.market.p25 === undefined ? {} : { p25: on(guidance.market.p25) }),
          ...(guidance.market.p75 === undefined ? {} : { p75: on(guidance.market.p75) }),
        }
      : undefined,
    sold: guidance.sold
      ? {
          ...guidance.sold,
          min: on(guidance.sold.min),
          median: on(guidance.sold.median),
          max: on(guidance.sold.max),
        }
      : undefined,
    lastSold: guidance.lastSold
      ? { ...guidance.lastSold, amount: on(guidance.lastSold.amount) }
      : undefined,
  };
}

/** What the hint must say about which basis its figures are on. */
export interface PriceGuidanceBasisNote {
  /** A short suffix for the figures themselves — "incl. GST", "before GST". */
  suffix: string;
  /**
   * The longer explanation, or `null` when there is nothing worth saying.
   *
   * `null` for the common case — an inclusive seller on a taxed item is
   * already comparing like with like, so a sentence telling them so is noise
   * that trains people to stop reading hints.
   */
  note: string | null;
  /** True when the figures were restated rather than shown as stored. */
  converted: boolean;
}

/**
 * Four cases, and the fourth is the one worth having this function for.
 *
 * | seller basis | rate        | figures   | says |
 * |---|---|---|---|
 * | inclusive    | > 0         | unchanged | "incl. GST" |
 * | exclusive    | > 0         | CONVERTED | "before GST", and that it was converted |
 * | either       | 0           | unchanged | nothing about tax — an exempt item has none |
 * | exclusive    | unresolved  | unchanged | 🛑 that they are NOT comparable |
 *
 * 🛑 The exempt case must not say "incl. GST". The figure is a bare amount and
 * claiming a tax basis on it is false — which is precisely the lie the seller
 * form's old `?? 0` default told on every listing before C0c defect 6.
 */
export function describePriceGuidanceBasis(
  basis: PriceGuidanceBasis,
): PriceGuidanceBasisNote {
  const includes = basis.sellerIncludesGst ?? true;
  const rate = basis.gstRate;

  if (rate === 0) {
    return { suffix: "", note: null, converted: false };
  }

  if (includes) {
    return { suffix: "incl. GST", note: null, converted: false };
  }

  if (typeof rate !== "number" || rate <= 0) {
    return {
      suffix: "incl. GST",
      note:
        "Your store prices exclude GST, so these figures are not directly comparable to what you type — the tax rate for this category could not be resolved.",
      converted: false,
    };
  }

  return {
    suffix: "before GST",
    note: `Market figures are tax-inclusive; shown here with ${rate}% GST removed to match how your store prices.`,
    converted: true,
  };
}
