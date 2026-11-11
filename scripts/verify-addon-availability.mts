/*
 * The add-on availability hook — does it reproduce the picker's THREE tiers?
 *
 * Run: npx tsx appkit/scripts/verify-addon-availability.mts
 *
 * 🛑 WHY THIS EXISTS AT ALL.
 *
 * The picker conversion was STOPPED because driving it from the registry's
 * platform flag alone would have sold sale-protection on a `finalSale` item
 * and offered cover from a seller who declined to provide it. This hook is
 * the fix, so the acceptance test is not "does it compile" — it is:
 *
 *   1. does it answer the SAME thing the picker open-codes, tier for tier;
 *   2. does it report the RIGHT REASON, since three different sentences are
 *      rendered and telling a buyer the wrong one is the defect the tiers
 *      exist to prevent;
 *   3. does a FIFTH add-on with no seller flag and no item rule just work.
 *
 * ⚠ The picker's own booleans are reproduced below BY HAND, frozen from the
 * source. Deriving them from the hook would make every row read
 * `hook === hook` — the circular-test trap that had to be caught once already
 * in `verify-addon-registry.mts`.
 */

import {
  ADDON_REGISTRY,
  addonById,
  type AddonDescriptor,
} from "../src/_internal/shared/fees/addon-registry";
import {
  ADDON_ITEM_RULES,
  addonAvailability,
  isDisclosedRefusal,
  resolveAddonOffers,
  type AddonAvailabilityContext,
} from "../src/_internal/shared/fees/addon-availability";

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

const ON = {
  commissions: {
    shipmentProtectionFeeEnabled: true,
    saleProtectionFeeEnabled: true,
    whatsappNotifyFeeEnabled: true,
    giftWrapFeeEnabled: true,
  },
};
const SELLER_BOTH = { supportsShippingProtection: true, supportsSaleProtection: true };

const ship = addonById("shipmentProtection")!;
const sale = addonById("saleProtection")!;
const wrap = addonById("giftWrap")!;
const wa = addonById("whatsappNotify")!;

console.log("\n── 🛑 THE PICKER'S OWN BOOLEANS, frozen by hand from StoreAddonsPicker ──");
/*
 * StoreAddonsPicker.tsx:153-161, transcribed. NOT derived from the hook.
 *   shippingOffered = platformFlag && supportsShippingProtection
 *   saleOffered     = platformFlag && supportsSaleProtection && !hasFinalSaleItem
 *   shippingDeclined= platformFlag && !supportsShippingProtection
 *   saleDeclined    = platformFlag && !supportsSaleProtection
 *   saleBlockedByFinalSale = platformFlag && supportsSaleProtection && hasFinalSaleItem
 */
function pickerShippingOffered(platform: boolean, seller: boolean): boolean {
  return platform && seller;
}
function pickerSaleOffered(platform: boolean, seller: boolean, finalSale: boolean): boolean {
  return platform && seller && !finalSale;
}

for (const platform of [true, false]) {
  for (const seller of [true, false]) {
    for (const finalSale of [true, false]) {
      const settings = {
        commissions: {
          shipmentProtectionFeeEnabled: platform,
          saleProtectionFeeEnabled: platform,
        },
      };
      const ctx: AddonAvailabilityContext = {
        settings,
        sellerFlags: { supportsShippingProtection: seller, supportsSaleProtection: seller },
        finalSale,
      };
      check(
        `shipping  platform=${platform} seller=${seller} final=${finalSale}`,
        addonAvailability(ship, ctx).available,
        pickerShippingOffered(platform, seller),
      );
      check(
        `sale      platform=${platform} seller=${seller} final=${finalSale}`,
        addonAvailability(sale, ctx).available,
        pickerSaleOffered(platform, seller, finalSale),
      );
    }
  }
}

/*
 * 🛑 THE PICKER DERIVES THREE MORE BOOLEANS FROM THE REASON, and those decide
 * which NOTICE renders. `available` matching is not enough — a hook that said
 * "unavailable" for the right cases but with the wrong reason would silently
 * swap "this seller does not offer protection" for "this basket contains a
 * final-sale item", which is a false statement about a seller.
 */
