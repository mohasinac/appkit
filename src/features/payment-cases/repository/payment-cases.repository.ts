// One shared predicate — this file had its own copy; see firestore-codes.ts.
import { isAlreadyExistsError } from "../../../errors/firestore-codes";
import type { DocumentReference } from "firebase-admin/firestore";
import type {
  FirebaseSieveFields,
  FirebaseSieveResult,
  SieveModel,
} from "../../../providers/db-firebase";
import {
  BaseRepository,
  applySieveToFirestore,
  parseSieveDateValue,
  prepareForFirestore,
} from "../../../providers/db-firebase";
import { normalizeError } from "../../../errors/normalize";
import { buildHistoryEntry } from "../../../_internal/shared/history/history";
import {
  PAYMENT_CASES_COLLECTION,
  PAYMENT_CASE_ACTIVE_STATUSES,
  PAYMENT_CASE_FIELDS,
  PAYMENT_CASE_RESOLUTION_MIN,
  PAYMENT_CASE_SEVERITY_RANK,
  createPaymentCaseId,
  type PaymentCaseDocument,
  type PaymentCaseKind,
  type PaymentCaseSeverity,
  type PaymentCaseStatus,
} from "../schemas/firestore";

/** gRPC `ALREADY_EXISTS` — the one `.create()` failure meaning "we have it". */
export interface OpenCaseInput {
  kind: PaymentCaseKind;
  /** Identifies THE PROBLEM, not the observation — see `createPaymentCaseId`. */
  subjectId: string;
  severity: PaymentCaseSeverity;
  title: string;
  detail: string;
  entityType: PaymentCaseDocument["entityType"];
  entityId: string;
  dueAt?: Date;
  amountAtRisk?: number;
  gatewayEventIds?: string[];
  orderIds?: string[];
  gatewayPaymentId?: string;
  now?: Date;
}

export type OpenCaseResult = {
  id: string;
  /** `true` on first sight; `false` when an existing case was observed again. */
  created: boolean;
};

export interface ResolveCaseInput {
  /** `actioned` (a human did something) or `dismissed` (nothing was wrong). */
  status: Extract<PaymentCaseStatus, "actioned" | "dismissed">;
  /** Required, min 10 chars — see the 🛑 on `resolve`. */
  resolution: string;
  /**
   * The admin uid. 🛑 There is no overload accepting `"system"`, and that
   * absence is the enforcement — see `resolve`.
   */
  resolvedBy: string;
  now?: Date;
}

export class PaymentCasesRepository extends BaseRepository<PaymentCaseDocument> {
  static readonly SIEVE_FIELDS: FirebaseSieveFields = {
    kind: { canFilter: true, canSort: false },
    status: { canFilter: true, canSort: false },
    severity: { canFilter: true, canSort: true },
    entityType: { canFilter: true, canSort: false },
    entityId: { canFilter: true, canSort: false },
    dedupeKey: { canFilter: true, canSort: false },
    assignedTo: { canFilter: true, canSort: false },
    observedCount: { canFilter: true, canSort: true },
    amountAtRisk: { canFilter: true, canSort: true },
    gatewayPaymentId: { canFilter: true, canSort: false },
    /*
     * Every date field needs `parseValue` — these are stored Timestamps and
     * sievejs' default coercion leaves an ISO string as a string, which
     * Firestore cannot compare to a Timestamp and so matches ZERO documents
     * with no error (Root Cause #47).
     */
    dueAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
    lastObservedAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
    resolvedAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
    selfHealedAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
    createdAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
  };

  constructor() {
    super(PAYMENT_CASES_COLLECTION);
  }

