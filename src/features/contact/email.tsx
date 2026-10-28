import "server-only";

// The lazy `require("react-dom/server")` this file used to carry inline now
// lives in ONE place — see render-static-markup.ts for why it cannot be a
// top-level import, and why there is exactly one copy of it.
import { renderStaticMarkup as renderToStaticMarkup } from "../email/render-static-markup";
import { normalizeError } from "../../errors/normalize";
import { guardSend, logSuppressedSend } from "../../_internal/server/notifications/send-guard";
import { recordSendAttempt } from "../../_internal/server/notifications/send-recorder";
import type { SendGuardContext } from "../../_internal/shared/features/messaging/config";
import type { JsonValue } from "@mohasinac/appkit";
import { getProviders } from "../../contracts";
import type { EmailOptions, IEmailProvider } from "../../contracts/email";
import { createResendProvider } from "../../providers/email-resend/provider";
import { siteSettingsRepository } from "../admin/repository/site-settings.repository";
import { serverLogger } from "../../monitoring";
import { currentYear, formatCurrency } from "../../utils";
import { EmailBold, EmailButton, EmailContainer, EmailDivider, EmailDoc, EmailFooter, EmailHeader, EmailRow } from "../email/primitives";
import { getBrandName } from "../../core/brand-resolver";

/*
 * Derived from the provider contract rather than re-declared beside it. The
 * hand-rolled copy this replaces was `Record<string, JsonValue> & {...}`, and
 * the index signature was the bug: `attachments` carries a Buffer, which is
 * not a JsonValue, so the one caller that passes an invoice PDF could not
 * compile — and `sendEmail` was not forwarding `attachments` to the provider
 * either, so even once it compiled the attachment would have been dropped
 * silently (Root Cause #57). Two shapes for one contract is what let those
 * drift apart; `headers` had the same history, declared on the provider side
 * only and read here through a cast.
 *
 * `html` is widened back to optional because a few senders here are text-only
 * and `sendEmail` defaults it to "" on the way out.
 */
type SendEmailOptions = Omit<EmailOptions, "html"> & { html?: string };

/**
 * Everything `sendEmail` needs beyond the message itself.
 *
 * 🛑 REQUIRED, and that is the entire enforcement mechanism.
 *
 * There is no `guard?:` and no default. A sender that cannot say who this mail
 * is for and what it is does not compile, so "someone forgot to guard a new
 * send path" is not a class of bug that can occur — which is what a
 * suppression-marker-and-audit approach would only have made *detectable*
 * (CLAUDE.md Rule #22: make the wrong thing unrepresentable).
 *
 * Kept as a separate second parameter rather than a field on
 * `SendEmailOptions`, which is now the provider's own `EmailOptions`. The
 * guard is about who may send and why; it is not part of the message, and
 * folding it in would put it on the wire to the provider.
 */
export type SendEmailGuard = SendGuardContext;

/*
 * One of the five `NEXT_PUBLIC_SITE_NAME` readers with five different
 * fallbacks that `core/brand-resolver.ts` was written to replace. Kept as a
 * local function so the two call sites below are untouched.
 */
function getSiteName(): string {
  return getBrandName();
}

function getSiteUrl(): string {
  return process.env.NEXTAUTH_URL?.trim() || "http://localhost:3000";
}

/**
 * Resolve an email provider that works in BOTH runtimes.
 *
 * The provider registry is populated by the consumer's `providers.config.ts`,
 * which only runs from the Next.js instrumentation hook. Firebase Functions
 * never call `registerProviders()`, so `getProviders()` throws there —
 * silently failing every Functions-side `sendEmail()` with
 * "Call registerProviders() before getProviders()". That is why the scheduled
 * dailyStatusDigest never delivered: `sendEmail` catches the throw and returns
 * it as `{ error }`, so it surfaced only as a logged "send failed".
 *
 * Falling back to a directly-constructed Resend provider mirrors exactly what
 * `sendNotification()` already does for Functions-side email — Firestore
 * credentials first, env vars second — so both paths resolve identically
 * instead of one runtime silently having no provider at all.
 */
