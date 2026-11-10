/**
 * The server's answer to *"may this buyer pay for this listing with this
 * method?"* — the four levels assembled and handed to `resolvePaymentMethod`.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * 🛑 WHY THIS EXISTS: THE RESOLVER HAD NO CONSUMERS
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `_internal/shared/payments/method-resolution.ts` shipped the precedence and
 * was verified against all nine cases — and then nothing called it. Measured
 * 2026-11-11: **zero consumers.** That is the declared-but-unwired defect
 * class this project keeps finding, and the correct reading of it is that the
 * precedence was never actually in force.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * 🛑 WHAT WAS ACTUALLY ENFORCED BEFORE THIS
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Two hand-written `if` blocks in the checkout action:
 *
 *   paymentMethod === "cod"  && siteSettings.payment.codEnabled       === false
 *   paymentMethod === "cash" && siteSettings.payment.upiManualEnabled === false
 *
 * So: `online` had no platform check at all, **no store could refuse a
 * method**, **no listing could refuse a method**, and a restricted buyer was
 * not consulted anywhere. A seller who did not want to handle cash on
 * delivery had no way to say so, and a buyer could post `cod` for any listing
 * in the catalogue.
 *
 * ⚠ The resolution is a SERVER re-resolve, not a check of something the client
 * said. Same rule the shipping work already follows — *"the server re-resolves
 * the chosen option and charges its own number; a posted `chargedRate` is
 * ignored"*. A method the UI offered is not evidence the method is permitted.
 */

import {
  resolvePaymentMethod,
  type MethodDecision,
  type PaymentMethodSlug,
} from "../../shared/payments/method-resolution";
import { isRestrictedTarget } from "../../../features/auth/server/checkSoftBan";
import type { SiteSettingsDocument } from "../../../features/admin/schemas/firestore";
import type { UserDocument } from "../../../features/auth/schemas/firestore";

/**
 * The legacy named toggles, mapped to the method slug each one governs.
 *
 * 🛑 These are a CEILING, not a default, because that is what they already
 * did: the checkout gate threw a hard `ValidationError` on
 * `codEnabled === false` and nothing could override it. Bridging them as a
 * soft default would have quietly made an admin's existing kill switch
 * overridable by any store — a behaviour change smuggled inside a refactor.
 *
 * ⚠ Only `=== false` counts. `true` and `undefined` both mean "no ceiling",
 * matching the old `=== false` comparisons exactly; an unconfigured install
 * must not refuse every method on every order.
 */
const LEGACY_PLATFORM_TOGGLES: Readonly<Record<string, keyof NonNullable<SiteSettingsDocument["payment"]>>> = {
  cod: "codEnabled",
  // `cash` is cash-on-pickup, historically governed by the manual-UPI toggle
  // because the two shared the out-of-band settlement flow.
  cash: "upiManualEnabled",
  phonepe: "phonepeEnabled",
  razorpay: "razorpayEnabled",
  cashfree: "cashfreeEnabled",
};

/**
 * The platform's two opinions about one method: the hard ceiling and the soft
 * floor, resolved from the new rules map first and the legacy toggles second.
 *
 * ⚠ `default: true` when nothing has an opinion. An install that has never
 * opened the payments screen must still be able to take money — defaulting to
 * `false` would make a fresh deploy refuse every method, which reads to an
 * operator as a broken checkout rather than as unset config.
 */
export function platformMethodRule(
  settings: { payment?: SiteSettingsDocument["payment"] } | null | undefined,
  method: PaymentMethodSlug,
): { platformDisabled: boolean; platformDefault: boolean } {
  const payment = settings?.payment;
  const rule = payment?.paymentMethodRules?.[method];

  const legacyKey = LEGACY_PLATFORM_TOGGLES[method];
  const legacyDisabled = legacyKey ? payment?.[legacyKey] === false : false;

  return {
    /*
     * EITHER source can impose the ceiling, and neither can lift the other's.
     * An admin who turned COD off on the old screen stays in force after this
     * change even if the new map says nothing — which is the whole point of
     * the bridge.
     */
    platformDisabled: rule?.disabled === true || legacyDisabled,
    platformDefault: rule?.default ?? true,
  };
}

