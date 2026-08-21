import { LISTING_TYPE_CAPABILITIES } from "../capabilities";
import { ROUTES } from "../../../../next/routing/route-map";
import { TABLE_KEYS } from "../../../../constants/table-keys";
import {
  STANDARD_SORT_OPTIONS,
  STANDARD_PUBLIC_SORT_OPTIONS,
} from "../../../../features/products/constants/sieve";

export const LISTING_TYPE = "digital-code" as const;
export const capability = LISTING_TYPE_CAPABILITIES["digital-code"];
export const config = {
  listingType: LISTING_TYPE,
  slugPrefix: "digitalcode-",
  cartLine: "single-product" as const,
  detailRoute: (idOrSlug: string) => String(ROUTES.PUBLIC.DIGITAL_CODE_DETAIL(idOrSlug)),
  badge: { label: "Digital Code", className: "bg-success-solid text-success-on-solid" },
  priceLabel: "Price per Code (₹)",
  typeLabel: "Digital Code",
  showsStockQuantity: false,

  tabSlug: "digital-codes",
  pluralLabel: "Digital Codes",
  chipLabel: "Digital Codes",
  browseRoute: String(ROUTES.PUBLIC.DIGITAL_CODES),
  // "Sold out" for a code pool means codesAvailable hit 0, which the
  // stockQuantity>0 predicate mirrors on this collection.
  hideDefault: "sold" as const,
  sortOptions: STANDARD_SORT_OPTIONS,
  publicSortOptions: STANDARD_PUBLIC_SORT_OPTIONS,
  extraFacetKeys: [TABLE_KEYS.DELIVERY_METHOD] as readonly string[],
};
