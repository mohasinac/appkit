/**
 * RULE SETS — payment, shipping, tax, offers and coins, as shared named rows.
 *
 * A listing type does not carry rules; it *selects* them. Editing
 * "India domestic" tax once updates every type that selected it, which is the
 * difference between configuration and copy-paste.
 *
 * ## Payment providers (owner, 2026-11-08)
 *
 * *"The payment methods are PhonePe, Razorpay, Cashfree or cash on delivery,
 * and they can be enabled/disabled by the admin or the seller (in future)."*
 *
 * So each provider is a row with its own enable flag and an `editableBy` that
 * says who may flip it. `seller` is listed today as `false` everywhere with the
 * field already present — the future grant is a value change, not a schema
 * change and not a release.
 *
 * ## 🛑 Money-path rows
 *
 * Everything in this file either moves money or creates an obligation. Changes
 * are audited, and the rows marked `twoAdminApproval` cannot be changed by one
 * person alone.
 *
 * Mocks: `mocks/10-forms.qm` *Rule forms*, `mocks/07-cart-checkout.qm`,
 *        `mocks/13-vendor.qm` *Shipments*.
 */

export type RuleEditor = "admin" | "seller" | "system";

export interface PaymentProvider {
  /** Stable key — matches the integration's own identifier. */
  id: "phonepe" | "razorpay" | "cashfree" | "cod";
  label: string;
  enabled: boolean;
  /**
   * Who may flip `enabled`. Admin always; seller is the 2026 future grant and
   * is false today everywhere — present so enabling it later is a value edit.
   */
  editableBy: { admin: boolean; seller: boolean };
  /** Order in the checkout method list. */
  order: number;
  /** Capture behaviour, because it differs per provider and matters on refunds. */
  capture: "immediate" | "on-dispatch" | "on-delivery";
  /** Providers that cannot be combined with a mechanism, named explicitly. */
  unavailableWhenMechanismOn?: string[];
  notes?: string;
}

export const paymentProvidersSeedData: PaymentProvider[] = [
  {
    id: "phonepe",
    label: "PhonePe",
    enabled: true,
    editableBy: { admin: true, seller: false },
    order: 1,
    capture: "immediate",
  },
  {
    id: "razorpay",
    label: "Razorpay",
    enabled: true,
    editableBy: { admin: true, seller: false },
    order: 2,
    capture: "immediate",
  },
  {
    id: "cashfree",
    label: "Cashfree",
    enabled: true,
    editableBy: { admin: true, seller: false },
    order: 3,
    capture: "immediate",
  },
  {
    id: "cod",
    label: "Cash on delivery",
    enabled: true,
    editableBy: { admin: true, seller: false },
    order: 4,
    capture: "on-delivery",
    /*
     * COD is refused by mechanism, never by listing type. A pre-order charged on
     * dispatch, a reveal lot whose contents are decided later, and a code issued
     * instantly all break COD for the same underlying reason: the money and the
     * goods separate in time.
     */
    unavailableWhenMechanismOn: ["preOrderWindow", "reveal", "instantFulfilment"],
    notes: "Refused per mechanism, not per type — see unavailableWhenMechanismOn.",
  },
];

export interface PaymentRuleSet {
  id: string;
  label: string;
  /** Providers allowed, by id. Intersected with each provider's own `enabled`. */
  providers: PaymentProvider["id"][];
  /** Verify the webhook signature before any state change. Never false. */
  requireWebhookSignature: true;
  /** Re-check the amount server-side. Never false. */
  serverSideAmountCheck: true;
  twoAdminApproval: boolean;
}

export const paymentRuleSetsSeedData: PaymentRuleSet[] = [
  {
    id: "payment-default",
    label: "Default — all providers",
    providers: ["phonepe", "razorpay", "cashfree", "cod"],
    requireWebhookSignature: true,
    serverSideAmountCheck: true,
    twoAdminApproval: true,
  },
  {
    id: "payment-no-cod",
    label: "Prepaid only",
    providers: ["phonepe", "razorpay", "cashfree"],
    requireWebhookSignature: true,
    serverSideAmountCheck: true,
    twoAdminApproval: true,
  },
];

export interface ShippingRuleSet {
  id: string;
  label: string;
  /** No shipping widgets resolve at all when false. */
  physical: boolean;
  insured: boolean;
  signatureRequired: boolean;
  /** Hours from payment to handover, before the SLA counts as breached. */
  dispatchSlaHours: number | null;
  /** Blocks the quote rather than guessing when an input is missing. */
  blockOnMissingInput: boolean;
}

export const shippingRuleSetsSeedData: ShippingRuleSet[] = [
  { id: "shipping-standard", label: "Standard", physical: true, insured: false, signatureRequired: false, dispatchSlaHours: 24, blockOnMissingInput: true },
  { id: "shipping-light", label: "Light / flat parcel", physical: true, insured: false, signatureRequired: false, dispatchSlaHours: 48, blockOnMissingInput: true },
  { id: "shipping-insured", label: "Insured + signature", physical: true, insured: true, signatureRequired: true, dispatchSlaHours: 24, blockOnMissingInput: true },
  { id: "shipping-none", label: "No shipping", physical: false, insured: false, signatureRequired: false, dispatchSlaHours: null, blockOnMissingInput: true },
];