async function resolveEmailProvider(): Promise<IEmailProvider> {
  try {
    return getProviders().email;
  } catch (err) {
    // Not an error condition — "no email provider registered yet" is the
    // expected signal on the Functions runtime, and the fallback below builds
    // one from credentials. Normalized anyway so the catch is never bare.
    void normalizeError(err);
    const [creds, settings] = await Promise.all([
      siteSettingsRepository.getDecryptedCredentials().catch((err: unknown) => {
        void normalizeError(err);
        return {} as { resendApiKey?: string };
      }),
      siteSettingsRepository.getSingleton().catch((err: unknown) => {
        void normalizeError(err);
        return null;
      }),
    ]);

    // A seeded placeholder ("re_PLACEHOLDER") is truthy but not a real key and
    // must never win over a real env var — same guard as providers.config.ts.
    const seeded = creds.resendApiKey?.trim() ?? "";
    const apiKey =
      seeded && !seeded.includes("PLACEHOLDER")
        ? seeded
        : (process.env.RESEND_API_KEY?.trim() ?? "");

    return createResendProvider({
      apiKey,
      fromEmail:
        settings?.emailSettings?.fromEmail?.trim() ||
        process.env.EMAIL_FROM?.trim() ||
        "",
      fromName:
        settings?.emailSettings?.fromName?.trim() ||
        process.env.EMAIL_FROM_NAME?.trim() ||
        "App",
    });
  }
}

/**
 * Send one email, subject to the messaging guard.
 *
 * `suppressed` is a THIRD outcome, distinct from both success and failure, and
 * callers must treat it as such: `{ data: null, error: null }` means the
 * message was deliberately not sent, so a caller that only checks `error` will
 * correctly not raise an alarm, and one that wants to know can read
 * `suppressed`. Returning an `error` for a suppression would have turned every
 * intentional quiet into a logged incident.
 */
export async function sendEmail(
  opts: SendEmailOptions,
  guard: SendEmailGuard,
): Promise<{ data: JsonValue; error: JsonValue; suppressed?: string }> {
  const decision = await guardSend(guard);
  if (!decision.allow) {
    logSuppressedSend(guard, decision);
    /*
     * Record the SUPPRESSION, not just the sends. Six checklist cases assert that
     * an email should NOT arrive, and over IMAP that is unprovable — you wait and
     * hope. Here it is a row saying which rule stopped it. Gated to the harness
     * mailbox; a no-op for everyone else. See send-recorder.ts.
     */
    void recordSendAttempt({
      to: opts.to as string | string[],
      subject: typeof opts.subject === "string" ? opts.subject : "",
      feature: guard.feature,
      audience: String(guard.audience),
      channel: String(guard.channel),
      outcome: "suppressed",
      reason: decision.reason,
    });
    return { data: null, error: null, suppressed: decision.reason };
  }
  try {
    const provider = await resolveEmailProvider();
    const data = await provider.send({
      to: opts.to,
      subject: opts.subject,
      html: typeof opts.html === "string" ? opts.html : "",
      text: typeof opts.text === "string" ? opts.text : undefined,
      from: typeof opts.from === "string" ? opts.from : undefined,
      cc:
        typeof opts.cc === "string" || Array.isArray(opts.cc)
          ? (opts.cc as string | string[])
          : undefined,
      replyTo: typeof opts.replyTo === "string" ? opts.replyTo : undefined,
      headers: opts.headers,
      // Forwarded, not dropped — the provider has mapped these to Resend's
      // `attachments` all along; nothing here ever handed them over.
      attachments: opts.attachments,
    });
    void recordSendAttempt({
      to: opts.to as string | string[],
      subject: typeof opts.subject === "string" ? opts.subject : "",
      feature: guard.feature,
      audience: String(guard.audience),
      channel: String(guard.channel),
      outcome: "sent",
      html: typeof opts.html === "string" ? opts.html : undefined,
    });
    return { data: data as unknown as JsonValue, error: null };
  } catch (error) {
    void normalizeError(error);
    const message = error instanceof Error ? error.message : String(error);
    void recordSendAttempt({
      to: opts.to as string | string[],
      subject: typeof opts.subject === "string" ? opts.subject : "",
      feature: guard.feature,
      audience: String(guard.audience),
      channel: String(guard.channel),
      outcome: "failed",
      reason: message,
    });
    return { data: null, error: message };
  }
}

