/*
 * WHY: Five admin views (Art, Stickers, Classified, Digital Codes, Live Items)
 *      were five copies of ONE config that differed only by listing type,
 *      title and placeholder text. Five copies is well past the Duplication
 *      Framework's Rule of Three, and it showed: every one carried
 *      `filterKeys: []` (no filter drawer at all despite filterable data) and
 *      its own hand-written three-option sort array, so a fix to any of it had
 *      to be applied five times and never was.
 *
 * WHAT: `buildListingTypeListingConfig(type, opts)` — one config, driven by
 *       the listing-type plugin registry. Title, sort set and per-type facet
 *       keys all come from `pluginFor(type)`, so a new listing type gets a
 *       working admin browse page with no new file.
 *
 * EXPORTS: ListingTypeListingRow, BuildListingTypeListingOptions,
 *          buildListingTypeListingConfig
 *
 * @tag domain:products
 * @tag layer:config
 * @tag pattern:factory
 * @tag access:client
 * @tag consumers:AdminArtView,AdminStickersView,AdminClassifiedView,AdminDigitalCodesView,AdminLiveView
 * @tag sideEffects:none
 */

import type { JsonArray } from "../../../schemas/types";
import { SIEVE_OP, sieveAnd, sieveFilter } from "../../../utils/sieve-builder";
import { sortBy } from "../../../constants/sort";
import { PRODUCT_FIELDS } from "../../../constants/field-names";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ROUTES } from "../../../next/routing/route-map";
import { pluginFor } from "../../../_internal/shared/listing-types/_registry";
import type { ListingType } from "../types";
import {
  toRecordArray,
  toRelativeDate,
  toCurrency,
  toStringValue,
} from "../../admin/hooks/useAdminListingData";
import type { ListingViewConfig } from "../../admin/components/DataListingView";

export interface ListingTypeListingRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  image?: string;
}

interface ListingTypeListingResponse {
  items?: JsonArray;
  total?: number;
}

export interface BuildListingTypeListingOptions {
  /** Override the page heading; defaults to the type's registered plural label. */
  title?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
}

/**
 * Admin browse config for one listing type.
 *
 * `status` is a real filter here (unlike the five hand-written copies, which
 * offered none) because an admin's main reason to open a per-type list is to
 * find the drafts and in-review items — exactly the rows a status filter
 * surfaces.
 */
export function buildListingTypeListingConfig(
  type: ListingType,
  opts: BuildListingTypeListingOptions = {},
): ListingViewConfig<ListingTypeListingResponse, ListingTypeListingRow> {
  const plugin = pluginFor(type);
  const label = opts.title ?? plugin.pluralLabel;

  return {
    portal: "admin",
    title: label,
    searchPlaceholder: opts.searchPlaceholder ?? `Search ${label.toLowerCase()} by name or seller`,
    emptyLabel: opts.emptyLabel ?? `No ${label.toLowerCase()} listings`,
    filterKeys: ["status"],
    defaultSort: sortBy(PRODUCT_FIELDS.CREATED_AT),
    // Keyed on the canonical type so two types can never share a cache entry.
    queryKey: ["admin", "listing-type", type],
    endpoint: ADMIN_ENDPOINTS.PRODUCTS,
    // The type's own sort set, not a copy-pasted three-option array.
    sortOptions: [...plugin.sortOptions],
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `${type}-${index}`),
        primary: toStringValue(item.title ?? item.productTitle, "Untitled listing"),
        secondary: [
          toStringValue(item.sellerName, "Unknown seller"),
          toCurrency(item.price),
        ].join(" · "),
        status: toStringValue(item.status, "draft"),
        updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
        image: toStringValue(item.mainImage, "") || undefined,
      })),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
    buildFilters: (state) =>
      sieveAnd(
        sieveFilter(PRODUCT_FIELDS.LISTING_TYPE, SIEVE_OP.EQ, type),
        state.status && state.status !== "All"
          ? sieveFilter(PRODUCT_FIELDS.STATUS, SIEVE_OP.EQ, state.status)
          : "",
      ) || undefined,
    // These are products filtered by listingType — reuse the real admin
    // product editor rather than leaving rows non-navigable.
    rowHrefTemplate: String(ROUTES.ADMIN.PRODUCTS_EDIT("{id}")),
  };
}
