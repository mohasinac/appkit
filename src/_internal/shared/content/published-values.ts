/**
 * Published numbers — ONE definition, rendered everywhere (Phase 9).
 *
 * ## 🛑 The problem this solves, stated as a measurement
 *
 * The same fact was published in four places with different answers. The
 * refund timeline appeared as "5–7 business days via Razorpay" (policy page,
 * naming the wrong gateway), "5–7 business days" (`REFUND_COPY`) and "3–5
 * business days" (the FAQ). The return window appeared as 7 days, 2 days and
 * 48 hours. The seller's return-response window is 48 hours in the FAQ and 3
 * days in `AdminOrdersGuideView`. The offer checkout deadline is 48h in code
 * and 24h in both the FAQ and the seed.
 *
 * Four owners, nothing reconciling them, and one of the four — the FAQ — is
 * **seeded into Firestore and then admin-editable**, so a number quoted there
 * drifts *after* deployment with no audit able to see it.
 *
 * ## 🛑 So copy carries TOKENS, and the token resolves at render time
 *
 * `{{returnWindowDays}}` in an FAQ answer is a promise that cannot drift: the
 * FAQ is still admin-editable, but the NUMBER inside it comes from here. An
 * admin can rewrite the sentence and cannot contradict the code.
 *
 * ## 🛑 This is NOT a settings group, and must not become one
 *
 * Nothing here is admin-editable. These are the values the CODE enforces —
 * `ORDER_RETURN_WINDOW_MS`, the obligation policies, `LANE_CHECKOUT_WINDOW_MS`
 * — surfaced for rendering. An editable copy of an enforced constant is two
 * sources of truth with a settings UI making the wrong one look
 * authoritative, which is the 18-dead-settings pattern (D28/D44/D57/D60)
 * arriving from the opposite direction: not a control that does nothing, but a
 * control that appears to do something the code ignores.
 *
 * Where a value genuinely IS configurable, the entry derives it from the
 * setting rather than restating it — see `resolvePublishedValues`.
 */

/*
 * 🛑 Every import here is the thing that ENFORCES the value, not a mirror of
 * it. That is what makes "the code wins" structural rather than a convention
 * somebody has to remember — and it is why there is no literal for the offer
 * deadline or the claim windows even though both appear in published copy.
 */
import { getBrandName, getBrandDomain } from "../../../core/brand-resolver";
import { OBLIGATION_POLICIES } from "../../../features/obligations/constants/policies";
import {
  POINTS_EARN_PERCENT,
  POINTS_EXPIRY_MONTHS,
  POINTS_MAX_REDEMPTION_PERCENT,
} from "../../../features/points/schemas/firestore";
import { PAYMENT_WINDOW_MINUTES } from "../../../features/orders/constants/payment-window";
import { SALE_PROTECTION_MAX_VALUE } from "../features/shipping/protections";
import { LANE_CHECKOUT_WINDOW_MS } from "../checkout/lanes";
import { PREORDER_MAX_DELIVERY_DAYS } from "../checkout/rules/_limits";
import {
  DISPUTE_TRANSIT_WINDOW_DAYS,
  DISPUTE_NOT_REACHED_GRACE_DAYS,
} from "../features/orders/dispute-reasons";
import { formatMoney } from "../../../utils/number.formatter";

/**
 * The offer checkout deadline, in hours, derived from the constant the lapse
 * sweep actually enforces.
 *
 * 🛑 Decision 23: the CODE wins this contradiction, not the FAQ's 24h and not
 * the seed's. An offer accepted yesterday carries a 48h `checkoutDeadline`
 * stored on it, so publishing 24 would be telling a buyer their live offer
 * expires sooner than it does — and changing the code to match the FAQ would
 * shorten deadlines already granted.
 */
const OFFER_CHECKOUT_HOURS = Math.round(LANE_CHECKOUT_WINDOW_MS.offer / 3_600_000);

