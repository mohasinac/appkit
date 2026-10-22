/**
 * `paymentCases` — ONE operator queue for everything where money is at risk.
 *
 * ## Why one collection and not several
 *
 * A missing order, an unprocessed webhook, a chargeback, a refund mismatch and
 * a dead job are different problems with the same audience: one person, once a
 * day, asking "is anything wrong with the money". Three collections would mean
 * three places to look and three chances to not look at one — and the one you
 * forget is the one with the deadline.
 *
 * `kind` discriminates. Adding a seventh kind is a union edit, not a new
 * collection.
 *
 * ## It mirrors `ReportDocument` on purpose
 *
 * `status` / `assignedTo` / `resolution` / `resolvedAt` / `entityType` /
 * `entityId` are field-for-field the same as `store-extensions`'
 * `ReportDocument`, so the admin list and detail views are a near-copy of the
 * reports ones rather than a new UI. The four status values are identical too.
 * Where it differs it is because a payment case has things a report does not: a
 * **external deadline**, an **amount at risk**, and an **observation count**.
 */

import type { BaseDocument } from "../../../_internal/shared/types/base-document";
import type { StatusChangeEntry } from "../../../_internal/shared/history/types";

export const PAYMENT_CASES_COLLECTION = "paymentCases";

/**
 * What kind of problem this is.
 *
 * | kind | opened when |
 * |---|---|
 * | `missing_order` | the gateway has a captured payment and we have no order — **the D64 shape** |
 * | `unprocessed_event` | a `gatewayEvents` row never reached a terminal status |
 * | `status_conflict` | a late event would have regressed an order's status |
 * | `dispute` | a chargeback. The only kind with a deadline we do not control |
 * | `refund_mismatch` | the gateway's `amount_refunded` disagrees with our `refunds[]` |
 * | `amount_mismatch` | captured amount ≠ the order's recorded total |
 * | `dead_job` | a job exhausted its retries (Phase 8) |
 * | `grievance` | a statutory grievance with a clock (Phase 10) |
 * | `shipping_unpriced` | a store's shipping could not be priced, so we shipped free |
 * | `manual_refund_due` | a cancellation owes money that no automatic rail can move |
 * | `protection_claim` | a buyer claimed against cover they paid for |
 * | `ledger_drift` | a buyer's points mirror disagreed with their ledger |
 *
 * 🛑 `shipping_unpriced` is a CONFIGURATION fault with a money consequence,
 * which is why it belongs in this queue rather than in `serverErrors`. An
 * `estimate`-mode store with no carrier rate quoted `unavailable`, which the
 * checkout mapped to `shippingFee: 0` — so every parcel for that store shipped
 * free at our expense, silently, for as long as nobody looked (D44). Keyed on
 * the STORE, so a misconfigured seller produces one case however many
 * checkouts hit them.
 */
