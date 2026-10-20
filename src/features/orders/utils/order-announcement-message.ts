export interface PurchaseAnnouncementInput {
  buyerName: string;
  firstItemName: string;
  /** 0 if only one item in the order */
  additionalItemCount: number;
  /** Total order amount in decimal rupees */
  totalAmount: number;
  orderId: string;
}

/**
 * Plain-text body for the "New order placed" staff notification row.
 *
 * Originally built for the WhatsApp purchase announcement. That integration
 * was removed 2026-10-20, but the builder survives because its output is now
 * the `adminNotifications` body the admin inbox renders and the daily digest
 * counts — a durable record rather than a per-admin blast.
 */
export function buildPurchaseAnnouncementMessage(
  input: PurchaseAnnouncementInput,
): string {
  const { buyerName, firstItemName, additionalItemCount, totalAmount, orderId } =
    input;
  const extra =
    additionalItemCount > 0
      ? ` + ${additionalItemCount} more item${additionalItemCount > 1 ? "s" : ""}`
      : "";
  const amount = totalAmount.toLocaleString("en-IN");
  return `🛍️ New order! ${buyerName} purchased ${firstItemName}${extra} for ₹${amount}. Order #${orderId}`;
}
