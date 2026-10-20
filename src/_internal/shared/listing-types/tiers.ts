/**
 * Which listing types a store may create: the basic/advanced split.
 *
 * ── The rule ──────────────────────────────────────────────────────────────
 *
 * `standard`, `spares` and `auction` are BASIC — every store can use them.
 * The other seven are ADVANCED and need the `advanced_listing_types`
 * capability, because each carries an obligation a new seller has not agreed
 * to yet: a pre-order takes money for stock that does not exist, a prize draw
 * is a regulated promotion, a classified happens off-platform with no escrow,
 * a digital code must be delivered from a pool the seller has to keep stocked,
 * and a live listing is an animal.
 *
 * ── Why a Record and not an array ─────────────────────────────────────────
 *
 * 🛑 `Record<ListingType, ListingTypeTier>`, so adding a member to the union
 * is a COMPILE error here rather than a silent omission that defaults to
 * whichever branch the code happens to fall through to.
 * `features/products/types/index.ts` warns that adding a union member touches
 * 21 named sites of which only 11 are compile-checked; this file is written to
 * be one of the eleven. Root Cause #61.
 *
 * ── Why `capabilities` is `readonly string[]` and not `StoreCapability[]` ──
 *
 * Two reasons, and the first is the honest one: that is what is actually
 * STORED. `storeFirestoreSchema` validates the field as `z.array(z.string())`,
 * so a capability that is not a union member round-trips today and this helper
 * must not pretend otherwise. The second is that it keeps this module free of
 * an import from `features/auth/permissions/constants`, which is the kind of
 * cross-feature edge `audit-import-cycles` exists to watch.
 *
 * A `StoreCapability[]` is assignable to it, so a typed caller loses nothing.
 */

import { AuthorizationError } from "../../../errors";
import type { ListingType } from "../../../features/products/types/index";
import type { JsonValue } from "../../../schemas/types";
import { ALL_LISTING_TYPES } from "./feature-flags";

export type ListingTypeTier = "basic" | "advanced";

/**
 * The capability that unlocks every advanced type at once.
 *
 * One flag rather than seven, deliberately: the question a seller is actually
 * answering is "do I want the complicated listing kinds", and seven checkboxes
 * invite six of them to be wrong. An admin who needs finer control has the
 * per-type legacy grants below.
 */
export const ADVANCED_LISTING_TYPE_CAPABILITY = "advanced_listing_types";

export const LISTING_TYPE_TIER: Record<ListingType, ListingTypeTier> = {
  standard: "basic",
  spares: "basic",
  auction: "basic",
  "pre-order": "advanced",
  "prize-draw": "advanced",
  classified: "advanced",
  "digital-code": "advanced",
  live: "advanced",
  art: "advanced",
  stickers: "advanced",
};

/**
 * Capabilities that grant ONE advanced type on their own, for stores that were
 * granted it before `advanced_listing_types` existed.
 *
 * 🛑 Load-bearing, not politeness. `host_preorders` is a real capability some
 * live stores already carry; dropping it would silently revoke pre-order
 * access from a seller who had been using it, and a permission that disappears
 * on deploy is indistinguishable from a bug.
 *
 * `host_auctions` deliberately has NO entry: `auction` is basic now, so the
 * check is gone. The capability string stays declared in the union so existing
 * store documents carrying it remain valid — it simply no longer gates
 * anything.
 */
const LEGACY_PER_TYPE_GRANT: Partial<Record<ListingType, string>> = {
  "pre-order": "host_preorders",
};

export function isAdvancedListingType(listingType: ListingType): boolean {
  return LISTING_TYPE_TIER[listingType] === "advanced";
}

/**
 * Does this capability array carry the advanced-types grant?
 *
 * Exists so no call site has to spell the capability string, and so none has
 * to cast: `capabilities` is `StoreCapability[]` in typed code and
 * `string[]` as stored, and an `.includes()` across that boundary is where an
 * `as never` gets reached for — which silences every other check on the
 * expression, not just the one being worked around.
 */
export function hasAdvancedListingTypes(
  capabilities: readonly string[] | null | undefined,
): boolean {
  return (capabilities ?? []).includes(ADVANCED_LISTING_TYPE_CAPABILITY);
}

/** The types every store can use, with no capability at all. */
export const BASIC_LISTING_TYPES: ListingType[] = ALL_LISTING_TYPES.filter(
  (t) => LISTING_TYPE_TIER[t] === "basic",
);

export const ADVANCED_LISTING_TYPES: ListingType[] = ALL_LISTING_TYPES.filter(
  (t) => LISTING_TYPE_TIER[t] === "advanced",
);

export interface ListingTypeAccessContext {
  /** Admins and employees bypass the tier entirely. */
  isPrivileged?: boolean;
  /** The store's stored capability array. Absent/empty is treated as none. */
  capabilities?: readonly string[] | null;
}

/**
 * May this store create or convert to this listing type?
 *
 * Pure — takes the capability array the caller already holds rather than
 * re-reading the store. Every gate site in the codebase has the store document
 * in scope already, and a helper that fetched would add one Firestore read per
 * product write against Rule #6's round-trip budget.
 */
export function isListingTypeAllowedFor(
  listingType: ListingType,
  ctx: ListingTypeAccessContext = {},
): boolean {
  if (ctx.isPrivileged) return true;
  if (!isAdvancedListingType(listingType)) return true;
  const caps = ctx.capabilities ?? [];
  if (caps.includes(ADVANCED_LISTING_TYPE_CAPABILITY)) return true;
  const legacy = LEGACY_PER_TYPE_GRANT[listingType];
  return legacy ? caps.includes(legacy) : false;
}

/** Every type this store may use, for building a picker or filtering nav. */
export function listingTypesAllowedFor(
  ctx: ListingTypeAccessContext = {},
): ListingType[] {
  return ALL_LISTING_TYPES.filter((t) => isListingTypeAllowedFor(t, ctx));
}

/**
 * Throwing form, for the server-side write paths.
 *
 * 🛑 `listingType` being absent is ALLOWED and must stay that way. Both product
 * schemas declare it optional, and a partial update that touches only `status`
 * or `stockQuantity` carries no type at all — refusing those would break every
 * stock decrement and status flip in the app. The gate's job is to refuse a
 * NAMED advanced type, not to require one.
 *
 * 🛑 On an UPDATE, the caller must additionally compare against the STORED
 * type and skip this when they match — see `sellerUpdateProduct`. Every
 * per-type edit page re-sends its own type literal, so asserting on the
 * submitted value alone locks a seller out of editing listings they already
 * own as soon as the capability is withdrawn. The rule is about creating and
 * converting, not about touching.
 */
export function assertListingTypeAllowed(
  /*
   * `JsonValue | undefined`, not `unknown`. The callers hold
   * `Record<string, JsonValue>` request bodies, so this is the widest type the
   * value can genuinely have — and naming it keeps the narrowing below honest,
   * where `unknown` would let any argument at all through the door and leave
   * the type-level signal at the call site worth nothing
   * (`audit-unknown-leakage`).
   */
  listingType: JsonValue | undefined,
  ctx: ListingTypeAccessContext = {},
): void {
  if (typeof listingType !== "string") return;
  if (!(listingType in LISTING_TYPE_TIER)) return;
  const typed = listingType as ListingType;
  if (isListingTypeAllowedFor(typed, ctx)) return;
  throw new AuthorizationError(
    `Your store is not approved to create ${typed} listings. ` +
      `Enable advanced listing types in your store settings first.`,
  );
}
