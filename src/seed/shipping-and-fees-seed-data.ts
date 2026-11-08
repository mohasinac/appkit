/**
 * SHIPPING CHOICE and PLATFORM FEES — the seller's offer, the buyer's pick, and
 * who carries the difference.
 *
 * Owner, 2026-11-08:
 *
 * *"A seller agrees from their dashboard for the shipping option. If they select
 * custom — i.e. their own — then they must set a per-order fee. But if they are
 * okay with our shipping providers' quotes then they must accept that as well.
 * Both can be enabled. When the buyer shops, at checkout they can select the
 * custom shipping (say ₹200 set by the seller) or check the quote from the
 * shipment integrations; if they find the other cheap they can choose whatever
 * they wish. But if they have selected that, then it is up to the seller to
 * fulfil as is — they cannot use the platform to ship for the other, as we have
 * already taken money from the customer. If however they need to override it,
 * they can refund the excess if any; and in case they needed to pay more for
 * their custom shipping than what the buyer paid, they have to swallow that
 * money as a loss. And the platform fee tapers per order — see the fee section below."*
 *
 * ## The rule that makes this safe
 *
 * **What the buyer picked is what the seller owes.** The money is already
 * captured against a named method, so the method is part of the contract — not
 * a seller preference to revisit at pack time. Every downstream consequence
 * below follows from that one sentence.
 *
 * Mocks: `mocks/18-shipping-fees.qm`.
 */

export type ShippingMode = "platform" | "custom";

export interface SellerShippingProfile {
  /** Store this profile belongs to. */
  sellerKey: string;
  /**
   * At least one must be true. A seller offering neither cannot publish a
   * listing with the `physicalShipping` mechanism — enforced at publish, not
   * discovered at checkout.
   */
  platformQuotesAccepted: boolean;
  customEnabled: boolean;
  /**
   * REQUIRED when `customEnabled`. Per ORDER, not per item — the seller is
   * quoting one parcel, and a per-item custom fee is how a four-item order
   * quietly becomes ₹800.
   */
  customFeePerOrderInr: number | null;
  /** Optional free-shipping threshold on the seller's own custom rate. */
  customFreeAboveInr: number | null;
  /** Shown at checkout beside the custom option, so the buyer knows who ships. */
  customLabel: string | null;
}

export const sellerShippingProfilesSeedData: SellerShippingProfile[] = [
  {
    sellerKey: "store-beyindia",
    platformQuotesAccepted: true,
    customEnabled: true,
    customFeePerOrderInr: 200,
    customFreeAboveInr: 2500,
    customLabel: "BeyIndia courier (we pack and ship ourselves)",
  },
  {
    sellerKey: "store-ripzone",
    platformQuotesAccepted: true,
    customEnabled: false,
    customFeePerOrderInr: null,
    customFreeAboveInr: null,
    customLabel: null,
  },
  {
    sellerKey: "store-farm-c",
    platformQuotesAccepted: false,
    customEnabled: true,
    customFeePerOrderInr: 60,
    customFreeAboveInr: null,
    customLabel: "Farm C local delivery",
  },
];

/**
 * What happens after the buyer has chosen. These are rules, not guidance: each
 * one closes a way for money to go missing.
 */
export interface ShippingObligationRule {
  id: string;
  situation: string;
  outcome: string;
  whoCarriesIt: "seller" | "buyer" | "platform" | "nobody";
  /** Writes a ledger entry when it fires. */
  ledger: boolean;
}

export const shippingObligationRulesSeedData: ShippingObligationRule[] = [
  {
    /*
     * 🛑 From CLAUDE.md (parallel session, 2026-11-08): the SERVER re-resolves
     * the chosen option and charges ITS OWN number. A `chargedRate` posted by
     * the client is ignored outright — otherwise the shipping line is a field
     * the buyer's browser can edit.
     */
    id: "server-reresolves",
    situation: "The client posts a shipping choice at checkout.",
    outcome:
      "The server re-resolves that option from the seller profile and the carrier rules and charges its own figure. A posted rate is never trusted.",
    whoCarriesIt: "platform",
    ledger: false,
  },
  {
    id: "chosen-is-owed",
    situation: "The buyer picked custom shipping and paid for it.",
    outcome:
      "The seller fulfils it themselves. They may NOT buy a platform label for this order — the money was taken against the method the buyer chose.",
    whoCarriesIt: "seller",
    ledger: false,
  },
  {
    id: "platform-chosen",
    situation: "The buyer picked a platform carrier quote.",
    outcome:
      "The seller buys that label through the platform. The label cost is deducted from the payout, as today.",
    whoCarriesIt: "seller",
    ledger: true,
  },
  {
    id: "seller-overrides-cheaper",
    situation: "The seller overrides the chosen method and it costs LESS.",
    outcome:
      "The excess is refunded to the buyer. It is never kept as margin — the buyer paid for a named service at a named price.",
    whoCarriesIt: "buyer",
    ledger: true,
  },
  {
    id: "seller-overrides-dearer",
    situation: "The seller's own shipping costs MORE than the buyer paid.",
    outcome:
      "The seller absorbs the difference. The buyer is never re-billed after capture, and the order is never held hostage to a shortfall.",
    whoCarriesIt: "seller",
    ledger: true,
  },
  {
    id: "no-method-offered",
    situation: "A seller offers neither platform quotes nor a custom rate.",
    outcome:
      "They cannot publish a listing with physical shipping. Blocked at publish, with the reason — never discovered by a buyer at checkout.",
    whoCarriesIt: "nobody",
    ledger: false,
  },
  {
    id: "quote-unavailable",
    situation: "The carrier integration cannot quote (missing weight, bad pincode).",
    outcome:
      "The platform option is ABSENT at checkout rather than guessed. If custom is enabled it stands alone; if not, the group cannot be checked out and says why.",
    whoCarriesIt: "nobody",
    ledger: false,
  },
];

