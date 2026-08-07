import { LISTING_TYPE_CAPABILITIES } from "../capabilities";
import { ROUTES } from "../../../../next/routing/route-map";

export const LISTING_TYPE = "art" as const;
export const capability = LISTING_TYPE_CAPABILITIES.art;
export const config = {
  listingType: LISTING_TYPE,
  slugPrefix: "art-",
  cartLine: "single-product" as const,
  detailRoute: (idOrSlug: string) => String(ROUTES.PUBLIC.PRODUCT_DETAIL(idOrSlug)),
  badge: undefined as { label: string; className: string } | undefined,
  priceLabel: "Price (₹)",
  typeLabel: "Art Print",
  showsStockQuantity: true,
};
