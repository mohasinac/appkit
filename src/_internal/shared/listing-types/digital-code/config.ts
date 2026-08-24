import { LISTING_TYPE_CAPABILITIES } from "../capabilities";
import { num, type AvailabilityRow, type DateLike } from "../availability";
import type { FirestoreValue } from "../../../../schemas/types";
import { ROUTES } from "../../../../next/routing/route-map";
import { TABLE_KEYS } from "../../../../constants/table-keys";
import { PRODUCT_FIELDS } from "../../../../constants/field-names";
import {
  STANDARD_SORT_OPTIONS,
  STANDARD_PUBLIC_SORT_OPTIONS,
} from "../../../../features/products/constants/sieve";

export const LISTING_TYPE = "digital-code" as const;
export const capability = LISTING_TYPE_CAPABILITIES["digital-code"];

/**
 * Read the pool counter from either row shape. A Firestore document nests it
 * under `digitalCode`; a row that has been through a Sieve projection or the
 * listingProcessor Function can carry the flattened dotted key instead.
 */
function readCodesAvailable(row: AvailabilityRow): DateLike {
  const nested = row.digitalCode;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return (nested as Record<string, FirestoreValue>).codesAvailable;
  }
  return row[PRODUCT_FIELDS.DIGITAL_CODES_AVAILABLE];
}

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
  // "Sold out" for a code pool means codesAvailable hit 0. That was ASSUMED to
  // be mirrored by stockQuantity, and it isn't — seed and production rows exist
  // with a drained pool and non-zero stock. The pool count is authoritative.
  hideDefault: "sold" as const,
  isAvailable: (row: AvailabilityRow) => num(readCodesAvailable(row)) !== 0,
  unavailableClauses: [
    { field: PRODUCT_FIELDS.DIGITAL_CODES_AVAILABLE, op: "eq" as const, value: 0 },
    { field: PRODUCT_FIELDS.AVAILABLE_QUANTITY, op: "eq" as const, value: 0 },
  ],
  sortOptions: STANDARD_SORT_OPTIONS,
  publicSortOptions: STANDARD_PUBLIC_SORT_OPTIONS,
  extraFacetKeys: [TABLE_KEYS.DELIVERY_METHOD] as readonly string[],
};