/**
 * PLATFORM FEES — a buyer per-unit fee AND a seller commission, both tapering.
 *
 * 🛑 FINAL SPEC (owner, 2026-11-08, after two wrong versions):
 *
 *   *"Reduce by 10% every 3 items. Do same for the fees commission: it is 5%
 *   start, reduces to min 2.5%. Platform fees Rs 10 reduces to Rs 5 min."*
 *   *"This is per order, not saving."*
 *
 * So both fees share one shape — start, decay 10% every 3 units, floor — and
 * both are MARGINAL: unit 1-3 pay the first rate, units 4-6 the second, and so
 * on. Six units is 3xRs10 + 3xRs9 = Rs 57.
 *
 * | | Buyer fee | Seller commission |
 * |---|---|---|
 * | Start | Rs 10 per unit | 5% of the unit's value |
 * | Decay | -10% every 3 units | -10% every 3 units |
 * | Floor | Rs 5 | 2.5% |
 * | GST | 18% | 18% |
 * | Shown | its own checkout line | the payout statement |
 *
 * 🛑 **Per ORDER, not a saving.** The taper resets on every order; it is a
 * basket-size discount, not a loyalty balance that accumulates across orders.
 * Nothing carries over, and there is no stored "savings" figure to reconcile.
 *
 * Two earlier versions were wrong and both are recorded because the failure is
 * instructive: v1 was a flat Rs 10 per LINE; v2 read a band table as a LOOKUP
 * (find the band, multiply every unit by it), which puts a CLIFF in the curve
 * where a bigger basket can cost less in total. The monotonicity guard at the
 * bottom of this file proves that cannot happen now, for the first sixty units,
 * rather than assuming it.
 *
 * A **composite listing counts as ONE unit** (the BX-53 case: Rs 10, not Rs 60)
 * — the buyer bought one thing that happens to contain six.
 */
export interface TaperConfig {
  /** Rate for the first tier. ₹ for the buyer fee, % for the seller commission. */
  start: number;
  /** Fractional reduction applied at each tier boundary. 0.10 = −10%. */
  decayPerTier: number;
  /** Units per tier. */
  unitsPerTier: number;
  /** The rate never goes below this, however many tiers deep. */
  floor: number;
}

export interface FeeBand {
  /** Inclusive lower bound on unit count. */
  minUnits: number;
  /** Inclusive upper bound; null means "and above". */
  maxUnits: number | null;
  perUnitInr: number;
}

export interface PlatformFeeConfig {
  id: string;
  label: string;
  /** Buyer-side per-unit fee in rupees. */
  buyerTaper: TaperConfig;
  /** Seller-side commission as a PERCENT of the unit's value. */
  sellerTaper: TaperConfig;
  gstRatePercent: number;
  /** A composite/bundle is ONE unit, not its component count. */
  compositeCountsAsOneUnit: true;
  pipelineStage: number;
  displayAsOwnLine: boolean;
  refundBehaviour: "pro-rata-on-line-refund";
  /** The owner's "all customizable for the platform". */
  editableBy: { admin: boolean; seller: boolean };
}

export const platformFeeSeedData: PlatformFeeConfig = {
  id: "fee-platform-default",
  label: "Platform fee",
  buyerTaper: { start: 10, decayPerTier: 0.1, unitsPerTier: 3, floor: 5 },
  sellerTaper: { start: 5, decayPerTier: 0.1, unitsPerTier: 3, floor: 2.5 },
  gstRatePercent: 18,
  compositeCountsAsOneUnit: true,
  pipelineStage: 6,
  displayAsOwnLine: true,
  refundBehaviour: "pro-rata-on-line-refund",
  editableBy: { admin: true, seller: false },
};

/** The rate that applies to the Nth unit (1-based), after the taper and floor. */
export const rateForUnit = (unitIndex: number, t: TaperConfig): number => {
  const tier = Math.floor((unitIndex - 1) / t.unitsPerTier);
  return Math.max(t.floor, t.start * (1 - t.decayPerTier) ** tier);
};

