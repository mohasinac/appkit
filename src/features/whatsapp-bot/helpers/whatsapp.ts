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
  WaBusinessSendInput,
  CatalogSyncInput,
  CatalogSyncResult,
  PurchaseAnnouncementInput,
} from "../types";

const META_GRAPH_BASE = "https://graph.facebook.com/v20.0";

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
 * Send a WhatsApp message via Meta WhatsApp Business Cloud API.
 * Distinct from the Twilio-based sendWhatsAppMessage — used for server-initiated
 * platform announcements. Returns true on success, false on any failure.
 */
export async function sendWhatsAppBusinessMessage(
  input: WaBusinessSendInput,
): Promise<boolean> {
  const { toPhone, message, phoneNumberId, accessToken } = input;
  const cleanPhone = toPhone.replace(/\D/g, "");
  if (!cleanPhone || !phoneNumberId || !accessToken) return false;
  try {
    const res = await fetch(`${META_GRAPH_BASE}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "text",
        text: { body: message },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Sync a store's products to a Meta Commerce Catalog via items_batch API.
 * Batches at 50 items per call (Meta limit). Returns aggregate results.
 */
export async function syncProductsToCatalog(
  input: CatalogSyncInput,
): Promise<CatalogSyncResult> {
  const { catalogId, accessToken, products } = input;
  const result: CatalogSyncResult = {
    handles: [],
    successCount: 0,
    failureCount: 0,
    errors: [],
  };

  const BATCH_SIZE = 50;
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    const requests = batch.map((p) => ({
      method: "UPDATE",
      retailer_id: p.id,
      data: {
        name: p.title,
        description: p.description,
        // Meta expects "<amount> <ISO_CURRENCY>" e.g. "450.00 INR"
        price: `${(p.price / 100).toFixed(2)} ${p.currency}`,
        image_url: p.imageUrl,
        availability: p.availability,
        condition: p.condition,
        ...(p.link ? { url: p.link } : {}),
      },
    }));

    try {
      const res = await fetch(
        `${META_GRAPH_BASE}/${catalogId}/items_batch`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ requests }),
        },
      );
      const json = (await res.json()) as { handles?: string[]; error?: { message: string } };
      if (res.ok && json.handles) {
        result.handles.push(...json.handles);
        result.successCount += batch.length;
      } else {
        result.failureCount += batch.length;
        result.errors.push(json.error?.message ?? `Batch ${i / BATCH_SIZE + 1} failed`);
      }
    } catch (err) {
      result.failureCount += batch.length;
      result.errors.push(String(err));
    }
  }

  return result;
}

/**
 * Build a plain-text purchase announcement message for WhatsApp.
 * Sent to admin numbers and store owner when a new order is placed.
 */
export function buildPurchaseAnnouncementMessage(
  input: PurchaseAnnouncementInput,
): string {
  const { buyerName, firstItemName, additionalItemCount, totalAmount, orderId } =
    input;
  const extra =
    additionalItemCount > 0 ? ` + ${additionalItemCount} more item${additionalItemCount > 1 ? "s" : ""}` : "";
  const amount = (totalAmount / 100).toLocaleString("en-IN");
  return `🛑 New order! ${buyerName} purchased ${firstItemName}${extra} for ₹${amount}. Order #${orderId}`;
}

/**
 * Build a wa.me share link with a pre-filled message.
 * Opens WhatsApp contact picker — user selects group manually.
 * This is the only API-compliant way to target a WhatsApp group.
 */
export function buildGroupShareLink(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
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