console.log("\n── the three notice booleans the picker derives from the REASON ──");
for (const platform of [true, false]) {
  for (const seller of [true, false]) {
    for (const finalSale of [true, false]) {
      const ctx: AddonAvailabilityContext = {
        settings: { commissions: { saleProtectionFeeEnabled: platform } },
        sellerFlags: { supportsSaleProtection: seller },
        finalSale,
      };
      const a = addonAvailability(sale, ctx);
      check(
        `saleDeclined       platform=${platform} seller=${seller} final=${finalSale}`,
        !a.available && a.reason === "seller-not-supported",
        platform && !seller, // frozen from StoreAddonsPicker.tsx:159
      );
      check(
        `blockedByFinalSale platform=${platform} seller=${seller} final=${finalSale}`,
        !a.available && a.reason === "final-sale",
        platform && seller && finalSale, // frozen from StoreAddonsPicker.tsx:160-161
      );
    }
  }
}

console.log("\n── 🛑 THE REASON, not just the boolean — three sentences, three tiers ──");
check(
  "platform off → platform-disabled (NOT a seller or item complaint)",
  addonAvailability(sale, { settings: {}, sellerFlags: SELLER_BOTH }),
  { available: false, reason: "platform-disabled" },
);
check(
  "seller declined → seller-not-supported",
  addonAvailability(sale, { settings: ON, sellerFlags: {} }),
  { available: false, reason: "seller-not-supported" },
);
check(
  "🛑 final sale → final-sale, the item tier, NOT seller-not-supported",
  addonAvailability(sale, { settings: ON, sellerFlags: SELLER_BOTH, finalSale: true }),
  { available: false, reason: "final-sale" },
);
check(
  "🛑 ORDER OF OWNERSHIP: platform off AND seller off AND final sale reports PLATFORM",
  addonAvailability(sale, { settings: {}, sellerFlags: {}, finalSale: true }),
  { available: false, reason: "platform-disabled" },
);

console.log("\n── 🛑 the asymmetry that is the reason the two are separate add-ons ──");
const finalSaleCtx = { settings: ON, sellerFlags: SELLER_BOTH, finalSale: true };
check("sale protection is REFUSED on a final-sale item", addonAvailability(sale, finalSaleCtx).available, false);
check(
  "🛑 shipping protection is UNAFFECTED — a lost parcel was never delivered",
  addonAvailability(ship, finalSaleCtx).available,
  true,
);

console.log("\n── the item tier delegates; it does not reimplement ──");
check(
  "above the value cap → above-value-cap",
  addonAvailability(sale, { settings: ON, sellerFlags: SELLER_BOTH, lineTotal: 10_000_000 }),
  { available: false, reason: "above-value-cap" },
);
check(
  "⚠ an ABSENT lineTotal skips the cap rather than failing it",
  addonAvailability(sale, { settings: ON, sellerFlags: SELLER_BOTH }).available,
  true,
);
check(
  "🛑 the value cap does NOT apply to shipping protection",
  addonAvailability(ship, { settings: ON, sellerFlags: SELLER_BOTH, lineTotal: 10_000_000 }).available,
  true,
);

console.log("\n── ✅ A CONDIMENT: no seller flag, no item rule — the deploy test ──");
check("gift wrap declares no seller opt-in", wrap.sellerEnabledPath, undefined);
check("gift wrap declares no item rule", wrap.itemRule, undefined);
check(
  "gift wrap is available with NO store document at all",
  addonAvailability(wrap, { settings: ON }).available,
  true,
);
check(
  "…and on a final-sale item, which is correct — you can wrap anything",
  addonAvailability(wrap, { settings: ON, finalSale: true }).available,
  true,
);
check(
  "…but still obeys the platform flag",
  addonAvailability(wrap, { settings: {} }),
  { available: false, reason: "platform-disabled" },
);
check("whatsapp updates likewise need no seller opt-in", wa.sellerEnabledPath, undefined);

/*
 * The acceptance test the plan named: a FIFTH add-on, by config alone.
 * Declared here as a literal rather than added to the registry, because the
 * point is that nothing in the mechanism had to learn about it.
 */
const fifth: AddonDescriptor = {
  id: "priorityPacking",
  label: "Priority packing",
  description: "Packed first, dispatched same day.",
  enabledPath: "commissions.priorityPackingFeeEnabled",
  pricing: { kind: "flat", amountPath: "commissions.priorityPackingFee", fallback: 25 },
  scope: "buyer",
  refund: "on-failure",
  perLine: false,
};
check(
  "🛑 a fifth add-on the code has never heard of resolves with NO code change",
  addonAvailability(fifth, {
    settings: { commissions: { priorityPackingFeeEnabled: true } },
  }),
  { available: true },
);
check(
  "…and is OFF when its own flag is absent",
  addonAvailability(fifth, { settings: ON }),
  { available: false, reason: "platform-disabled" },
);

