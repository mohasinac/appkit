/**
 * `obligations` — deadlines with money consequences.
 *
 * ## Why a mechanism rather than more cron jobs
 *
 * The order lifecycle has roughly seventy timer-driven scenarios ("seller never
 * accepts → auto-cancel + full refund at 3 days", "buyer cancels before
 * shipping", "return approved but never posted"…). The approach before this was
 * eight hand-written sweeps whose coverage could only be established by
 * checking that every pair of `.filter()` predicates agreed — and
 * Root Cause #27 is that reasoning having already failed at n=3: an order in
 * `reupload_requested` was excluded by `getExpiredPaymentDeadlines` (it HAS a
 * proof), by `getUnreviewedProofPastDeadline` (it HAS an outcome) and by
 * `runPendingOrderTimeout` (it HAS a deadline). Three sweeps, pairwise
 * disjoint, and the order held stock forever with no terminal state.
 *
 * This collection makes "which sweep owns this order" answerable by
 * construction instead of by three filters happening to agree.
 *
 * ## 🛑 IT IS A DUE-DATE INDEX, NOT TRUTH
 *
 * The order is authoritative. An obligation row exists so the sweep can FIND
 * candidates cheaply with one indexed query; having found one it **re-reads the
 * subject and re-evaluates the policy's `precondition`**, and a row whose
 * premise no longer holds closes as `superseded` rather than acting.
 *
 * That is what keeps this out of the stored-mirror drift class (Root Cause
 * #42). A row saying "cancel this order at 15:00" is a HINT; the order saying
 * "I was paid at 14:58" is the fact, and the fact wins.
 *
 * ## 🛑 NOT A FIRESTORE TRIGGER
 *
 * An `onOrderWrite` trigger that wrote `obligations`, whose sweep then wrote
 * `orders`, is Root Cause #92's self-write loop exactly — the one that cost
 * 1,017,548 invocations in 24 hours against a 2M/month free quota, plus a
 * sibling function woken a million times just to return. Obligations are
 * reconciled **inside the order's own write**, in `updateWithHistory`, where
 * the current document is already in hand.
 */

import type { BaseDocument } from "../../../_internal/shared/types/base-document";

export const OBLIGATIONS_COLLECTION = "obligations";

/**
 * Every kind of deadline the system owes somebody.
 *
 * 🛑 A `Record<ObligationKind, ObligationPolicy>` in `constants/policies.ts`
 * consumes this union, so **adding a kind without declaring its anchor,
 * duration and guardrail tier is a compile error.** That is the property that
 * makes the Nth scenario cheap instead of another bespoke cron job.
 */
export type ObligationKind =
  // ── pre-dispatch ────────────────────────────────────────────────────────
  | "seller-accept"
  | "seller-dispatch"
  | "proof-reupload"
  // ── in transit ──────────────────────────────────────────────────────────
  | "delivery-confirm"
  // ── returns ─────────────────────────────────────────────────────────────
  | "return-respond"
  | "return-post"
  | "return-receive"
  | "return-inspect"
  // ── protection claims ───────────────────────────────────────────────────
  | "claim-shipping"
  | "claim-sale"
  // ── money out ───────────────────────────────────────────────────────────
  | "payout-release";

/**
 * Lifecycle of one obligation.
 *
 * | state | meaning |
 * |---|---|
 * | `open` | the clock is running |
 * | `met` | the thing happened in time — closed by the order's own write |
 * | `acted` | the deadline passed and the sweep did what the policy says |
 * | `escalated` | the deadline passed and a human was asked instead |
 * | `superseded` | the premise no longer holds; nothing was owed after all |
 *
 * 🛑 `superseded` is not a failure and must not be reported as one. It is the
 * normal outcome of the index disagreeing with the subject, which is exactly
 * the case the re-read exists to catch.
 */
export type ObligationState = "open" | "met" | "acted" | "escalated" | "superseded";

