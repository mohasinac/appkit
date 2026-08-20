/**
 * Password Change OTP Actions.
 *
 * Server-side gate for POST /api/user/change-password — see
 * ../password-change-otp.ts for the full incident writeup. Mirrors
 * checkout-value-otp-actions.ts's shape exactly (same crypto primitives,
 * separate Firestore namespace and copy).
 */

import { timingSafeEqual } from "crypto";
import { ValidationError } from "../../../errors";
import { serverLogger } from "../../../monitoring";
import { sendEmail } from "../../contact/email";
import { getAdminDb } from "../../../providers/db-firebase";
import { resolveDate } from "../../../utils";
import {
  hashOtp,
  generateOtpCode,
  PASSWORD_CHANGE_OTP_EXPIRY_MS,
  PASSWORD_CHANGE_OTP_MAX_ATTEMPTS,
  passwordChangeOtpRef,
  enforcePasswordChangeOtpRateLimit,
  type PasswordChangeOtpDoc,
} from "../password-change-otp";

/** Sends a password-change OTP to the account's registered email. Returns masked email so the UI can confirm which inbox to check. */
export async function sendPasswordChangeOtp(
  userId: string,
  userEmail: string,
): Promise<{ maskedEmail: string }> {
  const db = getAdminDb();
  await enforcePasswordChangeOtpRateLimit(db, userId);

  const code = generateOtpCode();
  const codeHash = hashOtp(code);
  const expiresAt = new Date(Date.now() + PASSWORD_CHANGE_OTP_EXPIRY_MS);

  await passwordChangeOtpRef(db, userId).set({
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

  await sendEmail({
    to: userEmail,
    subject: `${siteName}: Verify your password change`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="margin-bottom:8px">Confirm Password Change</h2>
        <p style="color:#555">Someone requested to change this account's password. Enter this code to confirm it was you:</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;text-align:center;margin:24px 0;padding:16px;background:#f3f4f6;border-radius:8px">${code}</div>
        <p style="color:#888;font-size:12px">This code expires in 10 minutes. If you did not request this, your password has NOT been changed — but consider securing your account.</p>
      </div>
    `,
  });

  serverLogger.info(`Password change OTP sent: uid=${userId}`);
  return { maskedEmail };
}

/** Verifies the 6-digit password-change OTP and marks the Firestore record verified. */
export async function verifyPasswordChangeOtp(
  userId: string,
  code: string,
): Promise<void> {
  const db = getAdminDb();
  const ref = passwordChangeOtpRef(db, userId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new ValidationError("No verification code found. Please request a new code.");
  }
  const otpDoc = snap.data() as PasswordChangeOtpDoc;

  if (otpDoc.verified) return;

  if (otpDoc.attempts >= PASSWORD_CHANGE_OTP_MAX_ATTEMPTS) {
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
  serverLogger.info(`Password change OTP verified: uid=${userId}`);
}

/** Whether the account has a currently-verified password-change OTP on file. */
export async function isPasswordChangeOtpVerified(userId: string): Promise<boolean> {
  const db = getAdminDb();
  const snap = await passwordChangeOtpRef(db, userId).get();
  if (!snap.exists) return false;
  const otpDoc = snap.data() as PasswordChangeOtpDoc;
  return otpDoc.verified === true;
}

/** Consumes the verified OTP so it can't be reused for a future password change. */
export async function consumePasswordChangeOtp(userId: string): Promise<void> {
  const db = getAdminDb();
  await passwordChangeOtpRef(db, userId).delete();
}
