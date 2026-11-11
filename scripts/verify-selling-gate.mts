/*
 * Table test for the selling gate.
 *
 * Run: npx tsx appkit/scripts/verify-selling-gate.mts
 *
 * 🛑 WHY A SCRIPT AND NOT A UNIT TEST: this repo has no test runner and no
 * `*.test.ts` files at all. Follows the existing `verify-*` convention and
 * exits non-zero on failure.
 *
 * 🛑 WHY IT EXISTS: this gate's contract is INVERTED relative to every sibling
 * flag in `siteSettings.listings` — there, absent means enabled; here, absent
 * means OFF, because the failure mode is collecting a buyer's money for a
 * third party's goods without a Payment Aggregator authorisation. That is a
 * criminal exposure under PSS Act s.26, not a product defect, and it is
 * exactly one character (`!==` vs `===`, truthiness vs `=== true`) away from
 * being wrong in a way no type signature shows.
 *
 * The cases that matter most are the ones where a reasonable implementation
 * would wrongly OPEN the gate:
 *   · no settings at all  → must refuse, not allow
 *   · settings present but no platform store named → must refuse EVERYONE
 *   · a `"false"` string instead of a boolean → must refuse
 *   · a missing/empty store id on the write path → must refuse
 *   · an admin → must still refuse; privilege cannot make settlement lawful
 */

import {
  assertSellingAllowed,
  blockedSellingStoreIds,
  isSellingAllowedFor,
  isThirdPartySellingEnabled,
  platformSellerStoreId,
  sellingRefusalReason,
  type SellingGateSettings,
} from "../src/_internal/shared/selling/selling-gate";
import { siteSettingsSeedData } from "../src/seed/site-settings-seed-data";
import { storesSeedData } from "../src/seed/stores-seed-data";

let failures = 0;
let checks = 0;

function check(label: string, actual: unknown, expected: unknown): void {
  checks += 1;
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log(`  ok   ${label}`);
  } else {
    failures += 1;
    console.log(`  FAIL ${label}\n         expected ${e}\n         actual   ${a}`);
  }
}

const OURS = "store-letitrip-official";
const THEIRS = "store-someone-else";

const closed: SellingGateSettings = {
  listings: { thirdPartySellingEnabled: false, platformSellerStoreId: OURS },
};
const open: SellingGateSettings = {
  listings: { thirdPartySellingEnabled: true, platformSellerStoreId: OURS },
};
const unconfigured: SellingGateSettings = { listings: {} };

console.log("\n── the gate is CLOSED (the launch posture) ──");
check("our own store may sell", isSellingAllowedFor(OURS, closed), true);
check("another store may NOT", isSellingAllowedFor(THEIRS, closed), false);

console.log("\n── 🛑 the cases that would wrongly OPEN it ──");
check("no settings object at all", isSellingAllowedFor(THEIRS, undefined), false);
check("no listings group", isSellingAllowedFor(THEIRS, {}), false);
check("flag absent entirely", isSellingAllowedFor(THEIRS, unconfigured), false);
check(
  "flag absent → even OUR store is refused when no platform store is named",
  isSellingAllowedFor(OURS, unconfigured),
  false,
);
check(
  'a "false" STRING must not pass as truthy',
  isSellingAllowedFor(THEIRS, {
    listings: { thirdPartySellingEnabled: "false" as unknown as boolean, platformSellerStoreId: OURS },
  }),
  false,
);
check(
  'a "true" STRING must not pass either — only a real boolean opens it',
  isSellingAllowedFor(THEIRS, {
    listings: { thirdPartySellingEnabled: "true" as unknown as boolean, platformSellerStoreId: OURS },
  }),
  false,
);
check("undefined store id is refused, never waved through", isSellingAllowedFor(undefined, closed), false);
check("empty store id is refused", isSellingAllowedFor("", closed), false);
check("whitespace store id is refused", isSellingAllowedFor("   ", closed), false);
check(
  "empty platform store id does not match an empty store id",
  isSellingAllowedFor("", { listings: { platformSellerStoreId: "" } }),
  false,
);

console.log("\n── the gate is OPEN ──");
check("any store may sell", isSellingAllowedFor(THEIRS, open), true);
check("ours still may", isSellingAllowedFor(OURS, open), true);
check("even an unknown store", isSellingAllowedFor("store-brand-new", open), true);
check(
  "open with no platform store named is still open",
  isSellingAllowedFor(THEIRS, { listings: { thirdPartySellingEnabled: true } }),
  true,
);

