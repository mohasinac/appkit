/**
 * Allocating a number from a gapless series (Phase 7, D12).
 *
 * ## The whole design in one paragraph
 *
 * One transaction does three things: read the (series, FY) counter, `.create()`
 * an allocation claim keyed on the subject, and write `lastNumber + 1`. Any one
 * of the three failing rolls back all of them, so there is no state where a
 * number was consumed without being recorded, and no state where a subject
 * holds two numbers.
 *
 * ## 🛑 Why the claim is INSIDE the transaction
 *
 * The obvious shape is "check whether this order already has a number, then
 * allocate". That is a read-then-write race: two concurrent triggers both read
 * "no number", both allocate, and the order ends up with two — one of which is
 * a permanent gap in a series an auditor reads.
 *
 * `.create()` inside the transaction makes it impossible rather than unlikely.
 * A duplicate attempt fails the transaction, and the caller treats that as
 * "already allocated" and reads the existing number back. This is the fourth
 * use of that primitive in this codebase (refund claims, the gateway-event
 * inbox, the gateway-order claim), and the one with the least recoverable
 * failure mode.
 *
 * ## 🛑 Allocate on `paymentStatus → paid`, never at order creation
 *
 * COD and manual orders are created `pending`. Numbering at creation burns a
 * number on every abandoned order, and *gapless* means those gaps are
 * unexplainable — "that one was abandoned" is not an answer an auditor accepts
 * for a missing invoice number.
 */

import { getAdminDb } from "../../../../providers/db-firebase";
import { serverLogger } from "../../../../monitoring";
import { normalizeError } from "../../../../errors/normalize";
import {
  INVOICE_ALLOCATION_COLLECTION,
  INVOICE_COUNTER_COLLECTION,
  type InvoiceAllocationDocument,
  type InvoiceSeriesKind,
} from "../../../../features/invoicing/schemas/firestore";
import {
  CREDIT_NOTE_PREFIX,
  INVOICE_PREFIX,
  financialYearLabel,
  formatSeriesNumber,
} from "../../../../features/invoicing/utils/financial-year";

export interface AllocateSeriesNumberInput {
  kind: InvoiceSeriesKind;
  /**
   * What the number is FOR, and the idempotency key.
   *
   * An invoice passes the order id. A credit note passes
   * `${orderId}_${refundId}`, because an order may have several.
   */
  subjectId: string;
  orderId: string;
  /** Defaults to now. Injectable so a backfill can issue into a past FY. */
  at?: Date;
}

export interface AllocateSeriesNumberResult {
  number: string;
  fy: string;
  sequence: number;
  /** True when this call did the allocating; false when it found an existing one. */
  allocated: boolean;
}

function prefixFor(kind: InvoiceSeriesKind): string {
  return kind === "credit_note" ? CREDIT_NOTE_PREFIX : INVOICE_PREFIX;
}

/**
 * Allocate (or return the already-allocated) number for one subject.
 *
 * 🛑 Idempotent and NOT best-effort. It throws rather than returning a
 * sentinel, because every caller's correct response to "we could not number
 * this" is to leave the order un-invoiced and retry — a caller that treated
 * failure as "no number needed" would produce a paid order with no invoice,
 * silently.
 */
export async function allocateSeriesNumber(
  input: AllocateSeriesNumberInput,
): Promise<AllocateSeriesNumberResult> {
  const db = getAdminDb();
  const at = input.at ?? new Date();
  const fy = financialYearLabel(at);
  const counterRef = db
    .collection(INVOICE_COUNTER_COLLECTION)
    .doc(`${input.kind}_${fy}`);
  const claimRef = db.collection(INVOICE_ALLOCATION_COLLECTION).doc(input.subjectId);

  try {
    return await db.runTransaction(async (tx) => {
      /*
       * 🛑 Both reads BEFORE any write — a Firestore transaction requires it,
       * and the claim read is what lets an already-allocated subject return
       * its existing number instead of failing.
       */
      const [claimSnap, counterSnap] = await Promise.all([
        tx.get(claimRef),
        tx.get(counterRef),
      ]);

      if (claimSnap.exists) {
        const existing = claimSnap.data() as InvoiceAllocationDocument;
        return {
          number: existing.number,
          fy: existing.fy,
          sequence: existing.sequence,
          allocated: false,
        };
      }

      const last = counterSnap.exists
        ? ((counterSnap.data() as { lastNumber?: number }).lastNumber ?? 0)
        : 0;
      const sequence = last + 1;
      const number = formatSeriesNumber(prefixFor(input.kind), fy, sequence);

      /*
       * `set(..., { merge: true })` on the counter rather than `update`,
       * because the first allocation of a financial year creates it — and
       * `update` on a missing document throws, which would make 1 April the
       * one day of the year invoicing breaks.
       */
      tx.set(
        counterRef,
        {
          kind: input.kind,
          fy,
          lastNumber: sequence,
          lastIssuedAt: at,
          updatedAt: at,
          ...(counterSnap.exists ? {} : { createdAt: at }),
        },
        { merge: true },
      );

      /*
       * 🛑 `create`, not `set`. Within a transaction both are atomic against
       * the counter, but `create` additionally refuses if the claim appeared
       * between our read and our write — which is exactly the window a
       * concurrent trigger occupies.
       */
      tx.create(claimRef, {
        kind: input.kind,
        subjectId: input.subjectId,
        orderId: input.orderId,
        number,
        fy,
        sequence,
        issuedAt: at,
        createdAt: at,
        updatedAt: at,
      });

      return { number, fy, sequence, allocated: true };
    });
  } catch (err: unknown) {
    const normalized = normalizeError(err);
    /*
     * A lost race: the other side created the claim first. Read it back rather
     * than failing — both callers want the same answer, and whoever wrote it
     * wrote the number this subject now permanently has.
     */
    /*
     * Logged, not swallowed. `.catch(() => null)` alone made a Firestore
     * failure indistinguishable from "the claim genuinely is not there" — and
     * the two take opposite branches below: one must fall through to a fresh
     * allocation, the other must NOT, because re-allocating over a claim that
     * exists is how an invoice number gets issued twice. Root Cause #59's
     * shape, in the one place in this codebase where a silent degrade would
     * duplicate a filed document number.
     */
    const after = await claimRef.get().catch((readErr: unknown) => {
      const e = normalizeError(readErr);
      serverLogger.error("[invoicing] could not re-read the allocation claim after a race", {
        collection: INVOICE_ALLOCATION_COLLECTION,
        subjectId: input.subjectId,
        error: e.message,
      });
      return null;
    });
    if (after?.exists) {
      const existing = after.data() as InvoiceAllocationDocument;
      serverLogger.info("[invoicing] allocation race resolved to the existing number", {
        subjectId: input.subjectId,
        number: existing.number,
      });
      return {
        number: existing.number,
        fy: existing.fy,
        sequence: existing.sequence,
        allocated: false,
      };
    }
    serverLogger.error("[invoicing] allocation failed", {
      subjectId: input.subjectId,
      kind: input.kind,
      error: normalized.message,
    });
    throw err;
  }
}
