/*
 * WHY: Part 4's chart of accounts. A standard Indian small-business chart,
 *      named so a CA can map it to Tally at a glance — explicitly NOT a Tally
 *      import, and not a general-purpose chart. Every account here exists
 *      because some posting rule in this codebase needs it; an account with
 *      no rule behind it is the speculative-infra pattern.
 *
 * WHAT: 25 ChartAccountDocument partials.
 *
 * 🛑 `seedPurpose: "permanent"`. Clearing this collection does not just lose
 *     fixtures — it orphans every `journalEntries.lines[].accountCode`, and
 *     a journal line pointing at a code with no account is an entry no report
 *     can classify. Same argument as `mediaAssets`, where a wipe left 504
 *     objects in the bucket that nothing could resolve.
 *
 * EXPORTS:
 *   chartOfAccountsSeedData
 *
 * @tag domain:ledger,finance
 * @tag layer:seed
 * @tag access:server
 */

import type { ChartAccountDocument } from "../features/ledger/schemas/firestore";

type Row = Pick<ChartAccountDocument, "id" | "code" | "name" | "type" | "isActive"> &
  Partial<Pick<ChartAccountDocument, "description">>;

const account = (
  code: string,
  name: string,
  type: ChartAccountDocument["type"],
  description?: string,
): Row => ({
  id: `account-${code}`,
  code,
  name,
  type,
  isActive: true,
  ...(description ? { description } : {}),
});

/**
 * 🛑 The ranges are a CONVENTION FOR HUMANS and nothing derives from them.
 *
 * 1xxx asset · 2xxx liability · 3xxx equity · 4xxx income · 5xxx expense is
 * what a CA expects to see, which is the entire reason for numeric codes
 * rather than slugs. But `type` is declared on every row explicitly: a
 * derivation from the range would make the first account added outside it
 * silently misclassified, and a misclassified account is a balance sheet
 * that does not balance for a reason nobody can find.
 */
export const chartOfAccountsSeedData: Row[] = [
  // ── 1xxx Assets ─────────────────────────────────────────────────────────
  account("1100", "Bank", "asset", "The operating current account."),
  account(
    "1150",
    "Courier float",
    "asset",
    "Prepaid balance with the shipping provider. A booking draws this down; a top-up restores it. This is the account `bookShipment`'s wallet check is about.",
  ),
  account(
    "1200",
    "Payment gateway receivable",
    "asset",
    "Captured but not yet settled to the bank. The gap between a buyer paying and the money arriving is real and is days long; without this account that money is invisible.",
  ),
  account(
    "1300",
    "Input GST (ITC)",
    "asset",
    "🛑 Input tax is an ASSET, not a cost. Nothing in this codebase could receive input tax before Part 4, so ITC was simply unrecoverable — this account is what makes it trackable.",
  ),
  account("1400", "Inventory", "asset", "Goods held, at cost."),
  account(
    "1500",
    "Fixed assets",
    "asset",
    "🛑 Purchase only; depreciation is the CA's. An ₹80,000 camera posted here lands whole in one month, so any monthly P&L must label that or the month reads as a bad trading month.",
  ),
  account("1600", "Advances to suppliers", "asset", "Paid before goods landed."),

  // ── 2xxx Liabilities ────────────────────────────────────────────────────
  account(
    "2100",
    "Seller payable",
    "liability",
    "What is owed to stores for goods sold but not yet paid out. Carries `counterpartyId` per leg, which is what makes a per-seller ageing possible without a ledger per store.",
  ),
  account(
    "2200",
    "Output GST payable",
    "liability",
    "🛑 THE account that makes a correct top line possible. `revenueRollup.totalRevenue` sums `order.totalPrice`, so it counts GST we owe to the government as revenue. Splitting it out here is what separates turnover from takings.",
  ),
  account("2250", "TCS payable", "liability", "Tax collected at source under s.52, owed to the government."),
  account("2300", "Accounts payable", "liability", "Vendor bills received and unpaid."),
  account(
    "2400",
    "Buyer deposits",
    "liability",
    "Pre-order deposits and COD tokens. Money held against goods not yet delivered is a liability, not income — recognising it as revenue is how a cancellation turns into a hole.",
  ),
  account(
    "2500",
    "Refunds payable",
    "liability",
    "Approved and not yet paid. Without it a refund only appears when the cash leaves, so the books understate what is owed for exactly as long as it matters.",
  ),

  // ── 3xxx Equity ─────────────────────────────────────────────────────────
  account("3100", "Owner's capital", "equity"),
  account(
    "3900",
    "Opening balance equity",
    "equity",
    "🛑 The contra for every cutover balance, and it must net to zero once the opening entry is complete. A non-zero balance here after cutover means an opening figure was entered with no counterpart — which is the single most likely cutover error.",
  ),
  account("3950", "Retained earnings", "equity"),

  // ── 4xxx Income ─────────────────────────────────────────────────────────
  account("4100", "Commission income", "income", "The platform's own take."),
  account(
    "4200",
    "Shipping recovered",
    "income",
    "What the buyer paid for delivery. Separate from freight paid out (5200) deliberately: netting them hides whether shipping runs at a loss, which on a collectibles marketplace it frequently does.",
  ),
  account("4300", "Add-on income", "income", "Gift wrap, shipment protection, WhatsApp updates."),
  account("4400", "Listing and promotion fees", "income", "Featured slots and ad bookings (D56)."),
  account("4900", "Other income", "income"),

  // ── 5xxx Expenses ───────────────────────────────────────────────────────
  account(
    "5100",
    "Gateway charges",
    "expense",
    "🛑 The REAL MDR from the settlement report, not `PayoutDocument.gatewayFee` — that field is our own withholding against a seller's gross, which is a different number and not a cost to us.",
  ),
  account("5200", "Freight paid", "expense", "What the courier actually charged."),
  account("5300", "Cost of goods sold", "expense"),
  account("5400", "Wages", "expense"),
  account("5500", "Platform and software", "expense", "Vercel, Firebase, Resend."),
  account("5900", "Other expenses", "expense"),
];
