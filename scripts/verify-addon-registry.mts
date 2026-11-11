/*
 * Does the add-on registry price EXACTLY like the four functions it replaces?
 *
 * Run: npx tsx appkit/scripts/verify-addon-registry.mts
 *
 * 🛑 WHY THIS IS THE ONLY CHECK THAT MATTERS HERE.
 *
 * Replacing four bespoke `compute*Fee` functions with one data-driven one is
 * a pure refactor ONLY if every input produces the same rupee figure. The
 * failure mode is not a crash — it is a buyer being charged ₹49 instead of
 * ₹30, which nothing errors on and nobody notices until a reconciliation.
 *
 * The first draft of the registry failed this three ways, and each is a case
 * below:
 *   · it returned 0 for an absent price, where the originals fall back to a
 *     DEFAULT (₹10 / ₹49 / 2% / 3%). An install with the toggle on and no
 *     amount configured would have started charging nothing.
 *   · it skipped `roundRupees` on the percent component, which the originals
 *     apply BEFORE the max.
 *   · it set `perLine: true` on WhatsApp notify because the fee model wants
 *     that — a price INCREASE shipped under cover of a refactor.
 *
 * So the table deliberately includes absent-config and odd-subtotal rows,
 * which are where those three diverge and nowhere else.
 */

import {
  ADDON_REGISTRY,
  addonById,
  computeAddonPrice,
  enabledAddonsFor,
  isAddonEnabled,
  readSettingsPath,
} from "../src/_internal/shared/fees/addon-registry";
/*
 * ────────────────────────────────────────────────────────────────────────
 * 🛑 A FROZEN COPY OF THE ORIGINAL ARITHMETIC. DO NOT IMPORT THE REAL ONES.
 * ────────────────────────────────────────────────────────────────────────
 *
 * The four `compute*Fee` functions in `calculator.ts` now DELEGATE to the
 * registry. The moment they did, importing them here would have made every
 * equivalence row a tautology — `registry === registry` — and the file would
 * have gone on reporting 86/86 while verifying nothing at all.
 *
 * That is the same trap as the rounding check in this file's own history,
 * one level up: a test whose expectation is derived from the thing under
 * test. So the pre-delegation behaviour is transcribed here, by hand, and
 * this is now the independent record of what those functions did on
 * 2026-11-12 before the swap.
 *
 * ⚠ If a number here ever needs to change, that is a PRICE CHANGE and needs
 * saying out loud — not a test fix.
 */
const DEFAULTS = {
  whatsappNotifyFee: 10,
  giftWrapFee: 49,
  shipmentProtectionFeePercent: 2,
  shipmentProtectionFeeMin: 30,
  saleProtectionFeePercent: 3,
  saleProtectionFeeMin: 49,
};
const round2 = (n: number): number => Math.round(n * 100) / 100;

type Rates = Record<string, unknown>;
const n = (v: unknown, d: number): number => (typeof v === "number" && Number.isFinite(v) ? v : d);

function computeWhatsAppNotifyFee(selected: boolean, r: Rates): number {
  if (!selected || !r["whatsappNotifyFeeEnabled"]) return 0;
  return n(r["whatsappNotifyFee"], DEFAULTS.whatsappNotifyFee);
}
function computeGiftWrapFee(selected: boolean, r: Rates): number {
  if (!selected || !r["giftWrapFeeEnabled"]) return 0;
  return n(r["giftWrapFee"], DEFAULTS.giftWrapFee);
}
function computeShipmentProtectionFee(subtotal: number, selected: boolean, r: Rates): number {
  if (!selected || !r["shipmentProtectionFeeEnabled"]) return 0;
  const percent = n(r["shipmentProtectionFeePercent"], DEFAULTS.shipmentProtectionFeePercent);
  const min = n(r["shipmentProtectionFeeMin"], DEFAULTS.shipmentProtectionFeeMin);
  return Math.max(min, round2(subtotal * (percent / 100)));
}
function computeSaleProtectionFee(subtotal: number, selected: boolean, r: Rates): number {
  if (!selected || !r["saleProtectionFeeEnabled"]) return 0;
  const percent = n(r["saleProtectionFeePercent"], DEFAULTS.saleProtectionFeePercent);
  const min = n(r["saleProtectionFeeMin"], DEFAULTS.saleProtectionFeeMin);
  return Math.max(min, round2(subtotal * (percent / 100)));
}

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

