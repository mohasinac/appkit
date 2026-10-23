/**
 * Checkout Value OTP — Tier PP.
 *
 * Gates placing a checkout ≥ the site's `payment.otpCheckoutThreshold`
 * (skipped for COD — see `createCheckoutOrderAction`).
 */

import { createHmac, randomInt } from "crypto";
import { AuthorizationError } from "../../errors";
import { resolveDate } from "../../utils";
import { USER_COLLECTION } from "./schemas";

const HMAC_KEY =
  process.env.CONSENT_OTP_HMAC_KEY ||
  process.env.HMAC_SECRET ||
  "consent-otp-secret";

/** HMAC-SHA256 hash of an OTP code. */
export function hashOtp(code: string): string {
  return createHmac("sha256", HMAC_KEY).update(code).digest("hex");
}

/** Generate a cryptographically-secure random 6-digit OTP string. */
export function generateOtpCode(): string {
  return String(randomInt(100000, 1000000));
}

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
 * Throws AuthorizationError with a user-facing "already sent, retry in N
 * minutes" message when throttled — root-caused 2026-08-20: this used to
 * throw the bare internal string "checkoutValueOtpRateLimit", which the
 * client showed verbatim in a toast. A buyer who retried "Send code"
 * within the cooldown (e.g. after not seeing the first email land) saw a
 * cryptic error instead of being told a code was already on its way,
 * making the whole feature look broken.
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
      const remainingMinutes = Math.max(1, Math.ceil((CHECKOUT_VALUE_OTP_COOLDOWN_MS - elapsed) / 60_000));
      throw new AuthorizationError(
        `We already sent a code — check your inbox (and spam folder). You can request a new one in ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"}.`,
      );
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
