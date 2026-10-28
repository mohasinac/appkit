/**
 * India GST — the default `ITaxProvider`.
 *
 * ## 🛑 This DELEGATES. Every figure still comes from `calculateGst` /
 * `calculateGstInclusive`.
 *
 * Not a rewrite, on purpose. Those two functions split the intra-state half
 * differently and the difference is load-bearing:
 *
 *   calculateGst           cgst = sgst = round(gst / 2); gst RE-DERIVED as half*2
 *   calculateGstInclusive  cgst = round(gst / 2); sgst = round(gst - cgst)
 *
 * Measured on ₹66.67 at 18% inclusive: cgst 5.09, sgst 5.08 — the remainder
 * lands in sgst so the parts still sum to 10.17. Reimplementing the maths here
 * to make the two agree would move a paisa on figures GST is filed on. The
 * seam's whole value is that it adds an abstraction WITHOUT touching arithmetic.
 *
 * Verified by `.build-memory/tax-roundtrip.mjs` — 397 breakdowns across every
 * slab, both supply directions and the rounding edges, byte-identical.
 *
 * @tag domain:tax
 * @tag layer:provider
 * @tag access:isomorphic
 */
import {
  ITaxProvider,
  type TaxBreakdown,
  type TaxJurisdiction,
  type TaxableItem,
} from "../../contracts/tax";
import {
  calculateGst,
  calculateGstInclusive,
  type GstBreakdown,
} from "../../_internal/shared/fees/calculator";

/** CGST and SGST are each HALF the headline rate; IGST carries all of it. */
function componentsFrom(breakdown: GstBreakdown, rate: number) {
  const half = rate / 2;
  if (breakdown.igst > 0 || (breakdown.cgst === 0 && breakdown.sgst === 0 && breakdown.gstAmount > 0)) {
    return [{ code: "igst", label: "IGST", rate, amount: breakdown.igst }];
  }
  if (breakdown.gstAmount === 0) return [];
  return [
    { code: "cgst", label: "CGST", rate: half, amount: breakdown.cgst },
    { code: "sgst", label: "SGST", rate: half, amount: breakdown.sgst },
  ];
}

function toBreakdown(breakdown: GstBreakdown, rate: number): TaxBreakdown {
  return {
    taxableAmount: breakdown.taxableAmount,
    taxAmount: breakdown.gstAmount,
    components: componentsFrom(breakdown, rate),
  };
}

export class IndiaGstTaxProvider extends ITaxProvider {
  readonly id = "india-gst";

  /**
   * Intra-state when origin and destination states match.
   *
   * 🛑 Absent information is treated as INTRA-state, which preserves the
   * existing behaviour exactly rather than improving on it. Every current
   * caller passes an `intraState` boolean it computed itself, and the defaults
   * across those call sites resolve to intra-state when a place of supply is
   * unknown — changing that here would alter tax on orders with an incomplete
   * delivery snapshot, which is precisely the class of row most likely to
   * exist. A stricter rule is a product decision, not a side effect of adding
   * an interface.
   */
  isSameRegion(jurisdiction: TaxJurisdiction): boolean {
    const { origin, destination } = jurisdiction;
    if (!origin || !destination) return true;
    return origin.trim().toUpperCase() === destination.trim().toUpperCase();
  }

  onExclusive(
    item: TaxableItem,
    jurisdiction: TaxJurisdiction,
    taxableAmount: number,
  ): TaxBreakdown {
    return toBreakdown(
      calculateGst(item.rate, this.isSameRegion(jurisdiction), taxableAmount),
      item.rate,
    );
  }

  onInclusive(
    item: TaxableItem,
    jurisdiction: TaxJurisdiction,
    gross: number,
  ): TaxBreakdown {
    return toBreakdown(
      calculateGstInclusive(item.rate, this.isSameRegion(jurisdiction), gross),
      item.rate,
    );
  }
}

/** The default instance. A consumer in another jurisdiction registers its own. */
export const indiaGstTaxProvider = new IndiaGstTaxProvider();
