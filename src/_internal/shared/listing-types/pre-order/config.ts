import { LISTING_TYPE_CAPABILITIES } from "../capabilities";
import {
  num,
  STOCK_ONLY_UNAVAILABLE_CLAUSES,
  type AvailabilityRow,
} from "../availability";
import { ROUTES } from "../../../../next/routing/route-map";
import { TABLE_KEYS } from "../../../../constants/table-keys";
import { PRODUCT_FIELDS } from "../../../../constants/field-names";
import {
  PREORDER_SORT_OPTIONS,
  PREORDER_PUBLIC_SORT_OPTIONS,
} from "../../../../features/products/constants/sieve";

export const LISTING_TYPE = "pre-order" as const;
export const capability = LISTING_TYPE_CAPABILITIES["pre-order"];
export const config = {
  listingType: LISTING_TYPE,
  slugPrefix: "preorder-",
  cartLine: "single-product" as const,
  detailRoute: (idOrSlug: string) => String(ROUTES.PUBLIC.PRE_ORDER_DETAIL(idOrSlug)),
  badge: { label: "Pre-Order", className: "bg-info-solid text-info-on-solid" },
  priceLabel: "Pre-Order Price (₹)",
  typeLabel: "Pre-Order",
  showsStockQuantity: false,

  tabSlug: "pre-orders",
  pluralLabel: "Pre-Orders",
  chipLabel: "Pre-Orders",
  browseRoute: String(ROUTES.PUBLIC.PRE_ORDERS),
  // /pre-orders is in MAIN_NAV_ITEMS.
  inGeneralCatalogue: false,
  // a deposit against a future release; members would ship at different times
  canJoinProductGroup: false,
  iconKey: "preOrder" as const,
  hideDefault: "closed" as const,
  /*
   * A pre-order closes when its allocation fills, NOT when its delivery date
   * passes — a shipped-soon pre-order is still orderable.
   *
   * 🛑 THIS IS THE CANONICAL PRE-ORDER AVAILABILITY RULE. `./schema.ts`'s
   * `isOpenPreOrder` used to state a different one — it gated on the delivery
   * date with a non-null assertion on an optional field, so a dateless
   * pre-order read as closed — and it now DELEGATES here. The date is a
   * checkout input, not an availability input: `preOrderRule.preflightChecks`
   * refuses a past or beyond-45-day date at the moment money would move. See
   * `features/products/constants/preorder-window.ts`.
   *
   * 🛑 `preOrderClosed` NOW HAS A WRITE PATH. This comment used to say "no
   * write path has ever set it", and the reason was not that nobody tried: the
   * field was absent from `PRODUCT_UPDATABLE_FIELDS`, so the write schema
   * dropped it while returning 200 (Root Cause #101). It is in both the
   * updatable and public lists as of Phase 2, so this check is load-bearing
   * rather than defensive.
   */
  isAvailable: (row: AvailabilityRow) => {
    if (row[PRODUCT_FIELDS.PRE_ORDER_CLOSED] === true) return false;
    const current = num(row[PRODUCT_FIELDS.PRE_ORDER_CURRENT_COUNT]);
    const max = num(row[PRODUCT_FIELDS.PRE_ORDER_MAX_QUANTITY]);
    if (current !== null && max !== null && max > 0 && current >= max) return false;
    return true;
  },
  // A filled allocation always zeroes `availableQuantity`, so the shared
  // stock clauses select exactly the closed set — no extra query needed.
  unavailableClauses: STOCK_ONLY_UNAVAILABLE_CLAUSES,
  sortOptions: PREORDER_SORT_OPTIONS,
  publicSortOptions: PREORDER_PUBLIC_SORT_OPTIONS,
  extraFacetKeys: [
    TABLE_KEYS.PREORDER_STATUS,
    TABLE_KEYS.DATE_FROM,
    TABLE_KEYS.DATE_TO,
  ] as readonly string[],
};
