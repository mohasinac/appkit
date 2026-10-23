/**
 * What each business event posts.
 *
 * ## 🛑 THIS FILE IS THE WHOLE SAFETY ARGUMENT
 *
 * "Every journal entry is machine-generated from a business event" is the
 * one constraint that makes a ledger maintained by a web application
 * trustworthy. If a human has to remember that a gateway fee is
 * `Dr Bank Charges / Cr Bank`, it will eventually be posted backwards — and
 * a backwards entry still balances, so nothing downstream objects. These
 * functions are where that memory lives instead.
 *
 * Pure, and returning a `PostingInput` rather than writing: the caller hands
 * the result to `journalRepository.post`, which is the only thing that
 * touches Firestore and the only thing that checks the period lock. That
 * separation is also what lets `verify-posting-rules` exercise the rules
 * against real order shapes without a database.
 *
 * ## 🛑 Codes are referenced through ACCOUNT, never as bare strings
 *
 * A literal `"2200"` scattered across six rules is six chances to type
 * `"2000"`, and a posting to an account that does not exist is silently
 * dropped from the P&L by `profitAndLoss`'s unknown-account skip. One map,
 * named, so a wrong code is a compile error.
 */

import type { PostingInput } from "./posting";
import type { JournalLine } from "../../../../features/ledger/schemas/firestore";

/** The accounts these rules post to. Codes match `chartOfAccountsSeedData`. */
export const ACCOUNT = {
  BANK: "1100",
  COURIER_FLOAT: "1150",
  GATEWAY_RECEIVABLE: "1200",
  INPUT_GST: "1300",
  SELLER_PAYABLE: "2100",
  OUTPUT_GST: "2200",
  BUYER_DEPOSITS: "2400",
  REFUNDS_PAYABLE: "2500",
  OPENING_EQUITY: "3900",
  COMMISSION_INCOME: "4100",
  SHIPPING_RECOVERED: "4200",
  ADDON_INCOME: "4300",
  GATEWAY_CHARGES: "5100",
  FREIGHT_PAID: "5200",
} as const;

/** Drop legs that rounded to nothing, so a zero fee does not fail `assertBalanced`. */
function compact(lines: JournalLine[]): JournalLine[] {
  return lines.filter((l) => (l.debit ?? 0) !== 0 || (l.credit ?? 0) !== 0);
}

const r2 = (n: number) => Math.round((n ?? 0) * 100) / 100;

export interface OrderPostingInput {
  orderId: string;
  storeId: string;
  placedAt: Date;
  /** What the buyer paid in total, GST included. */
  totalPrice: number;
  /** Product GST inside `totalPrice`. */
  gstAmount?: number;
  /** Our commission, and the GST we charge on it. */
  platformFee?: number;
  platformFeeGst?: number;
  /** What the buyer paid for delivery, inside `totalPrice`. */
  shippingFee?: number;
  /** Gift wrap, protection, WhatsApp — inside `totalPrice`. */
  addonFees?: number;
}

/**
 * A paid order.
 *
 * 🛑 **The seller payable is the RESIDUAL, not a computed share.** Everything
 * the platform keeps is recognised explicitly — commission, its GST, the
 * shipping the buyer paid, add-ons, and output GST — and what remains is what
 * the seller is owed. Computing the seller's share independently and letting
 * the two meet in the middle is how a rounding difference becomes an
 * unbalanced entry that `assertBalanced` then refuses at checkout, turning a
 * half-paisa into a failed order.
 *
 * 🛑 **Output GST is a LIABILITY, which is the entire point of the exercise.**
 * `revenueRollup.totalRevenue` sums `order.totalPrice`, so today's "revenue"
 * includes tax owed to the government and freight owed to a courier. Crediting
 * 2200 here is what separates turnover from takings for the first time.
 *
 * 🛑 The debit is to GATEWAY RECEIVABLE, not Bank. Money captured is not
 * money arrived — the settlement lands days later, net of MDR, and
 * `settlementPosting` is what clears this account. Debiting Bank here would
 * overstate cash by the whole float for the length of the settlement cycle.
 */
export function orderPlacedPosting(o: OrderPostingInput): PostingInput {
  const commission = r2(o.platformFee ?? 0);
  const commissionGst = r2(o.platformFeeGst ?? 0);
  const shipping = r2(o.shippingFee ?? 0);
  const addons = r2(o.addonFees ?? 0);
  const outputGst = r2((o.gstAmount ?? 0) + commissionGst);
  const sellerPayable = r2(
    o.totalPrice - commission - commissionGst - shipping - addons - (o.gstAmount ?? 0),
  );

  return {
    entryDate: o.placedAt,
    sourceEvent: "order-placed",
    sourceId: o.orderId,
    narration: `Order ${o.orderId}`,
    lines: compact([
      { accountCode: ACCOUNT.GATEWAY_RECEIVABLE, debit: r2(o.totalPrice), credit: 0, memo: "Captured, awaiting settlement" },
      { accountCode: ACCOUNT.SELLER_PAYABLE, debit: 0, credit: sellerPayable, counterpartyId: o.storeId, memo: "Owed to the seller" },
      { accountCode: ACCOUNT.OUTPUT_GST, debit: 0, credit: outputGst, memo: "Tax collected, owed to the government" },
      { accountCode: ACCOUNT.COMMISSION_INCOME, debit: 0, credit: commission },
      { accountCode: ACCOUNT.SHIPPING_RECOVERED, debit: 0, credit: shipping },
      { accountCode: ACCOUNT.ADDON_INCOME, debit: 0, credit: addons },
    ]),
  };
}