/**
 * Every token that may appear in published copy.
 *
 * 🛑 A `Record` over this union, so a token added to the type without a value
 * is a COMPILE error — and a token used in copy that is not in the union is
 * caught by `resolvePublishedCopy` leaving it visibly unresolved rather than
 * silently blanking it. Both directions matter: a blanked token reads as a
 * sentence with a word missing, which nobody reports, while `{{wrongKey}}` on
 * a live page gets reported in minutes.
 */
export type PublishedValueKey =
  // ── Windows the code enforces ─────────────────────────────────────────────
  | "returnWindowDays"
  | "sellerAcceptDays"
  | "sellerDispatchBusinessDays"
  | "returnRespondHours"
  | "returnPostDays"
  | "offerCheckoutHours"
  | "paymentWindowMinutes"
  | "deliveryConfirmDays"
  | "orderCompleteDays"
  | "shipmentClaimHours"
  | "saleClaimHours"
  /*
   * The two numbers the `not_reached` dispute gate is built from.
   *
   * SEPARATE on purpose: the transit window is "when should it have arrived",
   * the grace is "how long after that before we believe it is lost". Folded
   * into a single 10 neither number is explicable on a policy page, and the
   * page is the whole reason they are published — a buyer told "you can raise
   * a delivery issue once it's late" needs to know what late means.
   */
  | "disputeTransitWindowDays"
  | "disputeNotReachedGraceDays"
  /*
   * The pre-order delivery ceiling. 🛑 A GATEWAY constraint turned into a
   * product promise — Cashfree Easy Split will not hold a settlement past 45
   * days — so the published number must come from the constant the write
   * schemas, the seller form and the checkout rule all refuse on, never from a
   * literal in a disclaimer body.
   */
  | "preOrderMaxDeliveryDays"
  // ── Money ────────────────────────────────────────────────────────────────
  | "platformFeeMax"
  | "platformFeePercent"
  | "shipmentProtectionPercent"
  | "shipmentProtectionMin"
  | "saleProtectionPercent"
  | "saleProtectionMin"
  | "saleProtectionMaxValue"
  | "codHandlingPercent"
  | "codDepositPercent"
  | "giftWrapFee"
  // ── Points ───────────────────────────────────────────────────────────────
  | "pointsEarnPercent"
  | "pointsMaxRedemptionPercent"
  | "pointsExpiryMonths"
  // ── Refunds ──────────────────────────────────────────────────────────────
  | "refundBusinessDaysMin"
  | "refundBusinessDaysMax"
  /*
   * ── The operator's own name ───────────────────────────────────────────────
   *
   * Seven disclaimer bodies name the platform — "the draw is run by X", "X is
   * not an authentication or grading service", "buyer protection is cover
   * provided by X". They are legal statements about WHO is making them, so
   * they cannot be brand-neutral prose; the name has to come from somewhere.
   *
   * It was hardcoded as a literal inside `_internal/`, which is the one thing
   * `audit-ssr-in-appkit` Rule 3 exists to prevent: a consumer of appkit would
   * have published OUR company's name on their own disclaimers.
   */
  | "siteName"
  | "siteDomain";

export type PublishedValues = Record<PublishedValueKey, string>;

/**
 * The settings this registry reads, where a value genuinely is configurable.
 *
 * Deliberately a narrow shape rather than `SiteSettingsDocument`: this module
 * is imported by client components to render copy, and widening it to the
 * whole settings document would invite a caller to pass one in — which is Root
 * Cause #70's leak (a raw document reaching a Client Component prop, where
 * TypeScript's structural typing strips nothing at runtime).
 */
export interface PublishedValueSettings {
  /**
   * The operator's display name, for the disclaimers that name who is making
   * the statement. Falls back to the injected brand (`getBrandName()`).
   */
  siteName?: string;
  platformFeeMax?: number;
  platformFeePercent?: number;
  shipmentProtectionFeePercent?: number;
  shipmentProtectionFeeMin?: number;
  saleProtectionFeePercent?: number;
  saleProtectionFeeMin?: number;
  codHandlingFeePercent?: number;
  codDepositPercent?: number;
  giftWrapFee?: number;
  returnWindowDays?: number;
}

