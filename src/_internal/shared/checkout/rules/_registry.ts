/**
 * Checkout rule registry — S-SBUNI-RULES 2026-05-13.
 *
 * Adding a new ListingType later means:
 *   1. Create `<type>.rule.ts` with just the overrides from DEFAULT_LISTING_RULE
 *   2. Add a capability row in `_internal/shared/listing-types/capabilities.ts`
 *   3. Add the import + entry to CHECKOUT_RULES below
 *
 * No grep of the consumer codebase needed.
 */

import type { ListingType } from "../../../../features/products/types/index";
import type { CartItemDocument } from "../../../../features/cart/schemas/firestore";
import type {
  ListingCheckoutRule,
  CategoryCheckoutRule,
  CartItemProductPair,
} from "./types";
import type { OrderType } from "../../../../features/orders/utils/order-splitter";
import { standardRule } from "./standard.rule";
import { auctionRule } from "./auction.rule";
import { preOrderRule } from "./preorder.rule";
import { prizeDrawRule } from "./prize-draw.rule";
import { offerRule } from "./offer.rule";
import { bundleRule } from "./bundle.rule";
import { classifiedRule } from "./classified.rule";
import { digitalCodeRule } from "./digital-code.rule";
import { liveRule } from "./live.rule";

export const CHECKOUT_RULES: Record<ListingType, ListingCheckoutRule> = {
  standard: standardRule,
  auction: auctionRule,
  "pre-order": preOrderRule,
  "prize-draw": prizeDrawRule,
  classified: classifiedRule,
  "digital-code": digitalCodeRule,
  live: liveRule,
};

export const CATEGORY_CHECKOUT_RULES: Record<string, CategoryCheckoutRule> = {
  bundle: bundleRule,
};

/**
 * Lookup the checkout rule for a listing type. Every consumer that used to
 * inline `if (listingType === "X")` should call this instead.
 */
export function getListingRule(listingType: ListingType): ListingCheckoutRule {
  return CHECKOUT_RULES[listingType] ?? CHECKOUT_RULES.standard;
}

/**
 * Lookup the checkout rule for a category type. Returns null for
 * non-purchaseable category types (sublisting, brand, category).
 */
export function getCategoryRule(categoryType: string): CategoryCheckoutRule | null {
  return CATEGORY_CHECKOUT_RULES[categoryType] ?? null;
}

/**
 * Pick the OrderType for a cart item — replaces the if/else cascade in
 * splitCartIntoOrderGroups.
 */
export function pickOrderType(item: CartItemDocument): OrderType {
  if (item.isOffer) return offerRule.orderType;
  const lt = (item.listingType ?? "standard") as ListingType;
  return (CHECKOUT_RULES[lt] ?? CHECKOUT_RULES.standard).orderType;
}

/**
 * Get the order-grouping split key for a cart item — replaces the inline
 * key construction in splitCartIntoOrderGroups.
 */
export function getSplitKey(item: CartItemDocument): string {
  if (item.isOffer) return offerRule.splitKey(item);
  const lt = (item.listingType ?? "standard") as ListingType;
  return (CHECKOUT_RULES[lt] ?? CHECKOUT_RULES.standard).splitKey(item);
}

/**
 * Run all synchronous preflight guards across a cart.  Each item is tested
 * against its type's rule.  Throws ValidationError on first violation.
 *
 * Note: the async maxPerUser cap check remains in the server-only
 * `enforceMaxPerUserForCart` (prize-bundle-gates.ts) and runs separately.
 */
export function runSyncPreflight(pairs: CartItemProductPair[]): void {
  const byType = new Map<ListingType, CartItemProductPair[]>();
  for (const pair of pairs) {
    if (pair.item.bundleProductIds?.length) continue; // bundles skip — direct checkout
    const lt = (pair.item.listingType ?? "standard") as ListingType;
    const bucket = byType.get(lt) ?? [];
    bucket.push(pair);
    byType.set(lt, bucket);
  }
  for (const [lt, ltPairs] of byType) {
    const rule = CHECKOUT_RULES[lt] ?? CHECKOUT_RULES.standard;
    rule.preflightChecks(ltPairs);
  }
}
