/**
 * Checkout Domain Actions (appkit)
 *
 * OTP-based checkout consent flow — delegates entirely to already-appkit-owned
 * helpers (consent-otp, auth repository, address repository).
 * Auth, rate-limiting, and Next.js specifics are handled by the consumer.
 */

import { timingSafeEqual } from "crypto";
import { ValidationError } from "../../../errors";
import { serverLogger } from "../../../monitoring";
import { sendEmail } from "../../contact";
import {
  CONSENT_OTP_EXPIRY_MS,
  CONSENT_OTP_MAX_ATTEMPTS,
  hashOtp,
  maskEmail,
  generateOtpCode,
  buildConsentOtpEmail,
  enforceConsentOtpRateLimit,
  saveConsentOtp,
  readConsentOtp,
  patchConsentOtp,
} from "../../auth";
import { addressRepository } from "../../account/repository/address.repository";
import { userRepository } from "../../auth/repository/user.repository";
import { resolveDate } from "../../../utils";

/** Returns masked email so the UI can confirm which inbox to check. */
export async function sendCheckoutConsentOtp(
  userId: string,
  userEmail: string,
  addressId: string,
): Promise<{ maskedEmail: string }> {
  const address = await addressRepository.findById(userId, addressId);
  if (!address) throw new ValidationError("Address not found.");

  await enforceConsentOtpRateLimit(userId);

  const code = generateOtpCode();
  const codeHash = hashOtp(code);
  const expiresAt = new Date(Date.now() + CONSENT_OTP_EXPIRY_MS);

  await saveConsentOtp(userId, addressId, {
    codeHash,
    expiresAt,
    attempts: 0,
    verified: false,
    addressId,
    createdAt: new Date(),
  });

  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "LetItRip";
  const { subject, html } = buildConsentOtpEmail(
    address.fullName,
    code,
    siteName,
  );
  await sendEmail({ to: userEmail, subject, html });

  serverLogger.info(`Consent OTP sent: uid=${userId} addressId=${addressId}`);

  return { maskedEmail: maskEmail(userEmail) };
}

/** Verifies the 6-digit consent OTP and marks the Firestore record verified. */
export async function verifyCheckoutConsentOtp(
  userId: string,
  addressId: string,
  code: string,
): Promise<void> {
  const otpDoc = await readConsentOtp(userId, addressId);
  if (!otpDoc)
    throw new ValidationError(
      "No consent OTP found. Please request a new code.",
    );

  if (otpDoc.verified) return;

  if (otpDoc.attempts >= CONSENT_OTP_MAX_ATTEMPTS) {
    throw new ValidationError(
      "Too many failed attempts. Please request a new code.",
    );
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
    await patchConsentOtp(userId, addressId, {
      attempts: otpDoc.attempts + 1,
    });
    throw new ValidationError("Invalid code. Please check and try again.");
  }

  await patchConsentOtp(userId, addressId, {
    verified: true,
    verifiedAt: new Date(),
  });

  serverLogger.info(
    `Consent OTP verified: uid=${userId} addressId=${addressId}`,
  );
}

/**
 * Grants consent via SMS when the shipping address phone matches the buyer's
 * registered phone number.
 */
export async function grantCheckoutConsentViaSms(
  userId: string,
  userPhone: string | undefined,
  addressId: string,
): Promise<void> {
  if (!userPhone)
    throw new ValidationError("No phone number registered on your account.");

  const address = await addressRepository.findById(userId, addressId);
  if (!address) throw new ValidationError("Address not found.");

  const normalizePhone = (s: string) => s.replace(/[^0-9]/g, "").slice(-10);
  if (normalizePhone(address.phone) !== normalizePhone(userPhone)) {
    throw new ValidationError(
      "Phone number does not match the shipping address. Please use email verification for this address.",
    );
  }

  await saveConsentOtp(userId, addressId, {
    codeHash: "",
    expiresAt: new Date(Date.now() + CONSENT_OTP_EXPIRY_MS),
    attempts: 0,
    verified: true,
    verifiedVia: "sms",
    addressId,
    createdAt: new Date(),
  });

  serverLogger.info(
    `Checkout consent granted via SMS: uid=${userId} addressId=${addressId}`,
  );
}

export { userRepository };
