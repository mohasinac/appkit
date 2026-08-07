import { LISTING_TYPE_CAPABILITIES } from "../capabilities";
import { ROUTES } from "../../../../next/routing/route-map";

export const LISTING_TYPE = "pre-order" as const;
export const capability = LISTING_TYPE_CAPABILITIES["pre-order"];
export const config = {
  listingType: LISTING_TYPE,
  slugPrefix: "preorder-",
  cartLine: "single-product" as const,
  detailRoute: (idOrSlug: string) => String(ROUTES.PUBLIC.PRE_ORDER_DETAIL(idOrSlug)),
  badge: { label: "Pre-Order", className: "bg-info-surface text-white" },
  priceLabel: "Pre-Order Price (₹)",
  typeLabel: "Pre-Order",
  showsStockQuantity: false,
};
