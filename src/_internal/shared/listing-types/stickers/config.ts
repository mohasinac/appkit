import { LISTING_TYPE_CAPABILITIES } from "../capabilities";
import {
  alwaysAvailable,
  STOCK_ONLY_UNAVAILABLE_CLAUSES,
} from "../availability";
import { ROUTES } from "../../../../next/routing/route-map";
import {
  STANDARD_SORT_OPTIONS,
  STANDARD_PUBLIC_SORT_OPTIONS,
} from "../../../../features/products/constants/sieve";

export const LISTING_TYPE = "stickers" as const;
export const capability = LISTING_TYPE_CAPABILITIES.stickers;
export const config = {
  listingType: LISTING_TYPE,
  slugPrefix: "sticker-",
  cartLine: "single-product" as const,
  detailRoute: (idOrSlug: string) => String(ROUTES.PUBLIC.PRODUCT_DETAIL(idOrSlug)),
  badge: { label: "Sticker Sheet", className: "bg-primary-700 text-white" },
  priceLabel: "Price (₹)",
  typeLabel: "Stickers",
  showsStockQuantity: true,

  tabSlug: "stickers",
  pluralLabel: "Stickers",
  chipLabel: "Stickers",
  // Stickers share the combined `/art` browse page with art prints — they
  // have no page of their own, which is why this points at ART rather than
  // a `/stickers` route that does not exist.
  browseRoute: String(ROUTES.PUBLIC.ART),
  hideDefault: "sold" as const,
  // Runs out rather than ending — no time dimension, so the shared
  // stock-only rules are the whole story for this type.
  isAvailable: alwaysAvailable,
  unavailableClauses: STOCK_ONLY_UNAVAILABLE_CLAUSES,
  sortOptions: STANDARD_SORT_OPTIONS,
  publicSortOptions: STANDARD_PUBLIC_SORT_OPTIONS,
  extraFacetKeys: [] as readonly string[],
};
