import { LISTING_TYPE_CAPABILITIES } from "../capabilities";
import { ROUTES } from "../../../../next/routing/route-map";

export const LISTING_TYPE = "classified" as const;
export const capability = LISTING_TYPE_CAPABILITIES.classified;
export const config = {
  listingType: LISTING_TYPE,
  slugPrefix: "classified-",
  cartLine: "blocked" as const,
  detailRoute: (idOrSlug: string) => String(ROUTES.PUBLIC.PRODUCT_DETAIL(idOrSlug)),
  badge: undefined as { label: string; className: string } | undefined,
  priceLabel: "Asking Price (₹)",
  typeLabel: "Classified",
  showsStockQuantity: true,
};
