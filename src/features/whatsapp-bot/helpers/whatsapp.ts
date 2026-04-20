import { createHmac, timingSafeEqual } from "crypto";
import {
  getDefaultCurrencySymbol,
  getDefaultLocale,
} from "../../../core/baseline-resolver";
import type {
  CheckoutMessageInput,
  StatusNotificationInput,
  WebhookVerifyInput,
  IncomingWebhookPayload,
  SendWhatsAppInput,
  StatusMessageInput,
} from "../types";

export function buildCheckoutMessageURL(input: CheckoutMessageInput): string {
  const { waNumber, cart, total, address, isPreorder = false } = input;
  const prefix = isPreorder ? "\uD83D\uDD16 *PRE-ORDER*\n\n" : "";
  const lines = cart.map(
    (i) =>
      `• ${i.name} ×${i.qty} — ${getDefaultCurrencySymbol()}${(i.salePrice * i.qty).toLocaleString(getDefaultLocale())}`,
  );
  const body = [
    `${prefix}Hi Hobson! I'd like to place an order:`,
    "",
    ...lines,
    "",
    `*Total: ${getDefaultCurrencySymbol()}${total.toLocaleString(getDefaultLocale())}*`,
    "",
    `Deliver to: ${address.name}, ${address.line1}${address.line2 ? ", " + address.line2 : ""}, ${address.city} - ${address.pincode}`,
    `Phone: ${address.phone}`,
    "",
    "Please share payment details.",
  ].join("\n");
  return `https://wa.me/${waNumber}?text=${encodeURIComponent(body)}`;
}

export function buildStatusNotificationURL(
  input: StatusNotificationInput,
): string {
  const { userPhone, template, vars } = input;
  const body = template.replace(
    /\{(\w+)\}/g,
    (_, key: string) => vars[key] ?? `{${key}}`,
  );
  return `https://wa.me/${userPhone}?text=${encodeURIComponent(body)}`;
}

export function verifyWebhookSignature(input: WebhookVerifyInput): boolean {
  const { payload, signature, secret } = input;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const sigBuf = Buffer.from(signature, "hex");
  if (expectedBuf.length !== sigBuf.length) return false;
  return timingSafeEqual(expectedBuf, sigBuf);
}

export function isAdminNumber(
  incomingNumber: string,
  adminBotNumber: string,
): boolean {
  const clean = (n: string) => n.replace(/\D/g, "");
  return clean(incomingNumber).endsWith(clean(adminBotNumber));
}

/**
 * Parse an incoming WhatsApp webhook payload (Twilio form-encoded or Wati.io JSON).
 * Returns null if the payload cannot be parsed or is missing required fields.
 */
export function parseIncomingWebhookPayload(
  rawBody: string,
  contentType: string,
): IncomingWebhookPayload | null {
  try {
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const params = new URLSearchParams(rawBody);
      const from = params.get("From") ?? "";
      const body = params.get("Body") ?? "";
      if (!from || !body) return null;
      return {
        from: from.replace(/^whatsapp:/i, "").replace(/\D/g, ""),
        body: body.trim(),
      };
    }
    // JSON format (Wati.io or generic)
    const json = JSON.parse(rawBody) as Record<string, unknown>;
    const from =
      typeof json.senderWaId === "string"
        ? json.senderWaId
        : typeof json.from === "string"
          ? json.from
          : "";
    const body =
      typeof (json.text as Record<string, unknown> | undefined)?.body ===
      "string"
        ? ((json.text as Record<string, unknown>).body as string)
        : typeof json.body === "string"
          ? json.body
          : "";
    if (!from || !body) return null;
    return { from: from.replace(/\D/g, ""), body: body.trim() };
  } catch {
    return null;
  }
}

const DEFAULT_STATUS_MESSAGES: Record<string, string> = {
  pending_payment:
    "🛒 Your order #{id} has been received and is awaiting payment confirmation.",
  payment_confirmed:
    "✅ Payment confirmed for order #{id}! We're getting it ready.",
  processing: "📦 Your order #{id} is being packed and prepared for dispatch.",
  shipped: "🚚 Your order #{id} is on its way!{tracking}",
  out_for_delivery: "🏃 Your order #{id} is out for delivery today!",
  delivered: "🎉 Order #{id} delivered! Thank you for your order!",
  cancelled:
    "❌ Your order #{id} has been cancelled. Contact us if you have any questions.",
  refund_initiated:
    "💸 Refund initiated for order #{id}. It should reflect within 5–7 business days.",
};

/**
 * Build a human-readable status notification message for an order.
 * Pass a custom `statusMessages` map to override the defaults.
 */
export function buildStatusMessage(
  input: StatusMessageInput,
  statusMessages: Record<string, string> = DEFAULT_STATUS_MESSAGES,
): string {
  const { orderId, status, trackingNumber, courierName } = input;
  const template =
    statusMessages[status] ??
    `Your order #${orderId} status updated to: ${status}.`;
  const trackingLine = trackingNumber
    ? `\nTracking: ${courierName ? courierName + " — " : ""}${trackingNumber}`
    : "";
  return template.replace("{id}", orderId).replace("{tracking}", trackingLine);
}

/**
 * Send an outbound WhatsApp message via Twilio REST API.
 * Returns true on success, false on failure.
 */
export async function sendWhatsAppMessage(
  input: SendWhatsAppInput,
): Promise<boolean> {
  const { toPhone, message, accountSid, authToken, fromNumber } = input;
  const cleanPhone = toPhone.replace(/\D/g, "");
  if (!cleanPhone) return false;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const body = new URLSearchParams({
    From: fromNumber,
    To: `whatsapp:+${cleanPhone}`,
    Body: message,
  });
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
    },
    body: body.toString(),
  });
  return res.ok;
}
