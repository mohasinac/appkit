import { LISTING_TYPE_CAPABILITIES } from "../capabilities";
import { ROUTES } from "../../../../next/routing/route-map";

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
};
