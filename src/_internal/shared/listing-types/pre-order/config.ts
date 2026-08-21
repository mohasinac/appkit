import { LISTING_TYPE_CAPABILITIES } from "../capabilities";
import { ROUTES } from "../../../../next/routing/route-map";
import { TABLE_KEYS } from "../../../../constants/table-keys";
import {
  PREORDER_SORT_OPTIONS,
  PREORDER_PUBLIC_SORT_OPTIONS,
} from "../../../../features/products/constants/sieve";

export const LISTING_TYPE = "pre-order" as const;
export const capability = LISTING_TYPE_CAPABILITIES["pre-order"];
export const config = {
  listingType: LISTING_TYPE,
  slugPrefix: "preorder-",
  cartLine: "single-product" as const,
  detailRoute: (idOrSlug: string) => String(ROUTES.PUBLIC.PRE_ORDER_DETAIL(idOrSlug)),
  badge: { label: "Pre-Order", className: "bg-info-solid text-info-on-solid" },
  priceLabel: "Pre-Order Price (₹)",
  typeLabel: "Pre-Order",
  showsStockQuantity: false,

  tabSlug: "pre-orders",
  pluralLabel: "Pre-Orders",
  chipLabel: "Pre-Orders",
  browseRoute: String(ROUTES.PUBLIC.PRE_ORDERS),
  hideDefault: "closed" as const,
  sortOptions: PREORDER_SORT_OPTIONS,
  publicSortOptions: PREORDER_PUBLIC_SORT_OPTIONS,
  extraFacetKeys: [
    TABLE_KEYS.PREORDER_STATUS,
    TABLE_KEYS.DATE_FROM,
    TABLE_KEYS.DATE_TO,
  ] as readonly string[],
};
