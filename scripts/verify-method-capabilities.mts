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

console.log(
  `\n${failures === 0 ? "✅" : "🛑"} ${checks - failures}/${checks} checks passed` +
    (failures > 0 ? ` — ${failures} FAILED` : ""),
);
process.exit(failures === 0 ? 0 : 1);
