import { LISTING_TYPE_CAPABILITIES } from "../capabilities";
import { ROUTES } from "../../../../next/routing/route-map";

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
};
