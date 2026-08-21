/**
 * Message templates used by job handlers.
 *
 * Lifted verbatim from functions/src/constants/messages.ts so the handlers
 * can live in appkit without depending on the consumer's functions/ tree.
 */

export const AUCTION_MESSAGES = {
  WON_TITLE: "You won the auction! 🎉",
  WON_MESSAGE: (productTitle: string, currency: string, amount: number): string =>
    `Congratulations! You won "${productTitle}" with a bid of ${currency} ${amount}.`,
  LOST_TITLE: "Auction ended",
  LOST_MESSAGE: (productTitle: string): string =>
    `The auction for "${productTitle}" has ended. You were outbid.`,
  NO_BIDS_LOG: (productId: string): string => `Auction ${productId} ended with no bids`,
  /** CTA on the winner's notification — links into the auction checkout lane. */
  WON_ACTION_LABEL: "Pay now",
  RESERVE_NOT_MET_TITLE: "Auction ended below reserve",
  RESERVE_NOT_MET_MESSAGE: (
    productTitle: string,
    currency: string,
    highestBid: number,
    reservePrice: number,
  ): string =>
    `"${productTitle}" ended at ${currency} ${highestBid}, below your reserve of ${currency} ${reservePrice}. No winner was declared and the listing was archived.`,
  RESERVE_NOT_MET_BIDDER_MESSAGE: (productTitle: string): string =>
    `The auction for "${productTitle}" ended without meeting the seller's reserve price, so it did not sell.`,
};

export const BID_MESSAGES = {
  OUTBID_TITLE: "You've been outbid",
  OUTBID_MESSAGE: (productTitle: string, currency: string, currentBid: number): string =>
    `Someone placed a higher bid on "${productTitle}". Current bid: ${currency} ${currentBid}.`,
};

export const ORDER_MESSAGES = {
  CANCELLED_TITLE: "Order cancelled",
  CANCELLED_TIMEOUT_MESSAGE: (productTitle: string, hours: number): string =>
    `Your order for "${productTitle}" was cancelled because payment was not received within ${hours} hours.`,
  CANCELLED_PAYMENT_WINDOW_TITLE: "Payment window expired",
  CANCELLED_PAYMENT_WINDOW_MESSAGE: (productTitle: string): string =>
    `Your order for "${productTitle}" was cancelled because payment wasn't completed within the 15-minute window. The item is back in stock — you're welcome to order again.`,
  AUTO_APPROVED_TITLE: "Payment auto-confirmed",
  AUTO_APPROVED_MESSAGE: (productTitle: string): string =>
    `Your payment proof for "${productTitle}" was auto-confirmed after 2 hours without manual review. If something looks wrong, you can raise a dispute from your order.`,
  CONFIRMED_TITLE: "Order confirmed ✅",
  CONFIRMED_MESSAGE: (productTitle: string): string =>
    `Your order for "${productTitle}" has been confirmed and is being prepared.`,
  SHIPPED_TITLE: "Your order has shipped 📦",
  SHIPPED_MESSAGE: (productTitle: string, trackingNumber?: string): string =>
    `Your order for "${productTitle}" is on its way!${
 trackingNumber ? ` Tracking: ${trackingNumber}` : ""
 }`,
  DELIVERED_TITLE: "Order delivered 🎉",
  DELIVERED_MESSAGE: (productTitle: string): string =>
    `Your order for "${productTitle}" has been delivered. Enjoy!`,
};

export const EMAIL_SUBJECTS = {
  ORDER_CONFIRMED: (productTitle: string): string => `Order confirmed — ${productTitle}`,
  ORDER_SHIPPED: (productTitle: string): string => `Your order has shipped — ${productTitle}`,
  ORDER_DELIVERED: (productTitle: string): string => `Order delivered — ${productTitle}`,
  ORDER_UPDATE_FALLBACK: (productTitle: string): string => `Order update — ${productTitle}`,
};

export const JOB_ERROR_MESSAGES = {
  RESEND_KEY_MISSING: "RESEND_API_KEY not configured — skipping email",
  RESEND_API_ERROR: (status: number, body: string): string =>
    `Resend API error ${status}: ${body}`,
};

/** Default Cart TTL in days (matches functions/config/constants). */
export const CART_TTL_DAYS = 60;
/** Default Notification TTL in days (matches functions/config/constants). */
export const NOTIFICATION_TTL_DAYS = 30;
/** Tester sandbox TTL in days — matches testDataExpiresAt() in features/tester/seed-data/tester-ttl.ts. */
export const TESTER_SANDBOX_TTL_DAYS = 7;
/** Firestore batch write hard ceiling. */
export const BATCH_LIMIT = 500;
/** Firestore single-query soft ceiling for reconcile sweeps. */
export const QUERY_LIMIT = 1000;
