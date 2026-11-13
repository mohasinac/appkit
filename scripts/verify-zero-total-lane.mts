/**
 * verify-zero-total-lane — an order with nothing left to collect is CONFIRMED,
 * and a COD order is never mistaken for one.
 *
 * 🛑 WHY THIS LANE EXISTS. `amountDue` derives from
 * `max(0, total − pointsApplied)` and then from the coupon term, so zero is
 * reachable — a prize coupon, or a 100%-off code on a cart with no fees.
 * Nothing handled it: `order_amount: 0` went to Cashfree, which rejects it,
 * so the buyer's failure arrived from a third party mid-checkout.
 *
 * The codebase already knew. `POINTS_MAX_REDEMPTION_PERCENT = 50` says at the
 * line: *"a ₹0 Razorpay order is not a thing, makes COD meaningless … a
 * ceiling keeps every order a real transaction."* That ceiling made zero
 * unreachable VIA POINTS and coupons never got the same treatment.
 *
 * 🛑🛑 THE COD EXCLUSION IS THE DANGEROUS HALF, and it is the reason this file
 * exists rather than a comment. For a cash-like method `amountDue` is only the
 * DEPOSIT — the balance rides on `codRemainingAmount` and is collected by a
 * courier days later. A COD order with a zero deposit owes exactly as much as
 * before. Treating "due now = 0" as "paid in full" would mark an UNPAID order
 * PAID and tell the courier to collect nothing: the platform would ship goods
 * and never be paid for them.
 *
 * Run: npx tsx appkit/scripts/verify-zero-total-lane.mts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

let fail = 0;
const check = (ok: boolean, label: string, detail = "") => {
  if (!ok) fail += 1;
  console.log(`  ${ok ? "✅" : "🛑"} ${label}${detail ? `  — ${detail}` : ""}`);
};

/*
 * The predicate, lifted verbatim from the source so the test cannot drift from
 * the shipped expression. Asserted below AND executed.
 */
const SRC = join(
  import.meta.dirname, "..", "src", "_internal", "server", "features", "checkout", "actions.ts",
);
const src = readFileSync(SRC, "utf8");

const expr = /const nothingToCollect =\s*([\s\S]{0,220}?);/.exec(src)?.[1]?.trim() ?? "";
check(expr.length > 0, "the `nothingToCollect` predicate exists");

console.log("\n  ── the predicate's four terms, each load-bearing ──\n");
check(/!adminBypass/.test(expr), "excludes adminBypass", "that lane has its own method and actor");
check(/!isCodLike/.test(expr), "excludes COD", "🛑 a COD deposit of 0 still owes the full balance");
check(/amountDueOnOrder <= 0/.test(expr), "uses the SERVER's computed amount");
check(/codRemainingAmount \?\? 0\) <= 0/.test(expr), "also requires no remaining balance", "belt and braces — either term alone can be wrong");
check(!/req\.|body\.|input\./.test(expr), "reads nothing a client can send");

/*
 * 🛑 EXECUTED FROM THE SOURCE EXPRESSION ITSELF, not a copy of it.
 *
 * The first version of this file hand-wrote the predicate a second time and
 * ran the cases against that copy. Proven inadequate by sabotage: deleting
 * `!isCodLike` from the real code left EVERY executed case green — a COD order
 * with a zero deposit still "passed" its own test — because the copy still had
 * the term. Only the source-text assertion went red.
 *
 * That is the duplicate-vocabulary defect this codebase keeps closing, wearing
 * a test's clothes: two statements of one rule, drifting the moment one is
 * edited. The expression is now compiled from the shipped text, so a change to
 * the code changes the test by construction and the two cannot disagree.
 */
const fn = new Function(
  "adminBypass", "isCodLike", "amountDueOnOrder", "codRemainingAmount",
  `return ${expr};`,
) as (a: boolean, c: boolean, d: number, r?: number) => boolean;
const nothingToCollect = (
  adminBypass: boolean, isCodLike: boolean, amountDueOnOrder: number, codRemainingAmount?: number,
) => fn(adminBypass, isCodLike, amountDueOnOrder, codRemainingAmount);

