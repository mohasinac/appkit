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
 * `isBrowsePageEnabled` in `../listing-types/feature-flags`) — so a content
 * tag can never reference a flag that governs nothing.
 *
 * @tag domain:content
 * @tag layer:shared
 * @tag access:isomorphic
 * @tag sideEffects:none
 */

import type { ListingType } from "../../../features/products/types/index";
import type { CategoryType } from "../../../features/categories/types/index";
import {
  isListingTypeEnabled,
  isCategoryTypeEnabled,
  isBrowsePageEnabled,
  type BrowsePageKey,
} from "../listing-types/feature-flags";

/**
 * What a piece of content depends on being enabled. A FAQ about collector-drop
 * bidding carries `{ governs: "listingType", value: "collector-drop" }`; a
 * homepage section plugging the brand directory carries
 * `{ governs: "browsePage", value: "brands" }`.
 */
export interface ContentTag {
  governs: "listingType" | "categoryType" | "browsePage";
  value: string;
}

/** The snapshot shape every `isXEnabled` helper in `feature-flags.ts` reads. */
interface ContentFlagSnapshot {
  listings?: {
    listingTypes?: Partial<Record<string, boolean>>;
    categoryTypes?: Partial<Record<string, boolean>>;
    browsePages?: Partial<Record<string, boolean>>;
  };
}

/**
 * `true` when EVERY tag on the content is still satisfied — absent/empty
 * `tags` is always visible, matching the "absent means enabled" default every
 * other flag check in this codebase uses (an install predating content
 * tagging must not have everything vanish).
 *
 * Tags are AND'd, not OR'd: a FAQ explaining both collector-drop bidding and
 * random-lots odds should disappear the moment either type closes, not stay
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
      default:
        // Exhaustiveness: a future `governs` member must be handled above,
        // not silently pass every check it was supposed to gate.
        return true;
    }
  });
}
