/**
 * May this notification type be EMAILED at all?
 *
 * ## Why this is code and not the admin allow-list
 *
 * `siteSettings.notificationChannels.email.types?: NotificationType[]` already
 * exists and is checked inside `sendNotification`. Setting it in the seed would
 * have been one line — and the wrong one, three times over:
 *
 *   · it is a plain array, so a NEW notification type is silently
 *     email-enabled. A `Record<Union, boolean>` makes it a compile error
 *     instead (Root Cause #61 — a Record is compile-safe, an array is not);
 *   · its empty case means "all types allowed", so an admin clearing the field
 *     reopens every one of them;
 *   · it is data, so a reseed quietly restores the old behaviour.
 *
 * So the two layers compose in one direction only: **this map decides what is
 * eligible, the admin list may narrow it further, and neither can widen past
 * here.**
 *
 * ## What this is actually protecting
 *
 * Resend's free tier is 100 emails/day, and three call sites could exhaust it
 * on their own:
 *
 *   · `auctionSettlement` sends `bid_lost` to every losing bidder, up to 50 in
 *     PARALLEL per auction, and settles all expired auctions concurrently —
 *     two auctions is the whole day;
 *   · `onScamReportCreate` fanned out one send per employee, up to 100;
 *   · `bid_outbid` is one email per bid per bidder on a live auction.
 *
 * The gate runs FIRST in `sendNotification`'s channel conjunctions — before the
 * settings read, before the budget counter — so those 50 sends now exit with
 * zero Firestore operations. That ordering is load-bearing: it is what lets the
 * daily counter stay a single unsharded document.
 *
 * ## Nothing is lost by dropping a type from here
 *
 * `sendNotification` writes the in-app notification BEFORE any channel
 * decision, so an ineligible type still fills the bell. Only the emailed copy
 * goes away.
 */

import type { NotificationType } from "../../../../features/admin/schemas/firestore";

/**
 * `true` = may email (subject to the admin allow-list, the kill switch, the
 * user's own preference and the daily ceiling). `false` = in-app bell only.
 *
 * Typed on the union so a new notification type cannot compile without an
 * answer to "is this worth an email?". Do not reach for a default — the whole
 * value of this map is that the question gets asked once, deliberately, per
 * type.
 */
export const EMAIL_ELIGIBLE_TYPES: Record<NotificationType, boolean> = {
  // ── Money. The buyer is owed something, owes something, or just paid. ──────
  order_placed: true,
  order_confirmed: true,
  order_shipped: true,
  order_delivered: true,
  order_cancelled: true,
  refund_initiated: true,
  payment_review: true,
  emi_installment_due_soon: true,
  emi_installment_overdue: true,

  // ── Negotiation. Each one is a move the other party must respond to, and ──
  // ── every one of them expires if they do not.                            ──
  offer_received: true,
  offer_responded: true,
  offer_expired: true,
  offer_counter_accepted: true,

  // Won, and on a clock: the winner forfeits the lot if they miss the payment
  // deadline. This is the one auction type that survives, and it survives
  // BECAUSE of the deadline — not because winning is nice to hear about.
  bid_won: true,

  // Someone must claim this, and the claim window closes.
  prize_won: true,

  // Access to the account itself — a ban or an unban. After the 2026-09 split
  // this means ONLY that; support tickets and scam reports moved to their own
  // types precisely so this one could keep emailing. A banned user has to be
  // told outside the app, because the app is what they just lost.
  account_action: true,

  // Signup and genuine one-off announcements. Low volume by nature.
  welcome: true,
  system: true,

  // ── Bell only. ────────────────────────────────────────────────────────────

  // The three auction fan-outs. `bid_lost` is up to 50 parallel sends per
  // settled auction; `bid_outbid` is one per bid per bidder; `bid_placed`
  // pings the seller on every single bid. All three are visible on the auction
  // page and in the bell, and none of them is a deadline.
  bid_lost: false,
  bid_outbid: false,
  bid_placed: false,
  auction_ended: false,

  // Marketing. The likeliest way to get the sending domain flagged, and the
  // first thing a recipient marks as spam — which damages deliverability for
  // the transactional mail above.
  promotion: false,
  product_available: false,

  // Nothing for the user to do; the record is on the site when they next look.
  review_approved: false,
  review_replied: false,

  // Housekeeping nags. `catalogue_images_stale` loops one send per stale item,
  // so it is a quiet fan-out of its own.
  catalogue_images_stale: false,
  prize_reveal_expired: false,

  // The conversation lives in the UI. Routine ticket back-and-forth costs
  // nothing; a staff replier who genuinely needs one to land in an inbox ticks
  // "also email the user", which sends `eligibilityOverride: "staff_requested"`
  // for that one reply. The user side has no such tick — a user replying to
  // their own ticket never triggers mail.
  support_ticket_update: false,

  // The reporter reads the outcome on the site; the admin side rides the daily
  // digest. This was the second 100-way fan-out — `onScamReportCreate` sent one
  // notification per employee, up to 100, for every report filed.
  scam_report_update: false,
};

/**
 * Prefer this over indexing the map directly — the lookup is `boolean`, and a
 * bare `EMAIL_ELIGIBLE_TYPES[type]` inside a long `&&` chain reads as a flag
 * rather than as a decision.
 */
export function isEmailEligible(type: NotificationType): boolean {
  return EMAIL_ELIGIBLE_TYPES[type] === true;
}

/**
 * For the admin UI, which renders an ineligible type as a DISABLED row rather
 * than hiding it. Hiding would leave an admin wondering why `bid_outbid` is
 * absent from a list that claims to cover every type; a disabled row with a
 * reason answers the question in place.
 */
export const EMAIL_INELIGIBLE_TYPE_LIST: readonly NotificationType[] =
  Object.freeze(
    (Object.keys(EMAIL_ELIGIBLE_TYPES) as NotificationType[]).filter(
      (t) => EMAIL_ELIGIBLE_TYPES[t] === false,
    ),
  );
