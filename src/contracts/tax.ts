// --- Tax Shared Types ---------------------------------------------------------

/**
 * The tax seam. Tier AK A3.
 *
 * ## Why this exists
 *
 * `gstRate`, `hsnCode` and `placeOfSupply` are read across 42 files, and
 * CGST/SGST/IGST is an Indian GST concept — so appkit shipped an *Indian*
 * ecommerce tax model rather than a tax model. A buyer of this package selling
 * in the EU needs VAT with a reverse charge; in the US, destination sales tax
 * with nexus. Neither is expressible as "split the rate in half when the states
 * match".
 *
 * ## 🛑 The FIELDS DO NOT MOVE, and this is the whole reason the phase is cheap
 *
 * `gstRate` / `hsnCode` / `placeOfSupply` stay exactly where they are on
 * `ProductDocument` and `OrderDocument`. They become the India provider's
 * PAYLOAD rather than appkit's universal schema. That buys the seam with:
 *
 *   · no Firestore migration, so no stored document becomes wrong (Rule #3)
 *   · no change to any index or query
 *   · nothing to roll back if a buyer never needs a second jurisdiction
 *
 * A schema migration was the first plan and it was the wrong one: the goal is
 * that appkit does not *compute* one country's tax, not that it forgets the
 * country exists.
 *
 * ## 🛑 Implementations DELEGATE. They do not reimplement.
 *
 * `IndiaGstTaxProvider` calls the existing `calculateGst` /
 * `calculateGstInclusive` / `allocateAcrossMembers`. It is a seam, not a
 * rewrite — and that is deliberate, because the two existing functions split
 * the half DIFFERENTLY and the difference is load-bearing:
 *
 *   calculateGst           cgst = sgst = round(gst / 2), gst RE-DERIVED as half*2
 *   calculateGstInclusive  cgst = round(gst / 2), sgst = round(gst - cgst)
 *
 * On ₹66.67 at 18% inclusive that is cgst 5.09 / sgst 5.08, preserving the
 * 10.17 total. A reimplementation that "tidied" the two into agreement would
 * move a paisa on real invoices, and GST is filed on those figures.
 *
 * The gate for this phase is `.build-memory/tax-roundtrip.mjs`: 397 breakdowns
 * across every slab, both supply directions and the rounding edges, required to
 * be byte-identical before and after. One paisa of drift is a defect.
 */

/** A single tax component on a line, named by the jurisdiction's own vocabulary. */
export interface TaxComponent {
  /** `"cgst"`, `"sgst"`, `"igst"`, `"vat"`, `"salesTax"` — the provider's term. */
  code: string;
  /** Human label for an invoice line. */
  label: string;
  /** Percentage applied, e.g. `9` for half of an 18% intra-state GST. */
  rate: number;
  /** Money, in major units (rupees, not paise). */
  amount: number;
}

/**
 * The result of taxing one amount.
 *
 * `components` sums to `taxAmount` exactly — providers are responsible for
 * assigning any rounding remainder to one component rather than letting the
 * parts disagree with the total.
 */
export interface TaxBreakdown {
  /** The amount tax was computed ON (ex-tax base). */
  taxableAmount: number;
  /** Total tax. Equals the sum of `components`. */
  taxAmount: number;
  components: TaxComponent[];
}

/**
 * Where a sale happens, in the only terms a tax engine actually needs.
 *
 * Deliberately NOT `placeOfSupply: string`. That is India's word for the
 * destination state code, and naming the contract after it would re-import the
 * jurisdiction this interface exists to abstract.
 */
export interface TaxJurisdiction {
  /** Seller's region code — an Indian state code, a US state, an EU country. */
  origin?: string;
  /** Buyer's region code. */
  destination?: string;
  /** ISO 3166-1 alpha-2, when a provider needs to distinguish cross-border. */
  country?: string;
}

/** What is being taxed. `taxCode` is the jurisdiction's classification (HSN, SIC, …). */
export interface TaxableItem {
  /** Rate as a percentage, e.g. `18`. Resolved by the caller from its own data. */
  rate: number;
  /** Jurisdiction classification code — India's HSN, and whatever elsewhere. */
  taxCode?: string;
}

export abstract class ITaxProvider {
  /** Stable id, e.g. `"india-gst"`. */
  abstract readonly id: string;

  /**
   * Tax ADDED to an ex-tax amount.
   *
   * @param taxableAmount the ex-tax base, in major units
   */
  abstract onExclusive(
    item: TaxableItem,
    jurisdiction: TaxJurisdiction,
    taxableAmount: number,
  ): TaxBreakdown;

  /**
   * Tax EXTRACTED from a tax-inclusive amount.
   *
   * 🛑 Not derivable from `onExclusive` by the caller. Backing out of a gross
   * figure and adding onto a net one round differently, and this codebase
   * already relies on the difference — see the class docstring.
   *
   * @param gross the tax-inclusive total, in major units
   */
  abstract onInclusive(
    item: TaxableItem,
    jurisdiction: TaxJurisdiction,
    gross: number,
  ): TaxBreakdown;

  /**
   * Is this sale taxed as same-region? India splits CGST/SGST when it is and
   * charges IGST when it is not; other jurisdictions may ignore the question
   * entirely, which is why it is the provider's to answer and not a caller's
   * boolean to pass around.
   */
  abstract isSameRegion(jurisdiction: TaxJurisdiction): boolean;
}
