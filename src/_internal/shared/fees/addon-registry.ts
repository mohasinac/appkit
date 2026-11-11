/**
 * Paid checkout add-ons, as DATA.
 *
 * ── Why ───────────────────────────────────────────────────────────────────
 *
 * Owner, 2026-11-11: *"new add-ons are mostly configurable with no code, like
 * condiments on a McDonald's order."*
 *
 * Today a fifth add-on is a RELEASE, not a row. The four that exist are
 * hardcoded by name in five separate places:
 *
 *   · `CartStoreAddons`            (features/cart/schemas/firestore.ts)
 *   · the order document          (features/orders/schemas/firestore.ts)
 *   · `commissions.*FeeEnabled` / `*Fee` pairs
 *   · one bespoke `compute*Fee` per add-on (this directory's calculator.ts)
 *   · `StoreAddonsPicker`
 *
 * That is the deploy test failing: a change the USER should be able to make
 * requires five edits and a publish.
 *
 * ── Why a registry and not a `Record<string, boolean>` alone ──────────────
 *
 * 🛑 THE FOUR ADD-ONS ARE NOT THE SAME SHAPE, and a naive "make them all
 * booleans" migration loses two things that are load-bearing:
 *
 *   · PRICING differs. WhatsApp notify and gift wrap are FLAT rupee amounts;
 *     both protections are a PERCENT of subtotal with a rupee MINIMUM. A
 *     single `price: number` cannot express the second, and inventing one
 *     would silently reprice the protections.
 *   · GIFT WRAP CARRIES FREE TEXT. `giftWrapMessage` rides beside the
 *     boolean. An add-on model with no payload slot would drop it, which is
 *     the kind of quiet data loss that only shows up on a gift order.
 *
 * ── What this module is NOT ───────────────────────────────────────────────
 *
 * ⚠ It does not price anything. `calculator.ts` owns the arithmetic and keeps
 * owning it; this names WHICH knobs an add-on reads and WHAT shape it has, so
 * one generic computation can replace four bespoke ones without changing a
 * single number. Verified by `verify-addon-registry.mts`, which asserts the
 * registry's paths resolve to the same values the hardcoded functions use.
 */

import { roundRupees } from "../../../utils/number.formatter";

/**
 * How an add-on is priced.
 *
 * 🛑 Dotted `siteSettings` paths, not values — the same decision
 * `RateDescriptor.path` documents: *"the path IS the identity"*. A registry
 * holding copies of the numbers would be a second place they live, and the
 * two would drift the first time an admin edited one.
 */
export type AddonPricing =
  | { kind: "flat"; amountPath: string; fallback: number }
  | {
      kind: "percentOfSubtotal";
      percentPath: string;
      minimumPath: string;
      fallbackPercent: number;
      fallbackMinimum: number;
    };

/** Who may turn an add-on on. */
export type AddonScope = "buyer" | "seller" | "both";

/**
 * Whether money comes back when the thing is not delivered.
 *
 * Owner, 2026-11-11: *"add-ons are non-refundable, or refundable in case of
 * not follow up."*
 *
 * 🛑 `"on-failure"` is NOT "refundable on request". It means: if WE did not
 * deliver what the add-on promised, it refunds. A buyer who simply changed
 * their mind about gift wrap after it was wrapped gets nothing, and that is
 * the intended asymmetry.
 */
export type AddonRefundPolicy = "never" | "on-failure";

export interface AddonDescriptor {
  /**
   * Stable slug. This is what a cart and an order store, so 🛑 renaming one
   * is a DATA MIGRATION, not an edit — historical orders carry the old key.
   */
  id: string;
  label: string;
  /** What the buyer is actually getting, in their words. */
  description: string;
  /** TIER 1 — dotted `siteSettings` path to the boolean that enables it platform-wide. */
  enabledPath: string;
  /**
   * TIER 2 — dotted path into the STORE document for the seller's opt-in.
   *
   * ⚠ ABSENT MEANS NO SELLER OPT-IN IS NEEDED, which is the right default for
   * a condiment: a seller does not consent to gift wrap. Present means the
   * seller must have said yes, and absent-on-the-store reads as NO — they
   * have not been asked, and enrolling them in a liability they never
   * accepted is the worse failure.
   */
  sellerEnabledPath?: string;
  /**
   * TIER 3 — key into `ADDON_ITEM_RULES` for per-item eligibility.
   *
   * 🛑 A KEY, not a predicate, so the CHOICE stays a row. Absent means the
   * add-on applies to any item — again the right default, and the reason a
   * fifth add-on needs no code. An unknown key degrades to AVAILABLE rather
   * than throwing; see `addon-availability.ts`.
   */
  itemRule?: string;
  pricing: AddonPricing;
  scope: AddonScope;
  refund: AddonRefundPolicy;
  /**
   * Does the price scale with the number of LINES in the order?
   *
   * ⚠ Lines, never quantity — A×5 + B×1 is **2**. Settled with the fee model:
   * the cost an add-on covers (messages, handling) tracks distinct items, not
   * units of the same item.
   */
  perLine: boolean;
  /**
   * An extra field the buyer fills in beside the toggle.
   *
   * 🛑 Exists because gift wrap has one (`giftWrapMessage`) and a
   * boolean-only model would drop it. Absent for every other add-on.
   */
  payload?: { key: string; kind: "text"; maxLength: number };
}

