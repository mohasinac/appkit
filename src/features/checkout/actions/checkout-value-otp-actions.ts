/**
 * Checkout Value OTP Actions (appkit) — Tier PP.
 *
 * OTP gate for placing a checkout whose total is at/above
 * `siteSettings.payment.otpCheckoutThreshold` (skipped for COD). A distinct
 * purpose from `checkout-actions.ts`'s third-party shipping consent OTP —
 * same crypto primitives, separate Firestore namespace and copy.
 */

import { timingSafeEqual } from "crypto";
import { ValidationError } from "../../../errors";
import { serverLogger } from "../../../monitoring";
import { sendEmail } from "../../contact/email";
import { getAdminDb } from "../../../providers/db-firebase";
import { resolveDate } from "../../../utils";
import {
  CHECKOUT_VALUE_OTP_EXPIRY_MS,
  CHECKOUT_VALUE_OTP_MAX_ATTEMPTS,
  hashOtp,
  generateOtpCode,
  checkoutValueOtpRef,
  enforceCheckoutValueOtpRateLimit,
  type CheckoutValueOtpDoc,
} from "../../auth/checkout-value-otp";

/** Sends a checkout-value OTP to the buyer's registered email. Returns masked email so the UI can confirm which inbox to check. */
export async function sendCheckoutValueOtp(
  userId: string,
  userEmail: string,
): Promise<{ maskedEmail: string }> {
  const db = getAdminDb();
  await enforceCheckoutValueOtpRateLimit(db, userId);

  const code = generateOtpCode();
  const codeHash = hashOtp(code);
  const expiresAt = new Date(Date.now() + CHECKOUT_VALUE_OTP_EXPIRY_MS);

  await checkoutValueOtpRef(db, userId).set({
    codeHash,
    expiresAt,
    attempts: 0,
    verified: false,
    createdAt: new Date(),
  });

  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "LetItRip";
  const [local, domain] = userEmail.split("@");
  const maskedEmail = domain
    ? `${local.length <= 2 ? "*".repeat(local.length) : local[0] + "*".repeat(local.length - 2) + local[local.length - 1]}@${domain}`
    : "***";

  const { error } = await sendEmail({
    to: userEmail,
    subject: `${siteName}: Verify your order`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="margin-bottom:8px">Verify Your Order</h2>
        <p style="color:#555">Your cart total requires verification before checkout. Enter this code to continue:</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;text-align:center;margin:24px 0;padding:16px;background:#f3f4f6;border-radius:8px">${code}</div>
        <p style="color:#888;font-size:12px">This code expires in 10 minutes. If you did not request this, please ignore this email.</p>
      </div>
    `,
  });

  if (error) {
    // Root-caused 2026-08-20: this used to be fire-and-forget — the
    // Firestore OTP doc was written and the caller always got back a
    // success response ("code sent") regardless of whether the email
    // actually went out. Any Resend-side failure (bad API key,
    // unverified sending domain, outage) silently stranded the buyer
    // with a checkout they could never complete, since the OTP gate
    // gave no indication anything had gone wrong.
    serverLogger.error("Failed to send checkout value OTP email", { uid: userId, error });
    throw new ValidationError(
      "We couldn't send the verification code — please try again in a moment, or contact support if this keeps happening.",
    );
  }

  serverLogger.info(`Checkout value OTP sent: uid=${userId}`);
  return { maskedEmail };
}

/** Verifies the 6-digit checkout-value OTP and marks the Firestore record verified. */
export async function verifyCheckoutValueOtp(
  userId: string,
  code: string,
): Promise<void> {
  const db = getAdminDb();
  const ref = checkoutValueOtpRef(db, userId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new ValidationError("No verification code found. Please request a new code.");
  }
  const otpDoc = snap.data() as CheckoutValueOtpDoc;

  if (otpDoc.verified) return;

  if (otpDoc.attempts >= CHECKOUT_VALUE_OTP_MAX_ATTEMPTS) {
    throw new ValidationError("Too many failed attempts. Please request a new code.");
  }

  if (Date.now() > (resolveDate(otpDoc.expiresAt)?.getTime() ?? 0)) {
    throw new ValidationError("Code expired. Please request a new one.");
  }

  const inputHash = hashOtp(code);
  if (
    !timingSafeEqual(
      Buffer.from(inputHash, "hex"),
      Buffer.from(otpDoc.codeHash, "hex"),
    )
  ) {
    await ref.update({ attempts: otpDoc.attempts + 1 });
    throw new ValidationError("Invalid code. Please check and try again.");
  }

  await ref.update({ verified: true, verifiedAt: new Date() });
  serverLogger.info(`Checkout value OTP verified: uid=${userId}`);
}

/** Whether the buyer has a currently-verified checkout-value OTP on file. */
export async function isCheckoutValueOtpVerified(userId: string): Promise<boolean> {
  const db = getAdminDb();
  const snap = await checkoutValueOtpRef(db, userId).get();
  if (!snap.exists) return false;
  const otpDoc = snap.data() as CheckoutValueOtpDoc;
  return otpDoc.verified === true;
}
