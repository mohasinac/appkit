import { LISTING_TYPE_CAPABILITIES } from "../capabilities";
import {
  alwaysAvailable,
  STOCK_ONLY_UNAVAILABLE_CLAUSES,
} from "../availability";
import { ROUTES } from "../../../../next/routing/route-map";
import { TABLE_KEYS } from "../../../../constants/table-keys";
import {
  STANDARD_SORT_OPTIONS,
  STANDARD_PUBLIC_SORT_OPTIONS,
} from "../../../../features/products/constants/sieve";

export const LISTING_TYPE = "live" as const;
export const capability = LISTING_TYPE_CAPABILITIES.live;
export const config = {
  listingType: LISTING_TYPE,
  slugPrefix: "live-",
  cartLine: "single-product" as const,
  detailRoute: (idOrSlug: string) => String(ROUTES.PUBLIC.LIVE_DETAIL(idOrSlug)),
  badge: { label: "Live Item", className: "bg-error-solid text-error-on-solid" },
  priceLabel: "Price (₹)",
  typeLabel: "Live Item",
  showsStockQuantity: true,

  tabSlug: "live",
  pluralLabel: "Live Items",
  chipLabel: "Live Items",
  browseRoute: String(ROUTES.PUBLIC.LIVE),
  hideDefault: "sold" as const,
  // Runs out rather than ending — no time dimension, so the shared
  // stock-only rules are the whole story for this type.
  isAvailable: alwaysAvailable,
  unavailableClauses: STOCK_ONLY_UNAVAILABLE_CLAUSES,
  sortOptions: STANDARD_SORT_OPTIONS,
  publicSortOptions: STANDARD_PUBLIC_SORT_OPTIONS,
  extraFacetKeys: [
    TABLE_KEYS.SPECIES,
    TABLE_KEYS.LIVE_SEX,
    TABLE_KEYS.JURISDICTION,
  ] as readonly string[],
};
