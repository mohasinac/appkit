/**
 * Plain-language derivations for every fee line a buyer is shown.
 *
 * 🛑 The problem this solves is not presentation. The Order Summary listed
 * `EMI surcharge ₹2,133.00`, `Platform fee ₹10.00` and `GST on platform fee
 * ₹1.80` beside a `₹39,500.00` subtotal, and **none of the three could be
 * checked by the person paying them.** ₹2,133 on ₹39,500 is 5.4% — a buyer has
 * no way to tell whether that is a rate, a tenure, a rounding error or a bug,
 * and the only honest response to an unexplained charge is to distrust it.
 *
 * ── Why the STRINGS live here and not in the component ────────────────────
 *
 * Each sentence is a claim about how a number was computed, and the number is
 * computed in `calculator.ts` / `emi/schedule.ts`. Putting the sentence beside
 * a `<Line>` would make it a second, prose implementation of the same rule —
 * free to drift the moment a cap moves (Root Cause #75: a rule reachable by
 * copy-paste gets copied, and the copy never learns about the branch added
 * later). These functions read the SAME rate fields the calculators read.
 *
 * ── Why they take the CHARGED amount as an argument ───────────────────────
 *
 * They explain the figure actually on screen; they do not recompute it. If a
 * derivation and the rendered amount ever disagree, the explanation must say
 * so rather than quietly print a second, prettier number — so each function
 * ends at the charged value and describes the route to it.
 *
 * 🛑 NOTHING HERE MAY NAME A SELLER-SIDE RATE. `surchargeSellerSharePercent`
 * (the platform/seller split of the EMI surcharge), `gatewayFeePercent`,
 * `payoutHoldDays` and `minPayoutAmount` are `PRIVATE_*_FIELDS`
 * (Root Cause #70). The EMI functions below are typed against
 * `BuyerEmiSettings`, which excludes the split structurally — so the omission
 * is enforced by `tsc`, not by this paragraph.
 */
import type { BuyerEmiSettings, BuyerFacingFees } from "../features/site-settings/fees";
import type { BuyerEmiQuote } from "../features/emi/schedule";
import { formatCurrency } from "../../../utils/number.formatter";
import type { PlatformFeeLine } from "./calculator";

/** One rendered explanation: a short claim plus the steps behind it. */
export interface FeeDerivation {
  /** One sentence answering "why am I paying this". */
  summary: string;
  /** The arithmetic, one step per line, in the order it is applied. */
  steps: string[];
}

/** `2` → `"2%"`, `2.5` → `"2.5%"` — no trailing `.0`. */
function pct(value: number): string {
  return `${Number(value.toFixed(2))}%`;
}

/**
 * The platform fee — a TAPERED per-unit rate, summed per cart line.
 *
 * 🛑 REWRITTEN TWICE on 2026-11-08, with the model it explains. It first
 * described a percentage of the subtotal capped at ₹10, then a flat ₹10 per
 * unit; the charge is now `Σ over lines ( taperedRate(units) × units )`.
 * Leaving either version behind would have been the precise defect this
 * module's own header warns about — "a second, prose implementation of the same
 * rule, free to drift" — except worse, because the drifted version is shown to
 * the person paying.
 *
 * 🛑 TAKES THE SERVER'S PER-LINE DERIVATION, and does not recompute it.
 * Under a flat rate a renderer could honestly re-derive "count × rate"; under a
 * taper it would have to re-implement the band lookup, in a browser, where a
 * disagreement with the charge is invisible until someone adds up the invoice.
 * So `lines` comes from `CheckoutFees.lines` — the same array the money was
 * summed from — and this function only formats it.
 *
 * The derivation stays checkable in one reading: each line shows its quantity,
 * the rate that quantity earned, and the product.
 */
export function explainPlatformFee(
  lines: readonly PlatformFeeLine[],
  charged: number,
  fees: BuyerFacingFees | null,
  currency = "INR",
): FeeDerivation | null {
  if (!fees) return null;
  const money = (v: number) => formatCurrency(v, currency);
  const billable = lines.filter((l) => l.units > 0);
  if (billable.length === 0) return null;

  const base = billable.reduce((sum, l) => sum + l.amount, 0);
  const rates = new Set(billable.map((l) => l.ratePerUnit));
  const topRate = Math.max(...billable.map((l) => l.ratePerUnit));
  const tapered = rates.size > 1 || billable.some((l) => l.ratePerUnit < topRate);

  const steps: string[] = billable.map((l) =>
    l.units === 1
      ? `${money(l.ratePerUnit)} for 1 item = ${money(l.amount)}`
      : `${money(l.ratePerUnit)} × ${l.units} = ${money(l.amount)}`,
  );
  if (billable.length > 1) steps.push(`Items together = ${money(base)}`);

  /*
   * The floor is defined on `platformFee + gstOnFee` COMBINED and is applied
   * once, inside `allocateCheckoutFees`, as extra platform fee with no GST of
   * its own. So it is mentioned here and never on the GST line — see the D41
   * note in `calculator.ts`.
   */
  if (fees.minimumTransactionFee !== undefined && charged > base) {
    steps.push(
      `Raised to meet the ${money(fees.minimumTransactionFee)} minimum transaction fee, which covers the fee and its GST together`,
    );
  }

  steps.push(`You pay ${money(charged)}`);

  const cheapest = Math.min(...billable.map((l) => l.ratePerUnit));
  return {
    summary: tapered
      ? `Our platform fee is per item, and it drops the more of one item you buy — down to ${money(cheapest)} each on this order.`
      : `Our platform fee is ${money(topRate)} per item, and it drops the more of one item you buy.`,
    steps,
  };
}

