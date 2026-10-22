/**
 * Credit notes — the document that reverses tax on a refund (Phase 7, 7c).
 *
 * ## 🛑 A refund needs a credit note; it never needs a re-issued invoice
 *
 * A GST invoice is issued once. When money goes back, the reversal is its own
 * numbered document referencing the original invoice — which is why there are
 * two series rather than a revision suffix on one.
 *
 * ## 🛑 Numbered on SETTLEMENT, not on reservation
 *
 * `processRefundAction` is two-phase: it reserves an entry, calls the provider,
 * then settles to `processed` or `failed`. A credit note numbered at
 * reservation would leave a numbered reversal in the series for money that
 * never moved, on every provider failure — and the number could not be
 * withdrawn.
 *
 * So this is called from the SETTLE step, for `processed` only.
 *
 * ## One per refund event, keyed accordingly
 *
 * An order can be refunded several times. The allocation claim is therefore
 * `${orderId}_${refundId}` — keying on the order alone would refuse the second
 * credit note, which is the inverse of the invoice's rule and is why
 * `allocateSeriesNumber` takes `subjectId` separately from `orderId`.
 */

import { randomUUID } from "node:crypto";

import { getAdminStorage } from "../../../../providers/db-firebase";
import { orderRepository } from "../../../../features/orders/repository/orders.repository";
import type {
  OrderDocument,
  OrderRefundEvent,
} from "../../../../features/orders/schemas/firestore";
import { serverLogger } from "../../../../monitoring";
import { normalizeError } from "../../../../errors/normalize";
import { allocateSeriesNumber } from "./allocate";

/** Same private prefix family as invoices — refused by the media proxy. */
export const CREDIT_NOTE_PREFIX_PATH = "private/credit-notes";

/**
 * Renders a credit note. Injected for the same reason as `InvoiceRenderer`:
 * `pdfkit` is a Functions dependency.
 */
export type CreditNoteRenderer = (
  order: OrderDocument,
  refund: OrderRefundEvent,
  creditNoteNumber: string,
) => Promise<Buffer>;

export interface IssueCreditNoteResult {
  creditNoteNumber: string;
  creditNoteStoragePath?: string;
  issued: boolean;
}

/**
 * Number and (optionally) render the credit note for one settled refund.
 *
 * 🛑 **Best-effort by design, and that is the opposite of the invoice rule.**
 * It is called from the refund settle path, where the money has ALREADY left
 * the gateway. Throwing here would turn a successful refund into a failed
 * action — the buyer has their money, our code reports an error, and an
 * operator retries a refund that already happened. A missing credit note is a
 * reporting gap recoverable by a backfill; a double refund is not.
 *
 * The invoice path throws for the mirror-image reason: nothing irreversible has
 * happened yet there, so refusing to proceed is the safe direction.
 *
 * `render` is optional — passing none numbers the reversal without producing a
 * document, which is what the GSTR-1 export actually needs (it reconciles
 * numbers and amounts, not PDFs). The PDF is for the buyer.
 */
export async function issueCreditNoteForRefund(
  order: OrderDocument,
  refund: OrderRefundEvent,
  render?: CreditNoteRenderer,
): Promise<IssueCreditNoteResult | null> {
  if (refund.creditNoteNumber) {
    return {
      creditNoteNumber: refund.creditNoteNumber,
      creditNoteStoragePath: refund.creditNoteStoragePath,
      issued: false,
    };
  }

  /*
   * 🛑 Only a refund that actually moved money gets a number. `status`
   * undefined means "committed" to every reader (rows written before the
   * two-phase lifecycle existed carry none), so the test admits those and
   * refuses only an explicit `reserved` or `failed`.
   */
  if (refund.status === "reserved" || refund.status === "failed") {
    return null;
  }

  try {
    const issuedAt = new Date();
    const allocation = await allocateSeriesNumber({
      kind: "credit_note",
      subjectId: `${order.id}_${refund.refundId}`,
      orderId: order.id,
      at: issuedAt,
    });

    let storagePath: string | undefined;
    if (render) {
      storagePath = `${CREDIT_NOTE_PREFIX_PATH}/${order.id}/${randomUUID()}.pdf`;
      const buffer = await render(order, refund, allocation.number);
      await getAdminStorage()
        .bucket()
        .file(storagePath)
        .save(buffer, {
          contentType: "application/pdf",
          metadata: { cacheControl: "private, no-store" },
          resumable: false,
        });
    }

    /*
     * 🛑 Written through the repository's own refund-event mutator, NOT by
     * read-modify-writing `refunds[]`. That array is appended by a transaction
     * precisely because a read-then-`[...existing, event]` write LOSES an
     * event under concurrency (D6), and stamping a credit-note number the
     * naive way would reintroduce exactly that defect on the same array.
     */
    await orderRepository.setRefundCreditNote(order.id, refund.refundId, {
      creditNoteNumber: allocation.number,
      creditNoteIssuedAt: issuedAt,
      ...(storagePath ? { creditNoteStoragePath: storagePath } : {}),
    });

    serverLogger.info("[invoicing] credit note issued", {
      orderId: order.id,
      refundId: refund.refundId,
      creditNoteNumber: allocation.number,
    });

    return {
      creditNoteNumber: allocation.number,
      creditNoteStoragePath: storagePath,
      issued: allocation.allocated,
    };
  } catch (err: unknown) {
    /*
     * Reported loudly and swallowed — see the 🛑 on this function. A refund
     * that succeeded must not be reported as failed because its paperwork
     * could not be numbered.
     */
    serverLogger.error("[invoicing] credit note FAILED — refund stands, reporting gap", {
      orderId: order.id,
      refundId: refund.refundId,
      error: normalizeError(err).message,
    });
    return null;
  }
}
