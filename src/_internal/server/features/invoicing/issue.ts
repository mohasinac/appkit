/**
 * Issuing an invoice: allocate the number, render, store the bytes (Phase 7).
 *
 * ## 🛑 WHERE the PDF goes, and why it is not the media path
 *
 * `private/invoices/{orderId}/{uuid}.pdf`, with **no `mediaAssets` row** and a
 * **random** object name. An invoice carries the buyer's full name, address and
 * phone.
 *
 * Three facts, each of which alone would be enough:
 *
 * 1. `/api/media/[...slug]` applies **no authentication at all** — it is a
 *    deliberately bare handler whose job is watermarking public product
 *    photography.
 * 2. The bucket's storage rule is `allow read: if true`.
 * 3. Media filenames in this codebase are content-derived and therefore
 *    GUESSABLE — `generateInvoiceFilename` is `invoice-{orderId}-{YYYYMMDD}`.
 *
 * So the random name is against the SEO-slug convention everywhere else *on
 * purpose*: guessable is the one property this must not have. And the `private/`
 * prefix is refused by the proxy's raw-path fallback — a check, not a naming
 * convention, which is precisely the distinction the digital-content comment
 * got wrong for weeks.
 *
 * ## 🛑 Store the bytes; never re-render to serve or to email
 *
 * Two renders can disagree — a changed template, a different library version,
 * a settings read that moved — and the buyer's copy must be byte-identical to
 * ours. So the bytes are written once, at issue time, and every later consumer
 * reads that object. On-demand rendering survives only as a fallback for orders
 * that predate this phase and have no stored path.
 */

import { randomUUID } from "node:crypto";

import { getAdminStorage } from "../../../../providers/db-firebase";
import { orderRepository } from "../../../../features/orders/repository/orders.repository";
import type { OrderDocument } from "../../../../features/orders/schemas/firestore";
import { serverLogger } from "../../../../monitoring";
import { normalizeError } from "../../../../errors/normalize";
import { allocateSeriesNumber } from "./allocate";

/** Storage prefix. Mirrors `private/digital-content/` — refused by the proxy. */
export const INVOICE_PREFIX_PATH = "private/invoices";

/**
 * Renders the PDF for an order.
 *
 * Injected rather than imported, because the renderer lives in
 * `functions/src/invoice-pdf.ts` — it pulls `pdfkit`, which is a Functions
 * dependency and has no business in appkit's module graph (Rule #6's build
 * weight, and Root Cause #18's import-chain trap).
 */
export type InvoiceRenderer = (order: OrderDocument) => Promise<Buffer>;

export interface IssueInvoiceResult {
  invoiceNumber: string;
  invoiceStoragePath: string;
  /** False when the order already had an invoice — the normal re-entry case. */
  issued: boolean;
}

/**
 * Give a paid order its invoice number and its stored PDF.
 *
 * 🛑 Idempotent through `allocateSeriesNumber`'s transactional claim.
 * `onOrderStatusChange` can fire more than once, and two numbers for one order
 * is the single unrecoverable failure in this phase — a number cannot be
 * withdrawn without leaving a gap.
 *
 * 🛑 Called on `paymentStatus → paid`, never at creation. COD and manual orders
 * are created `pending`.
 */
