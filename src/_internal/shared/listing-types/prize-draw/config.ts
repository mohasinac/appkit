import { LISTING_TYPE_CAPABILITIES } from "../capabilities";
import type { AvailabilityRow } from "../availability";
import { ROUTES } from "../../../../next/routing/route-map";
import { TABLE_KEYS } from "../../../../constants/table-keys";
import { PRODUCT_FIELDS } from "../../../../constants/field-names";
import {
  PRIZE_DRAW_SORT_OPTIONS,
  PRIZE_DRAW_PUBLIC_SORT_OPTIONS,
} from "../../../../features/products/constants/sieve";

export const LISTING_TYPE = "prize-draw" as const;
export const capability = LISTING_TYPE_CAPABILITIES["prize-draw"];
export const config = {
  listingType: LISTING_TYPE,
  slugPrefix: "prizedraw-",
  cartLine: "single-product" as const,
  detailRoute: (idOrSlug: string) => String(ROUTES.PUBLIC.PRIZE_DRAW_DETAIL(idOrSlug)),
  badge: { label: "Prize Draw", className: "bg-primary text-white" },
  priceLabel: "Price (₹)",
  typeLabel: "Prize Draw",
  showsStockQuantity: false,

  tabSlug: "prize-draws",
  pluralLabel: "Prize Draws",
  chipLabel: "Prize Draws",
  browseRoute: String(ROUTES.PUBLIC.PRIZE_DRAWS),
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
  sortOptions: PRIZE_DRAW_SORT_OPTIONS,
  publicSortOptions: PRIZE_DRAW_PUBLIC_SORT_OPTIONS,
  extraFacetKeys: [TABLE_KEYS.PRIZE_REVEAL_STATUS] as readonly string[],
};
