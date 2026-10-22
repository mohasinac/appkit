/**
 * Admin Audit Log Firestore Document Types & Constants
 *
 * Collection: adminAuditLog
 * Document ID: Firestore auto-ID (no slug prefix — see CLAUDE.md "True
 * Firestore auto-IDs" list, same convention as `notifications`/`sessions`/`jobs`).
 *
 * A queryable record of high-value privileged admin actions — bans, checkout
 * bypass, coupon edits, payout mark-paid, store status changes, role changes.
 * This is deliberately an MVP scope (instrumenting existing high-value call
 * sites), not an exhaustive every-write-path audit trail — see CLAUDE.md's
 * "Admin Audit Log" section for the full instrumented-action list.
 */

import type { BaseDocument } from "../../../_internal/shared/types/base-document";
import type { JsonValue } from "../../../schemas/types";

export const ADMIN_AUDIT_LOG_COLLECTION = "adminAuditLog";

export const AdminAuditActionValues = {
  USER_HARD_BAN: "user_hard_ban",
  USER_SOFT_BAN: "user_soft_ban",
  USER_UNBAN: "user_unban",
  CHECKOUT_BYPASS: "checkout_bypass",
  COUPON_UPDATE: "coupon_update",
  PAYOUT_MARK_PAID: "payout_mark_paid",
  STORE_STATUS_CHANGE: "store_status_change",
  USER_ROLE_CHANGE: "user_role_change",
  /**
   * Admin cancelled an offer. The store keeps sole authority to accept,
   * counter and decline; cancelling is the ONE write an admin may make, and
   * it is an escalation — reason required, and recorded both here and in the
   * offer's own `statusHistory`.
   */
  OFFER_CANCEL: "offer_cancel",
  /**
   * Admin credited or debited a buyer's points by hand.
   *
   * 🛑 Belongs here rather than only in the ledger, even though the ledger is
   * already append-only and already records `actorUid` and `adminReason`. The
   * two answer different questions: the ledger answers "why does THIS ACCOUNT
   * have 53 points", this answers "what have admins done lately" — and the
   * second is the one you need when the account is not yet suspected.
   *
   * 1 point = ₹1 of spendable discount, so a credit is a liability the platform
   * must honour and a debit removes value a buyer already holds. That is the
   * same class as `payout_mark_paid` and `coupon_update`, which are both here.
   */
  POINTS_ADJUST: "points_adjust",
  /**
   * Staff added a buyer-facing dispute reason.
   *
   * 🛑 Here because the list is POLICY VOCABULARY, even though no single row
   * decides money. The reasons are what buyers are offered when something goes
   * wrong, so the wording shapes what gets reported and how it is triaged —
   * and a badly-worded or leading option is the kind of thing that is only
   * ever noticed later, by which time "who added this, and when" is the
   * question. `createdByName` on the row answers it for the list; this answers
   * it in the one place an admin looks for "what have staff done lately".
   *
   * Recorded only on a REAL creation. Re-adding wording that already exists
   * returns the existing row, which is not an act worth logging.
   */
  DISPUTE_REASON_CREATE: "dispute_reason_create",
  /*
   * Retiring is recorded and reactivating is not, which is deliberate rather
   * than an omission. Retiring REMOVES an option buyers could pick, so "who
   * narrowed the list, and when" is the question an audit of a dispute trend
   * needs answered. Putting a row back restores the documented default, and a
   * log of both would read as churn.
   */
  DISPUTE_REASON_RETIRE: "dispute_reason_retire",
  /**
   * An admin changed a platform rate through `/admin/pricing`.
   *
   * 🛑 Recorded here as well as in `siteSettings.rateChanges`, and the two are
   * not redundant. The rate log answers "when did THIS rate last move" and is
   * capped, so it can lose its oldest entries; this answers "what have admins
   * done lately" across every privileged act, and is the one that has to
   * survive. Same split as `points_adjust` against its ledger.
   *
   * Every rate here is money the platform charges or withholds, so this is the
   * same class as `coupon_update` and `payout_mark_paid`.
   */
  PRICING_UPDATE: "pricing_update",
} as const;

export type AdminAuditAction = (typeof AdminAuditActionValues)[keyof typeof AdminAuditActionValues];

export interface AdminAuditLogDocument extends BaseDocument {
  actorUid: string;
  actorName?: string;
  action: AdminAuditAction;
  /** e.g. "user" | "store" | "coupon" | "payout" — the kind of entity affected. */
  targetType: string;
  targetId: string;
  /** Denormalized human-readable label (display name, coupon code, etc.) so the log list never needs a join. */
  targetLabel?: string;
  reason?: string;
  metadata?: Record<string, JsonValue>;
}

export const ADMIN_AUDIT_LOG_FIELDS = {
  ACTOR_UID: "actorUid",
  ACTOR_NAME: "actorName",
  ACTION: "action",
  TARGET_TYPE: "targetType",
  TARGET_ID: "targetId",
  TARGET_LABEL: "targetLabel",
  REASON: "reason",
  CREATED_AT: "createdAt",
  ACTION_VALUES: AdminAuditActionValues,
} as const;