export async function issueInvoiceForOrder(
  order: OrderDocument,
  render: InvoiceRenderer,
): Promise<IssueInvoiceResult> {
  /*
   * The fast path, and the common one: a second trigger on an order that is
   * already invoiced does no work and touches no counter. Checked before the
   * transaction purely to save the round trip — the transaction would reach
   * the same answer, which is what makes this safe rather than a race.
   */
  if (order.invoiceNumber && order.invoiceStoragePath) {
    return {
      invoiceNumber: order.invoiceNumber,
      invoiceStoragePath: order.invoiceStoragePath,
      issued: false,
    };
  }

  const issuedAt = new Date();
  const allocation = await allocateSeriesNumber({
    kind: "invoice",
    subjectId: order.id,
    orderId: order.id,
    at: issuedAt,
  });

  /*
   * 🛑 `randomUUID()`, and the ORDER ID is in the directory rather than the
   * filename. The directory makes an operator's life possible (every document
   * for one order is in one place); the random leaf is what makes the object
   * unguessable. Putting the order id in the FILENAME would undo the second
   * without improving the first.
   */
  const storagePath = `${INVOICE_PREFIX_PATH}/${order.id}/${randomUUID()}.pdf`;

  /*
   * Rendered with the number already on the order object, so the PDF carries
   * the number it was allocated — the renderer reads `order.invoiceNumber`,
   * and handing it the un-numbered document would produce an invoice with no
   * number printed on it while the database said otherwise.
   */
  const buffer = await render({
    ...order,
    invoiceNumber: allocation.number,
    invoiceIssuedAt: issuedAt,
  });

  await getAdminStorage()
    .bucket()
    .file(storagePath)
    .save(buffer, {
      contentType: "application/pdf",
      /*
       * 🛑 `private, no-store` on the OBJECT as well as on every response that
       * serves it. The object is not reachable without a signed URL or the
       * Admin SDK, but an intermediate cache that ever saw one must not keep
       * it: an invoice is one buyer's address, not a product photo.
       */
      metadata: { cacheControl: "private, no-store" },
      resumable: false,
    });

  /*
   * 🛑 The order is updated AFTER the bytes exist. The reverse ordering would
   * leave an order claiming an `invoiceStoragePath` that resolves to nothing,
   * and the serve route would then 404 on a document the buyer is entitled to
   * — while the number is already consumed, so retrying cannot re-issue it.
   *
   * A crash between the save and this update leaves an unreferenced object
   * (a few KB) and an order with a number but no path, which the next trigger
   * re-renders into a NEW object. Wasteful and harmless, which is the right
   * side of this trade.
   */
  await orderRepository.update(order.id, {
    invoiceNumber: allocation.number,
    invoiceIssuedAt: issuedAt,
    invoiceStoragePath: storagePath,
  });

  serverLogger.info("[invoicing] invoice issued", {
    orderId: order.id,
    invoiceNumber: allocation.number,
  });

  return {
    invoiceNumber: allocation.number,
    invoiceStoragePath: storagePath,
    issued: allocation.allocated,
  };
}

/**
 * Persist bytes rendered on demand, for an order that is already NUMBERED.
 *
 * ## Why the lazy path exists at all
 *
 * Numbering happens in `onOrderStatusChange`, which runs in appkit and cannot
 * render — `pdfkit` is a Functions dependency and bringing it into appkit's
 * module graph would add it to every consumer build (Rule #6's build weight,
 * Root Cause #18's import chain). So the two halves are split: the number is
 * allocated immediately and transactionally, the bytes are produced the first
 * time anyone asks for them and then stored forever.
 *
 * That split is a deliberate trade and worth naming: the first download of a
 * given invoice pays a render, and every later one does not. The alternative —
 * a second Firestore trigger on `orders` living in `functions/` — is the shape
 * that burned a million invocations a day in Root Cause #92.
 *
 * 🛑 Refuses to overwrite an existing path. A second numbered copy of one
 * invoice is two documents claiming one number, and the one a buyer already
 * downloaded is the one that counts.
 *
 * 🛑 Refuses an un-numbered order. Storing a PDF before the number exists
 * would freeze a pre-payment snapshot as "the invoice", and the real issuance
 * would then find a path already set.
 */
export async function storeRenderedInvoice(
  orderId: string,
  bytes: Buffer,
): Promise<string | null> {
  const order = await orderRepository.findById(orderId);
  if (!order?.invoiceNumber) return null;
  if (order.invoiceStoragePath) return order.invoiceStoragePath;

  const storagePath = `${INVOICE_PREFIX_PATH}/${orderId}/${randomUUID()}.pdf`;
  await getAdminStorage()
    .bucket()
    .file(storagePath)
    .save(bytes, {
      contentType: "application/pdf",
      metadata: { cacheControl: "private, no-store" },
      resumable: false,
    });
  // Path written only after the bytes exist — the reverse would point at
  // nothing and 404 a document the buyer is entitled to.
  await orderRepository.update(orderId, { invoiceStoragePath: storagePath });
  serverLogger.info("[invoicing] invoice bytes stored on first download", {
    orderId,
    invoiceNumber: order.invoiceNumber,
  });
  return storagePath;
}

/**
 * The stored bytes for an already-issued invoice, or null.
 *
 * Returns null rather than throwing on a missing object, because the caller's
 * correct response is to fall back to an on-demand render for a pre-Phase-7
 * order — and a throw would turn a legacy order's invoice page into an error.
 */
export async function readStoredInvoice(
  storagePath: string | undefined,
): Promise<Buffer | null> {
  if (!storagePath) return null;
  try {
    const [buffer] = await getAdminStorage().bucket().file(storagePath).download();
    return buffer;
  } catch (err: unknown) {
    serverLogger.warn("[invoicing] stored invoice unreadable — falling back to render", {
      storagePath,
      error: normalizeError(err).message,
    });
    return null;
  }
}
