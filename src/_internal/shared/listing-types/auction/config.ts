import { LISTING_TYPE_CAPABILITIES } from "../capabilities";
import { toDate, type AvailabilityRow } from "../availability";
import { ROUTES } from "../../../../next/routing/route-map";
import { TABLE_KEYS } from "../../../../constants/table-keys";
import { PRODUCT_FIELDS } from "../../../../constants/field-names";
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
  // There is no `auctionStatus` field — "ended" is purely the end date having
  // passed. An auction with no end date at all is treated as live rather than
  // hidden; a missing date is a data defect, not a signal that it is over.
  isAvailable: (row: AvailabilityRow, now: Date) => {
    const end = toDate(row[PRODUCT_FIELDS.AUCTION_END_DATE]);
    return end === null || end > now;
  },
  unavailableClauses: [
    // The ONLY inequality in the registry — safe because it names the sort
    // field the query must order by, which is also the natural sort for an
    // "ended auctions" archive ("Recently Ended").
    {
      field: PRODUCT_FIELDS.AUCTION_END_DATE,
      op: "lt" as const,
      value: "NOW" as const,
      sortField: PRODUCT_FIELDS.AUCTION_END_DATE,
    },
    { field: PRODUCT_FIELDS.IS_SOLD, op: "eq" as const, value: true },
  ],
  sortOptions: AUCTION_SORT_OPTIONS,
  publicSortOptions: AUCTION_PUBLIC_SORT_OPTIONS,
  extraFacetKeys: [
    TABLE_KEYS.MIN_BID,
    TABLE_KEYS.MAX_BID,
    TABLE_KEYS.DATE_FROM,
    TABLE_KEYS.DATE_TO,
  ] as readonly string[],
};