/** Buyer fee, MARGINAL: every unit pays its own tier's rate. */
export const buyerFeeBase = (units: number): number => {
  let sum = 0;
  for (let i = 1; i <= units; i += 1) sum += rateForUnit(i, platformFeeSeedData.buyerTaper);
  return +sum.toFixed(2);
};

/**
 * Seller commission, tapering by the same rule. Each unit's own value is
 * charged at that unit's tier rate, so a large basket earns the discount on
 * its later units rather than retrospectively on all of them.
 */
export const sellerCommissionBase = (unitPricesInr: number[]): number => {
  let sum = 0;
  unitPricesInr.forEach((price, idx) => {
    sum += (price * rateForUnit(idx + 1, platformFeeSeedData.sellerTaper)) / 100;
  });
  return +sum.toFixed(2);
};

/** The generated band table, for display in the admin UI and the mocks. */
export const buyerBandTable = (maxTiers = 9): FeeBand[] =>
  Array.from({ length: maxTiers }, (_, k) => {
    const t = platformFeeSeedData.buyerTaper;
    const minUnits = k * t.unitsPerTier + 1;
    return {
      minUnits,
      maxUnits: k === maxTiers - 1 ? null : minUnits + t.unitsPerTier - 1,
      perUnitInr: +rateForUnit(minUnits, t).toFixed(2),
    };
  });

/** Worked examples, kept beside the config so the arithmetic is reviewable. */
export const platformFeeExample = (units: number, unitPriceInr = 900) => {
  const prices = Array.from({ length: units }, () => unitPriceInr);
  const buyerBase = buyerFeeBase(units);
  const sellerBase = sellerCommissionBase(prices);
  const gst = platformFeeSeedData.gstRatePercent / 100;
  return {
    units,
    buyer: { base: buyerBase, total: +(buyerBase * (1 + gst)).toFixed(2) },
    seller: { base: sellerBase, total: +(sellerBase * (1 + gst)).toFixed(2) },
  };
};

export const platformFeeWorkedExamples = [1, 3, 6, 9, 12, 24, 30].map(u => platformFeeExample(u));

/**
 * SHIPPING ROUNDING — owner: *"shipments get rounded off to the nearest 50
 * higher than the estimation."* Always UP, never to-nearest: rounding Rs 59
 * down to Rs 50 means the platform eats Rs 9 on every parcel.
 */
export const shippingRoundingSeedData = {
  roundToInr: 50,
  direction: "up" as const,
  appliedAt: "quote" as const,
  /** Free shipping is exempt — zero must stay zero, not round to Rs 50. */
  exemptWhenFree: true,
  editableBy: { admin: true, seller: false },
};

export const roundShipping = (quoteInr: number): number =>
  quoteInr <= 0 && shippingRoundingSeedData.exemptWhenFree
    ? 0
    : Math.ceil(quoteInr / shippingRoundingSeedData.roundToInr) * shippingRoundingSeedData.roundToInr;

export const shippingRoundingExamples = [0, 59, 96, 200, 201, 320].map(q => ({ quote: q, charged: roundShipping(q) }));

/* Guards: the taper must never rise, must reach its floor, and a bigger basket
 * must never cost less in total. Proven for the first 60 units, not assumed. */
(() => {
  for (let u = 2; u <= 60; u += 1) {
    if (rateForUnit(u, platformFeeSeedData.buyerTaper) > rateForUnit(u - 1, platformFeeSeedData.buyerTaper)) {
      throw new Error(`buyer taper rises at unit ${u}`);
    }
    if (buyerFeeBase(u) < buyerFeeBase(u - 1)) {
      throw new Error(`buyer fee is not monotonic: ${u} units costs less than ${u - 1}`);
    }
  }
  if (rateForUnit(60, platformFeeSeedData.buyerTaper) !== platformFeeSeedData.buyerTaper.floor) {
    throw new Error("buyer taper never reaches its floor within 60 units");
  }
  if (rateForUnit(60, platformFeeSeedData.sellerTaper) !== platformFeeSeedData.sellerTaper.floor) {
    throw new Error("seller taper never reaches its floor within 60 units");
  }
})();

for (const p of sellerShippingProfilesSeedData) {
  if (!p.platformQuotesAccepted && !p.customEnabled) {
    throw new Error(`seller "${p.sellerKey}" offers no shipping method at all`);
  }
  if (p.customEnabled && p.customFeePerOrderInr == null) {
    throw new Error(`seller "${p.sellerKey}" enabled custom shipping without a per-order fee`);
  }
}

export const shippingAndFeesSeedData = {
  sellerProfiles: sellerShippingProfilesSeedData,
  obligationRules: shippingObligationRulesSeedData,
  platformFee: platformFeeSeedData,
  workedExamples: platformFeeWorkedExamples,
  shippingRounding: shippingRoundingSeedData,
  roundingExamples: shippingRoundingExamples,
};
