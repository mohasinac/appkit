/**
 * Checkout Domain Actions (appkit)
 *
 * OTP-based checkout consent flow — delegates entirely to already-appkit-owned
 * helpers (consent-otp, auth repository, address repository).
 * Auth, rate-limiting, and Next.js specifics are handled by the consumer.
 */

import { sieveFilter, SIEVE_OP } from "@mohasinac/appkit";
import { timingSafeEqual } from "crypto";
import { ValidationError } from "../../../errors";
import { serverLogger } from "../../../monitoring";
import { sendEmail } from "../../contact/email";
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
} from "../../auth/consent-otp";
import { addressesRepository } from "../../addresses/repository/addresses.repository";

const ERR_ADDRESS_NOT_FOUND = "Address not found.";

async function findUserAddress(userId: string, addressId: string) {
  const address = await addressesRepository.findById(addressId);
  if (!address || address.ownerType !== "user" || address.ownerId !== userId) {
    return null;
  }
  return address;
}
import { userRepository } from "../../auth/repository/user.repository";
import { resolveDate } from "../../../utils";

/** Returns masked email so the UI can confirm which inbox to check. */
export async function sendCheckoutConsentOtp(
  userId: string,
  userEmail: string,
  addressId: string,
): Promise<{ maskedEmail: string }> {
  const address = await findUserAddress(userId, addressId);
  if (!address) throw new ValidationError(ERR_ADDRESS_NOT_FOUND);

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

  const address = await findUserAddress(userId, addressId);
  if (!address) throw new ValidationError(ERR_ADDRESS_NOT_FOUND);

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

/**
 * Grants checkout consent for an admin test order, bypassing the normal OTP flow.
 *
 * The resulting Firestore doc is identical to a verified consent OTP so that
 * `createCheckoutOrderAction` can proceed without modification.  The
 * `verifiedVia: "admin_bypass"` marker prevents bypass-credit grants.
 *
 * Security: callers MUST verify the requesting user is an admin AND that
 * sieveFilter("siteSettings.featureFlags.adminCheckoutBypass", SIEVE_OP.EQ, "= true") before calling this.
 */
export async function grantAdminCheckoutBypass(
  userId: string,
  addressId: string,
  bypassingAdminUid: string,
): Promise<void> {
  const address = await findUserAddress(userId, addressId);
  if (!address) throw new ValidationError(ERR_ADDRESS_NOT_FOUND);

  await saveConsentOtp(userId, addressId, {
    codeHash: "",
    expiresAt: new Date(Date.now() + CONSENT_OTP_EXPIRY_MS),
    attempts: 0,
    verified: true,
    verifiedVia: "admin_bypass",
    adminBypassBy: bypassingAdminUid,
    addressId,
    createdAt: new Date(),
  });

  serverLogger.info(
    `Admin checkout bypass granted: uid=${userId} addressId=${addressId} bypassedBy=${bypassingAdminUid}`,
  );
}

export { userRepository };
