/**
 * Listing-type plugin registry — SB-UNI X2.
 *
 * Adding a new listing type later means:
 *   1. Add a folder `<type>/{config,schema,ctas,og,seed-factory}.ts`
 *   2. Add a row to `LISTING_TYPE_CAPABILITIES` in `./capabilities.ts`
 *   3. Add the import + entry below
 *
 * No grep-the-codebase sweep required. Future-expansion Pattern 3.
 */

import * as standard from "./standard/config";
import * as auction from "./auction/config";
import * as preOrder from "./pre-order/config";
import * as prizeDraw from "./prize-draw/config";

import { LISTING_TYPE_CAPABILITIES } from "./capabilities";
import type { ListingType } from "../../../features/products/types/index";

export interface ListingTypePlugin {
  listingType: ListingType;
  slugPrefix: string;
  cartLine: "single-product" | "blocked" | "bundle-expand";
}

export const LISTING_TYPE_REGISTRY = {
  standard: standard.config,
  auction: auction.config,
  "pre-order": preOrder.config,
  "prize-draw": prizeDraw.config,
  // SB-UNI-D will drop the bundle entry when bundles move to categoryType.
  // Until then, bundles use the standard cart-line semantics.
  bundle: {
    listingType: "bundle" as ListingType,
    slugPrefix: "bundle-",
    cartLine: "bundle-expand" as const,
  },
} as const;

export function pluginFor(type: ListingType) {
  return LISTING_TYPE_REGISTRY[type];
}

// Re-export the capability map so consumers can pull both surfaces from
// the same module path.
export { LISTING_TYPE_CAPABILITIES };