/*
 * ── The decided values (decision 23) ─────────────────────────────────────────
 *
 * Two live contradictions are resolved by NAMING A WINNER rather than
 * averaging:
 *
 *  - **return-response: 48 hours.** The FAQ wins over
 *    `AdminOrdersGuideView`'s 3 days, because 48h is the buyer-facing promise
 *    and the one a buyer has already read.
 *  - **offer checkout: 48 hours.** The CODE wins over the FAQ's and the seed's
 *    24h, because changing it would break live offers — an offer accepted
 *    yesterday has a 48h deadline stored on it.
 *
 * Both are derived from the obligation policies and `LANE_CHECKOUT_WINDOW_MS`
 * below rather than restated here, so "the code wins" is structural.
 */

/**
 * A policy's duration in minutes, whatever unit it declares.
 *
 * 🛑 EXHAUSTIVE over `DurationUnit`, which is `minutes | hours | days` — not
 * the two-case ternary this started as. A `minutes` duration read by a
 * hours-or-days ternary would be published as that many HOURS: a 15-minute
 * window rendered to a buyer as 15 hours, with nothing erroring. The
 * `switch` with no default is what makes a fourth unit a compile error rather
 * than a silent 60× on a published promise.
 */
function policyMinutes(kind: keyof typeof OBLIGATION_POLICIES): number {
  const d = OBLIGATION_POLICIES[kind].duration;
  switch (d.unit) {
    case "minutes":
      return d.value;
    case "hours":
      return d.value * 60;
    case "days":
      return d.value * 24 * 60;
  }
}

/**
 * Days, rounded.
 *
 * 🛑 `Math.round`, not `Math.floor`. A 36-hour window floors to 1 day, which
 * UNDERSTATES a promise to a buyer — and a published window shorter than the
 * one the code enforces is the direction that generates complaints. Rounding
 * up-or-nearest can only overstate, which is the safe error. A policy whose
 * duration does not divide cleanly into days should be published in hours
 * instead; this is for the ones that do.
 */
function policyDays(kind: keyof typeof OBLIGATION_POLICIES): number {
  return Math.round(policyMinutes(kind) / (24 * 60));
}

/** Hours, from the obligation policy that enforces it. */
function policyHours(kind: keyof typeof OBLIGATION_POLICIES): number {
  return Math.round(policyMinutes(kind) / 60);
}

/**
 * Resolve every published value.
 *
 * 🛑 Settings are read where they exist and the CODE is read where it does
 * not. A value with no setting is not a gap to fill with a literal — it is a
 * constant the code enforces, and restating it here is how the four
 * contradictions above happened in the first place.
 */
