/**
 * GSTR-1 export (Phase 7d) — the INPUT to a human filing, never a filing.
 *
 * ## 🛑 What this is and is not
 *
 * It is a CSV an accountant opens, checks and uses. It is not a return, it is
 * not filed, and nothing here talks to the GST portal — there is no webhook
 * facility in existence and no GSP contract. Labelling it otherwise would be
 * the most consequential lie in this codebase.
 *
 * ## 🛑 Credit notes are not optional
 *
 * A return listing invoices and no credit notes **does not reconcile**: the
 * output tax declared would be the tax on every sale including the ones that
 * were reversed. So both series are exported, the credit notes as negative
 * amounts, and the file's own total is the net.
 *
 * That is also why the two series exist in the first place — a reversal is its
 * own numbered document, so it has its own row here.
 *
 * ## The rate split comes from `gstByRate`
 *
 * Already on the order (`firestore.ts`), already per rate, already recorded at
 * the moment of supply. Nothing is recomputed from today's tax codes: an order
 * supplied under a rate that has since changed must appear at the rate it was
 * charged, and re-deriving it would silently restate history — the same defect
 * the PDF renderer's own 🛑 records about reading live site settings.
 */

import { orderRepository } from "../../../../features/orders/repository/orders.repository";
import type { OrderDocument } from "../../../../features/orders/schemas/firestore";
import { roundRupees } from "../../../../utils/number.formatter";
import { serverLogger } from "../../../../monitoring";