/**
 * What the sweep is allowed to do when a deadline passes.
 *
 * 🛑 THIS LIVES IN THE TYPE, not in the sweep's code, and that is deliberate:
 * the guardrail tier is a property of the SCENARIO, so it belongs beside the
 * duration rather than in a conditional somebody can quietly widen.
 *
 * - `act` — the ceiling is an amount we captured, the recipient is the payer,
 *   and no counterparty is debited. A pre-dispatch cancellation with a full
 *   refund qualifies; so does writing an anchor, closing a window, or
 *   BLOCKING a payout (withholding is always safe).
 * - `escalate` — goods have left the seller, or somebody other than the payer
 *   is debited, or a prior refund exists. Open a case; a human decides.
 */
export type ObligationDueAction = "act" | "escalate";

export interface ObligationDocument extends BaseDocument {
  kind: ObligationKind;
  /** Collection the subject lives in — `orders` for all of today's kinds. */
  subjectCollection: string;
  subjectId: string;
  /**
   * When it comes due. The ONE field the sweep queries on.
   *
   * 🛑 Required, not optional. The sweep filters `dueAt <= now`, and a
   * Firestore inequality **excludes every document that lacks the field**
   * (Root Cause #100) — so an optional `dueAt` would make the sweep
   * structurally unable to see exactly the rows that failed to compute one.
   */
  dueAt: Date;
  state: ObligationState;
  /** Why it closed. Free text for a human; never parsed. */
  closeReason?: string;
  closedAt?: Date;
  /** Warnings already sent, so a re-run does not re-warn. */
  warnedAt?: Date[];
  /**
   * Mirrors the subject's own flag so the sweep can compress deadlines for a
   * test fixture **without reading the subject first**.
   *
   * 🛑 Per-subject, never global. A global compression would shorten every
   * live buyer's deadline the moment someone ran the tester.
   */
  isTestData?: boolean;
  /** For the admin detail view, and for a case opened from here. */
  note?: string;
}

export const OBLIGATION_FIELDS = {
  ID: "id",
  KIND: "kind",
  SUBJECT_COLLECTION: "subjectCollection",
  SUBJECT_ID: "subjectId",
  DUE_AT: "dueAt",
  STATE: "state",
  CLOSE_REASON: "closeReason",
  CLOSED_AT: "closedAt",
  IS_TEST_DATA: "isTestData",
} as const;

/** States from which the sweep still has work to do. */
export const OBLIGATION_ACTIVE_STATES: readonly ObligationState[] = ["open"];

/**
 * 🛑 THE IDEMPOTENCY KEY, and the invariant it buys.
 *
 * Deterministic `${subjectId}__${kind}` means **at most one open obligation per
 * (subject, kind)**. A double create is a no-op write rather than a second
 * timer, which is what makes it safe to reconcile obligations on EVERY order
 * write — including the many writes that change nothing relevant.
 *
 * Double underscore, matching `createClaimedCouponId`'s convention, so a
 * subject id containing a single underscore cannot collide with a kind.
 */
export function createObligationId(subjectId: string, kind: ObligationKind): string {
  return `${subjectId}__${kind}`.replace(/[^A-Za-z0-9_.:-]/g, "_").slice(0, 1500);
}

/**
 * Runtime companion, keyed `Record<Union, true>` so both mistakes are compile
 * errors: a kind added to the union and forgotten here, and a key here that is
 * not a real kind. An array literal catches neither (Root Cause #61).
 */
const OBLIGATION_KIND_MAP: Record<ObligationKind, true> = {
  "seller-accept": true,
  "seller-dispatch": true,
  "proof-reupload": true,
  "delivery-confirm": true,
  "return-respond": true,
  "return-post": true,
  "return-receive": true,
  "return-inspect": true,
  "claim-shipping": true,
  "claim-sale": true,
  "payout-release": true,
};

export const ALL_OBLIGATION_KINDS = Object.keys(OBLIGATION_KIND_MAP) as ObligationKind[];