export interface TaxRuleSet {
  id: string;
  label: string;
  /** Resolution is ALWAYS by country pair — never by listing type. */
  originCountry: string;
  destinationCountry: string;
  regime: string;
  includedInDisplayedPrice: boolean;
  /** When no rule matches, block checkout. Never guess a tax rate. */
  onNoMatch: "block";
  twoAdminApproval: boolean;
}

export const taxRuleSetsSeedData: TaxRuleSet[] = [
  {
    id: "tax-india-domestic",
    label: "India → India (GST)",
    originCountry: "IN",
    destinationCountry: "IN",
    regime: "GST",
    includedInDisplayedPrice: true,
    onNoMatch: "block",
    twoAdminApproval: true,
  },
  {
    id: "tax-india-export",
    label: "India → export (zero-rated)",
    originCountry: "IN",
    destinationCountry: "*",
    regime: "zero-rated",
    includedInDisplayedPrice: false,
    onNoMatch: "block",
    twoAdminApproval: true,
  },
];

export interface OfferRuleSet {
  id: string;
  label: string;
  /** Not configurable — the owner's spec is that offers are public. */
  publicOffers: true;
  minimumIncrement: number | null;
  /** Hours before close in which an offer can no longer be retracted. */
  retractionLockHours: number;
  /** When autoAward is OFF, how long the seller has to pick. */
  sellerDecisionHours: number;
  onCloseWithNoOffers: "relist" | "expire";
}

export const offerRuleSetsSeedData: OfferRuleSet[] = [
  { id: "offers-default", label: "Default offers", publicOffers: true, minimumIncrement: null, retractionLockHours: 1, sellerDecisionHours: 48, onCloseWithNoOffers: "relist" },
  { id: "offers-collector", label: "Collector offers", publicOffers: true, minimumIncrement: null, retractionLockHours: 1, sellerDecisionHours: 48, onCloseWithNoOffers: "relist" },
];

export interface CoinRuleSet {
  id: string;
  label: string;
  /** Coins earned per ₹1 spent. */
  earnPerRupee: number;
  /** Coins required per ₹1 of redemption. */
  redeemPerRupee: number;
  /** Credited at this point, not at order placement. */
  earnedAt: "dispatch" | "delivery" | "order";
  expiryMonths: number;
  /** Maximum share of an order that may be paid in coins. */
  maxRedemptionShare: number;
  canRedeem: boolean;
}

export const coinRuleSetsSeedData: CoinRuleSet[] = [
  { id: "coins-default", label: "Standard earn + redeem", earnPerRupee: 1, redeemPerRupee: 10, earnedAt: "dispatch", expiryMonths: 12, maxRedemptionShare: 0.2, canRedeem: true },
  { id: "coins-earn-only", label: "Earn only", earnPerRupee: 1, redeemPerRupee: 10, earnedAt: "dispatch", expiryMonths: 12, maxRedemptionShare: 0, canRedeem: false },
];


/*
 * How a contest ranks its entries — a RULE SET, not an enum in code.
 *
 * 🛑 THE ROWS MOVED, THEY WERE NOT COPIED. They live in
 * `features/events/config/entry-ranking-rules.ts`, because
 * `schemas/entry-ranking.ts` reads them at runtime and the published package
 * EXCLUDES `dist/seed` (`package.json` `files[]` → `"!dist/seed"`). A runtime
 * module importing from here resolves fine locally against a synced dist and
 * then fails for every consumer installing from the registry — which is how
 * 4.87.0 shipped unusable. See that file's header for the full reasoning.
 *
 * The other rule-set families above stay here: they have no runtime reader in
 * shipped code, so moving them would ship bytes nobody imports. **Add no entry
 * ranking rows to this file** — a second copy of the table would be two
 * divergent definitions.
 */
export type { EntryRankingRuleSet } from "../features/events/config/entry-ranking-rules";
export { ENTRY_RANKING_RULE_SET_DEFINITIONS as entryRankingRuleSetsSeedData } from "../features/events/config/entry-ranking-rules";

import { ENTRY_RANKING_RULE_SET_DEFINITIONS } from "../features/events/config/entry-ranking-rules";

/** Everything in one export, so the seeder writes one config document. */
export const ruleSetsSeedData = {
  paymentProviders: paymentProvidersSeedData,
  payment: paymentRuleSetsSeedData,
  shipping: shippingRuleSetsSeedData,
  tax: taxRuleSetsSeedData,
  offers: offerRuleSetsSeedData,
  coins: coinRuleSetsSeedData,
  entryRanking: ENTRY_RANKING_RULE_SET_DEFINITIONS,
};
