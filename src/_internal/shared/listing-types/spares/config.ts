import { LISTING_TYPE_CAPABILITIES } from "../capabilities";
import {
  alwaysAvailable,
  STOCK_ONLY_UNAVAILABLE_CLAUSES,
} from "../availability";
import { ROUTES } from "../../../../next/routing/route-map";
import {
  STANDARD_SORT_OPTIONS,
  STANDARD_PUBLIC_SORT_OPTIONS,
} from "../../../../features/products/constants/sieve";

export const LISTING_TYPE = "spares" as const;
export const capability = LISTING_TYPE_CAPABILITIES.spares;
export const config = {
  listingType: LISTING_TYPE,
  /*
   * Singular, matching `sticker-` rather than the plural type name.
   *
   * 🛑 Matched by `startsWith`, so this exact string must open every seeded id
   * or `audit-seed-listing-type`'s R3 fails on every row — that audit calls the
   * shipped `detectListingTypeFromSlug` rather than re-deriving the map, which
   * is how it caught five `stickers-` ids against a registered `sticker-`.
   */
  slugPrefix: "spare-",
  cartLine: "single-product" as const,
  detailRoute: (idOrSlug: string) => String(ROUTES.PUBLIC.PRODUCT_DETAIL(idOrSlug)),
  badge: { label: "Spare Part", className: "bg-primary-700 text-white" },
  priceLabel: "Price (₹)",
  typeLabel: "Spares",
  showsStockQuantity: true,

  tabSlug: "spares",
  pluralLabel: "Spares",
  chipLabel: "Spares",
  browseRoute: String(ROUTES.PUBLIC.SPARES),
  /*
   * 🛑 `false`, and it obliges the nav entry that lands in the same change.
   *
   * The rule for this flag is nav reachability, not taste: a type kept out of
   * the general catalogue must own a page that `MAIN_NAV_ITEMS` links, or it is
   * reachable from nowhere (Root Cause #61). `/spares` is that page.
   *
   * The reason to keep it out is the catalogue itself. A seller who strips one
   * Beyblade lists eight parts, so a few disassembled items would outnumber
   * every complete listing on `/products` — and a buyer looking for a loose
   * attack ring wants a page where everything is a loose part, not one where
   * they are scattered among bundles and sealed boxes.
   */
  inGeneralCatalogue: false,
  /*
   * A sheet-plus-parts group is the shape this exists for on the sticker side,
   * and the same shape sells a stripped bey: the whole item as the parent, each
   * salvaged part as a child, buyer takes any mix.
   */
  canJoinProductGroup: true,
  iconKey: "spares" as const,
  hideDefault: "sold" as const,
  /*
   * A spare runs out rather than ending — there is no time dimension at all, so
   * the shared stock-only rules are the whole story. Usually quantity 1: it is
   * one physical object the seller happens to have.
   */
  isAvailable: alwaysAvailable,
  unavailableClauses: STOCK_ONLY_UNAVAILABLE_CLAUSES,
  sortOptions: STANDARD_SORT_OPTIONS,
  publicSortOptions: STANDARD_PUBLIC_SORT_OPTIONS,
  extraFacetKeys: [] as readonly string[],
};
