/**
 * verify-payment-prose — EXECUTES the payment-prose axis and asserts its
 * answers.
 *
 * ## Why this exists rather than a review
 *
 * This project's own acceptance rule: *"every resolver is EXECUTED in a test
 * and its `reason`/`source` asserted — never 'a caller exists'. Three unwired
 * resolvers were found exactly this way, and none would have been found by
 * review."* `resolvePaymentMethod` shipped with the full precedence and ZERO
 * callers; `persistCartEmiPlan` was wired to a route that had been deleted
 * beneath it. A green typecheck proves a thing COMPILES, never that it RUNS.
 *
 * ## What it is guarding
 *
 * `isOnlinePaymentEnabled`'s default is **inverted** relative to every other
 * flag in `feature-flags.ts`, deliberately, because this flag selects a
 * SENTENCE in a legal policy rather than granting a capability:
 *
 *   absent -> assume ONLINE   = over-disclosure. Harmless.
 *   absent -> assume COD-ONLY = a policy claiming "we never store card
 *                               details" on a store taking cards. A FAILURE
 *                               TO DISCLOSE, on the money path.
 *
 * That asymmetry is the single thing most likely to be "tidied" into
 * consistency with its neighbours by a later reader, which is exactly what
 * these cases stop.
 *
 * Run:  npx tsx scripts/verify-payment-prose.mts
 * Exits non-zero on any failure.
 */
import {
  isOnlinePaymentEnabled,
  type FeatureFlagSnapshot,
} from "../src/_internal/shared/listing-types/feature-flags";
import {
  isContentVisible,
  type ContentTag,
} from "../src/_internal/shared/features/content-tags/registry";

let fail = 0;
function check(name: string, actual: unknown, expected: unknown): void {
  const ok = actual === expected;
  if (!ok) fail += 1;
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${name.padEnd(64)} got ${JSON.stringify(actual)}`);
}

const ONLINE: ContentTag[] = [{ governs: "paymentMethod", value: "online" }];
const ALL_OFF: FeatureFlagSnapshot = {
  payment: { razorpayEnabled: false, phonepeEnabled: false, cashfreeEnabled: false },
};

console.log("\nisOnlinePaymentEnabled — the INVERTED default");
check("absent snapshot  -> true (disclose MORE, never less)", isOnlinePaymentEnabled(undefined), true);
check("null snapshot    -> true", isOnlinePaymentEnabled(null), true);
check("no payment group -> true", isOnlinePaymentEnabled({}), true);
check("explicit all-false -> false (a read that SUCCEEDED and said COD-only)", isOnlinePaymentEnabled(ALL_OFF), false);
check("razorpay on -> true", isOnlinePaymentEnabled({ payment: { razorpayEnabled: true } }), true);
check("phonepe on  -> true", isOnlinePaymentEnabled({ payment: { phonepeEnabled: true } }), true);
check("cashfree on -> true", isOnlinePaymentEnabled({ payment: { cashfreeEnabled: true } }), true);
check(
  "cod on + every gateway off -> false (COD is not an ONLINE method)",
  isOnlinePaymentEnabled({ payment: { ...ALL_OFF.payment, codEnabled: true } }),
  false,
);

console.log("\nisContentVisible — the clause carrying the COD-only wording");
check(
  "gateway live -> clause VISIBLE, so its `text` arm publishes",
  isContentVisible(ONLINE, { payment: { razorpayEnabled: true } }),
  true,
);
check(
  "COD-only     -> clause HIDDEN, so its `whenHidden` arm publishes",
  isContentVisible(ONLINE, ALL_OFF),
  false,
);
check("untagged content stays visible", isContentVisible(undefined, null), true);

console.log("\nthe fail-CLOSED default (was `return true`)");
check(
  "unhandled `governs` member -> false, never silently visible",
  isContentVisible([{ governs: "somethingNew" as ContentTag["governs"], value: "x" }], null),
  false,
);

console.log(`\n${fail === 0 ? "✅ all passed" : `🛑 ${fail} FAILED`}`);
process.exit(fail === 0 ? 0 : 1);
