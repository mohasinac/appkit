/**
 * The protection COVER as config — the cap, the windows and the exclusions.
 *
 * ── Why ───────────────────────────────────────────────────────────────────
 *
 * `protections.ts` holds four constants that ARE the product a buyer pays
 * for: how much cover, for how long, on what. Every one of them was a deploy
 * to change, which is the deploy test failing on a priced promise — and a
 * priced promise is the worst possible thing to need a release for, because
 * the moment it is wrong it is wrong for people who have already paid.
 *
 * ── 🛑 THIS DOES NOT REPLACE THE CONSTANTS. IT RESOLVES THROUGH THEM. ─────
 *
 * The numbers in `protections.ts` are not placeholders. ₹25,000 came from
 * this catalogue's own measured price bands (every median and p75 under
 * ₹15,000); 48h and 168h came from what each failure can still be ATTRIBUTED
 * within; the exclusion list is the "unadjudicable, not merely expensive"
 * test. Config moves those numbers — it does not invent them, and an install
 * that configures nothing keeps every one of them along with its reasoning.
 *
 * ── 🛑 THE TRAP THIS MODULE EXISTS TO MAKE UNMISSABLE ──────────────────────
 *
 * **A longer claim window must drag the payout hold with it.** The hold has
 * to outlast every window through which money can still flow back OUT of an
 * order, or a seller is paid before the buyer's cover expires and WE fund the
 * claim. `resolvePayoutHoldDays` already accepts `maxClaimWindowHours` for
 * exactly this reason — so the rule is simply:
 *
 *   🛑 Pass `maxClaimWindowHours(resolved)`, NEVER
 *      `PROTECTION_CLAIM_WINDOW_HOURS.sale`.
 *
 * Reading the constant there would honour a 30-day configured window while
 * holding the money 7 days, silently.
 */

import {
  PROTECTION_CLAIM_WINDOW_HOURS,
  SALE_PROTECTION_EXCLUDED_LISTING_TYPES,
  SALE_PROTECTION_EXCLUDES_GRADED,
  SALE_PROTECTION_MAX_VALUE,
  type ProtectionKind,
} from "./protections";

/** The `siteSettings.protection` shape, narrowed so no caller passes a document. */
export interface ProtectionConfigSettings {
  saleMaxValue?: number;
  claimWindowHours?: { shipping?: number; sale?: number };
  excludedListingTypes?: string[];
  excludesGraded?: boolean;
}

export interface ResolvedProtectionConfig {
  saleMaxValue: number;
  claimWindowHours: Record<ProtectionKind, number>;
  excludedListingTypes: readonly string[];
  excludesGraded: boolean;
}

/**
 * A positive finite number, or the fallback.
 *
 * 🛑 POSITIVE, not merely finite. A `0` cap would mean "cover nothing" while
 * reading as "unset", and a `0` claim window would close the window at the
 * instant of delivery — both are states an admin reaches by clearing a field,
 * and neither is something anyone means. Withdrawing cover is a deliberate
 * act and belongs on the `*FeeEnabled` toggle, which says so.
 *
 * ⚠ So this is NOT the `??` rule used for prices, where a configured `0`
 * legitimately means free. The direction differs because the consequence
 * differs: a free add-on is a gift, a zero-hour claim window is a product
 * that cannot be claimed against.
 */
function positiveOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * The effective cover, given settings.
 *
 * ⚠ Total, never partial: every field resolves, so a caller can never read a
 * half-configured object and supply its own idea of the rest.
 */
export function resolveProtectionConfig(
  settings?: ProtectionConfigSettings,
): ResolvedProtectionConfig {
  return {
    saleMaxValue: positiveOr(settings?.saleMaxValue, SALE_PROTECTION_MAX_VALUE),
    claimWindowHours: {
      shipping: positiveOr(
        settings?.claimWindowHours?.shipping,
        PROTECTION_CLAIM_WINDOW_HOURS.shipping,
      ),
      sale: positiveOr(settings?.claimWindowHours?.sale, PROTECTION_CLAIM_WINDOW_HOURS.sale),
    },
    /*
     * 🛑 REPLACES rather than merges, and an EMPTY ARRAY IS A REAL ANSWER
     * meaning "exclude nothing". Merging would make an exclusion impossible
     * to remove by config, which is half a knob; and treating `[]` as unset
     * would make "cover everything" the one choice requiring a deploy.
     *
     * ⚠ `Array.isArray` and not truthiness, precisely so `[]` survives.
     */
    excludedListingTypes: Array.isArray(settings?.excludedListingTypes)
      ? settings.excludedListingTypes
      : SALE_PROTECTION_EXCLUDED_LISTING_TYPES,
    /*
     * `=== true` / `=== false` both honoured, absent falls back. A plain `??`
     * would be correct here too; this is spelled out because the surrounding
     * fields deliberately do NOT use `??`, and a reader comparing them should
     * see that the difference is intended.
     */
    excludesGraded:
      typeof settings?.excludesGraded === "boolean"
        ? settings.excludesGraded
        : SALE_PROTECTION_EXCLUDES_GRADED,
  };
}

/**
 * The longest window money can still flow back out through.
 *
 * 🛑 FEED THIS TO `resolvePayoutHoldDays`. It is the whole reason that
 * function takes `maxClaimWindowHours` instead of reading a constant, and
 * passing the constant instead is the silent failure described in the header.
 */
export function maxClaimWindowHours(config: ResolvedProtectionConfig): number {
  return Math.max(config.claimWindowHours.shipping, config.claimWindowHours.sale);
}