console.log("\n  ── executed ──\n");
const cases: Array<[string, boolean, string]> = [
  ["a fully-covered prepaid order → CONFIRMED", nothingToCollect(false, false, 0), "the lane's whole purpose"],
  ["an ordinary paid order → normal lane", !nothingToCollect(false, false, 10799), ""],
  ["🛑 COD with a ZERO deposit → NOT confirmed", !nothingToCollect(false, true, 0, 10799), "the courier still collects ₹10,799"],
  ["🛑 COD with zero deposit AND zero balance → still NOT confirmed", !nothingToCollect(false, true, 0, 0), "method alone disqualifies it"],
  ["prepaid, zero due, but a stray balance → NOT confirmed", !nothingToCollect(false, false, 0, 500), "the second term catches it"],
  ["adminBypass stays its own lane", !nothingToCollect(true, false, 0), "keeps its actor and audit trail"],
  ["a NEGATIVE amount → treated as nothing to collect", nothingToCollect(false, false, -1), "<= 0, never === 0"],
];
for (const [label, ok, detail] of cases) check(ok, label, detail);

console.log("\n  ── the order records WHY it was free ──\n");
check(
  /NO_PAYMENT: "no_payment"/.test(
    readFileSync(join(import.meta.dirname, "..", "src", "features", "orders", "schemas", "firestore.ts"), "utf8"),
  ),
  "`no_payment` is a distinct PaymentMethod",
  "collapsing it into online/admin_bypass destroys the only record of why",
);
check(
  /nothingToCollect\s*\?\s*PaymentMethodValues\.NO_PAYMENT/.test(src),
  "the order is stamped with it",
  "a method nothing writes is the declared-but-unwired shape",
);
check(
  /adminBypass \|\| nothingToCollect\s*\?\s*PaymentStatusValues\.PAID/.test(src),
  "paymentStatus is PAID, not PENDING",
  "an order with nothing to collect can never leave PENDING on its own",
);

/*
 * 🛑 THE CROSS-CHECK: `no_payment` must not be cash-like.
 *
 * The lane's own guard is `!isCodLike`, i.e. `collectsOnDelivery(method)`. If
 * `no_payment` ever resolved `true` there, the lane would EXCLUDE the very
 * orders it exists for and they would sit PENDING forever, waiting for a
 * courier with nothing to collect. Two pieces of one feature read the same
 * function; this asserts they cannot disagree.
 *
 * Executed against the real capability table, not asserted from its source.
 */
console.log("\n  ── the method's own capabilities ──\n");
{
  const { collectsOnDelivery, hasReversibleCapture, bypassesCapture } = await import(
    "../src/_internal/shared/payments/method-capabilities.ts"
  );
  check(collectsOnDelivery("no_payment") === false, "no_payment does NOT collect on delivery", "or the lane excludes its own orders");
  check(collectsOnDelivery("cod") === true, "cod still does — control", "proves the function is really being read");
  check(
    hasReversibleCapture("no_payment") === false,
    "nothing to reverse — a refund is a human-settled owed case",
    "firing a gateway refund against a capture that never happened fails deep",
  );
  check(
    bypassesCapture("no_payment") === true,
    "it bypasses capture, like admin_bypass",
    "the UNKNOWN fallback says `false` — 'something took money we cannot return', which is FALSE here",
  );
}

/* 🛑 And the gateway must still refuse zero, or the lane is bypassable. */
const route = readFileSync(
  join(import.meta.dirname, "..", "..", "src", "app", "api", "payment", "create-order", "route.ts"), "utf8",
);
check(
  /amountInPaise <= 0/.test(route),
  "the payment route still refuses a zero capture",
  "the lane routes AROUND the gateway; it must never route INTO it with 0",
);

console.log(`\n${fail === 0 ? "✅ the zero-total lane holds, and COD is not caught by it" : `🛑 ${fail} failure(s)`}`);
process.exit(fail === 0 ? 0 : 1);
