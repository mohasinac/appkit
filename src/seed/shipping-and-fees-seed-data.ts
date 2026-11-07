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
 * money as a loss. And our website platform fee is ₹10 per listing, so an order
 * with n items is n × ₹10, plus GST 18%."*
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
 * Platform fee. Per LISTING LINE, so an order with n items is n × the unit fee,
 * plus GST on the fee itself.
 *
 * 🛑 The fee is charged on the line count, not the quantity: three of one item
 * is one listing line. Charging per unit turns a bulk order into a fee the
 * buyer notices, and nothing about handling three identical items costs three
 * times as much.
 */
export interface PlatformFeeConfig {
  id: string;
  label: string;
  perListingLineInr: number;
  gstRatePercent: number;
  /** Who the fee is charged to. */
  payer: "buyer" | "seller";
  /** Where it appears in the price pipeline (stage 6 — see the cart mock). */
  pipelineStage: number;
  /** Shown as its own line, never folded into shipping or the item price. */
  displayAsOwnLine: boolean;
  /** Fee is charged per shipment group, i.e. once per seller in a split cart. */
  chargedPer: "listing-line";
  /** Refunded proportionally when a line is refunded. */
  refundBehaviour: "pro-rata-on-line-refund";
}

export const platformFeeSeedData: PlatformFeeConfig = {
  id: "fee-platform-default",
  label: "Platform fee",
  perListingLineInr: 10,
  gstRatePercent: 18,
  payer: "buyer",
  pipelineStage: 6,
  displayAsOwnLine: true,
  chargedPer: "listing-line",
  refundBehaviour: "pro-rata-on-line-refund",
};

/** Worked example, kept beside the config so the arithmetic is reviewable. */
export const platformFeeExample = (lineCount: number) => {
  const base = lineCount * platformFeeSeedData.perListingLineInr;
  const gst = (base * platformFeeSeedData.gstRatePercent) / 100;
  return { lineCount, base, gst, total: base + gst };
};

/* 3 lines → base ₹30, GST ₹5.40, total ₹35.40. */
export const platformFeeWorkedExamples = [1, 2, 3, 5].map(platformFeeExample);

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
};
