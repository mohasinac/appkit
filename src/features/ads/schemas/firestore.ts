/**
 * D56 — a SELF-SERVE ad booking: one advertiser, one placement, one period.
 *
 * ## 🛑 Flat fee per slot per period, and explicitly NOT CPM
 *
 * Impression counting is a write per page view, which is the exact cost
 * pattern that suspended this project (Root Cause #104: 3.1M ISR writes
 * against a 200K allowance, 52.52 GB of Fast Origin Transfer against 10 GB,
 * for eleven monthly active users). A flat fee is one write per BOOKING.
 * Nothing here counts anything per render, and nothing should be added that
 * does.
 *
 * ## Why a PERIOD rather than an arbitrary date range
 *
 * The plan's requirement is slot-availability locking — two advertisers must
 * not book the same slot for overlapping dates. Firestore has no range
 * constraint, so an arbitrary `startAt`/`endAt` pair can only be checked by
 * QUERYING for overlaps and then writing, and two concurrent bookings both
 * read "no overlap" and both write. That race is invisible in testing and
 * sells the same slot twice.
 *
 * Discretising to a period makes the conflict a DOCUMENT COLLISION instead:
 * the booking id is derived from `(placementId, period)`, so the second
 * writer fails on an existing document inside its own transaction and
 * Firestore does the locking. There is no query to race against.
 *
 * It also matches what is being sold. "The homepage banner for November" is
 * the product; "the homepage banner from the 9th to the 23rd" is a pricing
 * model nobody asked for and an availability calendar nobody can render.
 */

import type { BaseDocument } from "../../../_internal/shared/types/base-document";

export const AD_BOOKING_COLLECTION = "adBookings";

/**
 * A calendar month, `YYYY-MM`.
 *
 * 🛑 A STRING, not a Date. It is an identity — half of the booking's primary
 * key — and a Date would make "the same month" a comparison rather than an
 * equality, which is precisely what the document-collision lock depends on
 * not being.
 */
export type AdPeriod = string;

const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isAdPeriod(value: string): value is AdPeriod {
  return PERIOD_PATTERN.test(value);
}

/** The period a date falls in, in UTC. */
export function adPeriodOf(date: Date): AdPeriod {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** First instant of a period, UTC. */
export function adPeriodStart(period: AdPeriod): Date {
  const [y, m] = period.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
}

/** First instant of the NEXT period — the exclusive end. */
export function adPeriodEnd(period: AdPeriod): Date {
  const [y, m] = period.split("-").map(Number);
  return new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
}

/**
 * 🛑 The booking id IS the lock. Derived, never generated.
 *
 * Two advertisers booking `banner-home` for `2026-11` compute the same id and
 * the second `tx.create` throws `ALREADY_EXISTS` — which is the whole
 * availability guarantee, enforced by Firestore rather than by a check
 * somebody could forget to run.
 */
export function adBookingId(placementId: string, period: AdPeriod): string {
  return `${placementId}__${period}`;
}

/**
 * Payment state. Deliberately coarse: this records whether the slot is PAID
 * FOR, not how. The invoice and the ledger posting are Part 4's job and carry
 * the detail; duplicating any of it here would be two records of one fact.
 */
export const AD_BOOKING_PAYMENT_STATES = ["unpaid", "paid", "refunded"] as const;
export type AdBookingPaymentState = (typeof AD_BOOKING_PAYMENT_STATES)[number];

/**
 * Creative moderation. **Nothing renders on the site until `approved`.**
 *
 * 🛑 `pending` is the initial value and there is no way to write `approved`
 * through the advertiser's own schema — see `adBookingWriteSchema`. A
 * self-serve flow where the submitter can set their own moderation state is
 * not moderated; it is a form with an extra field (Root Cause #76 — a field
 * the form can send is a field the form can destroy, here inverted into a
 * field the form can grant itself).
 */
export const AD_MODERATION_STATES = ["pending", "approved", "rejected"] as const;
export type AdModerationState = (typeof AD_MODERATION_STATES)[number];

export interface AdBookingCreative {
  title: string;
  body?: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export interface AdBookingDocument extends BaseDocument {
  /** Matches a `SiteSettingsAdPlacement.id`. */
  placementId: string;
  period: AdPeriod;
  /** Auth uid of the advertiser. */
  advertiserUid: string;
  /** Denormalised for the admin queue — a moderator should not fan out to `users`. */
  advertiserName?: string;
  /**
   * Rupees, SNAPSHOTTED at booking.
   *
   * 🛑 Never recomputed from the live rate card. The rate is a price the
   * advertiser agreed to; re-deriving it at render or invoice time would
   * silently reprice a sold slot the first time an admin edits the card —
   * the same rule `sourceContext` follows for order provenance.
   */
  priceRs: number;
  paymentState: AdBookingPaymentState;
  /** Set by the Part 4 invoicing path once the booking is billed. */
  invoiceId?: string;
  creative: AdBookingCreative;
  moderation: {
    state: AdModerationState;
    /** Required on a rejection — see `moderateAdCreative`. */
    note?: string;
    reviewedAt?: Date;
    /**
     * Staff uid. 🛑 Never returned to the advertiser: who rejected you is
     * not information a self-serve submitter needs, and naming an individual
     * moderator invites them being contacted directly.
     */
    reviewedBy?: string;
  };
  /** Set when an admin or the advertiser cancels. A cancelled booking frees nothing — see below. */
  cancelledAt?: Date;
  cancelledReason?: string;
}

/**
 * Does this booking put a creative on the page right now?
 *
 * 🛑 All four conditions, and the order is not an accident — moderation is
 * checked before the calendar so an approved-but-future booking and an
 * unreviewed current one are distinguishable in a debugger.
 */
export function isAdBookingLive(
  booking: Pick<
    AdBookingDocument,
    "moderation" | "paymentState" | "period" | "cancelledAt"
  >,
  now: Date = new Date(),
): boolean {
  if (booking.cancelledAt) return false;
  if (booking.moderation.state !== "approved") return false;
  if (booking.paymentState !== "paid") return false;
  const start = adPeriodStart(booking.period);
  const end = adPeriodEnd(booking.period);
  return now >= start && now < end;
}

/**
 * 🛑 A cancelled booking KEEPS its document, and therefore keeps the slot
 * locked for its own period.
 *
 * Deleting it would free the slot — which sounds like the point and is the
 * wrong behaviour twice over: the advertiser has paid for a period that has
 * possibly already started, and re-selling a month mid-flight means two
 * creatives were live in one slot at different times with one invoice
 * between them. Freeing a period is an ADMIN act (`releaseAdSlot`), done
 * knowingly, not a side effect of a cancel button.
 */
export const AD_BOOKING_CANCELLED_KEEPS_SLOT = true;
