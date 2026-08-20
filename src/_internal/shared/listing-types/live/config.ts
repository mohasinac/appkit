import { LISTING_TYPE_CAPABILITIES } from "../capabilities";
import { ROUTES } from "../../../../next/routing/route-map";

export const LISTING_TYPE = "live" as const;
export const capability = LISTING_TYPE_CAPABILITIES.live;
export const config = {
  listingType: LISTING_TYPE,
  slugPrefix: "live-",
  cartLine: "single-product" as const,
  detailRoute: (idOrSlug: string) => String(ROUTES.PUBLIC.LIVE_DETAIL(idOrSlug)),
  badge: undefined as { label: string; className: string } | undefined,
  priceLabel: "Price (₹)",
  typeLabel: "Live Item",
  showsStockQuantity: true,
};
