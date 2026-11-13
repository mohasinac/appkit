/*
 * Payment-method capabilities — and what an UNKNOWN method is assumed to do.
 *
 * Run: npx tsx appkit/scripts/verify-method-capabilities.mts
 *
 * 🛑 WHY THE UNKNOWN CASES ARE MOST OF THIS FILE.
 *
 * The slug is deliberately open, so a method this build has never heard of
 * WILL reach these functions. Each fallback was chosen for what it costs when
 * wrong, and getting one backwards is silent:
 *
 *   · `hasReversibleCapture` wrongly `true`  → a gateway refund fires against
 *     a method with no gateway. It fails somewhere deep, and the system
 *     believes the buyer was paid when they were not.
 *   · `collectsOnDelivery` wrongly `true`    → an order is placed with NOTHING
 *     captured, on a method we cannot describe.
 *   · `bypassesCapture` wrongly `true`       → collection is skipped entirely.
 *     That is the staff-override power, inherited by a typo.
 *
 * So the conservative corner is `false` on all three, and these checks exist
 * to stop someone "simplifying" one of them to a truthier default.
 */

import {
  PAYMENT_METHOD_CAPABILITIES,
  UNKNOWN_METHOD_CAPABILITIES,
  bypassesCapture,
  capabilitiesFor,
  collectsOnDelivery,
  hasReversibleCapture,
  isKnownPaymentMethod,
} from "../src/_internal/shared/payments/method-capabilities";
import { CHECKOUT_PAYMENT_METHODS } from "../src/_internal/shared/features/checkout/config.ts";

let failures = 0;
let checks = 0;
function check(label: string, actual: unknown, expected: unknown): void {
  checks += 1;
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) console.log(`  ok   ${label}`);
  else {
    failures += 1;
    console.log(`  FAIL ${label}\n         expected ${e}\n         actual   ${a}`);
  }
}

console.log("\n── the methods this build knows ──");
check("cod collects on delivery", collectsOnDelivery("cod"), true);
check("cod has NO reversible capture", hasReversibleCapture("cod"), false);
check("cod does not bypass", bypassesCapture("cod"), false);
check("online does not collect on delivery", collectsOnDelivery("online"), false);
check("online HAS reversible capture", hasReversibleCapture("online"), true);
check("razorpay reversible", hasReversibleCapture("razorpay"), true);
check("phonepe reversible", hasReversibleCapture("phonepe"), true);
check("cashfree reversible", hasReversibleCapture("cashfree"), true);
check("admin_bypass bypasses", bypassesCapture("admin_bypass"), true);
check("admin_bypass has no capture to reverse", hasReversibleCapture("admin_bypass"), false);
check("admin_bypass does not collect later either", collectsOnDelivery("admin_bypass"), false);

console.log("\n── 🛑 an UNKNOWN method: conservative on ALL THREE axes ──");
for (const unknown of ["crypto", "store_credit", "", "   ", "COD", "cod ", "bnpl_newco"]) {
  check(`"${unknown}" collectsOnDelivery`, collectsOnDelivery(unknown), unknown.trim() === "cod");
  check(`"${unknown}" hasReversibleCapture`, hasReversibleCapture(unknown), false);
  check(`"${unknown}" bypassesCapture`, bypassesCapture(unknown), false);
}
check("undefined", capabilitiesFor(undefined), UNKNOWN_METHOD_CAPABILITIES);
check("null", capabilitiesFor(null), UNKNOWN_METHOD_CAPABILITIES);
check(
  "a non-string never throws",
  capabilitiesFor(42 as unknown as string),
  UNKNOWN_METHOD_CAPABILITIES,
);

