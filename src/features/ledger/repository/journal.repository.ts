/*
 * WHY: The only write path into the books. Every rule that makes a ledger
 *      trustworthy — balanced, append-only, period-locked — is enforced here
 *      rather than asked of callers, because a caller who gets one wrong
 *      produces a successful write and finds out at the next GST return.
 *
 * WHAT: JournalRepository — post, reverse, lock, read.
 *
 * @tag domain:ledger,finance
 * @tag layer:repository
 * @tag access:server
 * @tag sideEffects:firestore
 */

/* The DIRECTORY barrel, which is where every other repository gets this
 * from — `providers/db-firebase/base` exports only `FirebaseRepository`,
 * and `BaseRepository` (the one with `this.db` and `mapDoc`) is composed
 * one level up. */
import { BaseRepository } from "../../../providers/db-firebase";
import { unitOfWork } from "../../../core/unit-of-work";
import {
  JOURNAL_ENTRIES_COLLECTION,
  ACCOUNTING_PERIODS_COLLECTION,
  LEDGER_FIELDS,
  type JournalEntryDocument,
  type AccountingPeriodDocument,
} from "../schemas/firestore";
import {
  assertBalanced,
  buildReversal,
  periodOf,
  UnbalancedEntryError,
  type PostingInput,
} from "../../../_internal/shared/features/ledger/posting";
import { NotFoundError } from "../../../errors/not-found-error";
import { ValidationError } from "../../../errors/validation-error";

/**
 * How many entries one period read may return.
 *
 * Sized against a plausible month rather than a round number: a few hundred
 * orders, each posting two or three entries, plus settlements and expenses.
 * 2,000 leaves real headroom and still fits comfortably inside a function's
 * memory and the ~3-round-trip budget.
 */
export const JOURNAL_PERIOD_SCAN_LIMIT = 2000;

export class JournalRepository extends BaseRepository<JournalEntryDocument> {
  /*
   * 🛑 NO `SIEVE_FIELDS`, same reasoning as `obligations`. The reports read
   * by period and by account code — two fixed shapes, both served by the
   * automatic index — and an admin looking at a figure opens the ORDER it
   * came from, not a filtered journal list. A Sieve surface nothing calls is
   * the `route-schema-registry` pattern: 576 keys into a layer with no
   * readers.
   */

  constructor() {
    super(JOURNAL_ENTRIES_COLLECTION);
  }

  /**
   * 🛑 APPEND-ONLY, and the method bodies refuse rather than a comment
   * asking nicely.
   *
   * `inventoryMovements` takes the same stance for the same reason: a
   * Firestore update succeeds silently, so a caller who edits history never
   * finds out, and a ledger whose rows can be edited cannot be used as
   * evidence of anything. The correction mechanism is `reverse()`.
   */
  override async update(): Promise<never> {
    throw new Error(
      "journalEntries is append-only. Correct an entry with reverse(), which posts the opposite legs and links the two — an edit would silently rewrite a period a GST return may already have been filed from.",
    );
  }

  override async delete(): Promise<never> {
    throw new Error(
      "journalEntries is append-only. An entry that should not have been posted is reversed, not removed; the reversal is the record that it was wrong.",
    );
  }

  /**
   * Post one entry.
   *
   * 🛑 **The balance check and the lock check are INSIDE the transaction.**
   * Reading the period's state first and writing after is a TOCTOU window: an
   * admin filing a return between the two gets an entry in the period they
   * just closed, which is the one outcome the lock exists to prevent. It is a
   * narrow window and it is exactly the kind that shows up once, in the
   * quarter it matters.
   */
  async post(input: PostingInput): Promise<JournalEntryDocument> {
    const balanced = assertBalanced(input);

    return unitOfWork.runTransaction(async (tx) => {
      const db = this.db;
      const periodRef = db
        .collection(ACCOUNTING_PERIODS_COLLECTION)
        .doc(`period-${balanced.period}`);
      const snap = await tx.get(periodRef);
      const period = snap.exists ? (snap.data() as AccountingPeriodDocument) : null;

      /*
       * 🛑 A period with NO row is OPEN, not closed.
       *
       * Fail-open here and fail-closed everywhere else is deliberate: a
       * period is closed by someone filing a return, which is an action that
       * writes a row. Treating absence as closed would mean the books refuse
       * every posting until an admin opens each month by hand — and the
       * first missed month silently stops the entire ingest, which looks
       * like a broken job rather than a missing row.
       */
      if (period?.status === "locked") {
        throw new ValidationError(
          `Period ${balanced.period} is closed and cannot accept new entries.`,
          {
            period:
              period.lockedReason ??
              "A return has been filed for this period. Post the correction to the open period instead.",
          },
        );
      }

      const ref = db.collection(JOURNAL_ENTRIES_COLLECTION).doc();
      const now = new Date();
      const doc = {
        ...balanced,
        id: ref.id,
        createdAt: now,
        updatedAt: now,
      } as JournalEntryDocument;
      tx.set(ref, doc);
      return doc;
    });
  }

