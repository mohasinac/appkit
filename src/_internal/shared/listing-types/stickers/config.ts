import { LISTING_TYPE_CAPABILITIES } from "../capabilities";
import { ROUTES } from "../../../../next/routing/route-map";

export const LISTING_TYPE = "stickers" as const;
export const capability = LISTING_TYPE_CAPABILITIES.stickers;
export const config = {
  listingType: LISTING_TYPE,
  slugPrefix: "sticker-",
  cartLine: "single-product" as const,
  detailRoute: (idOrSlug: string) => String(ROUTES.PUBLIC.PRODUCT_DETAIL(idOrSlug)),
  badge: undefined as { label: string; className: string } | undefined,
  priceLabel: "Price (₹)",
  typeLabel: "Stickers",
  showsStockQuantity: true,
};
