import { LISTING_TYPE_CAPABILITIES } from "../capabilities";
import { ROUTES } from "../../../../next/routing/route-map";

export const LISTING_TYPE = "auction" as const;
export const capability = LISTING_TYPE_CAPABILITIES.auction;
export const config = {
  listingType: LISTING_TYPE,
  slugPrefix: "auction-",
  cartLine: "blocked" as const,
  detailRoute: (idOrSlug: string) => String(ROUTES.PUBLIC.AUCTION_DETAIL(idOrSlug)),
  badge: { label: "Auction", className: "bg-warning-surface text-white" },
  priceLabel: "Suggested Retail Price (₹)",
  typeLabel: "Auction",
  showsStockQuantity: false,
};