  /**
   * Reverse an entry.
   *
   * 🛑 **Refuses a SECOND reversal of the same entry.** Without the check a
   * double-click posts the opposite legs twice, and the books then show the
   * original plus two reversals — a net position that is the mirror image of
   * the truth, balanced, and wrong. `reversedByEntryId` is set inside the
   * same transaction that reads it, so the second attempt loses the race
   * rather than both succeeding.
   */
  async reverse(
    entryId: string,
    reason: string,
    at: Date = new Date(),
  ): Promise<JournalEntryDocument> {
    if (!reason.trim()) {
      /*
       * A reversal with no stated reason is the one thing a reader of the
       * books cannot reconstruct later. The original entry says what was
       * posted; only this says why it was wrong.
       */
      throw new ValidationError("A reversal needs a reason.", {
        reason: "Say what was wrong with the original entry.",
      });
    }

    return unitOfWork.runTransaction(async (tx) => {
      const db = this.db;
      const originalRef = db.collection(JOURNAL_ENTRIES_COLLECTION).doc(entryId);
      const snap = await tx.get(originalRef);
      if (!snap.exists) throw new NotFoundError(`Journal entry ${entryId} not found.`);
      const original = snap.data() as JournalEntryDocument;

      if (original.reversedByEntryId) {
        throw new ValidationError(
          `Entry ${entryId} has already been reversed by ${original.reversedByEntryId}.`,
          { entryId: "Reversing it again would double the correction." },
        );
      }
      if (original.sourceEvent === "reversal") {
        /*
         * Reversing a reversal is re-instating the original, and saying so
         * is clearer than letting someone build a chain nobody can read. If
         * the original was right after all, post it again with a narration
         * that says why.
         */
        throw new ValidationError(
          `Entry ${entryId} is itself a reversal.`,
          { entryId: "To re-instate the original, post it again with a narration explaining why." },
        );
      }

      const reversalInput = buildReversal(
        { id: entryId, lines: original.lines, narration: original.narration },
        at,
        reason.trim(),
      );
      const balanced = assertBalanced(reversalInput);

      /*
       * The reversal's OWN period must be open. It is `at`'s period, not the
       * original's — see `buildReversal`, which deliberately does not
       * back-date. A correction found after a return was filed posts to the
       * open month and references the closed one.
       */
      const periodRef = db
        .collection(ACCOUNTING_PERIODS_COLLECTION)
        .doc(`period-${balanced.period}`);
      const periodSnap = await tx.get(periodRef);
      const period = periodSnap.exists
        ? (periodSnap.data() as AccountingPeriodDocument)
        : null;
      if (period?.status === "locked") {
        throw new ValidationError(
          `Period ${balanced.period} is closed, so the correction has nowhere to post.`,
          { period: "Open the current period before reversing." },
        );
      }

      const ref = db.collection(JOURNAL_ENTRIES_COLLECTION).doc();
      const now = new Date();
      const reversal = {
        ...balanced,
        id: ref.id,
        reversesEntryId: entryId,
        createdAt: now,
        updatedAt: now,
      } as JournalEntryDocument;

      tx.set(ref, reversal);
      /*
       * 🛑 The back-link is written with `tx.update` on the ORIGINAL, which
       * is the one edit to a posted entry this class permits — and it adds a
       * pointer rather than changing a figure. Without it `reverse()` has no
       * way to refuse a second attempt, and nothing reading the original can
       * tell it has been corrected.
       */
      tx.update(originalRef, { reversedByEntryId: ref.id, updatedAt: now });
      return reversal;
    });
  }