  /**
   * Open a case, or record another observation of one that already exists.
   *
   * 🛑 THIS IS WHAT MAKES IT SAFE TO RUN RECONCILERS ON A HOT CADENCE, and it
   * is the reason the dedupe key is the document id. A reconciler that re-finds
   * the same problem every 5 minutes for 30 days produces **one** case and
   * **one** notification. Without that property the queue fills with duplicates
   * of the same fact, an operator learns to ignore it, and the first real
   * chargeback is lost in 8,000 rows of noise — which is a worse outcome than
   * having no queue at all.
   *
   * On an existing case it increments `observedCount`, bumps `lastObservedAt`,
   * and ESCALATES severity if the new observation is worse. It deliberately
   * does not touch `title`, `detail`, `status`, `assignedTo` or `resolution` —
   * a human may have edited those, and a sweep must not overwrite a human.
   *
   * 🛑 Severity escalates and never falls. A reconciler seeing a smaller
   * manifestation of a known problem must not be able to quietly downgrade an
   * `error` an operator has already been paged about.
   */
  async openOrObserve(input: OpenCaseInput): Promise<OpenCaseResult> {
    const now = input.now ?? new Date();
    const id = createPaymentCaseId(input.kind, input.subjectId);
    const ref = this.getCollection().doc(id);

    const doc: PaymentCaseDocument = {
      id,
      kind: input.kind,
      status: "open",
      severity: input.severity,
      title: input.title,
      detail: input.detail,
      entityType: input.entityType,
      entityId: input.entityId,
      dedupeKey: id,
      observedCount: 1,
      lastObservedAt: now,
      ...(input.dueAt ? { dueAt: input.dueAt } : {}),
      ...(typeof input.amountAtRisk === "number"
        ? { amountAtRisk: input.amountAtRisk }
        : {}),
      ...(input.gatewayEventIds?.length ? { gatewayEventIds: input.gatewayEventIds } : {}),
      ...(input.orderIds?.length ? { orderIds: input.orderIds } : {}),
      ...(input.gatewayPaymentId ? { gatewayPaymentId: input.gatewayPaymentId } : {}),
      statusHistory: [
        buildHistoryEntry({
          actor: { role: "system" },
          trigger: `paymentCase:open:${input.kind}`,
          changes: { status: { from: null, to: "open" } },
          now,
        }),
      ],
      createdAt: now,
      updatedAt: now,
    };

    try {
      await ref.create(prepareForFirestore(doc));
      return { id, created: true };
    } catch (err) {
      if (!isAlreadyExistsError(err)) {
        void normalizeError(err);
        throw err;
      }
    }

    /*
     * Already open. A transaction, because `observedCount` is a read-modify-
     * write and two reconcilers can observe the same problem in the same tick —
     * `FieldValue.increment` would handle the counter but not the conditional
     * severity escalation, which needs the current value to compare.
     */
    try {
      await this.db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) return; // raced a delete; nothing to observe
        const current = this.mapDoc<PaymentCaseDocument>(snap);
        const escalate =
          PAYMENT_CASE_SEVERITY_RANK[input.severity] >
          PAYMENT_CASE_SEVERITY_RANK[current.severity];
        tx.update(ref, {
          observedCount: (current.observedCount ?? 0) + 1,
          lastObservedAt: now,
          updatedAt: now,
          ...(escalate ? { severity: input.severity } : {}),
          /*
           * A fresh observation clears `selfHealedAt`: the problem is back (or
           * never left), so a stale "looks resolved" banner would actively
           * mislead. Cleared with `null` rather than `undefined` because
           * `prepareForFirestore` strips undefined, which would leave the old
           * value in place — a delete that silently does nothing.
           */
          selfHealedAt: null,
        });
      });
    } catch (err) {
      void normalizeError(err);
      throw err;
    }

    return { id, created: false };
  }

  /**
   * Resolve a case. **Humans only.**
   *
   * 🛑 A CASE IS NEVER AUTO-CLOSABLE, AND THAT IS ENFORCED BY THE ABSENCE OF A
   * CODE PATH RATHER THAN BY A FLAG.
   *
   * There is no overload a job can call: `resolvedBy` is required, `"system"`
   * is rejected at runtime, and `resolution` has a length floor. A rule
   * enforced by a boolean can be flipped by whoever is in a hurry; a rule
   * enforced by there being no function to call cannot.
   *
   * The reason this matters more than it looks: every case here is money, and
   * the thing that closes a money case is a human understanding what happened.
   * A sweep that closed its own cases would turn the queue into a log — and a
   * log that scrolls is exactly what the 2026-10-21 incident had instead of a
   * record.
   *
   * A reconciler that no longer sees the problem calls `markSelfHealed`.
   */
  async resolve(id: string, input: ResolveCaseInput): Promise<void> {
    const resolution = input.resolution?.trim() ?? "";
    if (resolution.length < PAYMENT_CASE_RESOLUTION_MIN) {
      throw new Error(
        `A payment case resolution must be at least ${PAYMENT_CASE_RESOLUTION_MIN} characters — "${resolution}" says nothing a later reader can use`,
      );
    }
    if (!input.resolvedBy || input.resolvedBy === "system") {
      throw new Error(
        "A payment case can only be resolved by a human: `resolvedBy` must be an admin uid, never 'system'",
      );
    }

    const now = input.now ?? new Date();
    const ref = this.getCollection().doc(id);
    const existing = await this.findById(id);

    await ref.update({
      status: input.status,
      resolution,
      resolvedBy: input.resolvedBy,
      resolvedAt: now,
      updatedAt: now,
      statusHistory: [
        ...(existing?.statusHistory ?? []),
        buildHistoryEntry({
          actor: { role: "admin", uid: input.resolvedBy },
          trigger: "paymentCase:resolve",
          changes: { status: { from: existing?.status ?? null, to: input.status } },
          reason: resolution,
          now,
        }),
      ],
    });
  }

  /**
   * A reconciler no longer observes the problem.
   *
   * 🛑 Writes `selfHealedAt` and NOTHING ELSE — the status stays whatever it
   * was. "The symptom is gone" and "somebody understands why" are different
   * facts, and conflating them on a money case is how a hand-refunded payment
   * gets filed as fixed.
   */
  async markSelfHealed(id: string, now: Date = new Date()): Promise<void> {
    try {
      await this.getCollection().doc(id).update({ selfHealedAt: now, updatedAt: now });
    } catch (err) {
      // A case deleted between the sweep's read and this write is not a fault.
      void normalizeError(err);
    }
  }

  async assign(id: string, assignedTo: string, now: Date = new Date()): Promise<void> {
    await this.getCollection()
      .doc(id)
      .update({ assignedTo, status: "under-review", updatedAt: now });
  }

  /**
   * Open + under-review, worst first, then most-recently-observed first.
   *
   * ## 🛑 `orderBy(SEVERITY)` IS THE BUG THIS FIXES — never put it back
   *
   * This read `.orderBy(SEVERITY, "desc").orderBy(LAST_OBSERVED_AT, "desc")`
   * under the docstring "worst first". **It returned the opposite.** `severity`
   * stores the STRINGS `error` / `warning` / `info`, and Firestore orders
   * strings lexicographically — so `desc` yields **warning, info, error**, the
   * most urgent cases last, in the one query whose whole job is to put them
   * first. Nothing errored; the list was simply backwards.
   *
   * So the QUERY now selects its window by `lastObservedAt` — always written by
   * `openOrObserve`, one index, no composite on an enum — and the ORDER is
   * applied in memory from `PAYMENT_CASE_SEVERITY_RANK`, which already exists
   * and is exact. A stored numeric rank would also work and is worse: a second
   * representation of severity that can drift from the first.
   *
   * ## Why it SURVIVED, and what measuring corrected
   *
   * The order was wrong and harmless, because **neither consumer reads it** —
   * `countActiveBySeverity` tallies and `activeGatewayEventIds` collects into a
   * Set. Two of my own assumptions were false and are recorded so they are not
   * re-assumed:
   *
   *   · *"the digest reads this"* — it does NOT. `dailyStatusDigest` runs three
   *     `.count()` queries, one per severity, so it never ordered by severity
   *     and was correct throughout.
   *   · *"it has zero consumers, so delete it"* — it has TWO, both in this
   *     file. A grep for `listActive()` with empty parentheses missed
   *     `listActive(500)` twice, and deleting on that basis would have broken
   *     the digest's counts and the gateway-event retention exclusion.
   *
   * 🛑 The order DOES still matter to those two, via the WINDOW: at >500 active
   * cases, a severity-ordered window filled with alphabetically-first
   * `warning`s would have cut `error`s out of the count entirely. Theoretical
   * at this volume, real in principle, and fixed by the same change.
   *
   * `/admin/money-cases` deliberately does NOT use this — `DataListingView`
   * needs pagination, filters and a sort dropdown, so it goes through the Sieve
   * `list()` below. That view's `sortOptions` carries the matching 🛑 about why
   * it offers no severity sort: same arithmetic, found at the same time.
   */
  async listActive(limit = 100): Promise<PaymentCaseDocument[]> {
    const snap = await this.getCollection()
      .where(PAYMENT_CASE_FIELDS.STATUS, "in", [...PAYMENT_CASE_ACTIVE_STATUSES])
      .orderBy(PAYMENT_CASE_FIELDS.LAST_OBSERVED_AT, "desc")
      .limit(limit)
      .get();
    const rows = snap.docs.map((d) => this.mapDoc<PaymentCaseDocument>(d));
    return rows.sort((a, b) => {
      const bySeverity =
        (PAYMENT_CASE_SEVERITY_RANK[b.severity] ?? 0) -
        (PAYMENT_CASE_SEVERITY_RANK[a.severity] ?? 0);
      if (bySeverity !== 0) return bySeverity;
      return b.lastObservedAt.getTime() - a.lastObservedAt.getTime();
    });
  }

  /**
   * Active cases whose external deadline falls inside `horizon`.
   *
   * 🛑 One equality (`status in`) and one inequality (`dueAt <=`), ordered by
   * `dueAt` — the only shape Firestore serves without demanding the inequality
   * field lead the sort (Root Cause #59).
   *
   * 🛑 A case with NO `dueAt` is structurally absent from this query, because a
   * Firestore inequality excludes documents lacking the field (Root Cause
   * #100). That is correct here and is worth stating so nobody "fixes" it: a
   * case without a deadline cannot be nearly-overdue. It is NOT correct for
   * `listActive`, which is why that one filters on `status` only.
   */
  async listDueBefore(horizon: Date, limit = 50): Promise<PaymentCaseDocument[]> {
    const snap = await this.getCollection()
      .where(PAYMENT_CASE_FIELDS.STATUS, "in", [...PAYMENT_CASE_ACTIVE_STATUSES])
      .where(PAYMENT_CASE_FIELDS.DUE_AT, "<=", horizon)
      .orderBy(PAYMENT_CASE_FIELDS.DUE_AT, "asc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => this.mapDoc<PaymentCaseDocument>(d));
  }

  /**
   * Counts by severity over active cases.
   *
   * 🛑 Its docstring said *"what the daily digest prints"* and that is FALSE,
   * measured 2026-10-21: `dailyStatusDigest` runs its own three `.count()`
   * aggregations against the collection directly — deliberately, because that
   * file is reachable from the Functions bundle and avoids the repository. So
   * this method currently has no caller, and the digest does not depend on it.
   *
   * Kept rather than deleted because `activeGatewayEventIds` beside it is live
   * and shares `listActive`, so the pair earns its keep — but do not "wire the
   * digest to it" on the strength of the old comment: three `.count()`s are
   * cheaper than paging 500 documents to tally them.
   */
  async countActiveBySeverity(): Promise<Record<PaymentCaseSeverity, number>> {
    const rows = await this.listActive(500);
    const out: Record<PaymentCaseSeverity, number> = { info: 0, warning: 0, error: 0 };
    for (const row of rows) out[row.severity] = (out[row.severity] ?? 0) + 1;
    return out;
  }

  /** Every gateway-event id referenced by an ACTIVE case — the retention exclusion. */
  async activeGatewayEventIds(): Promise<Set<string>> {
    const rows = await this.listActive(500);
    const ids = new Set<string>();
    for (const row of rows) for (const id of row.gatewayEventIds ?? []) ids.add(id);
    return ids;
  }

  async listRefs(limit = 500): Promise<DocumentReference[]> {
    const snap = await this.getCollection().limit(limit).get();
    return snap.docs.map((d) => d.ref as DocumentReference);
  }

  async list(model: SieveModel): Promise<FirebaseSieveResult<PaymentCaseDocument>> {
    return applySieveToFirestore<PaymentCaseDocument>({
      baseQuery: this.getCollection(),
      model,
      fields: PaymentCasesRepository.SIEVE_FIELDS,
    });
  }
}

let cached: PaymentCasesRepository | null = null;

export function paymentCasesRepository(): PaymentCasesRepository {
  if (!cached) cached = new PaymentCasesRepository();
  return cached;
}