/**
 * The add-ons that ship.
 *
 * ⚠ Order is the order a buyer sees them in at checkout.
 *
 * 🛑 Paths mirror what `calculator.ts` already reads. They are asserted
 * equal by the verifier rather than trusted — a registry that *looks* like
 * the hardcoded functions but resolves one path differently would reprice
 * silently, which is the whole failure this indirection could introduce.
 */
export const ADDON_REGISTRY: readonly AddonDescriptor[] = [
  {
    id: "whatsappNotify",
    label: "WhatsApp order updates",
    description:
      "Order progress on WhatsApp as well as email. Email updates always arrive and are " +
      "covered by the platform fee — this buys the channel, not the information.",
    enabledPath: "commissions.whatsappNotifyFeeEnabled",
    pricing: { kind: "flat", amountPath: "commissions.whatsappNotifyFee", fallback: 10 },
    scope: "both",
    refund: "on-failure",
    /*
     * 🛑 FALSE, even though the fee model wants `max(₹10, ₹2 × lines)`.
     *
     * This registry is a FAITHFUL port of `computeWhatsAppNotifyFee`, which
     * multiplies by nothing. Shipping `perLine: true` here would have been a
     * silent price INCREASE delivered under cover of a refactor — the first
     * draft did exactly that, and the equivalence verifier is what caught it.
     *
     * Per-line pricing is a deliberate commercial change with its own
     * disclosure obligations. It flips here when that change is made, not as
     * a side effect of this one.
     */
    perLine: false,
  },
  {
    id: "giftWrap",
    label: "Gift wrap",
    description: "Wrapped, with a handwritten note if you add one.",
    enabledPath: "commissions.giftWrapFeeEnabled",
    pricing: { kind: "flat", amountPath: "commissions.giftWrapFee", fallback: 49 },
    scope: "buyer",
    refund: "never",
    perLine: false,
    // 🛑 The reason `payload` exists at all. Dropping this would lose the
    // note on every gift order and only surface as a complaint.
    payload: { key: "giftWrapMessage", kind: "text", maxLength: 200 },
  },
  {
    id: "shipmentProtection",
    label: "Shipment protection",
    description: "Covers loss or damage IN TRANSIT.",
    enabledPath: "commissions.shipmentProtectionFeeEnabled",
    /*
     * 🛑 The two upper tiers the picker already evaluated by hand. Declaring
     * them makes `addonAvailability` reproduce the SAME three-step answer the
     * picker open-codes, which is what lets the picker stop open-coding it.
     */
    sellerEnabledPath: "supportsShippingProtection",
    itemRule: "shipmentProtection",
    pricing: {
      kind: "percentOfSubtotal",
      percentPath: "commissions.shipmentProtectionFeePercent",
      minimumPath: "commissions.shipmentProtectionFeeMin",
      fallbackPercent: 2,
      fallbackMinimum: 30,
    },
    scope: "buyer",
    refund: "on-failure",
    perLine: false,
  },
  {
    id: "saleProtection",
    label: "Item protection",
    description: "Covers the ITEM — not as described, wrong item sent, item faults.",
    enabledPath: "commissions.saleProtectionFeeEnabled",
    sellerEnabledPath: "supportsSaleProtection",
    /*
     * 🛑 THE RULE THAT MADE THE HOOK NECESSARY. Without it a `finalSale` item
     * would be sold sale protection that can never pay out — "no returns" and
     * "no-questions-asked refund" are a plain contradiction.
     */
    itemRule: "saleProtection",
    pricing: {
      kind: "percentOfSubtotal",
      percentPath: "commissions.saleProtectionFeePercent",
      minimumPath: "commissions.saleProtectionFeeMin",
      fallbackPercent: 3,
      fallbackMinimum: 49,
    },
    /*
     * 🛑 A SEPARATE add-on from shipment protection, not a rename. The two
     * failures are independent and a `finalSale` item is eligible for one and
     * not the other — see `features/shipping/protections.ts`. Collapsing them
     * would sell cover that does not apply.
     */
    scope: "buyer",
    refund: "on-failure",
    perLine: false,
  },
];