/* Settings fixtures: fully configured, and deliberately EMPTY. */
const configured = {
  commissions: {
    whatsappNotifyFeeEnabled: true, whatsappNotifyFee: 10,
    giftWrapFeeEnabled: true, giftWrapFee: 49,
    shipmentProtectionFeeEnabled: true, shipmentProtectionFeePercent: 2, shipmentProtectionFeeMin: 30,
    saleProtectionFeeEnabled: true, saleProtectionFeePercent: 3, saleProtectionFeeMin: 49,
  },
};
/* 🛑 Toggles ON, amounts ABSENT — the case that caught the zero-fallback bug. */
const togglesOnly = {
  commissions: {
    whatsappNotifyFeeEnabled: true,
    giftWrapFeeEnabled: true,
    shipmentProtectionFeeEnabled: true,
    saleProtectionFeeEnabled: true,
  },
};

const SUBTOTALS = [0, 1, 99, 100, 333, 999, 1000, 1499, 2500, 7777, 100000];

console.log("\n── equivalence with the hardcoded functions, fully configured ──");
for (const sub of SUBTOTALS) {
  const c = configured.commissions;
  check(`whatsappNotify @${sub}`,
    computeAddonPrice(addonById("whatsappNotify")!, configured, { subtotal: sub, lineCount: 1 }),
    computeWhatsAppNotifyFee(true, c));
  check(`giftWrap @${sub}`,
    computeAddonPrice(addonById("giftWrap")!, configured, { subtotal: sub, lineCount: 1 }),
    computeGiftWrapFee(true, c));
  check(`shipmentProtection @${sub}`,
    computeAddonPrice(addonById("shipmentProtection")!, configured, { subtotal: sub, lineCount: 1 }),
    computeShipmentProtectionFee(sub, true, c));
  check(`saleProtection @${sub}`,
    computeAddonPrice(addonById("saleProtection")!, configured, { subtotal: sub, lineCount: 1 }),
    computeSaleProtectionFee(sub, true, c));
}

console.log("\n── 🛑 toggles ON, amounts ABSENT — must use the SAME defaults, not 0 ──");
for (const sub of [0, 500, 2500]) {
  const t = togglesOnly.commissions;
  check(`whatsappNotify default @${sub}`,
    computeAddonPrice(addonById("whatsappNotify")!, togglesOnly, { subtotal: sub, lineCount: 1 }),
    computeWhatsAppNotifyFee(true, t));
  check(`giftWrap default @${sub}`,
    computeAddonPrice(addonById("giftWrap")!, togglesOnly, { subtotal: sub, lineCount: 1 }),
    computeGiftWrapFee(true, t));
  check(`shipmentProtection default @${sub}`,
    computeAddonPrice(addonById("shipmentProtection")!, togglesOnly, { subtotal: sub, lineCount: 1 }),
    computeShipmentProtectionFee(sub, true, t));
  check(`saleProtection default @${sub}`,
    computeAddonPrice(addonById("saleProtection")!, togglesOnly, { subtotal: sub, lineCount: 1 }),
    computeSaleProtectionFee(sub, true, t));
}
check("and the defaults are non-zero (proves the fixture is meaningful)",
  computeAddonPrice(addonById("giftWrap")!, togglesOnly, { subtotal: 0, lineCount: 1 }) > 0, true);

/*
 * 🛑 THE ROUNDING CHECK ONLY WORKS WITH A FRACTIONAL PERCENT, and the first
 * version of this file did not have one — so it passed while the sabotage was
 * in place, i.e. it was verifying nothing.
 *
 * `roundRupees` is 2 DECIMAL PLACES, not whole rupees. A whole percent of an
 * integer subtotal never exceeds 2dp (X × 2/100 = X/50), so rounding is a
 * no-op across the entire table above and the bug hides.
 *
 * 2.36% — the real Razorpay all-in rate, and the value this config is heading
 * for — produces four decimals and exposes it.
 */
