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

export const LISTING_TYPE = "classified" as const;
export const capability = LISTING_TYPE_CAPABILITIES.classified;
export const config = {
  listingType: LISTING_TYPE,
  slugPrefix: "classified-",
  cartLine: "blocked" as const,
  detailRoute: (idOrSlug: string) => String(ROUTES.PUBLIC.CLASSIFIED_DETAIL(idOrSlug)),
  badge: { label: "Classified", className: "bg-secondary text-white" },
  priceLabel: "Asking Price (₹)",
  typeLabel: "Classified",
  showsStockQuantity: true,

  tabSlug: "classifieds",
  pluralLabel: "Classifieds",
  chipLabel: "Classifieds",
  browseRoute: String(ROUTES.PUBLIC.CLASSIFIED),
  hideDefault: "sold" as const,
  // Runs out rather than ending — no time dimension, so the shared
  // stock-only rules are the whole story for this type.
  isAvailable: alwaysAvailable,
  unavailableClauses: STOCK_ONLY_UNAVAILABLE_CLAUSES,
  sortOptions: STANDARD_SORT_OPTIONS,
  publicSortOptions: STANDARD_PUBLIC_SORT_OPTIONS,
  extraFacetKeys: [
    TABLE_KEYS.CITY,
    TABLE_KEYS.ACCEPTS_SHIPPING,
    TABLE_KEYS.NEGOTIABLE,
  ] as readonly string[],
};