export interface MethodGateContext {
  /**
   * ⚠ `payment` is OPTIONAL here, not merely possibly-undefined. Callers hand
   * this gate a slice they already hold (`{ payment: ctx.paymentSettings }`),
   * and under `exactOptionalPropertyTypes` a `Pick<…, "payment">` would reject
   * that — forcing a cast at every call site to satisfy a distinction that
   * makes no difference to the resolution, since `platformMethodRule` treats
   * absent and undefined identically.
   */
  readonly settings: { payment?: SiteSettingsDocument["payment"] } | null | undefined;
  /** The seller's defaults. `undefined` per method = no opinion. */
  readonly store?: { paymentMethods?: Record<string, boolean> } | null;
  /** This listing's override. `undefined` per method = inherit the store. */
  readonly listing?: { paymentMethods?: Record<string, boolean> } | null;
  /** The buyer, for the deny level. Only `role` and `softBans` are read. */
  readonly buyer?: Pick<UserDocument, "role" | "softBans"> | null;
}

/**
 * Resolve one method for one buyer/store/listing context.
 *
 * ⚠ Returns a DECISION with a reason, never a bare boolean. The three ways a
 * method can be unavailable need different copy and different handling: a
 * buyer who is personally restricted will contact support, and support has to
 * be able to tell that case from "the seller does not offer this".
 */
export function resolveMethodForContext(
  method: PaymentMethodSlug,
  ctx: MethodGateContext,
): MethodDecision {
  const { platformDisabled, platformDefault } = platformMethodRule(ctx.settings, method);

  return resolvePaymentMethod({
    platformDisabled,
    platformDefault,
    storeValue: ctx.store?.paymentMethods?.[method],
    listingValue: ctx.listing?.paymentMethods?.[method],
    /*
     * 🛑 DENY-ONLY, and resolved from the soft-ban list rather than a bespoke
     * field — `{ action: "use_payment_method", target: method }`. Reusing that
     * mechanism brings expiry, the `bannedBy` audit trail and the
     * lift-without-deleting convention with it.
     *
     * ⚠ No buyer on the context means NO DENIAL, not a denial. This gate runs
     * on paths that legitimately have no user document to hand (an admin
     * placing an order on someone's behalf, a pricing preview), and failing
     * closed there would block checkout for everyone rather than restrict the
     * few. The restriction is a targeted risk control, so its absence must
     * mean "not restricted" — the ban list is the positive assertion.
     */
    buyerDenied: ctx.buyer
      ? isRestrictedTarget(ctx.buyer, "use_payment_method", method)
      : false,
  });
}

/** Buyer-facing copy per refusal reason. */
const REFUSAL_COPY: Record<Exclude<MethodDecision, { allowed: true }>["reason"], string> = {
  /*
   * ⚠ Deliberately does NOT say "the admin disabled this". A buyer cannot act
   * on that, and naming our internal configuration in a checkout error is
   * noise to them and detail to anyone probing the site.
   */
  platform_disabled: "is not currently accepted. Please choose another payment method.",
  not_enabled: "is not available for this item. Please choose another payment method.",
  /*
   * 🛑 Distinguishable WITHOUT being accusatory, and without confirming to a
   * probing account which restrictions it carries. "Not available on your
   * account" is enough for the buyer to contact support, and support can see
   * the soft-ban row with its reason and who applied it.
   */
  buyer_denied: "is not available on your account. Please choose another payment method, or contact support.",
};

/**
 * Human-readable refusal for a method, or `null` when it is allowed.
 *
 * Separated from the resolution so a caller can decide between throwing (the
 * checkout action) and filtering (the method list a buyer is shown) without
 * either one re-deriving the precedence.
 */
export function methodRefusalMessage(
  method: PaymentMethodSlug,
  label: string,
  ctx: MethodGateContext,
): string | null {
  const decision = resolveMethodForContext(method, ctx);
  if (decision.allowed) return null;
  /*
   * Sentence-cased here rather than at the call site. The labels are written
   * lowercase for mid-sentence use by `payment-gate.ts` ("cannot be paid for
   * with cash on delivery"), so a caller starting a sentence with one needs
   * this — and leaving that to each caller is how one of them ends up
   * shipping "cash on delivery is not currently accepted."
   */
  const sentence = `${label} ${REFUSAL_COPY[decision.reason]}`;
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}