  /**
   * Close a period.
   *
   * 🛑 Takes the reason and the actor, both required. "Who closed October
   * and under which return" is the first question anyone asks when a figure
   * disagrees with a filing, and a lock with no answer to it is a lock
   * somebody will simply reopen.
   */
  async lockPeriod(
    period: string,
    lockedByUid: string,
    lockedReason: string,
  ): Promise<void> {
    if (!/^\d{4}-\d{2}$/.test(period)) {
      throw new ValidationError(`"${period}" is not a YYYY-MM period.`, {
        period: "Expected a month such as 2026-10.",
      });
    }
    if (!lockedReason.trim()) {
      throw new ValidationError("Closing a period needs a reason.", {
        lockedReason: "Name the return this period was filed under.",
      });
    }

    await unitOfWork.runTransaction(async (tx) => {
      const db = this.db;
      const ref = db.collection(ACCOUNTING_PERIODS_COLLECTION).doc(`period-${period}`);
      const snap = await tx.get(ref);
      if ((snap.data() as AccountingPeriodDocument | undefined)?.status === "locked") {
        /*
         * Idempotent rather than an error: a retried request must not read
         * as a failure, and re-closing a closed period changes nothing.
         */
        return;
      }
      const now = new Date();
      tx.set(ref, {
        id: `period-${period}`,
        period,
        status: "locked",
        lockedReason: lockedReason.trim(),
        lockedAt: now,
        lockedByUid,
        createdAt: now,
        updatedAt: now,
      } satisfies AccountingPeriodDocument & { id: string });
    });
  }

  /**
   * 🛑 There is deliberately NO `unlockPeriod`.
   *
   * Reopening a period a return was filed from is not an operation the
   * system should make easy — the correct response to a late correction is a
   * reversing entry in the OPEN period, which is what `resolvePostingPeriod`
   * computes and what every accountant expects. If a period genuinely must
   * be reopened (a return withdrawn, say), that is a deliberate act with a
   * paper trail outside this system, and a console write is the right amount
   * of friction for it.
   *
   * This method exists only to say so. Deleting it would leave the absence
   * looking like an oversight somebody helpfully fills in.
   */

  /**
   * Every entry in a period, for a trial balance or a return.
   *
   * 🛑 **BOUNDED, and truncation is REPORTED rather than silent.** An
   * unbounded read is the Rule #6 violation, but the reason it matters here
   * is sharper than cost: a trial balance computed from a silently truncated
   * page is a trial balance that BALANCES — both sides lose the same
   * entries — while being wrong. It would look perfect and reconcile to
   * nothing.
   *
   * So `truncated` is part of the return type and callers must handle it.
   * The same stance `listPublicProducts` takes with its own `truncated`
   * flag: a floor rendered as "50+", never a figure presented as a total.
   *
   * The real answer at volume is a period rollup written by a scheduled job
   * — the `revenueRollup` pattern — and this is deliberately NOT that, so
   * the flag is what forces the question rather than hiding it.
   */
  async listByPeriod(
    period: string,
    limit = JOURNAL_PERIOD_SCAN_LIMIT,
  ): Promise<{ entries: JournalEntryDocument[]; truncated: boolean }> {
    const snap = await this.db
      .collection(JOURNAL_ENTRIES_COLLECTION)
      .where(LEDGER_FIELDS.PERIOD, "==", period)
      .orderBy(LEDGER_FIELDS.ENTRY_DATE)
      .limit(limit + 1)
      .get();
    const docs = snap.docs.slice(0, limit);
    return {
      entries: docs.map((d) => this.mapDoc<JournalEntryDocument>(d)),
      truncated: snap.docs.length > limit,
    };
  }

  /** Whether a period is closed. Absence means open — see `post`. */
  async isPeriodLocked(period: string): Promise<boolean> {
    const snap = await this.db
      .collection(ACCOUNTING_PERIODS_COLLECTION)
      .doc(`period-${period}`)
      .get();
    return (snap.data() as AccountingPeriodDocument | undefined)?.status === "locked";
  }

  /**
   * The cutover entry.
   *
   * 🛑 **NOT a backfill.** Pre-cutover data here is seeded and test, so
   * replaying it would post fixtures as trade — the first financial year is
   * therefore split across the old rollups and this ledger, and the
   * "pre-ledger estimate" label on the old reports is what keeps that
   * honest rather than hiding it.
   *
   * 🛑 Refuses to run twice. An opening balance posted a second time doubles
   * every starting figure, and because both entries balance nothing
   * downstream would object.
   */
  async postOpeningBalances(
    at: Date,
    lines: PostingInput["lines"],
  ): Promise<JournalEntryDocument> {
    const existing = await this.db
      .collection(JOURNAL_ENTRIES_COLLECTION)
      .where(LEDGER_FIELDS.SOURCE_EVENT, "==", "opening-balance")
      .limit(1)
      .get();
    if (!existing.empty) {
      throw new UnbalancedEntryError(
        "Opening balances have already been posted. Correct them with a reversing entry rather than posting a second opening.",
      );
    }
    return this.post({
      entryDate: at,
      sourceEvent: "opening-balance",
      narration: `Opening balances at cutover, ${periodOf(at)}`,
      lines,
    });
  }
}

export const journalRepository = new JournalRepository();