async function sendConfiguredEmail(
  opts: SendEmailOptions,
  guard: SendEmailGuard,
): Promise<{ data: JsonValue; error: JsonValue; suppressed?: string }> {
  return sendEmail(opts, guard);
}

const PARA_STYLE = { margin: "0 0 12px", fontSize: "14px", lineHeight: "1.6" } as const;
const LABEL_STYLE = { color: "#71717a", fontSize: "13px" } as const;
const VALUE_STYLE = { color: "#18181b", fontSize: "14px", fontWeight: 600 } as const;

/*
 * `sendVerificationEmailWithLink` and `sendPasswordResetEmailWithLink` were
 * deleted here 2026-09.
 *
 * Both had ZERO callers. Signup verification and password reset moved to the
 * Firebase client SDK's own hosted templates (Root Cause #54/#55), which send
 * browser→Firebase with no server hop — so these two had been rendering
 * templates nobody would ever receive. Keeping them "in case" would have meant
 * two plausible-looking Resend senders sitting next to the real ones, ready for
 * someone to wire up a second, competing password-reset path.
 *
 * If a bespoke auth mail is ever genuinely needed, note that it must go
 * through `sendEmail(opts, guard)` like everything else, and that Firebase's
 * own quota — not Resend's 100/day — is what currently absorbs this traffic.
 */