console.log("\n── helpers ──");
check("isThirdPartySellingEnabled(undefined)", isThirdPartySellingEnabled(undefined), false);
check("isThirdPartySellingEnabled(closed)", isThirdPartySellingEnabled(closed), false);
check("isThirdPartySellingEnabled(open)", isThirdPartySellingEnabled(open), true);
check("platformSellerStoreId(closed)", platformSellerStoreId(closed), OURS);
check("platformSellerStoreId(unconfigured)", platformSellerStoreId(unconfigured), undefined);
check(
  "platformSellerStoreId trims an all-whitespace value to undefined",
  platformSellerStoreId({ listings: { platformSellerStoreId: "  " } }),
  undefined,
);

console.log("\n── refusal reasons are DISTINCT (they send you to different places) ──");
const notConfigured = sellingRefusalReason(THEIRS, unconfigured) ?? "";
const closedToThirdParties = sellingRefusalReason(THEIRS, closed) ?? "";
check("allowed → null, not a string", sellingRefusalReason(OURS, closed), null);
check("not-configured names configuration", notConfigured.includes("not configured"), true);
check("closed names own stock", closedToThirdParties.includes("its own stock"), true);
check("the two reasons differ", notConfigured !== closedToThirdParties, true);

console.log("\n── assertSellingAllowed throws, and only when it should ──");
function throws(fn: () => void): string | false {
  try {
    fn();
    return false;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}
check("our store does not throw", throws(() => assertSellingAllowed(OURS, closed)), false);
check("another store throws", typeof throws(() => assertSellingAllowed(THEIRS, closed)), "string");
check("undefined store throws", typeof throws(() => assertSellingAllowed(undefined, closed)), "string");
check("open gate does not throw", throws(() => assertSellingAllowed(THEIRS, open)), false);
check(
  "the thrown message is the same text sellingRefusalReason gives",
  throws(() => assertSellingAllowed(THEIRS, closed)),
  closedToThirdParties,
);

console.log("\n── mixed cart: EVERY offender is named, not just the first ──");
check(
  "three stores, two blocked → both reported",
  blockedSellingStoreIds([OURS, THEIRS, "store-third"], closed),
  [THEIRS, "store-third"],
);
check("de-duplicated", blockedSellingStoreIds([THEIRS, THEIRS, THEIRS], closed), [THEIRS]);
check("all ours → empty", blockedSellingStoreIds([OURS, OURS], closed), []);
check("gate open → empty regardless", blockedSellingStoreIds([THEIRS, "store-x"], open), []);
check("empty cart → empty", blockedSellingStoreIds([], closed), []);
check(
  "a missing store id is reported as an offender, not skipped",
  blockedSellingStoreIds([OURS, undefined], closed),
  [""],
);

/*
 * ── The seed, against the real store rows ────────────────────────────────
 *
 * 🛑 Everything above tests the LOGIC with hand-made settings. This tests the
 * DATA WE SHIP, which is a different failure: the resolver can be perfect
 * while the seed names a store that does not exist, or forgets the id
 * entirely — in which case a freshly seeded site sells nothing and the cause
 * is three files away from the code anyone would look at.
 *
 * It is the same class as the `closedPaths` erasure found while building
 * this: correct code, wrong data, and nothing failing loudly.
 */
console.log("\n── the SEEDED config against the SEEDED stores ──");
const seededSettings = siteSettingsSeedData as SellingGateSettings;
const seededStoreIds = storesSeedData.map((s) => s.id).filter((id): id is string => typeof id === "string");

check("seed ships the flag explicitly", seededSettings.listings?.thirdPartySellingEnabled, false);
check("seed names a platform store", typeof platformSellerStoreId(seededSettings), "string");
check(
  "🛑 the nominated store EXISTS in the store seed",
  seededStoreIds.includes(platformSellerStoreId(seededSettings) ?? ""),
  true,
);
const sellers = seededStoreIds.filter((id) => isSellingAllowedFor(id, seededSettings));
check("exactly ONE seeded store may sell", sellers.length, 1);
check("and it is the nominated one", sellers[0], platformSellerStoreId(seededSettings));
check(
  "every other seeded store is refused",
  seededStoreIds.filter((id) => !isSellingAllowedFor(id, seededSettings)).length,
  seededStoreIds.length - 1,
);
console.log(
  `       (${seededStoreIds.length} seeded stores — ${sellers.length} sells, ` +
    `${seededStoreIds.length - 1} refused: ${seededStoreIds.filter((i) => i !== sellers[0]).join(", ")})`,
);

console.log(
  `\n${failures === 0 ? "✅" : "🛑"} ${checks - failures}/${checks} checks passed` +
    (failures > 0 ? ` — ${failures} FAILED` : ""),
);
process.exit(failures === 0 ? 0 : 1);