export interface Gstr1Row {
  /** `LIR/26-27/0001` or `LIRCN/26-27/0001`. */
  documentNumber: string;
  documentType: "invoice" | "credit_note";
  documentDate: string;
  orderId: string;
  /** The buyer's state, which decides CGST+SGST vs IGST. */
  placeOfSupply: string;
  gstRate: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export interface Gstr1Export {
  rows: Gstr1Row[];
  /** Net of credit notes — what the period actually owes. */
  totals: { taxableValue: number; cgst: number; sgst: number; igst: number; total: number };
  /**
   * Orders in the window that are PAID but carry no invoice number.
   *
   * 🛑 Reported, never silently excluded. A paid order missing from a tax
   * return is the one error this export must not hide, and "the row simply
   * wasn't there" is indistinguishable from "there was nothing to report" in a
   * CSV. Root Cause #84's lesson applied to an accounting artefact: a count
   * that goes quiet is as likely to have stopped looking as to be satisfied.
   */
  unnumberedPaidOrders: string[];
}

/** One row per (document, rate) slice — which is what a GSTR-1 line is. */
function rowsForOrder(order: OrderDocument): Gstr1Row[] {
  /*
   * 🛑 `placeOfSupply` ONLY — never parsed out of `shippingAddress`, which is
   * a flat string on this document. Deriving a state from free text to file a
   * tax return is not a thing to do, and an order placed before the field
   * existed is reported as blank rather than guessed at.
   */
  const placeOfSupply = order.placeOfSupply ?? "";
  const date = order.invoiceIssuedAt ?? order.orderDate ?? order.createdAt;
  const dateStr = date instanceof Date ? date.toISOString().slice(0, 10) : "";
  const byRate = order.gstByRate ?? [];

  const invoiceRows: Gstr1Row[] = order.invoiceNumber
    ? byRate.map((slice) => ({
        documentNumber: order.invoiceNumber!,
        documentType: "invoice" as const,
        documentDate: dateStr,
        orderId: order.id,
        placeOfSupply,
        gstRate: slice.gstRate,
        taxableValue: roundRupees(slice.taxableAmount),
        cgst: roundRupees(slice.cgst),
        sgst: roundRupees(slice.sgst),
        igst: roundRupees(slice.igst),
        total: roundRupees(slice.taxableAmount + slice.cgst + slice.sgst + slice.igst),
      }))
    : [];

  /*
   * ── Credit notes, as NEGATIVE rows ────────────────────────────────────────
   *
   * 🛑 The tax reversed is apportioned across the SAME rate slices the invoice
   * carried, pro-rata on the refunded amount. A refund is a rupee figure with
   * no rate attached, and a multi-rate order's reversal has to be split
   * somehow — pro-rata on the invoice's own slices is the only split that
   * reconciles back to the invoice it adjusts.
   *
   * 🛑 Only SETTLED refunds appear, and only ones that were numbered. A
   * `reserved` entry is money that has not moved; a numbered reversal for it
   * would overstate the period's credit notes.
   */
  const invoiceTotal = byRate.reduce((s, r) => s + r.taxableAmount, 0);
  const creditRows: Gstr1Row[] = [];
  for (const refund of order.refunds ?? []) {
    if (!refund.creditNoteNumber) continue;
    if (refund.status === "reserved" || refund.status === "failed") continue;
    const refundDate = refund.creditNoteIssuedAt ?? refund.refundedAt;
    const refundDateStr =
      refundDate instanceof Date ? refundDate.toISOString().slice(0, 10) : dateStr;
    // No rate information at all — reported as one untaxed row rather than
    // dropped, so the CSV's total still matches the money that moved.
    if (invoiceTotal <= 0 || byRate.length === 0) {
      creditRows.push({
        documentNumber: refund.creditNoteNumber,
        documentType: "credit_note",
        documentDate: refundDateStr,
        orderId: order.id,
        placeOfSupply,
        gstRate: 0,
        taxableValue: -roundRupees(refund.amount),
        cgst: 0,
        sgst: 0,
        igst: 0,
        total: -roundRupees(refund.amount),
      });
      continue;
    }
    for (const slice of byRate) {
      /*
       * The slice's share of the refund, and then that amount's share of the
       * slice — two ratios, because a refund is a gross rupee figure while a
       * slice is split into taxable value and tax.
       *
       * 🛑 `sliceTotal > 0` guards a 0%-rated (exempt) slice, where the tax is
       * legitimately zero and a naive `portion / sliceTotal` would be a
       * division by zero producing `Infinity` — and `roundRupees(Infinity)` is
       * `NaN`, which propagates into the file's TOTAL row and makes every
       * figure in it unusable. One bad cell would be visible; a NaN total is
       * the whole return.
       */
      const share = slice.taxableAmount / invoiceTotal;
      const portion = refund.amount * share;
      const sliceTotal = slice.taxableAmount + slice.cgst + slice.sgst + slice.igst;
      const taxFraction = sliceTotal > 0 ? portion / sliceTotal : 0;
      creditRows.push({
        documentNumber: refund.creditNoteNumber,
        documentType: "credit_note",
        documentDate: refundDateStr,
        orderId: order.id,
        placeOfSupply,
        gstRate: slice.gstRate,
        taxableValue: -roundRupees(slice.taxableAmount * taxFraction),
        cgst: -roundRupees(slice.cgst * taxFraction),
        sgst: -roundRupees(slice.sgst * taxFraction),
        igst: -roundRupees(slice.igst * taxFraction),
        total: -roundRupees(portion),
      });
    }
  }

  return [...invoiceRows, ...creditRows];
}

/**
 * Build the export for a date window.
 *
 * 🛑 Windowed on the INVOICE date, not the order date. A COD order placed on
 * 30 March and paid on 2 April is invoiced in the new financial year, and that
 * is the period its tax belongs to — numbering happens at payment for exactly
 * this reason.
 */
export async function buildGstr1Export(
  from: Date,
  to: Date,
): Promise<Gstr1Export> {
  const orders = await orderRepository.listInvoicedBetween(from, to);

  const rows: Gstr1Row[] = [];
  const unnumberedPaidOrders: string[] = [];
  for (const order of orders) {
    if (order.paymentStatus === "paid" && !order.invoiceNumber) {
      unnumberedPaidOrders.push(order.id);
      continue;
    }
    rows.push(...rowsForOrder(order));
  }

  const totals = rows.reduce(
    (acc, r) => ({
      taxableValue: acc.taxableValue + r.taxableValue,
      cgst: acc.cgst + r.cgst,
      sgst: acc.sgst + r.sgst,
      igst: acc.igst + r.igst,
      total: acc.total + r.total,
    }),
    { taxableValue: 0, cgst: 0, sgst: 0, igst: 0, total: 0 },
  );

  if (unnumberedPaidOrders.length > 0) {
    serverLogger.warn("[gstr1] paid orders with no invoice number in window", {
      count: unnumberedPaidOrders.length,
      from: from.toISOString(),
      to: to.toISOString(),
    });
  }

  return {
    rows,
    totals: {
      taxableValue: roundRupees(totals.taxableValue),
      cgst: roundRupees(totals.cgst),
      sgst: roundRupees(totals.sgst),
      igst: roundRupees(totals.igst),
      total: roundRupees(totals.total),
    },
    unnumberedPaidOrders,
  };
}

const CSV_HEADER = [
  "Document Number",
  "Document Type",
  "Document Date",
  "Order ID",
  "Place of Supply",
  "GST Rate",
  "Taxable Value",
  "CGST",
  "SGST",
  "IGST",
  "Total",
].join(",");

/**
 * 🛑 Every field is quoted and internal quotes are doubled.
 *
 * An invoice number contains `/`, a place of supply can contain a comma, and a
 * CSV whose columns shift by one on a single row is worse than no CSV — it
 * reconciles to a plausible wrong number rather than failing to open.
 */
function csvCell(value: string | number): string {
  const s = String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export function gstr1ToCsv(data: Gstr1Export): string {
  const lines = [CSV_HEADER];
  for (const r of data.rows) {
    lines.push(
      [
        r.documentNumber,
        r.documentType === "credit_note" ? "Credit Note" : "Invoice",
        r.documentDate,
        r.orderId,
        r.placeOfSupply,
        r.gstRate,
        r.taxableValue.toFixed(2),
        r.cgst.toFixed(2),
        r.sgst.toFixed(2),
        r.igst.toFixed(2),
        r.total.toFixed(2),
      ]
        .map(csvCell)
        .join(","),
    );
  }
  /*
   * A TOTAL row, and it is net of credit notes. An accountant's first act is to
   * check the file's own total against their own figure; making them sum 400
   * rows to do it is how a transcription error enters a tax return.
   */
  lines.push(
    [
      "TOTAL",
      "",
      "",
      "",
      "",
      "",
      data.totals.taxableValue.toFixed(2),
      data.totals.cgst.toFixed(2),
      data.totals.sgst.toFixed(2),
      data.totals.igst.toFixed(2),
      data.totals.total.toFixed(2),
    ]
      .map(csvCell)
      .join(","),
  );
  /*
   * 🛑 The exceptions go IN the file, not only in a log. The person filing is
   * not the person reading our logs, and a paid order absent from a tax return
   * is the one error this export must not hide.
   */
  if (data.unnumberedPaidOrders.length > 0) {
    lines.push("");
    lines.push(
      csvCell(
        `WARNING: ${data.unnumberedPaidOrders.length} paid order(s) in this window carry no invoice number and are NOT included above: ${data.unnumberedPaidOrders.join(" ")}`,
      ),
    );
  }
  return lines.join("\n");
}
