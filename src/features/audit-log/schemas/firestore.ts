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
 *
 * 🛑 NOT STRICTLY "ADMIN" ANY MORE. `allocation_random_assign` is written by
 * the platform itself under a `"system:allocation"` sentinel, because the one
 * property that action needs — an immutable, queryable record no seller can
 * write or edit — is the property this collection already has and a log line
 * does not. The collection name stays `adminAuditLog`; the question it answers
 * widens from "what have admins done" to "what privileged or fairness-critical
 * act happened, and on whose authority". See that value's own docstring.
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
  /**
   * An admin granted or revoked `trustedSeller` on a store.
   *
   * 🛑 Its OWN action rather than folded into `store_status_change`, because
   * "what changed about this store" and "who accepted this risk" are
   * different questions. Trusting a seller means paying before delivery, so
   * the platform carries a lost parcel and a non-delivery dispute — and when
   * one of those lands, the question is who decided and when.
   *
   * Recorded on a real change only. Re-saving an unrelated field on an
   * already-trusted store writes nothing; a log of non-events stops being
   * read.
   */
  STORE_TRUST_CHANGE: "store_trust_change",
  /*
   * ── Part 14 / A5 ─────────────────────────────────────────────────────────
   *
   * `audit-privileged-write-unlogged` found 14 admin write paths that record
   * nothing. These are the action values the ones being closed now need; the
   * rest stay on the ratchet until each is given one deliberately.
   *
   * 🛑 Each is a SEPARATE value rather than a shared `admin_write`. The log's
   * question is "what have admins done lately", and an undifferentiated value
   * answers it with a row that says only "something". Filtering is the whole
   * point of the collection.
   */
  /** A role's permission set changed — the definition of who can do what. */
  ROLE_CHANGE: "role_change",
  /**
   * A tax code's rate or HSN mapping changed.
   *
   * 🛑 The one STATUTORY thing an admin can edit, which is why
   * `/admin/pricing` deliberately does not mirror it. A wrong rate here is a
   * wrong return, so "who set this and when" is the question an assessment
   * asks first.
   */
  TAX_CODE_CHANGE: "tax_code_change",
  /** Sessions forcibly revoked — the user is signed out everywhere, now. */
  SESSION_REVOKE: "session_revoke",
  /** A bulk operation over many users at once. */
  USER_BULK_ACTION: "user_bulk_action",
  /** A moderation report resolved, dismissed or actioned. */
  MODERATION_DECISION: "moderation_decision",
  /** A payment case claimed or resolved — money a buyer says did not arrive. */
  PAYMENT_CASE_DECISION: "payment_case_decision",
  /**
   * A scammer profile edited.
   *
   * 🛑 Public-facing accusation. The profile names a person or a payment
   * handle, so the wording and the status are reputational — and the one
   * question that follows a complaint is who wrote it.
   */
  SCAMMER_PROFILE_UPDATE: "scammer_profile_update",
  /**
   * A common-toggle card on the admin dashboard quick-jump (Phase 9, overhaul
   * brief) flipped a site-settings boolean — maintenance mode, buyer-seller
   * messaging, or the customer assistant. Each of the three has a wider
   * blast radius than a single admin's own session (maintenance mode takes
   * the whole site down for every visitor), so "who flipped this, and when"
   * is the same question `store_status_change` already answers for stores.
   */
  COMMON_TOGGLE_CHANGE: "common_toggle_change",
  /**
   * The platform's RNG allocated a concealed item to one buyer's order line.
   *
   * 🛑 THE ONLY NON-ADMIN ACTION IN THIS TABLE, and the reason it belongs
   * here anyway is the whole point of the surprise/reveal mechanic. The
   * owner's framing: *"it is randomly generated so we have a trace — no
   * seller can say you got a trash item when in reality you got the prize,
   * because it was not transparent."*
   *
   * A trace is only a trace if it is immutable and inspectable. Until now the
   * pick was recorded with `ctx.logger.info`, which is neither: logs rotate,
   * are not queryable per order, and are not something a buyer or an auditor
   * can be shown when a seller disputes what was sent. This collection is
   * admin-SDK-write-only (`firestore.rules` is a blanket deny-all), carries no
   * update path anywhere in the codebase, and is already rendered by
   * `AdminAuditLogView` — so it is exactly the "immutable record someone can
   * point at" the claim needs, and **a seller cannot write or edit a row in
   * it.**
   *
   * `actorUid` is the `"system:allocation"` sentinel: the pick is a rule with
   * an RNG attached, not a discretionary decision, and the same sentinel
   * convention already exists for `"system:points-expiry"`. The absence of a
   * human actor is itself the evidence — if an allocation row ever carried a
   * real uid, that would be the fraud.
   *
   * Written INSIDE the assignment transaction, so the allocation and its trace
   * commit or fail together. A best-effort `recordAdminAction` after the fact
   * could leave an allocated order with no record of why it got what it got,
   * which is the one state this must not be able to reach.
   *
   * `targetType: "orderItem"`, `targetId: "<orderId>"`, and the audit row's
   * own id becomes the order line's `allocationId`.
   */
  ALLOCATION_RANDOM_ASSIGN: "allocation_random_assign",
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
