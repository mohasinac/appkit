import type { PaymentProofReviewMessageInput } from "../types";

/**
 * Tier PP — message for the payment-proof fast-review WhatsApp push (sent
 * to every `whatsappAdminNotifyNumbers` number when a buyer uploads proof)
 * and for the buyer/seller "share for review" wa.me link (same message,
 * routed through `buildGroupShareLink` instead of the Cloud API push).
 *
 * Pure string builder — deliberately kept in its own file, isolated from
 * `./whatsapp.ts` (which has a top-level `import { createHmac } from
 * "crypto"`), so it can be safely exported from the client-safe barrel.
 * The buyer/seller share-link caller (order payment page) needs this
 * client-side; the crypto-importing sibling functions never can be.
 */
export function buildPaymentProofReviewMessage(
  input: PaymentProofReviewMessageInput,
): string {
  const { orderId, buyerName, productTitle, totalAmount, reviewUrl } = input;
  const amount = totalAmount.toLocaleString("en-IN");
  return `💳 Payment proof submitted! ${buyerName} uploaded proof for "${productTitle}" (₹${amount}). Order #${orderId}. Please review within 2 hours or it auto-confirms: ${reviewUrl}`;
}
