import { LISTING_TYPE_CAPABILITIES } from "../capabilities";
import type { AvailabilityRow } from "../availability";
import { ROUTES } from "../../../../next/routing/route-map";
import { TABLE_KEYS } from "../../../../constants/table-keys";
import { PRODUCT_FIELDS } from "../../../../constants/field-names";
import {
  RANDOM_LOTS_SORT_OPTIONS,
  RANDOM_LOTS_PUBLIC_SORT_OPTIONS,
} from "../../../../features/products/constants/sieve";

export const LISTING_TYPE = "random-lots" as const;
export const capability = LISTING_TYPE_CAPABILITIES["random-lots"];
export const config = {
  listingType: LISTING_TYPE,
  slugPrefix: "randomlots-",
  cartLine: "single-product" as const,
  detailRoute: (idOrSlug: string) => String(ROUTES.PUBLIC.RANDOM_LOTS_DETAIL(idOrSlug)),
  badge: { label: "Random Lots", className: "bg-primary text-white" },
  priceLabel: "Price (₹)",
  typeLabel: "Random Lots",
  showsStockQuantity: false,

  tabSlug: "random-lots",
  pluralLabel: "Random Lots",
  chipLabel: "Random Lots",
  browseRoute: String(ROUTES.PUBLIC.RANDOM_LOTS),
  // /random-lots is in MAIN_NAV_ITEMS. Entry-based pricing reads wrong beside
  // ordinary unit prices in the general grid.
  inGeneralCatalogue: false,
  // sells ENTRIES at a fixed price; a group line would blur what was entered
  canJoinProductGroup: false,
  iconKey: "randomLots" as const,
  hideDefault: "closed" as const,
  // `prizeRevealStatus`, NOT remaining entries: a draw can close with slots
  // unsold (the seller ends it early, or the reveal window lapses), and it can
  // sell every slot while still open pending the reveal. Only the status field
  // answers "can someone still enter this".
  isAvailable: (row: AvailabilityRow) =>
    row[PRODUCT_FIELDS.PRIZE_REVEAL_STATUS] !==
    PRODUCT_FIELDS.PRIZE_REVEAL_STATUS_VALUES.CLOSED,
  unavailableClauses: [
    {
      field: PRODUCT_FIELDS.PRIZE_REVEAL_STATUS,
      op: "eq" as const,
      value: PRODUCT_FIELDS.PRIZE_REVEAL_STATUS_VALUES.CLOSED,
    },
    { field: PRODUCT_FIELDS.AVAILABLE_QUANTITY, op: "eq" as const, value: 0 },
  ],
  sortOptions: RANDOM_LOTS_SORT_OPTIONS,
  publicSortOptions: RANDOM_LOTS_PUBLIC_SORT_OPTIONS,
  extraFacetKeys: [TABLE_KEYS.PRIZE_REVEAL_STATUS] as readonly string[],
};
