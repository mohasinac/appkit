import { LISTING_TYPE_CAPABILITIES } from "../capabilities";
import { ROUTES } from "../../../../next/routing/route-map";
import { TABLE_KEYS } from "../../../../constants/table-keys";
import {
  AUCTION_SORT_OPTIONS,
  AUCTION_PUBLIC_SORT_OPTIONS,
} from "../../../../features/products/constants/sieve";

export const LISTING_TYPE = "auction" as const;
export const capability = LISTING_TYPE_CAPABILITIES.auction;
export const config = {
  listingType: LISTING_TYPE,
  slugPrefix: "auction-",
  cartLine: "blocked" as const,
  detailRoute: (idOrSlug: string) => String(ROUTES.PUBLIC.AUCTION_DETAIL(idOrSlug)),
  badge: { label: "Auction", className: "bg-warning-solid text-warning-on-solid" },
  priceLabel: "Suggested Retail Price (₹)",
  typeLabel: "Auction",
  showsStockQuantity: false,

  tabSlug: "auctions",
  pluralLabel: "Auctions",
  chipLabel: "Auctions",
  browseRoute: String(ROUTES.PUBLIC.AUCTIONS),
  // An auction is never "sold out" — it ends. Hiding by stock would hide
  // every live auction, since auctions don't carry meaningful stock.
  hideDefault: "ended" as const,
  sortOptions: AUCTION_SORT_OPTIONS,
  publicSortOptions: AUCTION_PUBLIC_SORT_OPTIONS,
  extraFacetKeys: [
    TABLE_KEYS.MIN_BID,
    TABLE_KEYS.MAX_BID,
    TABLE_KEYS.DATE_FROM,
    TABLE_KEYS.DATE_TO,
  ] as readonly string[],
};
