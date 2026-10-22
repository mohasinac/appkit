/**
 * `disputeReasons` — the staff-curated list a buyer picks from when raising a
 * dispute.
 *
 * ## What this is NOT
 *
 * 🛑 It is not policy. Every row carries a `kind`, and the GATE lives on the
 * kind — see `_internal/shared/features/orders/dispute-reasons.ts`. A row can
 * never introduce a new kind of claim, because a gate cannot branch on a
 * user-created string.
 *
 * So this list is for TRIAGE and ANALYTICS: "what are buyers actually
 * reporting", answered without reading free text. Staff (admin + employees)
 * add rows as real gaps appear; buyers select only.
 *
 * ## Why staff-creatable rather than a closed enum
 *
 * Its sibling `RETURN_REASON` *is* a closed enum, and deliberately so: each
 * member there decides whether a final sale can refuse the return, which is a
 * money consequence that must be reviewed in code. Nothing here decides money.
 * A support agent who keeps seeing "the courier left it at the wrong flat"
 * should be able to add it without a release.
 */

/*
 * 🛑 `DisputeKind` is IMPORTED, never re-declared. A second two-value union
 * spelled by hand here is how the gate and the list would come to disagree
 * about what `item` means — Root Cause #61, which this codebase has paid for
 * ten times over.
 */
import type { DisputeKind } from "../../../_internal/shared/features/orders/dispute-reasons";

export const DISPUTE_REASON_COLLECTION = "disputeReasons";

export interface DisputeReasonDocument {
  /** `dreason-<slug of label>`, so the same reason cannot be added twice. */
  id: string;
  /** Buyer-facing. Shown verbatim in the picker. */
  label: string;
  /** Which gate this reason is subject to. Never free-form. */
  kind: DisputeKind;
  /**
   * 🛑 Soft-retire, never delete.
   *
   * A past dispute names this reason. Deleting the row would orphan that
   * record and take the author with it — and the order snapshots the LABEL
   * precisely so history survives either way, but a deleted row still loses
   * "who added this, and when" for anyone auditing the list itself.
   */
  isActive: boolean;
  /** Display name, so a seller or agent can see whose wording this is. */
  createdByName: string;
  /** The uid, for moderation. Never rendered. */
  createdByUid: string;
  createdAt: Date;
  updatedAt: Date;
}

export const DISPUTE_REASON_FIELDS = {
  ID: "id",
  LABEL: "label",
  KIND: "kind",
  IS_ACTIVE: "isActive",
  CREATED_BY_UID: "createdByUid",
  CREATED_AT: "createdAt",
} as const;

/**
 * Bounds on a label.
 *
 * Short on purpose: this is a picker option, not the buyer's explanation. The
 * detail goes in the free-text field on the dispute itself, which is where a
 * buyer should describe what actually happened.
 */
export const DISPUTE_REASON_LABEL_MAX = 80;
