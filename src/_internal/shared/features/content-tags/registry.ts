/**
 * Content tagging — one resolver for "does this document's governing flag
 * still allow it to be shown."
 *
 * A disabled listing type does not, on its own, remove a line mentioning it
 * from a FAQ, a homepage section, or a nav item. `hidden-surfaces.ts` and
 * `feature-flags.ts` already decide which ROUTES a disabled type hides; this
 * module answers the same question for a stored CONTENT document that merely
 * references a type/category/browse-page rather than being one.
 *
 * 🛑 `governs` is deliberately NOT a free-form "feature" flag key.
 * `siteSettings.featureFlags` — a generic string-keyed boolean bag — was
 * DELETED 2026-08-29 (see `appkit/src/features/admin/schemas/firestore.ts`
 * around the "11 of its 14 keys had zero readers" note) precisely because an
 * admin could flip an entry and nothing would happen. `ContentTag.governs` is
 * restricted to the three flag groups that genuinely exist and already have
 * real readers (`isListingTypeEnabled`, `isCategoryTypeEnabled`,
 * `isBrowsePageEnabled` in `../../listing-types/feature-flags`) — so a content
 * tag can never reference a flag that governs nothing.
 *
 * @tag domain:content
 * @tag layer:shared
 * @tag access:isomorphic
 * @tag sideEffects:none
 */

import type { ListingType } from "../../../../features/products/types/index";
import type { CategoryType } from "../../../../features/categories/types/index";
import {
  isListingTypeEnabled,
  isCategoryTypeEnabled,
  isBrowsePageEnabled,
  isOnlinePaymentEnabled,
  type BrowsePageKey,
  type FlagValue,
} from "../../listing-types/feature-flags";

/**
 * What a piece of content depends on being enabled. A FAQ about collector-drop
 * bidding carries `{ governs: "listingType", value: "collector-drop" }`; a
 * homepage section plugging the brand directory carries
 * `{ governs: "browsePage", value: "brands" }`.
 */
export interface ContentTag {
  /**
   * ⚠ `paymentMethod` governs PROSE, not a surface — the other three decide
   * whether a page or link exists, this one decides which SENTENCE a legal
   * page publishes. Added 2026-11-12 so the approved payment paragraph ("Our
   * only payment method is Cash on Delivery") cannot keep asserting that after
   * a gateway is enabled. Its only value today is `"online"`.
   */
  governs: "listingType" | "categoryType" | "browsePage" | "paymentMethod";
  value: string;
}

/** The snapshot shape every `isXEnabled` helper in `feature-flags.ts` reads. */
export interface ContentFlagSnapshot {
  listings?: {
    listingTypes?: Partial<Record<string, FlagValue>>;
    categoryTypes?: Partial<Record<string, FlagValue>>;
    browsePages?: Partial<Record<string, FlagValue>>;
  };
  /**
   * The gateway flags, for `governs: "paymentMethod"`. Same field names
   * `siteSettings.payment` already stores, so a caller passes the settings
   * document straight through with no mapping step to drift.
   *
   * ⚠ Optional, and an absent group does NOT mean "no gateway" — see
   * `isOnlinePaymentEnabled`, whose default is deliberately the opposite of
   * every other flag in that file.
   */
  payment?: {
    razorpayEnabled?: boolean;
    phonepeEnabled?: boolean;
    cashfreeEnabled?: boolean;
    codEnabled?: boolean;
  };
}

/**
 * `true` when EVERY tag on the content is still satisfied — absent/empty
 * `tags` is always visible, matching the "absent means enabled" default every
 * other flag check in this codebase uses (an install predating content
 * tagging must not have everything vanish).
 *
 * Tags are AND'd, not OR'd: a FAQ explaining both collector-drop bidding and
 * clearance odds should disappear the moment either type closes, not stay
 * up because the other is still open and give half-true instructions.
 */
export function isContentVisible(
  tags: ContentTag[] | undefined,
  settings: ContentFlagSnapshot | null | undefined,
): boolean {
  if (!tags || tags.length === 0) return true;
  return tags.every((tag) => {
    switch (tag.governs) {
      case "listingType":
        return isListingTypeEnabled(tag.value as ListingType, settings);
      case "categoryType":
        return isCategoryTypeEnabled(tag.value as CategoryType, settings);
      case "browsePage":
        return isBrowsePageEnabled(tag.value as BrowsePageKey, settings);
      case "paymentMethod":
        /*
         * Only `"online"` is meaningful today. An unrecognised value falls to
         * the same answer as an absent snapshot — see `isOnlinePaymentEnabled`,
         * where the default is deliberately "disclose more", because the
         * asymmetric risk here is a policy FAILING to disclose card handling,
         * not one disclosing a tender the store does not take.
         */
        return isOnlinePaymentEnabled(settings);
      default:
        /*
         * 🛑 FAILS CLOSED, changed 2026-11-12.
         *
         * This returned `true` under a comment warning that *"a future
         * `governs` member must be handled above, not silently pass every
         * check it was supposed to gate"* — i.e. it named the hazard and then
         * chose it. Adding `paymentMethod` is exactly the "future member" that
         * comment anticipated, and for a payment claim fail-open is the
         * dangerous direction: an unhandled tag would render a COD-only
         * sentence with a gateway live.
         *
         * Hiding content is the recoverable failure (an operator sees a gap);
         * publishing a false claim is not. Unreachable today — the union is
         * closed and every member is handled above — so this costs nothing
         * now and is correct when it eventually fires.
         */
        return false;
    }
  });
}
