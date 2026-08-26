import type { FirestoreValue } from "../../../schemas/types";

/**
 * Generic entity status history — the shape shared by every entity that
 * records how it got to its current state.
 *
 * Built for orders first (W2) and adopted by stores, payouts, offers, bids,
 * support tickets, scammer profiles, catalogue approvals, shipments and
 * returns in W15. Before this existed, exactly ONE of ~40 status-bearing
 * entities had any history at all — `ads`, built inline in a route handler
 * with no type and no reuse.
 */

export type HistoryActorRole = "buyer" | "seller" | "admin" | "system";

export interface HistoryActor {
  /** Firebase Auth uid. Absent for `system` (cron jobs, Firestore triggers). */
  uid?: string;
  role: HistoryActorRole;
}

/** A single field's before/after. `from` is `null` on the creation entry. */
export interface FieldChange {
  from: FirestoreValue;
  to: FirestoreValue;
}

export interface StatusChangeEntry {
  at: Date;
  actorUid?: string;
  actorRole: HistoryActorRole;

  /**
   * DELTA ONLY — the tracked fields that actually changed, never a copy of
   * the whole document. A full snapshot per transition would duplicate the
   * record on every status change; the whole point of this shape is that it
   * does not.
   */
  changes: Record<string, FieldChange>;

  /** Why, when a human supplied a reason (cancellation, rejection). */
  reason?: string;
  /** Free-text note from an admin/seller action. */
  note?: string;

  /**
   * The function, route or job that caused the change — `"customShipOrder"`,
   * `"paymentWindowTimeout"`, `"adminVerifyPayment"`. This is what the
   * timeline renders by, which is why per-path events (proof uploaded,
   * installment paid, winner revealed) need NO new status values.
   */
  trigger: string;
}

/**
 * Cap for any history array. Matches `HISTORY_MAX`'s reasoning: an unbounded
 * array on a hot document inflates every read of that document (Rule #6), and
 * an order that changes status more than this has a different problem.
 */
export const STATUS_HISTORY_MAX = 50;

export interface AppendHistoryResult {
  history: StatusChangeEntry[];
  /**
   * How many entries have been dropped off the front across the document's
   * lifetime. Surfaced so the UI can say "earlier history trimmed" instead
   * of implying none existed — silent truncation reads as "this is all of
   * it", which is the same lie as a silently dropped field.
   */
  truncatedCount: number;
}


/**
 * A `StatusChangeEntry` after it has crossed the RSC boundary.
 *
 * Identical except `at` is an ISO string. Server Components must serialise
 * before handing history to a `"use client"` component: every other date prop
 * on those drawers is already a string, and mixing the two is how a
 * `toLocaleString` on a string ends up rendering "Invalid Date".
 *
 * Declared once here rather than restated per page — two client files had
 * hand-written copies, which is both a duplication and (because each spelled
 * `changes` as `Record<string, { from: unknown; to: unknown }>`) an untyped
 * seam `audit-unknown-leakage` correctly refused.
 */
export interface SerialisedStatusChangeEntry extends Omit<StatusChangeEntry, "at"> {
  at: string;
}