export type PaymentCaseKind =
  | "missing_order"
  | "unprocessed_event"
  | "status_conflict"
  | "dispute"
  | "refund_mismatch"
  | "amount_mismatch"
  | "dead_job"
  | "grievance"
  | "shipping_unpriced"
  /**
   * A buyer has claimed against protection cover they paid for.
   *
   * 🛑 Its own kind rather than borrowed from `refund_mismatch`, which is what
   * I reached for first and is wrong: a claim is not a disagreement with the
   * gateway about refund totals, it is a human decision about who absorbs a
   * loss. Filing it under a kind that means something else makes the queue's
   * own filters lie, and the kind chips are what an operator triages by.
   */
  | "protection_claim"
  /**
   * A cancelled order owes the buyer money and nothing can move it
   * automatically — see `_internal/server/features/orders/cancellation-refund.ts`.
   *
   * Three situations produce it, and they share this kind because they share
   * the operator's next action (send money, record the reference): the order
   * was paid by cash / UPI-manual / EMI so there is no gateway transaction to
   * reverse; it was cancelled after dispatch, so how much is owed is a human
   * decision about who bears the outbound leg; or the gateway refund was
   * attempted and failed.
   *
   * 🛑 Distinct from `refund_mismatch`, which means the gateway and our
   * `refunds[]` DISAGREE about a refund that happened. Here nothing has
   * happened and that is the point. Filing this under a kind that means
   * something else is the shortcut I took once already with protection claims,
   * and it is attractive precisely because a plausible kind exists.
   *
   * The amount is on the order too (`refundAmount` + `refundStatus: "pending"`,
   * written in the same patch as the cancellation), so the case and the order
   * cannot disagree about what is owed — and the order carries it even if this
   * write fails.
   */
  | "manual_refund_due"
  /**
   * A buyer's `users/{uid}.pointsBalance` mirror disagrees with the sum of
   * their `pointsLedger` entries.
   *
   * The ledger is append-only and therefore authoritative; the mirror exists
   * only so a balance read is one document instead of a scan. So drift always
   * means the mirror is wrong — and the reconciler repairs it. The case is
   * raised anyway, because **a repaired mirror hides the write path that broke
   * it.** Root Cause #102 is the same shape one domain over: a counter that
   * drifted silently, where nothing errored because a wrong number is just a
   * number.
   *
   * 🛑 Its own kind rather than `amount_mismatch`, which means the GATEWAY and
   * our order total disagree. Nothing external is involved here; this is two of
   * our own records disagreeing. The kind chips are what an operator triages
   * by, and the third time this file has had to say so.
   *
   * `severity: "warning"` not `"error"`: the buyer's spendable balance is
   * whatever the repair sets it to, so no money is at risk by the time anyone
   * reads the case — but a recurring one means a writer is losing entries.
   * Keyed on the USER, so a persistently broken mirror is one case with a
   * rising `observedCount` rather than a new row every night.
   */
  | "ledger_drift"
  /**
   * We could not book a courier, so one or more PAID orders cannot be
   * dispatched by us.
   *
   * The commonest cause is our own prepaid courier wallet running dry —
   * Shiprocket has no recharge API, so the top-up is irreducibly a human
   * action, which is exactly what a case is for.
   *
   * 🛑 KEYED ON THE WALLET (the provider), NOT ON THE ORDER. Fifty blocked
   * orders are ONE problem with one fix, and the daily email ceiling applies
   * to staff mail too (`send-guard.ts:92`) — so a per-order case would open
   * fifty rows and spend the whole 80/day budget telling an operator the same
   * thing fifty times, leaving them blind to everything else. `openOrObserve`
   * raises `observedCount` instead, which also makes "how many orders are
   * stuck behind this" readable at a glance.
   *
   * 🛑 Its own kind rather than `shipping_unpriced`, which means we could not
   * work out what shipping COSTS. Here the price is known and the money to pay
   * it is not there. The kind chips are what an operator triages by, and this
   * is the fourth time this file has had to say so — the shortcut is always
   * attractive because a plausible kind already exists.
   *
   * `severity: "error"`: a buyer has paid and their parcel is not moving.
   */
  | "courier_unavailable";

/**
 * Identical to `ReportStatus`, deliberately — see the header. `actioned` means
 * a human did something; `dismissed` means a human decided nothing was wrong.
 * Both require a `resolution`.
 */
export type PaymentCaseStatus = "open" | "under-review" | "actioned" | "dismissed";

/**
 * Three values, matching `adminNotifications`' own severity vocabulary so one
 * maps onto the other without a translation table.
 *
 * 🛑 Severity only ever ESCALATES — see `openOrObserve`. A reconciler that
 * re-finds a problem it has already reported must not be able to quietly
 * downgrade it.
 */
export type PaymentCaseSeverity = "info" | "warning" | "error";

export interface PaymentCaseDocument extends BaseDocument {
  kind: PaymentCaseKind;
  status: PaymentCaseStatus;
  severity: PaymentCaseSeverity;

  /** Human-readable one-liner. The row an operator scans. */
  title: string;
  /** What was observed, in enough detail to act without opening the gateway. */
  detail: string;

  /** Mirrors `ReportDocument` — what the case is ABOUT. */
  entityType: "order" | "payment" | "refund" | "event" | "job" | "store" | "user";
  entityId: string;

  /**
   * The dedupe key, which is ALSO the document id.
   *
   * 🛑 Stored as a field as well, redundantly, because a Firestore id is not
   * queryable as data — `where("dedupeKey","==",…)` is sometimes what a caller
   * has, and `orderBy(documentId())` has its own restrictions. The redundancy
   * is one short string and it is never written twice: `openOrObserve` derives
   * both from the same value.
   */
  dedupeKey: string;
  /** How many times a reconciler has independently re-found this problem. */
  observedCount: number;
  lastObservedAt: Date;

  /**
   * An EXTERNAL hard deadline, never an SLA we invented.
   *
   * 🛑 This is the field that justifies the collection existing. For a dispute
   * it is the gateway's own `respond_by`: miss it and we lose by default,
   * irrespective of who was right. For a grievance it is statutory. Nothing
   * else sets it, and a case with no `dueAt` is a case with no clock — which is
   * most of them, and that is correct.
   */
  dueAt?: Date;

