/**
 * WHETHER an add-on may be offered — the three tiers, and WHY when it may not.
 *
 * ── Why this is a separate module from the registry ───────────────────────
 *
 * `addon-registry.ts` answers *what an add-on costs*. It deliberately knows
 * nothing about stores, listings or claim rules, which is what lets it stay
 * pure data plus arithmetic.
 *
 * But the picker cannot be driven from pricing alone, and the attempt to do
 * that is what stopped the conversion. `StoreAddonsPicker` evaluates THREE
 * tiers — platform flag, seller opt-in, item eligibility — and renders a
 * DIFFERENT buyer-facing message per tier. Driving it off `isAddonEnabled`
 * alone would have:
 *
 *   · offered protection from a seller who explicitly declined to provide it;
 *   · 🛑 sold SALE protection on a `finalSale` item it can never apply to;
 *   · collapsed three refusals into one, telling the buyer the wrong reason.
 *
 * ── 🛑 THIS DOES NOT REIMPLEMENT `protectionAvailability` ─────────────────
 *
 * That function already owns the real rules — the final-sale asymmetry, the
 * value cap, the excluded categories, and the order of checks that makes the
 * reason meaningful. A second copy here would be two divergent definitions of
 * who is covered, which is the one thing a protection product cannot have.
 *
 * So the two protections DELEGATE to it, and this module's own job is small:
 * generalise the tier SHAPE so a fifth add-on needs no code.
 *
 * ── What a new add-on actually needs ──────────────────────────────────────
 *
 * | tier | how it is declared | a new add-on |
 * |---|---|---|
 * | platform | `enabledPath` — a settings path | ✅ a row |
 * | seller | `sellerEnabledPath` — a STORE path | ✅ a row, or omit for "no seller opt-in needed" |
 * | item | `itemRule` — a key into `ADDON_ITEM_RULES` | ✅ omit, and it is always item-eligible |
 *
 * ⚠ So the deploy test passes for the ordinary case (a condiment: gift wrap,
 * WhatsApp updates, anything new) while the two protections keep the
 * genuinely bespoke logic they need. An add-on that wants a NEW kind of item
 * restriction still needs a rule — stated plainly rather than pretended away.
 */

import type { AddonDescriptor } from "./addon-registry";
import { isAddonEnabled } from "./addon-registry";
import {
  protectionAvailability,
  type ProtectionUnavailableReason,
} from "../features/shipping/protections";

/**
 * Why an add-on is not on offer.
 *
 * 🛑 The protection reasons VERBATIM, plus one. Re-spelling them would mean
 * the copy layer had two vocabularies for one concept, and a renderer that
 * handled `"final-sale"` from one path and `"finalSale"` from the other.
 */
export type AddonUnavailableReason =
  | ProtectionUnavailableReason
  /** The add-on's item rule refused for a reason with no more specific name. */
  | "item-ineligible";

export type AddonAvailability =
  | { available: true }
  | { available: false; reason: AddonUnavailableReason };

/**
 * Everything the three tiers can ask about.
 *
 * ⚠ Every item field is optional and ABSENT MEANS "do not apply that check",
 * never "fail it". A caller that cannot supply `lineTotal` is describing a gap
 * in our own data, and refusing cover over it would charge a fee and then
 * decline the claim — the same reasoning `ProtectionTierInput.lineTotal`
 * already carries, kept identical on purpose.
 *
 * 🛑 `sellerFlags` is the STORE DOCUMENT, read by path. Not a pre-computed
 * boolean pair: a fifth add-on with a seller opt-in must be a row, and a
 * `{ supportsX, supportsY }` shape would make it a type change.
 */
export interface AddonAvailabilityContext {
  /** `siteSettings`, for tier 1. */
  settings: unknown;
  /** The store document, for tier 2. Absent = the seller has opted into nothing. */
  sellerFlags?: unknown;
  /** Tier 3 — does the group contain an item sold as final? */
  finalSale?: boolean;
  /** Tier 3 — the line total including shipping, for the value cap. */
  lineTotal?: number;
  /** Tier 3 — the listing type, for the exclusion list. */
  listingType?: string;
  /** Tier 3 — whether the item carries a third-party grade. */
  isGraded?: boolean;
}

/**
 * Item-tier rules, by key.
 *
 * 🛑 A function per rule, and that is NOT the registry becoming code again.
 * The CHOICE — which rule this add-on uses, or none — stays a row. This is the
 * machinery the row selects, exactly as `entryRanking` and the capability
 * registry already work.
 *
 * ⚠ An add-on naming a rule this build does not have DEGRADES TO AVAILABLE
 * rather than throwing. Newer config against an older deploy must not take
 * checkout down. The cost of being wrong is one offered add-on, which the
 * server-side claim gate still refuses; the cost of throwing is a dead cart.
 */
