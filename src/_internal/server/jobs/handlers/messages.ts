/**
 * Message templates used by job handlers.
 *
 * Lifted verbatim from functions/src/constants/messages.ts so the handlers
 * can live in appkit without depending on the consumer's functions/ tree.
 */

export const COLLECTOR_DROP_MESSAGES = {
  WON_TITLE: "You won the collector drop! 🎉",
  WON_MESSAGE: (productTitle: string, currency: string, amount: number): string =>
    `Congratulations! You won "${productTitle}" with a bid of ${currency} ${amount}.`,
  LOST_TITLE: "Collector Drop ended",
  LOST_MESSAGE: (productTitle: string): string =>
    `The collector drop for "${productTitle}" has ended. You were outbid.`,
  NO_BIDS_LOG: (productId: string): string => `Collector Drop ${productId} ended with no bids`,
  /** CTA on the winner's notification — links into the collector drop checkout lane. */
  WON_ACTION_LABEL: "Pay now",
  RESERVE_NOT_MET_TITLE: "Collector Drop ended below reserve",
  RESERVE_NOT_MET_MESSAGE: (
    productTitle: string,
    currency: string,
    highestBid: number,
    reservePrice: number,
  ): string =>
    `"${productTitle}" ended at ${currency} ${highestBid}, below your reserve of ${currency} ${reservePrice}. No winner was declared and the listing was archived.`,
  RESERVE_NOT_MET_BIDDER_MESSAGE: (productTitle: string): string =>
    `The collector drop for "${productTitle}" ended without meeting the seller's reserve price, so it did not sell.`,
};

export const BID_MESSAGES = {
  OUTBID_TITLE: "You've been outbid",
  OUTBID_MESSAGE: (productTitle: string, currency: string, currentBid: number): string =>
    `Someone placed a higher bid on "${productTitle}". Current bid: ${currency} ${currentBid}.`,

  // Buy Now places a HOLD, not a purchase — the collector drop stays live and other
  // buyers can still bid or buy it out, so the copy has to convey urgency
  // without claiming the item is already theirs.
  BUY_NOW_HELD_TITLE: "Complete your Buy Now purchase",
  BUY_NOW_HELD_MESSAGE: (
    productTitle: string,
    currency: string,
    amount: number,
    minutes: number,
  ): string =>
    `You've claimed "${productTitle}" at the Buy Now price of ${currency} ${amount}. The collector drop is still live, so it's yours only once you've paid — complete checkout within ${minutes} minutes.`,
  BUY_NOW_HELD_ACTION: "Pay now",

  BUY_NOW_LAPSED_TITLE: "Buy Now claim expired",
  BUY_NOW_LAPSED_MESSAGE: (productTitle: string): string =>
    `Your Buy Now claim on "${productTitle}" expired before payment was completed, so it's been released. The collector drop is still running if you'd like to bid.`,

  BUY_NOW_COLLECTOR_DROP_ENDED_TITLE: "Buy Now claim released",
  BUY_NOW_COLLECTOR_DROP_ENDED_MESSAGE: (productTitle: string): string =>
    `The collector drop for "${productTitle}" ended before you completed your Buy Now purchase, so your claim was released and the item went to the winning bidder.`,
};

export const ORDER_MESSAGES = {
  CANCELLED_TITLE: "Order cancelled",
  CANCELLED_TIMEOUT_MESSAGE: (productTitle: string, hours: number): string =>
    `Your order for "${productTitle}" was cancelled because payment was not received within ${hours} hours.`,
  /*
   * 🛑 Four buyer-facing strings DELETED 2026-11-12, all with zero senders:
   *
   * · `CANCELLED_PAYMENT_WINDOW_{TITLE,MESSAGE}` — "payment wasn't completed
   *   within the 15-minute window". Only `paymentWindowTimeout`'s deleted half
   *   sent them, and no order has had a window to miss since 2026-11-11.
   * · `AUTO_APPROVED_{TITLE,MESSAGE}` — "your payment proof was auto-confirmed
   *   after 2 hours without manual review". ⚠ Read what that sentence
   *   promised: it told a buyer an unreviewed screenshot had been accepted.
   *   The job behind it (`paymentReviewAutoApprove`) is already gone; leaving
   *   the copy would have let any future caller re-assert it in one line.
   */
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

/*
 * ── SELLER-FACING COPY FOR THE SAME TRANSITIONS ───────────────────────────────
 *
 * 🛑 Every string in `ORDER_MESSAGES` is written in the SECOND PERSON to a
 * BUYER — *"Your order has shipped"*. Once `dispatchNotification` started
 * fanning an order event out to the seller as well, the seller began receiving
 * those same sentences about their own sale, as though they had bought it.
 * `audience: "seller"` fixed the action URL and could not fix the words.
 *
 * So the seller gets their own set, and the difference is not cosmetic: a
 * seller does not need to be told their order shipped — THEY shipped it. What
 * they need is the state and whatever they must now do, which is why these are
 * phrased as facts about an order rather than news.
 *
 * ⚠ Still a hardcoded map, like `STATUS_CONFIG` beside it. Both are slated to
 * become registry rows (plan §A2 — *"retire the five maps"*), and keeping the
 * seller copy in exactly the same shape as the buyer copy is what makes that a
 * single mechanical move rather than two. Do NOT give this one a different
 * structure.
 */
export const ORDER_MESSAGES_SELLER = {
  CONFIRMED_TITLE: "Order confirmed — prepare it",
  CONFIRMED_MESSAGE: (productTitle: string): string =>
    `An order for "${productTitle}" is confirmed and awaiting dispatch.`,
  SHIPPED_TITLE: "Order marked shipped",
  SHIPPED_MESSAGE: (productTitle: string, trackingNumber?: string): string =>
    `"${productTitle}" is marked shipped${
      trackingNumber ? ` with tracking ${trackingNumber}` : " — no tracking number recorded yet"
    }.`,
  DELIVERED_TITLE: "Order delivered",
  DELIVERED_MESSAGE: (productTitle: string): string =>
    `"${productTitle}" was delivered to the buyer. Payout follows the usual settlement cycle.`,
  CANCELLED_TITLE: "Order cancelled",
  CANCELLED_MESSAGE: (productTitle: string): string =>
    `The order for "${productTitle}" was cancelled. Stock has been returned.`,
  PLACED_TITLE: "New order received",
  PLACED_MESSAGE: (productTitle: string, buyerName: string, paid: boolean): string =>
    `${paid ? "A paid order" : "An order"} for "${productTitle}" from ${
      buyerName || "a buyer"
    } is waiting for you.`,
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
/**
 * Test-data TTL in days. RE-EXPORTED, not re-declared — this was a second
 * literal `7` whose only tie to the real one was a comment saying it matched.
 */
export { TEST_DATA_TTL_DAYS } from "../../../../constants/seed-meta";
/** Firestore batch write hard ceiling. */
export const BATCH_LIMIT = 500;
/** Firestore single-query soft ceiling for reconcile sweeps. */
export const QUERY_LIMIT = 1000;