/**
 * GST on the commission.
 *
 * 🛑 Levied on the commission ACTUALLY CHARGED, never on the uncapped figure —
 * which is the one thing a buyer checking ₹1.80 against a ₹39,500 subtotal
 * would get wrong.
 */
export function explainGstOnPlatformFee(
  platformFee: number,
  charged: number,
  fees: BuyerFacingFees | null,
  currency = "INR",
): FeeDerivation | null {
  if (!fees || fees.gstPercent === undefined) return null;
  const money = (v: number) => formatCurrency(v, currency);
  return {
    summary: `GST at ${pct(fees.gstPercent)}, charged on our commission — not on the price of the items.`,
    steps: [
      `${pct(fees.gstPercent)} of the ${money(platformFee)} commission = ${money(charged)}`,
      "Item prices already include their own GST, shown below the total",
    ],
  };
}

/**
 * The EMI surcharge — the cost of credit, stated as a cost of credit.
 *
 * 🛑 Takes a `BuyerEmiQuote`, which is `computeBuyerEmiQuote`'s return type and
 * carries no surcharge split. `computeEmiSchedule`'s richer result is
 * assignable to it, so the type does not stop a server caller passing the
 * wrong one — but nothing here reads a field that only exists on the wider
 * shape, so no split can be printed either.
 */
export function explainEmiSurcharge(
  sellerSubtotal: number,
  tenureMonths: number,
  quote: BuyerEmiQuote,
  emi: BuyerEmiSettings | null,
  currency = "INR",
): FeeDerivation | null {
  if (!emi) return null;
  const money = (v: number) => formatCurrency(v, currency);
  const principal = sellerSubtotal - quote.tokenAmount;
  const perMonth = quote.installments[0]?.amount ?? 0;

  return {
    summary: `Spreading ${money(sellerSubtotal)} over ${tenureMonths} months costs ${money(
      quote.surchargeAmount,
    )} — that is the total cost of credit.`,
    steps: [
      `Token paid today: ${pct(emi.tokenPercent)} of ${money(sellerSubtotal)} = ${money(quote.tokenAmount)}`,
      `Financed amount: ${money(sellerSubtotal)} − ${money(quote.tokenAmount)} = ${money(principal)}`,
      `Surcharge: ${pct(emi.surchargePercentPerMonth)} of ${money(principal)} per month × ${tenureMonths} months = ${money(quote.surchargeAmount)}`,
      `Repaid over ${tenureMonths} instalments of about ${money(perMonth)}, due on day ${emi.billingDay} of each month`,
      `Total you will pay: ${money(quote.tokenAmount)} + ${money(quote.remainingBalance)} = ${money(
        quote.tokenAmount + quote.remainingBalance,
      )}`,
    ],
  };
}

/** COD handling — a cap that bites on most carts, same shape as the commission. */
export function explainCodHandlingFee(
  subtotal: number,
  charged: number,
  fees: BuyerFacingFees | null,
  currency = "INR",
): FeeDerivation | null {
  if (!fees || fees.codHandlingFeePercent === undefined) return null;
  const money = (v: number) => formatCurrency(v, currency);
  const uncapped = (subtotal * fees.codHandlingFeePercent) / 100;
  const steps = [`${pct(fees.codHandlingFeePercent)} of ${money(subtotal)} = ${money(uncapped)}`];
  if (fees.codHandlingFeeCap !== undefined && uncapped > fees.codHandlingFeeCap) {
    steps.push(`Capped at ${money(fees.codHandlingFeeCap)}`);
  }
  steps.push(`You pay ${money(charged)}`);
  return {
    summary: "What it costs us to collect cash at your door and bank it.",
    steps,
  };
}

/**
 * Every derivation a price breakdown can render, keyed by the line it belongs
 * to. A key with no entry simply renders no disclosure — a line we cannot
 * explain says nothing rather than guessing.
 */
export interface FeeDerivations {
  platformFee?: FeeDerivation | null;
  gstOnFee?: FeeDerivation | null;
  emiSurcharge?: FeeDerivation | null;
  codHandlingFee?: FeeDerivation | null;
}
