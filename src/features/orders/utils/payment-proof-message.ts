export interface PaymentProofReviewMessageInput {
  orderId: string;
  buyerName: string;
  productTitle: string;
  totalAmount: number;
  reviewUrl: string;
}

/**
 * Tier PP — message body for the buyer/seller "share for review" `wa.me`
 * link on the order payment page.
 *
 * Pure string builder with no crypto and no network, so it is safe to export
 * from the client-safe barrel. It used to live beside the WhatsApp Cloud API
 * senders in `features/whatsapp-bot/`, isolated into its own file precisely
 * because those siblings carried a top-level `import { createHmac } from
 * "crypto"`. The Cloud API integration was removed 2026-10-20; this builder
 * survived because it feeds an ordinary `wa.me` deep link, which needs no
 * token, no registered number and no Meta billing relationship.
 */
export function buildPaymentProofReviewMessage(
  input: PaymentProofReviewMessageInput,
): string {
  const { orderId, buyerName, productTitle, totalAmount, reviewUrl } = input;
  const amount = totalAmount.toLocaleString("en-IN");
  return `💳 Payment proof submitted! ${buyerName} uploaded proof for "${productTitle}" (₹${amount}). Order #${orderId}. Please review within 2 hours or it auto-confirms: ${reviewUrl}`;
}
