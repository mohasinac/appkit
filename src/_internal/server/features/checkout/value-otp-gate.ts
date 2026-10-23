/**
 * The high-value OTP gate — one implementation, taking the amount it judges.
 *
 * ## Why this exists as a function rather than two `if`s
 *
 * There were two hand-rolled copies: one in `createOrderForGroup`'s lane
 * block and one in `POST /api/payment/create-order`. They already disagreed
 * on what they measured — the first summed `price × quantity` over the cart,
 * the second used the gateway route's own `subtotalRs` — and neither could
 * be reused by anything else, because the amount was computed inline rather
 * than passed in. That is Root Cause #75's shape exactly: a rule reachable
 * only by copy-paste gets copied, and a copy made before a branch was added
 * never learns about it.
 *
 * ## 🛑 It takes an AMOUNT, and that is the Part 6 prerequisite
 *
 * `otpCheckoutThreshold` is per CHECKOUT, so three ₹4,000 checkouts clear
 * ₹12,000 with no OTP — and splitting an order is precisely what a shared
 * purchase does. The gate therefore cannot keep deriving its own figure from
 * whatever cart happens to be in scope; the caller has to say what sum is
 * being authorised. For an ordinary checkout that is the cart; for an
 * N-party arrangement it is the ARRANGEMENT total, charged across several
 * payments that are individually under the line.
 *
 * Passing the amount in is the whole change. There is no arrangement yet to
 * pass one, which is why this lands as a prerequisite rather than as a
 * feature — but the gate can no longer be dodged by a caller that did not
 * exist when the rule was written.
 */

import { ApiError } from "../../../../errors/api-error";
import { isCheckoutValueOtpVerified } from "../../../../features/checkout/actions/checkout-value-otp-actions";

export interface CheckoutValueOtpGateInput {
  uid: string;
  /** The sum being authorised, in rupees. See the header: the CALLER decides. */
  amount: number;
  /** `siteSettings.payment.otpCheckoutThreshold`. Absent or ≤ 0 disables the gate. */
  threshold: number | undefined;
  /**
   * 🛑 COD is exempt, and that is a real decision rather than an oversight:
   * a physical hand-off at the door is its own verification, and nothing has
   * been captured when the gate would fire. Pass the method so the exemption
   * lives here instead of being re-remembered at each call site.
   */
  paymentMethod?: string;
  /** The admin checkout bypass (`siteSettings.featureFlags.adminCheckoutBypass`). */
  adminBypass?: boolean;
}

/**
 * Throws **403 `CHECKOUT_VALUE_OTP_REQUIRED`** when the amount clears the
 * threshold and the buyer has not verified. Returns silently otherwise.
 *
 * 🛑 Call it BEFORE creating a gateway order, never after. Verifying
 * post-payment means charging the buyer and then asking whether they were
 * allowed to be charged — which is what the comment at the gateway call site
 * has always said and is the reason that copy sits where it does.
 */
export async function assertCheckoutValueOtp(
  input: CheckoutValueOtpGateInput,
): Promise<void> {
  const { uid, amount, threshold, paymentMethod, adminBypass } = input;

  if (adminBypass) return;
  if (paymentMethod === "cod") return;
  if (typeof threshold !== "number" || threshold <= 0) return;
  /*
   * `>=`, not `>`. A threshold of ₹5,000 means a ₹5,000 checkout is gated —
   * the schema comment on `otpCheckoutThreshold` calls it a MINIMUM, and
   * both previous copies already read it that way.
   */
  if (amount < threshold) return;

  const verified = await isCheckoutValueOtpVerified(uid);
  if (!verified) {
    throw new ApiError(403, "CHECKOUT_VALUE_OTP_REQUIRED");
  }
}
