/*
 * WHO PAYS for a return — is it published, and does it follow the config?
 *
 * Run: npx tsx appkit/scripts/verify-return-cost-disclosure.mts
 *
 * 🛑 WHY THIS EXISTS.
 *
 * `siteSettings.returns.bornBy` carried its own instruction in the schema —
 * *"Must be DISCLOSED before purchase"* — and had ZERO readers: the schema,
 * two seeds, nothing else. A requirement written down and not met is this
 * project's recurring defect class, and it was shipped by the lane that added
 * the field.
 *
 * So the acceptance test is not "does a disclaimer exist". It is:
 *   1. the published phrase FOLLOWS the setting, both ways;
 *   2. the fallback MATCHES the schema's own default, because a
 *      disclosed-but-wrong policy is worse than none — it is the one a buyer
 *      relies on;
 *   3. an unrecognised value degrades to the default rather than publishing a
 *      bare enum member as legal copy;
 *   4. the disclaimer names the FAILED-DELIVERY case, which is where this
 *      actually bites and the one a buyer has never considered.
 */

import {
  resolvePublishedValues,
  resolvePublishedCopy,
} from "../src/_internal/shared/content/published-values";
import { DISCLAIMERS } from "../src/_internal/shared/content/disclaimers";

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

console.log("\n── the token follows the setting ──");
check(
  'bornBy "buyer" publishes "the buyer"',
  resolvePublishedValues({ returnsBornBy: "buyer" }).returnCostBornBy,
  "the buyer",
);
check(
  'bornBy "seller" publishes "the seller"',
  resolvePublishedValues({ returnsBornBy: "seller" }).returnCostBornBy,
  "the seller",
);
check(
  "🛑 ABSENT publishes the SCHEMA'S default (buyer), not an empty string",
  resolvePublishedValues().returnCostBornBy,
  "the buyer",
);
check(
  "⚠ an unrecognised value from a newer deploy degrades to the default",
  resolvePublishedValues({ returnsBornBy: "platform" as never }).returnCostBornBy,
  "the buyer",
);
check(
  "🛑 and never publishes the raw slug as legal copy",
  /buyer|seller/.test(resolvePublishedValues({ returnsBornBy: "seller" }).returnCostBornBy) &&
    !resolvePublishedValues({ returnsBornBy: "seller" }).returnCostBornBy.includes("bornBy"),
  true,
);

console.log("\n── the disclaimer itself ──");
const entry = DISCLAIMERS["return-cost"];
check("it exists", typeof entry?.body, "string");
check("it carries the token", entry.body.includes("{{returnCostBornBy}}"), true);
check(
  "🛑 it names the FAILED-DELIVERY case — 'returns' alone reads as 'if I change my mind'",
  /refused|address was wrong|nobody could be reached/.test(entry.body),
  true,
);
check(
  "🛑 it says this is a DEFAULT, not a verdict — fault moves it",
  /default when nobody is at fault/.test(entry.body),
  true,
);
check(
  "🛑 it states the platform never absorbs it — the owner's rule, in the copy",
  /does not absorb return freight/.test(entry.body),
  true,
);
check(
  "it is surfaced where the DECISION is made, not only on a policy page",
  entry.surfaces.includes("CheckoutSummary") && entry.surfaces.includes("ProductDetailPageView"),
  true,
);
check("tone is legal, not warning — it qualifies rather than prevents", entry.tone, "legal");

console.log("\n── rendered end to end ──");
for (const [setting, expected] of [
  ["buyer", "paid by the buyer"],
  ["seller", "paid by the seller"],
] as const) {
  const rendered = resolvePublishedCopy(
    entry.body,
    resolvePublishedValues({ returnsBornBy: setting, siteName: "Example" }),
  );
  check(`bornBy="${setting}" renders "${expected}"`, rendered.includes(expected), true);
  check(
    `…and leaves NO unresolved token behind (bornBy="${setting}")`,
    /\{\{[a-zA-Z]+\}\}/.test(rendered),
    false,
  );
}

console.log(
  `\n${failures === 0 ? "✅" : "🛑"} ${checks - failures}/${checks} checks passed` +
    (failures > 0 ? ` — ${failures} FAILED` : ""),
);
process.exit(failures === 0 ? 0 : 1);