console.log("\n── the fallback profile itself ──");
check("unknown: collectsOnDelivery false", UNKNOWN_METHOD_CAPABILITIES.collectsOnDelivery, false);
check("unknown: hasReversibleCapture false", UNKNOWN_METHOD_CAPABILITIES.hasReversibleCapture, false);
check("unknown: bypassesCapture false", UNKNOWN_METHOD_CAPABILITIES.bypassesCapture, false);
check(
  "🛑 every field is false — the conservative corner, not a mixed default",
  Object.values(UNKNOWN_METHOD_CAPABILITIES).every((v) => v === false),
  true,
);

console.log("\n── whitespace is tolerated, case is NOT ──");
check('" cod " trims to cod', collectsOnDelivery(" cod "), true);
check(
  '🛑 "COD" is NOT cod — slugs are lowercase and silently case-folding would mask a bad write',
  isKnownPaymentMethod("COD"),
  false,
);

console.log("\n── known vs unknown ──");
check("cod is known", isKnownPaymentMethod("cod"), true);
check("crypto is not", isKnownPaymentMethod("crypto"), false);
check("undefined is not", isKnownPaymentMethod(undefined), false);
check(
  "every declared method answers all three without throwing",
  Object.keys(PAYMENT_METHOD_CAPABILITIES).filter((m) => {
    const c = capabilitiesFor(m);
    return typeof c.collectsOnDelivery !== "boolean" ||
      typeof c.hasReversibleCapture !== "boolean" ||
      typeof c.bypassesCapture !== "boolean";
  }),
  [],
);
check(
  "🛑 no method both collects on delivery AND claims reversible capture",
  Object.entries(PAYMENT_METHOD_CAPABILITIES)
    .filter(([, c]) => c.collectsOnDelivery && c.hasReversibleCapture)
    .map(([m]) => m),
  [],
);
check(
  "🛑 no method both bypasses capture AND collects",
  Object.entries(PAYMENT_METHOD_CAPABILITIES)
    .filter(([, c]) => c.bypassesCapture && (c.collectsOnDelivery || c.hasReversibleCapture))
    .map(([m]) => m),
  [],
);

/*
 * ── THE MIGRATED CALL SITES, each asserted as the QUESTION IT ASKS ─────────
 *
 * 🛑 Not a restatement of the table above. Each row below is a real branch,
 * named by what it decides, so that "which capability did that site mean?"
 * has a recorded answer rather than being re-derived from the diff. Getting
 * the mapping wrong is silent — the code compiles either way.
 */
console.log("\n── the migrated branch sites ──");

/** `createOrderForGroup` + the preview mirror: charge the carrier handling fee? */
const chargesHandlingFee = collectsOnDelivery;
check("cod pays a handling fee", chargesHandlingFee("cod"), true);
check("online does not", chargesHandlingFee("online"), false);
check("🛑 an unknown method is charged NOTHING, never a guessed fee", chargesHandlingFee("bnpl"), false);

/** The COD value cap: bounded because nothing was captured. */
const needsUncapturedCap = collectsOnDelivery;
check("cod is capped", needsUncapturedCap("cod"), true);
check(
  "🛑 the cap predicate IS the deposit-split predicate — they must never diverge",
  needsUncapturedCap("bnpl") === chargesHandlingFee("bnpl"),
  true,
);

/** The high-value OTP gate: exempt only what collects at the door. */
const otpExempt = collectsOnDelivery;
check("cod is OTP-exempt", otpExempt("cod"), true);
check("online is NOT exempt", otpExempt("online"), false);
check(
  "🛑 an unknown method is NOT exempt — the gate FIRES, which is more verification not less",
  otpExempt("bnpl"),
  false,
);

/** `bookShipment`: tell the carrier to collect cash. */
const bookAsCod = collectsOnDelivery;
check("cod books isCod", bookAsCod("cod"), true);
check(
  "🛑 an unknown method books PREPAID — never demand money from a buyer who already paid",
  bookAsCod("bnpl"),
  false,
);

