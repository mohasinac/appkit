import { LISTING_TYPE_CAPABILITIES } from "../capabilities";
import { ROUTES } from "../../../../next/routing/route-map";
import { TABLE_KEYS } from "../../../../constants/table-keys";
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
  sortOptions: PRIZE_DRAW_SORT_OPTIONS,
  publicSortOptions: PRIZE_DRAW_PUBLIC_SORT_OPTIONS,
  extraFacetKeys: [TABLE_KEYS.PRIZE_REVEAL_STATUS] as readonly string[],
};
