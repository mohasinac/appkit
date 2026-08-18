/**
 * Checkout Value OTP — Tier PP.
 *
 * A distinct OTP purpose from `consent-otp.ts` (which gates third-party
 * shipping consent): this one gates placing a checkout ≥ the site's
 * `payment.otpCheckoutThreshold` (skipped for COD — see
 * `createCheckoutOrderAction`). Deliberately a SEPARATE Firestore namespace
 * (`checkoutValueOtps` vs `consentOtps`) rather than reusing the shipping-
 * consent one — different purpose, different copy, independently tunable
 * rate limits. Reuses `generateOtpCode()`/`hashOtp()` from `consent-otp.ts`
 * rather than duplicating the crypto.
 */

import { AuthorizationError } from "../../errors";
import { resolveDate } from "../../utils";
import { USER_COLLECTION } from "./schemas";
import { generateOtpCode, hashOtp } from "./consent-otp";

export { generateOtpCode, hashOtp };

/** OTP validity window (10 minutes) — matches consent-OTP's window; independently tunable if policy diverges later. */
export const CHECKOUT_VALUE_OTP_EXPIRY_MS = 10 * 60 * 1000;
export const CHECKOUT_VALUE_OTP_EXPIRY_MINUTES = 10;

/** Per-user send cooldown (15 minutes). */
export const CHECKOUT_VALUE_OTP_COOLDOWN_MS = 15 * 60 * 1000;

/** Maximum failed verification attempts before the OTP is locked. */
export const CHECKOUT_VALUE_OTP_MAX_ATTEMPTS = 5;

/** Rate-limit config for the verify endpoint / action (10 attempts per 5 min). */
export const CHECKOUT_VALUE_OTP_VERIFY_RATE_LIMIT = {
  limit: 10,
  window: 300,
} as const;

type Db = FirebaseFirestore.Firestore;

/**
 * Single-slot doc per user — unlike consent OTP (one per address), a buyer
 * can only be mid-checkout once, so there's no per-context key needed.
 */
export function checkoutValueOtpRef(db: Db, uid: string) {
  return db
    .collection(USER_COLLECTION)
    .doc(uid)
    .collection("checkoutValueOtps")
    .doc("current");
}

export function checkoutValueOtpRateLimitRef(db: Db, uid: string) {
  return db
    .collection(USER_COLLECTION)
    .doc(uid)
    .collection("checkoutValueOtpRateLimit")
    .doc("meta");
}

export interface CheckoutValueOtpDoc {
  codeHash: string;
  expiresAt: FirebaseFirestore.Timestamp;
  attempts: number;
  verified: boolean;
}

/**
 * Enforce the per-user send rate-limit.
 * Throws AuthorizationError("checkoutValueOtpRateLimit") when throttled.
 */
export async function enforceCheckoutValueOtpRateLimit(
  db: Db,
  uid: string,
): Promise<void> {
  const metaRef = checkoutValueOtpRateLimitRef(db, uid);

  await db.runTransaction(async (tx: FirebaseFirestore.Transaction) => {
    const metaSnap = await tx.get(metaRef);
    const meta = metaSnap.exists
      ? (metaSnap.data() as { lastSentAt?: FirebaseFirestore.Timestamp })
      : null;

    const lastSentMs = resolveDate(meta?.lastSentAt)?.getTime() ?? 0;
    const elapsed = Date.now() - lastSentMs;

    if (elapsed < CHECKOUT_VALUE_OTP_COOLDOWN_MS) {
      throw new AuthorizationError("checkoutValueOtpRateLimit");
    }
    tx.set(metaRef, { lastSentAt: new Date() }, { merge: true });
  });
}

/** Build the checkout-value OTP WhatsApp/SMS message body. */
export function buildCheckoutValueOtpMessage(code: string, siteName: string): string {
  return (
    `*${siteName} — Order Verification*\n\n` +
    `Your verification code for this high-value order is: *${code}*\n\n` +
    `This code expires in ${CHECKOUT_VALUE_OTP_EXPIRY_MINUTES} minutes. ` +
    `If you did not request this, please ignore this message.`
  );
}