/** Lookup by slug. Returns `undefined` for an id this build has never heard of. */
export function addonById(id: string): AddonDescriptor | undefined {
  return ADDON_REGISTRY.find((a) => a.id === id);
}

/**
 * Read a dotted path out of a settings-shaped object.
 *
 * ⚠ Returns `undefined` rather than throwing on a missing segment. Newer
 * config against an older deploy must degrade, never take a page down — the
 * governing rule, applied to the one place a typo'd path would otherwise
 * surface as a crash during checkout.
 */
export function readSettingsPath(settings: unknown, path: string): unknown {
  let node: unknown = settings;
  for (const segment of path.split(".")) {
    if (node === null || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[segment];
  }
  return node;
}

/**
 * Is this add-on switched on platform-wide?
 *
 * 🛑 `=== true`, so an absent flag is OFF. Unlike a browse page, an add-on
 * that defaults ON would CHARGE somebody — a wrong default here takes money,
 * which is the asymmetry that decides the direction.
 */
export function isAddonEnabled(descriptor: AddonDescriptor, settings: unknown): boolean {
  return readSettingsPath(settings, descriptor.enabledPath) === true;
}

/**
 * What this add-on costs, given the order it is attached to.
 *
 * ⚠ Mirrors `calculator.ts`'s existing arithmetic exactly — flat amounts
 * multiply by line count only when `perLine`, percentages floor at the
 * configured minimum. The verifier asserts equality against those functions
 * rather than assuming it.
 *
 * Returns `0` for a disabled add-on, an unreadable path, or a non-finite
 * value: a missing price must never become `NaN` on a buyer's total.
 */
export function computeAddonPrice(
  descriptor: AddonDescriptor,
  settings: unknown,
  ctx: { subtotal: number; lineCount: number },
): number {
  if (!isAddonEnabled(descriptor, settings)) return 0;

  /*
   * 🛑 `??` AND NOT `||`, and the fallback is the SAME constant the hardcoded
   * function uses — not zero.
   *
   * The first draft returned 0 for an unreadable path. That silently made an
   * install with the toggle ON but no amount configured charge nothing, where
   * `computeGiftWrapFee` charges ₹49. A registry that reprices on absent
   * config is worse than the four functions it replaces.
   *
   * `??` so a configured `0` means free and is honoured, while absent means
   * the default. With `||` a deliberate zero would silently become ₹49.
   */
  const num = (path: string, fallback: number): number => {
    const raw = readSettingsPath(settings, path);
    return typeof raw === "number" && Number.isFinite(raw) ? raw : fallback;
  };

  if (descriptor.pricing.kind === "flat") {
    const amount = num(descriptor.pricing.amountPath, descriptor.pricing.fallback);
    const lines = descriptor.perLine ? Math.max(1, Math.floor(ctx.lineCount)) : 1;
    return amount * lines;
  }

  const percent = num(descriptor.pricing.percentPath, descriptor.pricing.fallbackPercent);
  const minimum = num(descriptor.pricing.minimumPath, descriptor.pricing.fallbackMinimum);
  /*
   * ⚠ `roundRupees` on the PERCENT component BEFORE the max, exactly as
   * `computeShipmentProtectionFee` does. Rounding after the max, or not at
   * all, moves the result by up to a rupee on ordinary subtotals — small, and
   * a mismatch between the quoted and charged figure all the same.
   */
  return Math.max(minimum, roundRupees((ctx.subtotal * percent) / 100));
}

/** Every add-on a buyer may be offered right now. */
export function enabledAddonsFor(scope: AddonScope, settings: unknown): AddonDescriptor[] {
  return ADDON_REGISTRY.filter(
    (a) => (a.scope === scope || a.scope === "both") && isAddonEnabled(a, settings),
  );
}
