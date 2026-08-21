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
import { normalizeError } from "../../../errors/normalize";
import { serverLogger } from "../../../monitoring";
import { sendEmail } from "../../contact/email";
import { getAdminDb } from "../../../providers/db-firebase";
import { resolveDate } from "../../../utils";
import { addressesRepository } from "../../addresses/repository/addresses.repository";
import { siteSettingsRepository } from "../../admin/repository/site-settings.repository";
import { sendWhatsAppBusinessMessage } from "../../whatsapp-bot/helpers/whatsapp";
import { isChannelHealthy, withChannelRetry } from "../../../_internal/server/notifications/channel-health";
import {
  CHECKOUT_VALUE_OTP_EXPIRY_MS,
  CHECKOUT_VALUE_OTP_MAX_ATTEMPTS,
  hashOtp,
  generateOtpCode,
  checkoutValueOtpRef,
  enforceCheckoutValueOtpRateLimit,
  buildCheckoutValueOtpMessage,
  type CheckoutValueOtpDoc,
} from "../../auth/checkout-value-otp";

export type CheckoutValueOtpChannel = "email" | "whatsapp";

function maskEmail(userEmail: string): string {
  const [local, domain] = userEmail.split("@");
  return domain
    ? `${local.length <= 2 ? "*".repeat(local.length) : local[0] + "*".repeat(local.length - 2) + local[local.length - 1]}@${domain}`
    : "***";
}

/**
 * Sends a checkout-value OTP either by email (default) or WhatsApp
 * (opt-in — the buyer must explicitly choose it in the UI). WhatsApp phone
 * is always resolved server-side from the selected shipping address —
 * never trust a client-supplied phone number.
 *
 * If the chosen channel (and, for email, its skip-worthy fallback) is
 * currently circuit-broken or unconfigured, the OTP gate is treated as
 * satisfied (`skipped: true`) rather than blocking checkout — the caller
 * must log this, since it is a security-relevant bypass even though
 * user-authorized by the channel outage.
 */
export async function sendCheckoutValueOtp(
  userId: string,
  userEmail: string,
  channel: CheckoutValueOtpChannel = "email",
  addressId?: string,
): Promise<{ maskedEmail?: string; maskedPhone?: string; skipped?: boolean }> {
  const db = getAdminDb();
  await enforceCheckoutValueOtpRateLimit(db, userId);

  const code = generateOtpCode();
  const codeHash = hashOtp(code);
  const expiresAt = new Date(Date.now() + CHECKOUT_VALUE_OTP_EXPIRY_MS);
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "LetItRip";

  if (channel === "whatsapp") {
    if (!addressId) {
      throw new ValidationError("Select a delivery address before sending the code via WhatsApp.");
    }
    const settings = await siteSettingsRepository.getSingleton().catch(() => null);
    const creds = settings?.credentials ?? {};
    const whatsappOtpEnabled = settings?.notificationChannels?.whatsapp?.otpEnabled === true;
    const phoneNumberId = creds.whatsappPhoneNumberId?.trim() ?? "";
    const accessToken = creds.whatsappCloudApiToken?.trim() ?? "";
    const credsReady =
      phoneNumberId && accessToken && !phoneNumberId.includes("PLACEHOLDER") && !accessToken.includes("PLACEHOLDER");

    if (!whatsappOtpEnabled || !credsReady) {
      throw new ValidationError("WhatsApp verification isn't available right now — send the code by email instead.");
    }

    const address = await addressesRepository.findById(addressId);
    const phone = address?.phone?.trim();
    if (!phone) {
      throw new ValidationError("The selected address has no phone number on file — send the code by email instead.");
    }

    if (!(await isChannelHealthy("whatsapp"))) {
      serverLogger.warn("sendCheckoutValueOtp: WhatsApp channel unhealthy — skipping OTP gate", { uid: userId, channel });
      return { skipped: true };
    }

    await checkoutValueOtpRef(db, userId).set({
      codeHash,
      expiresAt,
      attempts: 0,
      verified: false,
      createdAt: new Date(),
    });

    const message = buildCheckoutValueOtpMessage(code, siteName);
    try {
      const sent = await withChannelRetry("whatsapp", async () => {
        const ok = await sendWhatsAppBusinessMessage({ toPhone: phone, message, phoneNumberId, accessToken });
        if (!ok) throw new Error("WhatsApp Cloud API returned a non-OK response");
        return ok;
      });
      if (!sent) throw new Error("WhatsApp send failed");
    } catch (err) {
      void normalizeError(err);
      serverLogger.error("Failed to send checkout value OTP via WhatsApp", { uid: userId, err });
      throw new ValidationError(
        "We couldn't send the verification code via WhatsApp — please try again, or send it by email instead.",
      );
    }

    const maskedPhone = phone.length > 4 ? `${"*".repeat(phone.length - 4)}${phone.slice(-4)}` : "***";
    serverLogger.info(`Checkout value OTP sent via WhatsApp: uid=${userId}`);
    return { maskedPhone };
  }

  if (!(await isChannelHealthy("email"))) {
    serverLogger.warn("sendCheckoutValueOtp: email channel unhealthy — skipping OTP gate", { uid: userId, channel });
    return { skipped: true };
  }

  await checkoutValueOtpRef(db, userId).set({
    codeHash,
    expiresAt,
    attempts: 0,
    verified: false,
    createdAt: new Date(),
  });

  const maskedEmail = maskEmail(userEmail);

  try {
    await withChannelRetry("email", async () => {
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
      if (error) throw new Error(String(error));
    });
  } catch (err) {
    void normalizeError(err);
    // Root-caused 2026-08-20: this used to be fire-and-forget — the
    // Firestore OTP doc was written and the caller always got back a
    // success response ("code sent") regardless of whether the email
    // actually went out. Any Resend-side failure (bad API key,
    // unverified sending domain, outage) silently stranded the buyer
    // with a checkout they could never complete, since the OTP gate
    // gave no indication anything had gone wrong.
    serverLogger.error("Failed to send checkout value OTP email", { uid: userId, err });
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
