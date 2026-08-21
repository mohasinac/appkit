import { LISTING_TYPE_CAPABILITIES } from "../capabilities";
import { ROUTES } from "../../../../next/routing/route-map";
import {
  STANDARD_SORT_OPTIONS,
  STANDARD_PUBLIC_SORT_OPTIONS,
} from "../../../../features/products/constants/sieve";

export const LISTING_TYPE = "standard" as const;
export const capability = LISTING_TYPE_CAPABILITIES.standard;
export const config = {
  listingType: LISTING_TYPE,
  slugPrefix: "product-",
  cartLine: "single-product" as const,
  detailRoute: (idOrSlug: string) => String(ROUTES.PUBLIC.PRODUCT_DETAIL(idOrSlug)),
  badge: undefined as { label: string; className: string } | undefined,
  priceLabel: "Price (₹)",
  typeLabel: "Product",
  showsStockQuantity: true,

  tabSlug: "products",
  pluralLabel: "Products",
  chipLabel: "Standard",
  browseRoute: String(ROUTES.PUBLIC.PRODUCTS),
  hideDefault: "sold" as const,
  sortOptions: STANDARD_SORT_OPTIONS,
  publicSortOptions: STANDARD_PUBLIC_SORT_OPTIONS,
  extraFacetKeys: [] as readonly string[],
};
