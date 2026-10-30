import { LISTING_TYPE_CAPABILITIES } from "../capabilities";
import { toDate, type AvailabilityRow } from "../availability";
import { ROUTES } from "../../../../next/routing/route-map";
import { TABLE_KEYS } from "../../../../constants/table-keys";
import { PRODUCT_FIELDS } from "../../../../constants/field-names";
import {
  COLLECTOR_DROP_SORT_OPTIONS,
  COLLECTOR_DROP_PUBLIC_SORT_OPTIONS,
} from "../../../../features/products/constants/sieve";

export const LISTING_TYPE = "collector-drop" as const;
export const capability = LISTING_TYPE_CAPABILITIES["collector-drop"];
export const config = {
  listingType: LISTING_TYPE,
  slugPrefix: "collectordrop-",
  cartLine: "blocked" as const,
  detailRoute: (idOrSlug: string) => String(ROUTES.PUBLIC.COLLECTOR_DROP_DETAIL(idOrSlug)),
  badge: { label: "Collector Drop", className: "bg-warning-solid text-warning-on-solid" },
  priceLabel: "Suggested Retail Price (₹)",
  typeLabel: "Collector Drop",
  showsStockQuantity: false,

  tabSlug: "collector-drops",
  pluralLabel: "Collector Drops",
  chipLabel: "Collector Drops",
  browseRoute: String(ROUTES.PUBLIC.COLLECTOR_DROPS),
  // /collector-drops is in MAIN_NAV_ITEMS. A collector drop card in the general grid renders
  // Buy-Now chrome rather than bid affordances, so it belongs on its own page.
  inGeneralCatalogue: false,
  // one unique lot, won by one bidder — there is no "pick 3 of these"
  canJoinProductGroup: false,
  iconKey: "bid" as const,
  // A collector drop is never "sold out" — it ends. Hiding by stock would hide
  // every live collector drop, since collector drops don't carry meaningful stock.
  hideDefault: "ended" as const,
  // There is no `collectorDropStatus` field — "ended" is purely the end date having
  // passed. A collector drop with no end date at all is treated as live rather than
  // hidden; a missing date is a data defect, not a signal that it is over.
  isAvailable: (row: AvailabilityRow, now: Date) => {
    const end = toDate(row[PRODUCT_FIELDS.COLLECTOR_DROP_END_DATE]);
    return end === null || end > now;
  },
  unavailableClauses: [
    // The ONLY inequality in the registry — safe because it names the sort
    // field the query must order by, which is also the natural sort for an
    // "ended collector drops" archive ("Recently Ended").
    {
      field: PRODUCT_FIELDS.COLLECTOR_DROP_END_DATE,
      op: "lt" as const,
      value: "NOW" as const,
      sortField: PRODUCT_FIELDS.COLLECTOR_DROP_END_DATE,
    },
    { field: PRODUCT_FIELDS.IS_SOLD, op: "eq" as const, value: true },
  ],
  sortOptions: COLLECTOR_DROP_SORT_OPTIONS,
  publicSortOptions: COLLECTOR_DROP_PUBLIC_SORT_OPTIONS,
  extraFacetKeys: [
    TABLE_KEYS.MIN_BID,
    TABLE_KEYS.MAX_BID,
    TABLE_KEYS.DATE_FROM,
    TABLE_KEYS.DATE_TO,
  ] as readonly string[],
};
