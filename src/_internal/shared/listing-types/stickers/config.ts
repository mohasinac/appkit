import { LISTING_TYPE_CAPABILITIES } from "../capabilities";
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
  sortOptions: STANDARD_SORT_OPTIONS,
  publicSortOptions: STANDARD_PUBLIC_SORT_OPTIONS,
  extraFacetKeys: [] as readonly string[],
};