console.log("\n── 🛑 rounding: needs a FRACTIONAL percent or it verifies nothing ──");
const fractional = {
  commissions: {
    shipmentProtectionFeeEnabled: true,
    shipmentProtectionFeePercent: 2.36,
    shipmentProtectionFeeMin: 1,
  },
};
for (const sub of [333, 777, 1234, 9999]) {
  check(`2.36% of ${sub} matches the original exactly`,
    computeAddonPrice(addonById("shipmentProtection")!, fractional, { subtotal: sub, lineCount: 1 }),
    computeShipmentProtectionFee(sub, true, fractional.commissions));
}
check("and the value genuinely has >2dp before rounding (proves the fixture bites)",
  ((1234 * 2.36) / 100).toString().split(".")[1]!.length > 2, true);
check("rounded differs from unrounded here",
  computeShipmentProtectionFee(1234, true, fractional.commissions) !== (1234 * 2.36) / 100, true);

console.log("\n── a DISABLED add-on costs nothing, however configured ──");
const off = { commissions: { ...configured.commissions, giftWrapFeeEnabled: false } };
check("disabled giftWrap", computeAddonPrice(addonById("giftWrap")!, off, { subtotal: 2500, lineCount: 3 }), 0);
check("matches the original", computeGiftWrapFee(true, off.commissions), 0);
check("absent settings entirely", computeAddonPrice(addonById("giftWrap")!, undefined, { subtotal: 100, lineCount: 1 }), 0);
check("absent flag is OFF, never on", isAddonEnabled(addonById("giftWrap")!, { commissions: {} }), false);
check('a "true" STRING does not enable it', isAddonEnabled(addonById("giftWrap")!, { commissions: { giftWrapFeeEnabled: "true" } }), false);

console.log("\n── a CONFIGURED ZERO means free, and is honoured (?? not ||) ──");
const freeWrap = { commissions: { ...configured.commissions, giftWrapFee: 0 } };
check("giftWrapFee: 0 charges 0, not the ₹49 default",
  computeAddonPrice(addonById("giftWrap")!, freeWrap, { subtotal: 2500, lineCount: 1 }), 0);
check("and the original agrees", computeGiftWrapFee(true, freeWrap.commissions), 0);

console.log("\n── perLine is FALSE everywhere today (no silent price change) ──");
for (const a of ADDON_REGISTRY) check(`${a.id}.perLine`, a.perLine, false);
check("line count therefore changes nothing",
  computeAddonPrice(addonById("whatsappNotify")!, configured, { subtotal: 2500, lineCount: 20 }),
  computeAddonPrice(addonById("whatsappNotify")!, configured, { subtotal: 2500, lineCount: 1 }));

console.log("\n── registry shape ──");
check("four add-ons", ADDON_REGISTRY.length, 4);
check("ids are unique", new Set(ADDON_REGISTRY.map((a) => a.id)).size, 4);
check("giftWrap carries the free-text payload", addonById("giftWrap")?.payload?.key, "giftWrapMessage");
check("nothing else carries a payload",
  ADDON_REGISTRY.filter((a) => a.payload).map((a) => a.id), ["giftWrap"]);
check("unknown id resolves to undefined, never throws", addonById("nope"), undefined);
check("readSettingsPath tolerates a missing branch", readSettingsPath({}, "a.b.c"), undefined);
check("readSettingsPath tolerates a null mid-path", readSettingsPath({ a: null }, "a.b"), undefined);
check("buyer scope includes 'both'",
  enabledAddonsFor("buyer", configured).map((a) => a.id).sort(),
  ["giftWrap", "saleProtection", "shipmentProtection", "whatsappNotify"]);
check("seller scope is only the 'both' one",
  enabledAddonsFor("seller", configured).map((a) => a.id), ["whatsappNotify"]);
check("every enabledPath actually resolves in a configured install",
  ADDON_REGISTRY.filter((a) => readSettingsPath(configured, a.enabledPath) === undefined).map((a) => a.id), []);
check("every price path resolves too",
  ADDON_REGISTRY.filter((a) => {
    const p = a.pricing;
    return p.kind === "flat"
      ? readSettingsPath(configured, p.amountPath) === undefined
      : readSettingsPath(configured, p.percentPath) === undefined ||
        readSettingsPath(configured, p.minimumPath) === undefined;
  }).map((a) => a.id), []);

console.log(
  `\n${failures === 0 ? "✅" : "🛑"} ${checks - failures}/${checks} checks passed` +
    (failures > 0 ? ` — ${failures} FAILED` : ""),
);
process.exit(failures === 0 ? 0 : 1);
