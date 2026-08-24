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

export const LISTING_TYPE = "art" as const;
export const capability = LISTING_TYPE_CAPABILITIES.art;
export const config = {
  listingType: LISTING_TYPE,
  slugPrefix: "art-",
  cartLine: "single-product" as const,
  detailRoute: (idOrSlug: string) => String(ROUTES.PUBLIC.PRODUCT_DETAIL(idOrSlug)),
  badge: { label: "Art Print", className: "bg-primary-700 text-white" },
  priceLabel: "Price (₹)",
  typeLabel: "Art Print",
  showsStockQuantity: true,

  tabSlug: "art",
  pluralLabel: "Art",
  chipLabel: "Art",
  // `/art` is a COMBINED browse page spanning art + stickers, and art
  // detail pages use the standard product route — so this is a real
  // dedicated browse surface even though detailRoute points at /products.
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
