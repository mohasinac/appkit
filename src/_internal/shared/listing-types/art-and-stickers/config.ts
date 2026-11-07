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

/**
 * Art & Stickers — printed-only physical goods, standard-like checkout.
 *
 * 🛑 ONE type, not two. `art` and `stickers` were separate union members with
 * byte-identical capability rows, identical checkout rules, identical
 * availability semantics and the same `browseRoute` — the only differences
 * were labels and a slug prefix. Every "list every listing type" site had to
 * carry both, and every combined surface (`/art`, the store tab, the
 * category/brand tab bars) needed a bespoke two-value OR-group to put them
 * back together again. That OR-group is what this merge deletes.
 *
 * 🛑 `tabSlug` stays `"art"` and `browseRoute` stays `/art`. That id space is
 * deliberately NOT `listingType` (see `ListingTypePlugin.tabSlug`), and `/art`
 * is a live indexed URL — the merge is internal, the public path is untouched.
 *
 * 🛑 `slugPrefix` is `"art-"`; the pre-merge `"sticker-"` prefix lives on in
 * `LEGACY_SLUG_PREFIXES` so a stored sticker id still resolves to this type
 * instead of silently classifying as `standard`.
 */
export const LISTING_TYPE = "art-and-stickers" as const;
export const capability = LISTING_TYPE_CAPABILITIES["art-and-stickers"];
export const config = {
  listingType: LISTING_TYPE,
  slugPrefix: "art-",
  cartLine: "single-product" as const,
  detailRoute: (idOrSlug: string) => String(ROUTES.PUBLIC.PRODUCT_DETAIL(idOrSlug)),
  badge: { label: "Art & Stickers", className: "bg-primary-700 text-white" },
  priceLabel: "Price (₹)",
  typeLabel: "Art & Stickers",
  showsStockQuantity: true,

  // 🛑 Unchanged across the merge — banked URL, separate id space.
  tabSlug: "art",
  pluralLabel: "Art & Stickers",
  chipLabel: "Art & Stickers",
  // `/art` is this type's dedicated browse page; detail pages use the
  // standard product route.
  browseRoute: String(ROUTES.PUBLIC.ART),
  // /art ("Art & Stickers") is in MAIN_NAV_ITEMS.
  inGeneralCatalogue: false,
  // THE case this exists for: a sheet plus its individual cut-out stickers,
  // and a print that is one of a set.
  canJoinProductGroup: true,
  iconKey: "art" as const,
  primaryActionKind: "buy-now" as const,
  hideDefault: "sold" as const,
  // Runs out rather than ending — no time dimension, so the shared
  // stock-only rules are the whole story for this type.
  isAvailable: alwaysAvailable,
  unavailableClauses: STOCK_ONLY_UNAVAILABLE_CLAUSES,
  sortOptions: STANDARD_SORT_OPTIONS,
  publicSortOptions: STANDARD_PUBLIC_SORT_OPTIONS,
  extraFacetKeys: [] as readonly string[],
};
