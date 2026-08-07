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
// SB-UNI-F 2026-05-13 — Phase 2 union extension.
import * as classified from "./classified/config";
import * as digitalCode from "./digital-code/config";
import * as live from "./live/config";
// EMI/art-stickers session — printed-only physical-goods types.
import * as art from "./art/config";
import * as stickers from "./stickers/config";

import { LISTING_TYPE_CAPABILITIES } from "./capabilities";
import type { ListingType } from "../../../features/products/types/index";

export interface ListingTypePlugin {
  listingType: ListingType;
  slugPrefix: string;
  cartLine: "single-product" | "blocked" | "bundle-expand";
  /** Public detail-page href builder — replaces the ad-hoc per-type href pickers duplicated across card/link components. */
  detailRoute: (idOrSlug: string) => string;
  /** Card-grid badge shown for time-sensitive/action-required types (auction/pre-order); undefined = no badge. */
  badge?: { label: string; className: string };
  /** Seller create/edit form price-field label. */
  priceLabel: string;
  /** Human label for the listing type (breadcrumbs/titles). */
  typeLabel: string;
  /** Whether the seller create/edit form shows a Stock Quantity field. */
  showsStockQuantity: boolean;
}

// SB-UNI-D — bundle entry removed; bundles are a categoryType, not a listingType.
// SB-UNI-F 2026-05-13 — classified / digital-code / live added.
// EMI/art-stickers session — art / stickers added.
export const LISTING_TYPE_REGISTRY: Record<ListingType, ListingTypePlugin> = {
  standard: standard.config,
  auction: auction.config,
  "pre-order": preOrder.config,
  "prize-draw": prizeDraw.config,
  classified: classified.config,
  "digital-code": digitalCode.config,
  live: live.config,
  art: art.config,
  stickers: stickers.config,
};

export function pluginFor(type: ListingType): ListingTypePlugin {
  return LISTING_TYPE_REGISTRY[type];
}

/**
 * Infer a listing type from a product slug/id by matching its registered
 * `slugPrefix` — replaces ad-hoc `id.startsWith("auction-")` chains in
 * contexts (guest carts, unauthenticated payloads) that don't carry an
 * explicit `listingType` field. Falls back to "standard" when no prefix matches.
 */
export function detectListingTypeFromSlug(slug: string): ListingType {
  for (const plugin of Object.values(LISTING_TYPE_REGISTRY)) {
    if (plugin.slugPrefix && slug.startsWith(plugin.slugPrefix)) return plugin.listingType;
  }
  return "standard";
}

// Re-export the capability map so consumers can pull both surfaces from
// the same module path.
export { LISTING_TYPE_CAPABILITIES };