export interface SettlementPostingInput {
  settlementId: string;
  settledAt: Date;
  /** Gross captured in this settlement, matching what was debited to 1200. */
  gross: number;
  /** The gateway's real MDR for it. */
  fee: number;
  /** GST on that fee — an INPUT credit, not a cost. */
  feeGst: number;
}

/**
 * A gateway settlement arriving in the bank.
 *
 * 🛑 `fee` here is the gateway's REAL charge from the settlement report, and
 * it is NOT `PayoutDocument.gatewayFee` — that field is our own withholding
 * against a seller's gross, a different number with a different meaning.
 * Posting one as the other overstates our costs and understates what we
 * withheld, in opposite directions, so the error compounds.
 *
 * 🛑 The GST on the fee is an ASSET (input credit), not an expense. Nothing
 * in this codebase could receive input tax before Part 4, so this was simply
 * unrecoverable — which is money, every month, that was never claimable.
 */
export function settlementPosting(s: SettlementPostingInput): PostingInput {
  const net = r2(s.gross - s.fee - s.feeGst);
  return {
    entryDate: s.settledAt,
    sourceEvent: "settlement-ingest",
    sourceId: s.settlementId,
    narration: `Settlement ${s.settlementId}`,
    lines: compact([
      { accountCode: ACCOUNT.BANK, debit: net, credit: 0 },
      { accountCode: ACCOUNT.GATEWAY_CHARGES, debit: r2(s.fee), credit: 0, memo: "MDR from the settlement report" },
      { accountCode: ACCOUNT.INPUT_GST, debit: r2(s.feeGst), credit: 0, memo: "ITC on the gateway fee" },
      { accountCode: ACCOUNT.GATEWAY_RECEIVABLE, debit: 0, credit: r2(s.gross) },
    ]),
  };
}

export interface PayoutPostingInput {
  payoutId: string;
  storeId: string;
  paidAt: Date;
  amount: number;
}

/**
 * Paying a seller.
 *
 * Clears the payable raised at order time against real cash. Two legs and no
 * income or expense — paying a debt is not a cost, and treating it as one
 * double-counts every sale.
 */
export function payoutPosting(p: PayoutPostingInput): PostingInput {
  return {
    entryDate: p.paidAt,
    sourceEvent: "payout-paid",
    sourceId: p.payoutId,
    narration: `Payout ${p.payoutId} to ${p.storeId}`,
    lines: [
      { accountCode: ACCOUNT.SELLER_PAYABLE, debit: r2(p.amount), credit: 0, counterpartyId: p.storeId },
      { accountCode: ACCOUNT.BANK, debit: 0, credit: r2(p.amount) },
    ],
  };
}

export interface RefundPostingInput {
  orderId: string;
  refundId: string;
  refundedAt: Date;
  amount: number;
  /** The product GST inside the refunded amount, which is reclaimable. */
  gstAmount?: number;
}

/**
 * A refund.
 *
 * 🛑 **A refund is NOT a negative sale, and that distinction is why the top
 * line is currently wrong.** `revenueRollup` removes a fully-refunded order
 * from its sum entirely and does not reduce it at all for a partial — so
 * revenue silently rewrites itself retroactively, and no two runs of the same
 * report over the same period agree.
 *
 * Here it is its own event with its own date: the sale stays in the month it
 * happened, the refund lands in the month it happened, and both are visible.
 *
 * 🛑 It DEBITS output GST, reclaiming tax already declared. Omitting that leg
 * means paying GST on money that was given back.
 */
export function refundPosting(r: RefundPostingInput): PostingInput {
  const gst = r2(r.gstAmount ?? 0);
  return {
    entryDate: r.refundedAt,
    sourceEvent: "order-refunded",
    sourceId: r.refundId,
    narration: `Refund ${r.refundId} on order ${r.orderId}`,
    lines: compact([
      { accountCode: ACCOUNT.COMMISSION_INCOME, debit: r2(r.amount - gst), credit: 0, memo: "Sale reversed" },
      { accountCode: ACCOUNT.OUTPUT_GST, debit: gst, credit: 0, memo: "Tax reclaimed on the refunded amount" },
      { accountCode: ACCOUNT.REFUNDS_PAYABLE, debit: 0, credit: r2(r.amount) },
    ]),
  };
}