console.log("\n── ⚠ unknown config DEGRADES, never throws ──");
const badRule: AddonDescriptor = { ...wrap, itemRule: "aRuleFromANewerDeploy" };
check(
  "🛑 an unknown item rule is AVAILABLE, not an exception — a dead cart is worse",
  addonAvailability(badRule, { settings: ON }),
  { available: true },
);
check(
  "a null store document does not throw",
  addonAvailability(sale, { settings: ON, sellerFlags: null }),
  { available: false, reason: "seller-not-supported" },
);
check(
  "a string where a store document should be does not throw",
  addonAvailability(sale, { settings: ON, sellerFlags: "oops" as unknown }),
  { available: false, reason: "seller-not-supported" },
);
check(
  "a seller flag that is truthy-but-not-true reads as NOT opted in",
  addonAvailability(sale, { settings: ON, sellerFlags: { supportsSaleProtection: 1 } }),
  { available: false, reason: "seller-not-supported" },
);

console.log("\n── what gets DISCLOSED vs hidden ──");
check("🛑 platform-disabled is HIDDEN — nothing to say about this seller", isDisclosedRefusal("platform-disabled"), false);
check("seller-not-supported is disclosed — it is a choice the buyer should know", isDisclosedRefusal("seller-not-supported"), true);
check("final-sale is disclosed", isDisclosedRefusal("final-sale"), true);
check("above-value-cap is disclosed", isDisclosedRefusal("above-value-cap"), true);
check("excluded-category is disclosed", isDisclosedRefusal("excluded-category"), true);

check(
  "a platform with everything off offers NOTHING and discloses NOTHING",
  resolveAddonOffers(ADDON_REGISTRY, { settings: {} }).length,
  0,
);
check(
  "🛑 a seller who declined both still produces two DISCLOSED refusals, not silence",
  resolveAddonOffers(ADDON_REGISTRY, { settings: ON, sellerFlags: {} })
    .filter((o) => !o.availability.available)
    .map((o) => o.descriptor.id),
  ["shipmentProtection", "saleProtection"],
);
check(
  "…and the two condiments are still OFFERED alongside them",
  resolveAddonOffers(ADDON_REGISTRY, { settings: ON, sellerFlags: {} })
    .filter((o) => o.availability.available)
    .map((o) => o.descriptor.id),
  ["whatsappNotify", "giftWrap"],
);

console.log("\n── the registry's own declarations ──");
check(
  "exactly the two protections declare a seller opt-in",
  ADDON_REGISTRY.filter((a) => a.sellerEnabledPath !== undefined).map((a) => a.id),
  ["shipmentProtection", "saleProtection"],
);
check(
  "exactly the two protections declare an item rule",
  ADDON_REGISTRY.filter((a) => a.itemRule !== undefined).map((a) => a.id),
  ["shipmentProtection", "saleProtection"],
);
/*
 * 🛑 THIS CHECK WAS A NO-OP ON ITS FIRST DRAFT, and it is recorded rather than
 * quietly fixed because it is the second time in this plan's work.
 *
 * It asked whether `addonAvailability(...) === undefined`. That function
 * ALWAYS returns an object, so the filter was empty whatever the registry
 * said — a typo'd `itemRule` would have passed, which is exactly the failure
 * the check is named for (an unknown key degrades to AVAILABLE, by design, so
 * nothing else would have complained either).
 *
 * The real question is whether the declared KEY EXISTS in the rules map.
 * Verify the checker before the code.
 */
check(
  "🛑 every declared item rule RESOLVES — a typo would silently mean 'no restriction'",
  ADDON_REGISTRY.filter(
    (a) => a.itemRule !== undefined && ADDON_ITEM_RULES[a.itemRule] === undefined,
  ).map((a) => a.id),
  [],
);
check(
  "…and that check can SEE a typo — a made-up key is reported",
  [{ ...wrap, itemRule: "nope" }].filter(
    (a) => a.itemRule !== undefined && ADDON_ITEM_RULES[a.itemRule] === undefined,
  ).map((a) => a.id),
  ["giftWrap"],
);
check(
  "🛑 and the saleProtection key really is wired — remove it and this goes true",
  addonAvailability(sale, { settings: ON, sellerFlags: SELLER_BOTH, finalSale: true }).available,
  false,
);

console.log(
  `\n${failures === 0 ? "✅" : "🛑"} ${checks - failures}/${checks} checks passed` +
    (failures > 0 ? ` — ${failures} FAILED` : ""),
);
process.exit(failures === 0 ? 0 : 1);
