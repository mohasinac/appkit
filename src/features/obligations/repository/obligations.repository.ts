import type { DocumentReference } from "firebase-admin/firestore";
import { BaseRepository, prepareForFirestore } from "../../../providers/db-firebase";
import { normalizeError } from "../../../errors/normalize";
import { serverLogger } from "../../../monitoring";
import {
  OBLIGATIONS_COLLECTION,
  OBLIGATION_ACTIVE_STATES,
  OBLIGATION_FIELDS,
  createObligationId,
  type ObligationDocument,
  type ObligationKind,
  type ObligationState,
} from "../schemas/firestore";

export interface OpenObligationInput {
  kind: ObligationKind;
  subjectCollection: string;
  subjectId: string;
  dueAt: Date;
  isTestData?: boolean;
  note?: string;
  now?: Date;
}

export interface CloseObligationInput {
  state: Exclude<ObligationState, "open">;
  closeReason: string;
  now?: Date;
}

export class ObligationsRepository extends BaseRepository<ObligationDocument> {
  /*
   * 🛑 NO `SIEVE_FIELDS`, deliberately.
   *
   * `audit-sieve-field-coverage` targets every `*.repository.ts` defining one,
   * and this collection has no filterable admin list to justify it: the sweep
   * uses exactly one query shape, and an operator looking at a deadline looks
   * at the ORDER, not at the index row. Declaring a Sieve surface nothing calls
   * is the speculative-infra pattern — the `route-schema-registry` lesson, 576
   * keys into a layer with no readers.
   */

  constructor() {
    super(OBLIGATIONS_COLLECTION);
  }

  /**
   * Open an obligation, or leave an existing open one exactly as it is.
   *
   * 🛑 `.create()`, fails-if-exists — which gives the invariant **at most one
   * open obligation per (subject, kind)**. That is what makes it safe to
   * reconcile obligations on EVERY order write, including the great majority
   * that change nothing relevant: a double create is a no-op, not a second
   * timer.
   *
   * 🛑 It deliberately does NOT update the `dueAt` of an existing row. The
   * clock starts once, at the anchoring event, and a later write re-deriving a
   * slightly different deadline must not quietly extend it — that would let a
   * seller refresh their own dispatch deadline by touching the order.
   */
  async open(input: OpenObligationInput): Promise<{ id: string; created: boolean }> {
    const now = input.now ?? new Date();
    const id = createObligationId(input.subjectId, input.kind);

    const doc: ObligationDocument = {
      id,
      kind: input.kind,
      subjectCollection: input.subjectCollection,
      subjectId: input.subjectId,
      dueAt: input.dueAt,
      state: "open",
      ...(input.isTestData ? { isTestData: true } : {}),
      ...(input.note ? { note: input.note } : {}),
      createdAt: now,
      updatedAt: now,
    };

    try {
      await this.getCollection().doc(id).create(prepareForFirestore(doc));
      return { id, created: true };
    } catch (err) {
      /*
       * Any failure is treated as "already there". Unlike the gateway-event
       * inbox — which must fail OPEN because a lost event is unrecoverable —
       * an obligation is a derived hint: the next order write reconciles again,
       * and the subject itself still carries the facts. Rethrowing here would
       * let a transient Firestore blip fail the ORDER WRITE that triggered the
       * reconcile, which is the one thing that must not happen.
       */
      void normalizeError(err);
      return { id, created: false };
    }
  }

  /** Close one, with a reason. Never throws — see `open`. */
  async close(
    subjectId: string,
    kind: ObligationKind,
    input: CloseObligationInput,
  ): Promise<void> {
    const now = input.now ?? new Date();
    try {
      await this.getCollection()
        .doc(createObligationId(subjectId, kind))
        .update({
          state: input.state,
          closeReason: input.closeReason,
          closedAt: now,
          updatedAt: now,
        });
    } catch (err) {
      // Closing one that does not exist is the normal case, not a fault.
      void normalizeError(err);
    }
  }