export const ADDON_ITEM_RULES: Readonly<
  Record<string, (ctx: AddonAvailabilityContext) => AddonAvailability>
> = {
  /*
   * Both delegate. `protectionAvailability` is given the two upper tiers as
   * already-satisfied, because this module has just checked them — passing
   * `false` would make it answer with the upper tier's reason and mask the
   * item one.
   */
  shipmentProtection: (ctx) =>
    toAddonAvailability(
      protectionAvailability("shipping", {
        platformEnabled: true,
        sellerSupports: true,
        finalSale: ctx.finalSale === true,
        ...(typeof ctx.lineTotal === "number" ? { lineTotal: ctx.lineTotal } : {}),
        ...(ctx.listingType !== undefined ? { listingType: ctx.listingType } : {}),
        ...(ctx.isGraded !== undefined ? { isGraded: ctx.isGraded } : {}),
      }),
    ),
  saleProtection: (ctx) =>
    toAddonAvailability(
      protectionAvailability("sale", {
        platformEnabled: true,
        sellerSupports: true,
        finalSale: ctx.finalSale === true,
        ...(typeof ctx.lineTotal === "number" ? { lineTotal: ctx.lineTotal } : {}),
        ...(ctx.listingType !== undefined ? { listingType: ctx.listingType } : {}),
        ...(ctx.isGraded !== undefined ? { isGraded: ctx.isGraded } : {}),
      }),
    ),
};

function toAddonAvailability(
  result: ReturnType<typeof protectionAvailability>,
): AddonAvailability {
  return result.available ? { available: true } : { available: false, reason: result.reason };
}

/**
 * Read a dotted path and answer `true` ONLY for a literal `true`.
 *
 * 🛑 Absent means NOT opted in, matching `supportsSaleProtection`'s own
 * contract. A seller who has never been asked has not agreed to be held to a
 * liability, and defaulting them in is a worse failure than a page of risk
 * notices.
 */
function flagAt(source: unknown, path: string): boolean {
  let node: unknown = source;
  for (const segment of path.split(".")) {
    if (node === null || typeof node !== "object") return false;
    node = (node as Record<string, unknown>)[segment];
  }
  return node === true;
}

/**
 * The three tiers, in the order of OWNERSHIP: platform, then seller, then item.
 *
 * 🛑 The order is the whole reason this returns a reason at all. *"We do not
 * offer this"* and *"this seller does not offer this"* are different sentences
 * and lead a buyer to different actions — the first is final, the second means
 * shop elsewhere. Checking item-first would report an item problem on a
 * platform that has the feature switched off entirely.
 */
export function addonAvailability(
  descriptor: AddonDescriptor,
  ctx: AddonAvailabilityContext,
): AddonAvailability {
  if (!isAddonEnabled(descriptor, ctx.settings)) {
    return { available: false, reason: "platform-disabled" };
  }
  if (descriptor.sellerEnabledPath !== undefined) {
    if (!flagAt(ctx.sellerFlags, descriptor.sellerEnabledPath)) {
      return { available: false, reason: "seller-not-supported" };
    }
  }
  if (descriptor.itemRule !== undefined) {
    const rule = ADDON_ITEM_RULES[descriptor.itemRule];
    // ⚠ Unknown rule key → available. See the note on ADDON_ITEM_RULES.
    if (rule) return rule(ctx);
  }
  return { available: true };
}

/**
 * Does this refusal get DISCLOSED to the buyer, or hidden?
 *
 * 🛑 The distinction the picker already makes and must not lose:
 * platform-disabled shows NOTHING, because there is nothing to say about this
 * seller or this item — the product does not exist here. Every other refusal
 * is about a choice someone made, and a buyer deciding whether to purchase is
 * entitled to know a seller declined cover or an item cannot carry it.
 */
export function isDisclosedRefusal(reason: AddonUnavailableReason): boolean {
  return reason !== "platform-disabled";
}

/** Every add-on actually on offer here, with the refusals worth disclosing. */
export function resolveAddonOffers(
  descriptors: readonly AddonDescriptor[],
  ctx: AddonAvailabilityContext,
): { descriptor: AddonDescriptor; availability: AddonAvailability }[] {
  return descriptors
    .map((descriptor) => ({ descriptor, availability: addonAvailability(descriptor, ctx) }))
    .filter(
      ({ availability }) =>
        availability.available || isDisclosedRefusal(availability.reason),
    );
}