export interface OrderConfirmationEmailParams {
  to: string;
  userName: string;
  orderId: string;
  productTitle: string;
  quantity: number;
  totalPrice: number;
  currency: string;
  shippingAddress?: string;
  paymentMethod: string;
  items?: Array<{
    productId: string;
    productTitle: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  /**
   * Phase 7 — the invoice PDF to attach, as STORED bytes.
   *
   * 🛑 Bytes, never a path and never a renderer. Two renders can disagree — a
   * changed template, a different library version — and the buyer's copy must
   * be byte-identical to ours. Letting this function render would be a second
   * render by definition.
   *
   * 🛑 Optional, and absence must stay silent. The invoice is numbered on the
   * PAID transition and its bytes are produced on first request, so a COD
   * order confirmed before payment legitimately has none — and this email has
   * always sent without an attachment. Failing or warning here would turn the
   * normal case into a noisy one.
   *
   * Resend supports attachments already (`email-resend/provider.ts`), so this
   * needs no new send, no new credential and no change to the 80/day ceiling.
   * Only the payload is bigger.
   */
  invoicePdf?: { filename: string; content: Buffer };
}

function renderOrderItems(
  items: OrderConfirmationEmailParams["items"],
  productTitle: string,
  quantity: number,
  currency: string,
) {
  if (items && items.length > 1) {
    return (
      <>
        <p style={{ ...PARA_STYLE, fontWeight: 600 }}>Items ({items.length})</p>
        {items.map((item, idx) => (
          <p key={item.productId ?? idx} style={PARA_STYLE}>
            {item.productTitle} × {item.quantity} —{" "}
            <EmailBold>{formatCurrency(item.totalPrice, currency)}</EmailBold>
          </p>
        ))}
      </>
    );
  }
  return (
    <>
      <p style={PARA_STYLE}>
        <span style={LABEL_STYLE}>Product:</span>{" "}
        <span style={VALUE_STYLE}>{productTitle}</span>
      </p>
      <p style={PARA_STYLE}>
        <span style={LABEL_STYLE}>Quantity:</span>{" "}
        <span style={VALUE_STYLE}>{quantity}</span>
      </p>
    </>
  );
}

export async function sendOrderConfirmationEmail(
  params: OrderConfirmationEmailParams,
): Promise<{ success: boolean; data?: JsonValue }> {
  const siteName = getSiteName();
  const siteUrl = getSiteUrl();
  const {
    to,
    userName,
    orderId,
    productTitle,
    quantity,
    totalPrice,
    currency,
    shippingAddress,
    paymentMethod,
    items,
  } = params;

  const orderUrl = `${siteUrl}/user/orders/view/${orderId}`;
  const formattedTotal = formatCurrency(totalPrice, currency);
  const paymentLabel =
    paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment";

  const html = `<!DOCTYPE html>${renderToStaticMarkup(
    <EmailDoc title="Order confirmed">
      <EmailContainer>
        <EmailHeader brandName={siteName}>Order Confirmed ✓</EmailHeader>
        <EmailRow>
          <p style={PARA_STYLE}>Hi {userName},</p>
          <p style={PARA_STYLE}>
            Thank you for your order! We've received it and will process it
            shortly.
          </p>
          <p style={PARA_STYLE}>
            <span style={LABEL_STYLE}>Order ID:</span>{" "}
            <span style={VALUE_STYLE}>{orderId}</span>
          </p>
          {renderOrderItems(items, productTitle, quantity, currency)}
          <p style={PARA_STYLE}>
            <span style={LABEL_STYLE}>Total:</span>{" "}
            <span style={VALUE_STYLE}>{formattedTotal}</span>
          </p>
          <p style={PARA_STYLE}>
            <span style={LABEL_STYLE}>Payment:</span>{" "}
            <span style={VALUE_STYLE}>{paymentLabel}</span>
          </p>
          {shippingAddress ? (
            <p style={PARA_STYLE}>
              <span style={LABEL_STYLE}>Ship to:</span>{" "}
              <span style={VALUE_STYLE}>{shippingAddress}</span>
            </p>
          ) : null}
          <EmailDivider spacing="md" />
          <EmailButton href={orderUrl}>View order</EmailButton>
          <p style={{ ...PARA_STYLE, color: "#71717a" }}>
            We'll send you another email when your order is shipped.
          </p>
        </EmailRow>
        <EmailFooter copyright={`© ${currentYear()} ${siteName}. All rights reserved.`} />
      </EmailContainer>
    </EmailDoc>,
  )}`;

  const itemsText =
    items && items.length > 1
      ? items
          .map(
            (item) =>
              `  • ${item.productTitle} × ${item.quantity} — ${formatCurrency(item.totalPrice, currency)}`,
          )
          .join("\n")
      : `  Product: ${productTitle}\n  Quantity: ${quantity}`;

  try {
    const { data, error } = await sendConfiguredEmail(
      {
        to,
        subject: `Order Confirmed — ${orderId}`,
        html,
        /*
         * Phase 7 — the invoice, when there is one. The STORED bytes, handed
         * in by the caller: see `invoicePdf` on the params type for why this
         * function must not render its own.
         */
        ...(params.invoicePdf
          ? {
              attachments: [
                {
                  filename: params.invoicePdf.filename,
                  content: params.invoicePdf.content,
                  contentType: "application/pdf",
                },
              ],
            }
          : {}),
        text: `Hi ${userName},\n\nYour order ${orderId} has been confirmed!\n\n${itemsText}\nTotal: ${formattedTotal}\nPayment: ${paymentLabel}\nShip to: ${shippingAddress ?? "-"}\n\nView your order: ${orderUrl}\n\n© ${currentYear()} ${siteName}`,
      },
      {
        channel: "email",
        feature: "order_confirmation",
        audience: "user",
        /*
         * Transactional: this is the buyer's receipt for money already taken.
         * It ignores the kill switch — a site that has quietened its marketing
         * must still confirm the orders it accepted — but it is still counted
         * against the daily ceiling, because the ceiling exists to stay inside
         * the provider's limit and the provider does not exempt receipts.
         */
        transactional: true,
      },
    );
    if (error) {
      serverLogger.error("Failed to send order confirmation email", { error });
      return { success: false };
    }
    return { success: true, data };
  } catch (error) {
    void normalizeError(error);
    serverLogger.error("Error sending order confirmation email", { error });
    return { success: false };
  }
}

/*
 * `sendContactEmail` was deleted here 2026-09. A contact-form submission is now
 * a RECORD, not an email.
 *
 * It already wrote to `contactSubmissions` and already had a full admin inbox
 * at `/admin/contact` with read/resolve flags — the email was a duplicate
 * signal on top of a queue that existed. Each submission now appears in the
 * daily digest with a `mailto:` reply link, which costs nothing and puts the
 * reply in the operator's own mailbox rather than routing it back out through
 * a 100/day allowance.
 *
 * 🛑 Two things had to change together for this to be safe, and the second is
 * the one that bites:
 *
 *   1. `/api/contact` must AWAIT the Firestore write and fail the request when
 *      it fails. It was fire-and-forget `.catch()`-and-continue, with the email
 *      as the de-facto backup — so with the email gone, a dropped write would
 *      have silently lost a customer's message.
 *   2. `getSupportEmail()` went with it. Its fallback was
 *      `"support@example.com"` and `EMAIL_SUPPORT` was never set in any
 *      runtime, so every contact email this function ever "sent" went to a
 *      domain nobody owns. That is a bug this deletion happens to fix.
 */

export async function sendDigitalCodeClaimedEmail(params: {
  to: string;
  userName: string;
  productTitle: string;
  orderId: string;
}): Promise<{ success: boolean }> {
  const siteName = getSiteName();
  const siteUrl = getSiteUrl();
  const { to, userName, productTitle, orderId } = params;
  const orderUrl = `${siteUrl}/user/orders/view/${orderId}`;

  const html = `<!DOCTYPE html>${renderToStaticMarkup(
    <EmailDoc title="Your digital code is ready">
      <EmailContainer>
        <EmailHeader brandName={siteName}>Your Digital Code Is Ready 🔑</EmailHeader>
        <EmailRow>
          <p style={PARA_STYLE}>Hi {userName},</p>
          <p style={PARA_STYLE}>
            Your digital code for <EmailBold>{productTitle}</EmailBold> has been
            assigned to your order and is ready to reveal.
          </p>
          <p style={PARA_STYLE}>
            <span style={LABEL_STYLE}>Order ID:</span>{" "}
            <span style={VALUE_STYLE}>{orderId}</span>
          </p>
          <p style={PARA_STYLE}>
            <span style={LABEL_STYLE}>Product:</span>{" "}
            <span style={VALUE_STYLE}>{productTitle}</span>
          </p>
          <EmailDivider spacing="md" />
          <EmailButton href={orderUrl}>Reveal your code</EmailButton>
          <p style={{ ...PARA_STYLE, color: "#71717a" }}>
            For security, the code is only shown inside your {siteName}{" "}
            account.
          </p>
        </EmailRow>
        <EmailFooter copyright={`© ${currentYear()} ${siteName}. All rights reserved.`} />
      </EmailContainer>
    </EmailDoc>,
  )}`;

  try {
    const { error } = await sendConfiguredEmail(
      {
        to,
        subject: `Your digital code for "${productTitle}" is ready`,
        html,
        text: `Hi ${userName},\n\nYour digital code for "${productTitle}" (Order: ${orderId}) is ready to reveal.\n\nVisit your order: ${orderUrl}\n\nFor security, the code is only shown inside your ${siteName} account.\n\n© ${currentYear()} ${siteName}`,
      },
      {
        channel: "email",
        feature: "digital_code_claimed",
        audience: "user",
        // Transactional: the buyer has paid and this is how they learn the
        // thing they bought is available to collect. Suppressing it would be
        // taking money and saying nothing.
        transactional: true,
      },
    );
    if (error) {
      serverLogger.error("Failed to send digital code claimed email", { error });
      return { success: false };
    }
    return { success: true };
  } catch (error) {
    void normalizeError(error);
    serverLogger.error("Error sending digital code claimed email", { error });
    return { success: false };
  }
}

/*
 * `sendSiteSettingsChangedEmail` was deleted here 2026-09.
 *
 * It fired on EVERY settings save — so an admin adjusting a fee spent one of
 * the day's 100 emails per click, and a session of tuning could spend a dozen.
 *
 * What it was for is already covered better: `adminAuditLog` records the actor,
 * the action and the fields on every privileged admin write and is queryable at
 * `/admin/audit-log`, which an email cannot be. The daily digest now carries
 * the count so a burst of settings activity is still visible without anyone
 * having to go looking.
 *
 * Note also that its `adminEmails: string[]` parameter was aspirational: the
 * one call site passed `[process.env.ADMIN_NOTIFICATION_EMAIL ?? "admin@letitrip.in"]`,
 * a single address, and `ADMIN_NOTIFICATION_EMAIL` was set in no runtime — so
 * "notify the admins" meant one hardcoded mailbox.
 */