/** Phase 1c: resolve a collecting gateway only for a gateway-captured tender. */
const resolvesGateway = hasReversibleCapture;
check("online resolves a collecting gateway", resolvesGateway("online"), true);
check("cod does not — there is no capture to commingle", resolvesGateway("cod"), false);
check("🛑 an unknown method is never handed a gateway", resolvesGateway("bnpl"), false);

/** `assertPaymentMethodAllowed`: exempt the staff override, and never SUGGEST it. */
check("admin_bypass skips the cart gate", bypassesCapture("admin_bypass"), true);
check(
  "🛑 an unknown slug does NOT inherit the staff override — it falls through to the gate",
  bypassesCapture("admin_bypass_"),
  false,
);
/*
 * ── CAPTURE-BYPASSING TENDERS ─────────────────────────────────────────────
 *
 * This used to assert `=== ["admin_bypass"]`, i.e. "exactly ONE method
 * bypasses capture". It FIRED when `no_payment` was added with the ₹0 lane,
 * which is the tripwire working — but the count was never the property worth
 * protecting. Its own message says what is: *"a second would silently become
 * SUGGESTABLE."*
 *
 * 🛑 So assert THAT, executably. `payment-gate.ts` filters bypassers out of the
 * suggestion list (`CHECKOUT_PAYMENT_METHODS.filter(m => !bypassesCapture(m) …)`),
 * and the real invariant is that no capture-bypassing tender is ever offered
 * to a buyer as an alternative. A staff override and a zeroed total are not
 * things to suggest.
 *
 * ⚠ Widening the array to `["admin_bypass", "no_payment"]` would have been the
 * cheap fix and would have left the assertion testing a COUNT — passing
 * happily on the day a third bypasser arrives that IS selectable, which is the
 * exact failure the message describes. The list is now derived, not enumerated.
 */
const bypassers = Object.entries(PAYMENT_METHOD_CAPABILITIES)
  .filter(([, c]) => c.bypassesCapture)
  .map(([m]) => m);

/*
 * ⚠ Asserted as CONCRETE FACTS per method, not as a clever derived expression.
 * A first attempt checked "every bypasser is filtered out of the suggestions"
 * — which is TAUTOLOGICAL, because the filter is the exclusion. A verifier
 * that restates the implementation passes no matter what the implementation
 * does; that is the same defect as a test re-typing the rule it tests.
 *
 * These two can genuinely regress, and each names what breaks:
 */
check(
  "🛑 the two known bypassers are exactly the staff override and the zeroed total",
  bypassers.sort(),
  ["admin_bypass", "no_payment"],
);

check(
  "🛑 `no_payment` is NOT buyer-selectable — it is DERIVED after the gate runs",
  (CHECKOUT_PAYMENT_METHODS as readonly string[]).includes("no_payment"),
  false,
);

/**
 * The order-confirmation email label.
 *
 * 🛑 The regression this locks: the old `cod ? … : "Online Payment"` asserted
 * an online payment for EVERY other method, including unknown ones.
 */
function emailPaymentLabel(method: string | undefined): string {
  return collectsOnDelivery(method)
    ? "Cash on Delivery"
    : hasReversibleCapture(method)
      ? "Online Payment"
      : "Payment";
}
check("cod label", emailPaymentLabel("cod"), "Cash on Delivery");
check("online label", emailPaymentLabel("online"), "Online Payment");
check("razorpay label", emailPaymentLabel("razorpay"), "Online Payment");
check(
  "🛑 an unknown method is NOT called an online payment in a buyer's confirmation",
  emailPaymentLabel("bnpl"),
  "Payment",
);
check("🛑 nor is admin_bypass", emailPaymentLabel("admin_bypass"), "Payment");
check("undefined degrades, never throws", emailPaymentLabel(undefined), "Payment");

console.log(
  `\n${failures === 0 ? "✅" : "🛑"} ${checks - failures}/${checks} checks passed` +
    (failures > 0 ? ` — ${failures} FAILED` : ""),
);
process.exit(failures === 0 ? 0 : 1);