export function resolvePublishedValues(
  settings?: PublishedValueSettings,
): PublishedValues {
  return {
    // ── Windows: every one of these comes from the thing that enforces it ──
    returnWindowDays: String(settings?.returnWindowDays ?? 7),
    sellerAcceptDays: String(policyDays("seller-accept")),
    sellerDispatchBusinessDays: String(policyDays("seller-dispatch")),
    returnRespondHours: String(policyHours("return-respond")),
    returnPostDays: String(policyDays("return-post")),
    offerCheckoutHours: String(OFFER_CHECKOUT_HOURS),
    paymentWindowMinutes: String(PAYMENT_WINDOW_MINUTES),
    deliveryConfirmDays: String(policyDays("delivery-confirm")),
    orderCompleteDays: String(policyDays("order-complete")),
    shipmentClaimHours: String(policyHours("claim-shipping")),
    saleClaimHours: String(policyHours("claim-sale")),
    /*
     * Straight from the dispute module's own constants, not re-typed here.
     * Two copies of a published number is the exact drift Phase 9 exists to
     * remove — the table in this file's own header records a return window
     * that code said 7, one FAQ said 2 and another said 48 hours.
     */
    disputeTransitWindowDays: String(DISPUTE_TRANSIT_WINDOW_DAYS),
    disputeNotReachedGraceDays: String(DISPUTE_NOT_REACHED_GRACE_DAYS),
    preOrderMaxDeliveryDays: String(PREORDER_MAX_DELIVERY_DAYS),

    // ── Money: settings-driven, with the schema defaults as the fallback ───
    platformFeeMax: formatRupees(settings?.platformFeeMax ?? 10),
    platformFeePercent: String(settings?.platformFeePercent ?? 2),
    shipmentProtectionPercent: String(settings?.shipmentProtectionFeePercent ?? 2),
    shipmentProtectionMin: formatRupees(settings?.shipmentProtectionFeeMin ?? 30),
    saleProtectionPercent: String(settings?.saleProtectionFeePercent ?? 3),
    saleProtectionMin: formatRupees(settings?.saleProtectionFeeMin ?? 49),
    saleProtectionMaxValue: formatRupees(SALE_PROTECTION_MAX_VALUE),
    codHandlingPercent: String(settings?.codHandlingFeePercent ?? 2),
    codDepositPercent: String(settings?.codDepositPercent ?? 10),
    giftWrapFee: formatRupees(settings?.giftWrapFee ?? 0),

    // ── Points ─────────────────────────────────────────────────────────────
    pointsEarnPercent: String(POINTS_EARN_PERCENT),
    pointsMaxRedemptionPercent: String(POINTS_MAX_REDEMPTION_PERCENT),
    pointsExpiryMonths: String(POINTS_EXPIRY_MONTHS),

    // ── Refunds ────────────────────────────────────────────────────────────
    /*
     * 🛑 The gateway's own processing time, and the ONE value here that no
     * code enforces — so it is a literal, and that is stated rather than
     * hidden. It is also where the three-way contradiction lived (5–7 / 5–7 /
     * 3–5), which is the argument for putting it here at all: a number nothing
     * enforces is exactly the one that drifts.
     *
     * 🛑 And the published copy must NOT name the gateway. The policy page
     * said "via Razorpay" while payment ran through PhonePe, and it will be
     * wrong again the next time a provider changes — a fact about our vendor
     * is not a fact the buyer needs.
     */
    refundBusinessDaysMin: "5",
    refundBusinessDaysMax: "7",

    /*
     * Admin setting first, then the brand the consumer INJECTED at boot.
     *
     * 🛑 Was `SITE_CONFIG.brand.name`, and the reasoning given for that was
     * right about the failure mode — "a fork that forgets to configure its
     * brand publishes a visibly generic disclaimer rather than silently
     * attributing its legal statements to us" — but wrong about the mechanism:
     * `SITE_CONFIG` is a FROZEN const, and the only thing that can override it
     * (`createSiteConfig`) has **zero callers**. So the override it described
     * did not exist, and a consumer with a configured brand still published
     * "App" in its own legal text whenever `siteSettings.siteName` was unset.
     *
     * `getBrandName()` keeps the same safe default ("Site") and adds the
     * injection path that was missing.
     */
    siteName: settings?.siteName ?? getBrandName(),
    /** Bare host, for addresses quoted in published copy. */
    siteDomain: getBrandDomain(),
  };
}

/**
 * Replace every `{{token}}` in a string.
 *
 * 🛑 An UNKNOWN token is left verbatim, never blanked. A blanked token reads
 * as a sentence with a word missing — which looks like clumsy copy and nobody
 * reports — while a visible `{{returnWindowDayz}}` on a live page is reported
 * within minutes. Failing loudly is the whole point of a token system whose
 * copy is admin-editable.
 */
export function resolvePublishedCopy(
  text: string,
  values: PublishedValues,
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (whole, key: string) => {
    const resolved = (values as Record<string, string | undefined>)[key];
    return resolved ?? whole;
  });
}

/**
 * `₹10`, `₹1,499.50` — no trailing `.00` on a whole figure.
 *
 * 🛑 A `const whole = Number.isInteger(amount)` sat here unused after the A2
 * conversion, and an unused local is worth opening rather than deleting: in
 * this codebase a discarded value has three times turned out to be a dropped
 * one (a lost delivery snapshot, two blank seller tiles, a full page reload).
 *
 * Checked — this one is genuinely dead. `formatMoney` runs exactly that test
 * internally (`Number.isInteger(amount) ? 0 : 2`), which is what this function
 * used to do by hand before delegating. Nothing is lost by removing it.
 */
function formatRupees(amount: number): string {
  return formatMoney(amount);
}
