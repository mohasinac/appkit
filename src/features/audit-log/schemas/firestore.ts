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