  /** Decimal rupees. What this case could cost if it goes the wrong way. */
  amountAtRisk?: number;

  assignedTo?: string;
  resolution?: string;
  resolvedAt?: Date;
  resolvedBy?: string;

  /**
   * Set by a reconciler that no longer observes the problem.
   *
   * 🛑 This is NOT a resolution and must never be rendered as one. The UI shows
   * "looks resolved — confirm?" and the case stays `open`. The distinction:
   * "the symptom went away" and "a human understands why" are different facts,
   * and on money the second is the one that matters. A self-healed
   * `missing_order` might mean the retry worked — or might mean somebody
   * refunded it by hand and the order will never exist.
   */
  selfHealedAt?: Date;

  /** Gateway / event / order cross-references, for the detail view's links. */
  gatewayEventIds?: string[];
  orderIds?: string[];
  gatewayPaymentId?: string;

  statusHistory?: StatusChangeEntry[];
  statusHistoryTruncated?: number;
}

export const PAYMENT_CASE_FIELDS = {
  ID: "id",
  KIND: "kind",
  STATUS: "status",
  SEVERITY: "severity",
  TITLE: "title",
  DETAIL: "detail",
  ENTITY_TYPE: "entityType",
  ENTITY_ID: "entityId",
  DEDUPE_KEY: "dedupeKey",
  OBSERVED_COUNT: "observedCount",
  LAST_OBSERVED_AT: "lastObservedAt",
  DUE_AT: "dueAt",
  AMOUNT_AT_RISK: "amountAtRisk",
  ASSIGNED_TO: "assignedTo",
  RESOLUTION: "resolution",
  RESOLVED_AT: "resolvedAt",
  RESOLVED_BY: "resolvedBy",
  SELF_HEALED_AT: "selfHealedAt",
  GATEWAY_PAYMENT_ID: "gatewayPaymentId",
} as const;

/** Severity rank, for the escalate-only rule. */
export const PAYMENT_CASE_SEVERITY_RANK: Record<PaymentCaseSeverity, number> = {
  info: 0,
  warning: 1,
  error: 2,
};

/** A resolution must say something. Ten characters is the same floor the admin offer-cancel reason uses. */
export const PAYMENT_CASE_RESOLUTION_MIN = 10;

/**
 * Statuses a case can be in while still needing attention.
 *
 * 🛑 Exported so the digest, the escalation query and the retention exclusion
 * all read ONE definition. Three hand-written copies of "which statuses are
 * open" is how a case stops appearing in one of three places.
 */
export const PAYMENT_CASE_ACTIVE_STATUSES: readonly PaymentCaseStatus[] = [
  "open",
  "under-review",
];

/**
 * Runtime companions, keyed `Record<Union, true>` so BOTH mistakes are compile
 * errors: a union member missing here, and a key here that is not a member. An
 * array literal catches neither — which is how ten independent enumerations of
 * `ListingType` came to disagree (Root Cause #61).
 */
const PAYMENT_CASE_KIND_MAP: Record<PaymentCaseKind, true> = {
  missing_order: true,
  unprocessed_event: true,
  status_conflict: true,
  dispute: true,
  refund_mismatch: true,
  amount_mismatch: true,
  dead_job: true,
  grievance: true,
  shipping_unpriced: true,
  protection_claim: true,
  manual_refund_due: true,
  ledger_drift: true,
};
export const PAYMENT_CASE_KINDS = Object.keys(PAYMENT_CASE_KIND_MAP) as PaymentCaseKind[];

const PAYMENT_CASE_STATUS_MAP: Record<PaymentCaseStatus, true> = {
  open: true,
  "under-review": true,
  actioned: true,
  dismissed: true,
};
export const PAYMENT_CASE_STATUSES = Object.keys(
  PAYMENT_CASE_STATUS_MAP,
) as PaymentCaseStatus[];

/**
 * Build the dedupe key, which becomes the document id.
 *
 * 🛑 The key must identify THE PROBLEM, not the observation — that is the whole
 * mechanism. `missing_order:pay_abc123` is the same problem whether a
 * reconciler notices it once or thirty times, so thirty runs produce ONE case
 * and ONE notification. Including a timestamp or a run id here would produce
 * thirty cases and make the queue unusable within a week, which is the failure
 * mode that makes operators stop opening it.
 */
export function createPaymentCaseId(kind: PaymentCaseKind, subjectId: string): string {
  return `${kind}:${subjectId}`.replace(/[^A-Za-z0-9_.:-]/g, "_").slice(0, 1500);
}
