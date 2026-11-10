/**
 * Checkout Value OTP Actions (appkit) — Tier PP.
 *
 * OTP gate for placing a checkout whose total is at/above
 * `siteSettings.payment.otpCheckoutThreshold` (skipped for COD). A distinct
 * purpose from `checkout-actions.ts`'s third-party shipping consent OTP —
 * same crypto primitives, separate Firestore namespace and copy.
 */

import { timingSafeEqual } from "crypto";
import { AuthorizationError, ValidationError } from "../../../errors";
import { normalizeError } from "../../../errors/normalize";
import { safeRead } from "../../../errors/safe-read";
import { serverLogger } from "../../../monitoring";
import { sendEmail } from "../../contact/email";
import { getAdminDb } from "../../../providers/db-firebase";
import { resolveDate } from "../../../utils";
import { addressesRepository } from "../../addresses/repository/addresses.repository";
import { siteSettingsRepository } from "../../admin/repository/site-settings.repository";
import { sendWhatsAppTemplateMessage } from "../../whatsapp-bot/helpers/whatsapp";
import { isChannelHealthy, withChannelRetry } from "../../../_internal/server/notifications/channel-health";
import { guardSend, logSuppressedSend } from "../../../_internal/server/notifications/send-guard";
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
import { getBrandName } from "../../../core/brand-resolver";

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
  opts?: {
    /**
     * Skip the per-user cooldown because the caller already paid it for this
     * same buyer request.
     *
     * 🛑 Needed for the fallback in `deliverCheckoutValueOtp`, and without it
     * the fallback cannot work AT ALL: `enforceCheckoutValueOtpRateLimit`
     * WRITES `lastSentAt` on every call, so a second attempt moments later is
     * refused by the cooldown the first attempt just set. One buyer pressing
     * "send code" once is one request, however many channels it takes to
     * deliver — so the cooldown belongs to the request, not the attempt.
     *
     * Deliberately opt-IN: every existing caller keeps being rate limited.
     */
    alreadyRateLimited?: boolean;
  },
): Promise<{ maskedEmail?: string; maskedPhone?: string; skipped?: boolean }> {
  const db = getAdminDb();
  if (!opts?.alreadyRateLimited) await enforceCheckoutValueOtpRateLimit(db, userId);

  const code = generateOtpCode();
  const codeHash = hashOtp(code);
  const expiresAt = new Date(Date.now() + CHECKOUT_VALUE_OTP_EXPIRY_MS);
  /*
   * 🛑 Was `process.env.NEXT_PUBLIC_SITE_NAME || "LetItRip"`, and the env var
   * holds `"Let It Rip India"` — which is `appkit.config.js → brand.heroCaption`,
   * not `brand.name`. So every high-value checkout OTP named the site something
   * the brand owner does not call it, and an unconfigured install of appkit
   * named it this marketplace.
   */
  const siteName = getBrandName();

  if (channel === "whatsapp") {
    if (!addressId) {
      throw new ValidationError("Select a delivery address before sending the code via WhatsApp.");
    }
    // A failed settings read makes the WhatsApp channel look deliberately
    // switched off ("send the code by email instead") — a defensible fallback,
    // but one an operator has to be able to see, since it is indistinguishable
    // from an admin having disabled it.
    const settings = await safeRead(() => siteSettingsRepository.getSingleton(), {
      route: "checkout/value-otp",
      key: "checkoutValueOtp.siteSettings",
      fallback: null,
    });
    const creds = settings?.credentials ?? {};
    const whatsappOtpEnabled = settings?.notificationChannels?.whatsapp?.otpEnabled === true;
    const phoneNumberId = creds.whatsappPhoneNumberId?.trim() ?? "";
    const accessToken = creds.whatsappCloudApiToken?.trim() ?? "";
    /*
     * 🛑 The AUTHENTICATION template is a HARD requirement, not a nicety. A
     * checkout OTP is business-initiated and almost never falls inside the 24h
     * customer-service window, and Meta rejects free-form `type: "text"` sends
     * there — which is exactly what this path used to do. The symptom was not
     * an error anyone would read: the send returned non-OK, the channel
     * circuit-breaker tripped, and the OTP gate then reported itself SATISFIED
     * (`skipped: true`) on every high-value checkout.
     *
     * Treated as part of `credsReady` so an install without one resolves to
     * email rather than failing: see `resolveDefaultOtpChannel` below.
     */
    const otpTemplate = creds.whatsappTemplateCheckoutOtp?.trim() ?? "";
    const templateLanguage = creds.whatsappTemplateLanguage?.trim() || "en";
    const credsReady =
      phoneNumberId &&
      accessToken &&
      otpTemplate &&
      !phoneNumberId.includes("PLACEHOLDER") &&
      !accessToken.includes("PLACEHOLDER");

    if (!whatsappOtpEnabled || !credsReady) {
      throw new ValidationError("WhatsApp verification isn't available right now — send the code by email instead.");
    }

    const address = await addressesRepository.findById(addressId);
    /*
   * REVEALED: this phone receives the high-value checkout OTP, so it has to
   * be the real number. `addressesRepository` is ciphertext-by-default, and
   * `.trim()` on the stored value is what the nominal brand caught — the
   * old intersection form let `Encrypted<string>` call string methods.
   */
  const addressPlain = address ? addressesRepository.revealAddress(address) : null;
  const phone = addressPlain?.phone?.trim();
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

    // Same guard as the email branch below, same reasoning: transactional, so
    // the kill switch does not apply (the buyer cannot check out without the
    // code), but the daily ceiling does.
    const waGuard = {
      channel: "whatsapp" as const,
      feature: "checkout_value_otp",
      audience: "user" as const,
      transactional: true,
    };
    const waDecision = await guardSend(waGuard);
    if (!waDecision.allow) {
      logSuppressedSend(waGuard, waDecision);
      throw new ValidationError(
        "We couldn't send the verification code via WhatsApp — please try again, or send it by email instead.",
      );
    }

    try {
      const sent = await withChannelRetry("whatsapp", async () => {
        /*
         * 🛑 The code travels TWICE, and both are required.
         *
         * `bodyParams` fills the `{{1}}` Meta renders inside its own
         * authentication copy (the body text of an AUTHENTICATION template is
         * owned by Meta, not by us). `buttonParam` fills the COPY_CODE button
         * — omit it and Meta 4xxs the send outright, because a copy button
         * with nothing to copy is not a valid message.
         *
         * `message` is no longer sent: free-form text on a business-initiated
         * send is rejected. It is still built above because the email branch
         * and the rate-limit bookkeeping share it.
         */
        const ok = await sendWhatsAppTemplateMessage({
          toPhone: phone,
          phoneNumberId,
          accessToken,
          templateName: otpTemplate,
          languageCode: templateLanguage,
          bodyParams: [code],
          buttonParam: code,
        });
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
      const { error } = await sendEmail(
        {
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
        },
        {
          channel: "email",
          feature: "checkout_value_otp",
          audience: "user",
          /*
           * The strongest case for `transactional` in the codebase: the buyer
           * is mid-checkout above the high-value threshold and CANNOT complete
           * the order without this code. Suppressing it does not quieten the
           * site, it breaks checkout — so it ignores the kill switch.
           *
           * It still counts against the daily ceiling, which is the honest
           * behaviour: if the provider is going to start rejecting, pretending
           * otherwise here just moves the failure somewhere less legible. The
           * 15-minute per-user cooldown in `checkout-value-otp.ts` already
           * bounds how much of the allowance one buyer can consume.
           */
          transactional: true,
        },
      );
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

/** What `deliverCheckoutValueOtp` tells the caller about the attempt. */
export interface CheckoutValueOtpDelivery {
  maskedEmail?: string;
  maskedPhone?: string;
  /** The channel that actually delivered. Absent when nothing could. */
  sentVia?: CheckoutValueOtpChannel;
  /**
   * The buyer asked for one channel and got the other. Surface this — a code
   * that silently arrives somewhere the buyer is not looking reads to them as
   * "no code arrived", and they retry into the cooldown.
   */
  fellBack?: boolean;
  /** 🛑 BOTH channels unavailable — the OTP gate was WAIVED. */
  skipped?: boolean;
}

/**
 * Which channel a buyer gets by default when they have not chosen one.
 *
 * WhatsApp is the owner's preferred default (2026-11-10), but it is **earned,
 * not assumed**: it wins only when the channel is switched on, the Cloud API
 * credentials are real, and an AUTHENTICATION template name is configured.
 * Any of those missing and this resolves to email.
 *
 * 🛑 That condition is the whole safety property. Defaulting every buyer to
 * WhatsApp before an authentication template exists would send each one down a
 * channel Meta physically rejects; the repeated failures trip the channel
 * circuit-breaker, and an unhealthy channel used to make the OTP gate report
 * itself SATISFIED. The default would then have quietly disabled high-value
 * order verification for everyone. It flips itself on when the config lands —
 * no redeploy, because the template name is config and not code.
 */
export async function resolveDefaultOtpChannel(): Promise<CheckoutValueOtpChannel> {
  const settings = await safeRead(() => siteSettingsRepository.getSingleton(), {
    route: "checkout/value-otp",
    key: "checkoutValueOtp.defaultChannel",
    fallback: null,
  });
  const creds = settings?.credentials ?? {};
  const ready =
    settings?.notificationChannels?.whatsapp?.otpEnabled === true &&
    Boolean(creds.whatsappPhoneNumberId?.trim()) &&
    Boolean(creds.whatsappCloudApiToken?.trim()) &&
    Boolean(creds.whatsappTemplateCheckoutOtp?.trim());
  if (!ready) return "email";
  return (await isChannelHealthy("whatsapp")) ? "whatsapp" : "email";
}

/**
 * Send the checkout-value OTP, falling back to the other channel rather than
 * waiving the gate.
 *
 * 🛑 This exists because the single-channel primitive answers `skipped: true`
 * when its channel is circuit-broken or unconfigured — i.e. a channel OUTAGE
 * silently satisfied the high-value OTP gate and let the order through
 * unverified. One provider having a bad afternoon should not be a way to skip
 * identity verification on the largest orders on the site.
 *
 * Owner decision, 2026-11-10: **fall back to the other channel; only skip when
 * BOTH are down.** Skipping stays possible on purpose — the alternative is
 * that a Meta or Resend outage blocks every high-value checkout — but it is
 * now the genuinely-last resort, and it is logged as the security event it is
 * rather than as a routine info line.
 */
export async function deliverCheckoutValueOtp(
  userId: string,
  userEmail: string,
  requested?: CheckoutValueOtpChannel,
  addressId?: string,
): Promise<CheckoutValueOtpDelivery> {
  const preferred = requested ?? (await resolveDefaultOtpChannel());
  const order: CheckoutValueOtpChannel[] =
    preferred === "whatsapp" ? ["whatsapp", "email"] : ["email", "whatsapp"];

  const failures: string[] = [];

  for (const [index, candidate] of order.entries()) {
    try {
      const result = await sendCheckoutValueOtp(userId, userEmail, candidate, addressId, {
        // 🛑 Only the FIRST attempt pays the cooldown — see the option's own
        // note. Charging the fallback again refuses it instantly.
        alreadyRateLimited: index > 0,
      });
      if (result.skipped) {
        failures.push(`${candidate}: channel unavailable`);
        continue;
      }
      return { ...result, sentVia: candidate, fellBack: candidate !== preferred };
    } catch (err) {
      /*
       * A cooldown rejection is the buyer's own rate limit and must reach them
       * verbatim — retrying the other channel would be answering "you asked
       * too soon" by sending another message. Rethrown, not collected.
       */
      if (err instanceof AuthorizationError) throw err;
      void normalizeError(err);
      failures.push(`${candidate}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /*
   * 🛑 Both channels failed, so the gate is waived and a high-value order can
   * be placed without verification. `error`, not `warn` or `info`: this is the
   * one branch here with a security consequence, and the previous version of
   * this behaviour was invisible precisely because it logged at `warn` next to
   * ordinary noise.
   */
  serverLogger.error(
    "deliverCheckoutValueOtp: EVERY channel failed — high-value OTP gate WAIVED",
    { uid: userId, preferred, failures },
  );
  return { skipped: true };
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
