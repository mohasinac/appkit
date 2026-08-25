/*
 * WHY: All three bid listings — buyer, seller and admin — were dead ends. A
 *      bid could be SEEN in a list and never opened, so the amount, the
 *      auction it belongs to, when it was placed and whether it was outbid,
 *      won or forfeited were only ever visible as a table row. `bid` is also
 *      one of the three `relatedType` values with no per-record page in ANY
 *      role, so a bid notification had nowhere to link.
 * WHAT: The `<RecordDetailModal>` field list for a bid, built once.
 *
 * ## One builder, three portals
 *
 * The three views differ only in whether they may show the bidder's identity:
 * a buyer sees their own bid, a seller sees who bid on their auction, and an
 * admin sees everything. Writing the field list three times would be three
 * chances to leak a bidder's name into the buyer view or to forget a field in
 * one portal — the shape of Root Cause #38, one layer up.
 *
 * `maskPublicBid` already exists for the PUBLIC bid history and is unchanged;
 * this is the dashboard equivalent, where the viewer is authenticated and the
 * question is which role they hold.
 *
 * EXPORTS:
 *   buildBidDetailFields, bidStatusBadge, type BidDetailViewer
 *
 * @tag domain:auctions
 * @tag layer:feature-util
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:UserBidsView,SellerBidsView,AdminBidsView
 * @tag sideEffects:none
 */

import type { BidDocument } from "../schemas/firestore";

/** Which portal is looking. Decides whether bidder identity is shown. */
export type BidDetailViewer = "buyer" | "seller" | "admin";

type FieldRow = { label: string; value: string };

const money = (amount: number | undefined, currency = "INR") =>
  amount == null
    ? "—"
    : new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);

const when = (value: unknown): string => {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
};

/**
 * A bid's status as a badge.
 *
 * `forfeited` is deliberately distinguished from `cancelled`: a forfeited bid
 * WON and then let the payment window lapse, which is the seller's problem and
 * the buyer's fault; a cancelled one never won anything. Collapsing them would
 * hide exactly the distinction a support query is about.
 */
export function bidStatusBadge(status: string | undefined): { label: string; tone: string } {
  switch (status) {
    case "won":
      return { label: "Won", tone: "success" };
    case "active":
      return { label: "Leading", tone: "info" };
    case "outbid":
      return { label: "Outbid", tone: "warning" };
    case "forfeited":
      return { label: "Forfeited — payment window lapsed", tone: "danger" };
    case "cancelled":
      return { label: "Cancelled", tone: "default" };
    case "lost":
      return { label: "Lost", tone: "default" };
    default:
      return { label: status ?? "Unknown", tone: "default" };
  }
}

/**
 * The scalar rows for a bid's detail modal.
 *
 * `bidderName` appears only for seller and admin. A buyer opening their OWN
 * bid does not need to be told their own name, and the same component is used
 * by all three, so gating here rather than at each call site is what stops a
 * future copy-paste showing one buyer another's identity.
 */
export function buildBidDetailFields(
  bid: BidDocument,
  viewer: BidDetailViewer,
): FieldRow[] {
  const rows: FieldRow[] = [
    { label: "Auction", value: bid.productTitle || bid.productId },
    { label: "Bid amount", value: money(bid.bidAmount, bid.currency) },
  ];

  // Only meaningful when the bid raised a previous one.
  if (bid.previousBidAmount != null) {
    rows.push({ label: "Previous high bid", value: money(bid.previousBidAmount, bid.currency) });
  }
  if (bid.autoMaxBid != null) {
    rows.push({ label: "Auto-bid limit", value: money(bid.autoMaxBid, bid.currency) });
  }

  rows.push({ label: "Placed", value: when(bid.bidDate ?? bid.createdAt) });

  if (viewer !== "buyer") {
    rows.push({ label: "Bidder", value: bid.userName || bid.userId });
  }

  // A buyout is a real bid, not a bid-free purchase — surfacing it here is
  // what makes "why is there no ladder on this auction" answerable.
  if (bid.isBuyout) {
    rows.push({ label: "Placed via", value: "Buy Now" });
  }

  // The order this bid became. Present only once the win was actually paid,
  // which is exactly the question "did they ever pay?" asks.
  if (bid.orderId) {
    rows.push({ label: "Order", value: bid.orderId });
  }

  rows.push({ label: "Bid ID", value: bid.id });
  return rows;
}