  /**
   * The sweep's ONE query: open obligations past due.
   *
   * 🛑 One equality (`state`) and one inequality (`dueAt`), ordered by `dueAt`
   * — the only shape Firestore serves without demanding the inequality field
   * lead the sort (Root Cause #59). **ONE composite index for every kind**,
   * which is the whole reason `kind` is a field rather than named deadline
   * columns on the order: fifteen named deadline fields would mean fifteen
   * queries per tick and fifteen new composite indexes on a collection that
   * already carries 55. The two orphan `prizeRevealDeadline` indexes — on a
   * field that exists in no TypeScript file — are a preview of that failure.
   */
  async listDue(now: Date, limit = 100): Promise<ObligationDocument[]> {
    const snap = await this.getCollection()
      .where(OBLIGATION_FIELDS.STATE, "in", [...OBLIGATION_ACTIVE_STATES])
      .where(OBLIGATION_FIELDS.DUE_AT, "<=", now)
      .orderBy(OBLIGATION_FIELDS.DUE_AT, "asc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => this.mapDoc<ObligationDocument>(d));
  }

  /** Open obligations approaching their deadline, for the warning pass. */
  async listUpcoming(horizon: Date, now: Date, limit = 100): Promise<ObligationDocument[]> {
    const snap = await this.getCollection()
      .where(OBLIGATION_FIELDS.STATE, "in", [...OBLIGATION_ACTIVE_STATES])
      .where(OBLIGATION_FIELDS.DUE_AT, "<=", horizon)
      .orderBy(OBLIGATION_FIELDS.DUE_AT, "asc")
      .limit(limit)
      .get();
    return snap.docs
      .map((d) => this.mapDoc<ObligationDocument>(d))
      .filter((o) => o.dueAt.getTime() > now.getTime());
  }

  /**
   * Every open obligation for one subject — the quiet-period check.
   *
   * 🛑 This is the QUIET PERIOD invariant's query, and the payout path must
   * call it at BOTH batch-creation and settlement time. A refund posted between
   * the two would otherwise silently shrink a payout an admin had already sent.
   */
  async listOpenForSubject(subjectId: string): Promise<ObligationDocument[]> {
    const snap = await this.getCollection()
      .where(OBLIGATION_FIELDS.SUBJECT_ID, "==", subjectId)
      .where(OBLIGATION_FIELDS.STATE, "in", [...OBLIGATION_ACTIVE_STATES])
      .get();
    return snap.docs.map((d) => this.mapDoc<ObligationDocument>(d));
  }

  /** Record that a warning was sent, so a re-run does not re-warn. */
  async recordWarning(id: string, at: Date): Promise<void> {
    try {
      const existing = await this.findById(id);
      await this.getCollection()
        .doc(id)
        .update({
          warnedAt: [...(existing?.warnedAt ?? []), at],
          updatedAt: at,
        });
    } catch (err) {
      /*
       * Best effort, but RECORDED. `void normalizeError(err)` alone types the
       * error and reports it nowhere — as silent as `catch {}` while looking
       * handled, which is what audit-silent-degrade calls normalize theatre.
       * Swallowing is still correct here (a warning marker is a derived hint; the next order write reconciles again); losing the reason is not.
       */
      serverLogger.warn("obligations.warn failed", {
        error: normalizeError(err).message,
      });
    }
  }

  /** Refs for a subject's obligations — used when an order is hard-deleted. */
  async refsForSubject(subjectId: string): Promise<DocumentReference[]> {
    const snap = await this.getCollection()
      .where(OBLIGATION_FIELDS.SUBJECT_ID, "==", subjectId)
      .limit(50)
      .get();
    return snap.docs.map((d) => d.ref as DocumentReference);
  }
}

let cached: ObligationsRepository | null = null;

export function obligationsRepository(): ObligationsRepository {
  if (!cached) cached = new ObligationsRepository();
  return cached;
}
