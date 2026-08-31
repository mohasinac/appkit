"use client";

/*
 * WHY: Five seller views — Art, Stickers, Classified, Digital Codes, Live Items
 *      — were 1,033 lines of the same component. Identical props, identical
 *      delete scaffolding, identical row actions, identical bulk-action map,
 *      identical `getTotal`, identical availability scope. What actually
 *      differed was a listing-type string, four lines of copy, two routes, and
 *      one to three extra columns.
 *
 *      Five copies is well past the Duplication Framework's Rule of Three, and
 *      it had already drifted: Digital Codes offered four sort options where
 *      the other four offered five, and every one hand-wrote a sort array the
 *      plugin registry already publishes.
 *
 *      🛑 The deeper point is that this consolidation had ALREADY been done —
 *      `buildListingTypeListingConfig` exists, is tagged `pattern:factory`, its
 *      header describes this exact problem, and it already accepts
 *      `portal: "seller"`. It had FIVE admin callers and ZERO seller ones. The
 *      seller half was written by hand next to it. That is the unadopted-layer
 *      shape this whole plan exists to close, so this file adopts it rather
 *      than starting a third implementation.
 *
 * WHAT: One component. Everything shared lives here; everything per-type lives
 *       in `SELLER_LISTING_TYPE_SPECS` below, which is the complete inventory
 *       of what genuinely differs.
 *
 * EXPORTS: SellerListingRow, SellerListingTypeSpec, SELLER_LISTING_TYPE_SPECS,
 *          SellerListingTypeView, SellerListingTypeViewProps
 *
 * @tag domain:seller,products
 * @tag layer:view
 * @tag pattern:factory
 * @tag access:client
 * @tag consumers:SellerArtView,SellerStickersView,SellerClassifiedView,SellerDigitalCodesView,SellerLiveView
 * @tag sideEffects:none
 */

import React, { useCallback, useState } from "react";
import { Badge, ConfirmDeleteModal, RowActionMenu, Span, Text } from "../../../ui";
import type { BulkActionItem } from "../../../ui";
import { useEntityDelete } from "../../../react/hooks/useEntityDelete";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { ROUTES } from "../../../next/routing/route-map";
import { sortBy } from "../../../constants/sort";
import { PRODUCT_FIELDS } from "../../../constants/field-names";
import { SIEVE_OP, sieveFilter } from "../../../utils/sieve-builder";
import { pluginFor } from "../../../_internal/shared/listing-types/_registry";
import type { JsonValue } from "../../../schemas/types";
import {
  toCurrency,
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../../admin/hooks/useAdminListingData";
import { DataListingView } from "../../admin/components/DataListingView";
import type { ListingViewConfig } from "../../admin/components/DataListingView";
import type { AdminTableColumn } from "../../admin/types";
import { ROW_ACTION_META, SELLER_BULK_ACTIONS } from "../../products/constants/action-defs";
import { useAvailabilityScope } from "../../products/hooks/useAvailabilityScope";
import type { ListingType } from "../../products/types";

/**
 * The shared row, plus whatever a spec's `extraFields` adds.
 *
 * Extra values are display STRINGS, deliberately — every per-type column in the
 * five originals rendered text, a pill or a badge derived from one value, and a
 * string keeps the row type non-generic so the columns array needs no type
 * parameter threaded through five call sites.
 */
export interface SellerListingRow {
  [key: string]: string;
  id: string;
  title: string;
  price: string;
  status: string;
  createdAt: string;
}

export interface SellerListingTypeSpec {
  /** Seller-side edit route. The plugin registry carries only PUBLIC routes. */
  editRoute: (id: string) => string;
  /** Seller-side "create new" route. */
  newRoute: string;
  /** Primary CTA label — not derivable ("New Art Print" vs "New Live Item"). */
  createLabel: string;
  /** Which `SELLER_BULK_ACTIONS` preset backs the bulk bar. */
  bulkKey: keyof typeof SELLER_BULK_ACTIONS;
  /** What this type calls one of its listings in the delete dialog. */
  deleteLabel: string;
  searchPlaceholder: string;
  emptyLabel: string;
  /** Heading override; defaults to the plugin's `pluralLabel`. */
  title?: string;
  /** Header for the first column. Defaults to "Listing". */
  titleHeader?: string;
  /** Header for the last column. Defaults to "Created". */
  createdHeader?: string;
  /** Toast on a successful delete. Defaults to "Listing deleted." */
  deleteSuccess?: string;
  /** Per-type row values, read off the raw document. */
  extraFields?: (item: Record<string, JsonValue>) => Record<string, string>;
  /** Columns inserted between Price and Status. */
  extraColumns?: AdminTableColumn<SellerListingRow>[];
}

/* ── Shared column renderers ─────────────────────────────────────────────── */

const textCell = (key: string, header: string): AdminTableColumn<SellerListingRow> => ({
  key,
  header,
  render: (row) => (
    <Text className="text-[var(--appkit-color-text-muted)]" size="sm">
      {row[key] || "—"}
    </Text>
  ),
});

const numberCell = (key: string, header: string): AdminTableColumn<SellerListingRow> => ({
  key,
  header,
  render: (row) => (
    <Text className="tabular-nums" size="sm">
      {row[key] || "0"}
    </Text>
  ),
});

/* ── The per-type inventory ──────────────────────────────────────────────── */

/**
 * Everything that genuinely differs between the five, in one place.
 *
 * A `Record<…, SellerListingTypeSpec>` rather than a `Partial`: a key here is a
 * deliberate claim that this type has a dedicated seller browse page, and the
 * type union is deliberately the narrow set of five rather than `ListingType`,
 * because standard / auction / pre-order / prize-draw do NOT have one — their
 * store routes redirect into the multi-type `SellerProductsView`.
 */
export type SellerListingTypeKey =
  | "art"
  | "stickers"
  | "classified"
  | "digital-code"
  | "live";

export const SELLER_LISTING_TYPE_SPECS: Record<SellerListingTypeKey, SellerListingTypeSpec> = {
  art: {
    editRoute: (id) => String(ROUTES.STORE.ART_EDIT(id)),
    newRoute: String(ROUTES.STORE.ART_NEW),
    createLabel: "New Art Print",
    bulkKey: "art",
    deleteLabel: "Art Listing",
    searchPlaceholder: "Search art prints...",
    emptyLabel: "No art listings yet — list your first print",
    extraFields: (item) => ({
      size: toStringValue((item.printMeta as { size?: string } | undefined)?.size, ""),
    }),
    extraColumns: [textCell("size", "Size")],
  },

  stickers: {
    editRoute: (id) => String(ROUTES.STORE.STICKERS_EDIT(id)),
    newRoute: String(ROUTES.STORE.STICKERS_NEW),
    createLabel: "New Sticker Listing",
    bulkKey: "stickers",
    deleteLabel: "Sticker Listing",
    searchPlaceholder: "Search sticker listings...",
    emptyLabel: "No sticker listings yet — list your first pack",
    extraFields: (item) => ({
      size: toStringValue((item.printMeta as { size?: string } | undefined)?.size, ""),
    }),
    extraColumns: [textCell("size", "Size")],
  },

  classified: {
    editRoute: (id) => String(ROUTES.STORE.CLASSIFIED_EDIT(id)),
    newRoute: String(ROUTES.STORE.CLASSIFIED_NEW),
    createLabel: "New Classified",
    bulkKey: "classified",
    deleteLabel: "Classified Listing",
    searchPlaceholder: "Search classified listings...",
    emptyLabel: "No classified listings yet — post your first buy/sell/trade ad",
    // `title` pinned: the plugin's pluralLabel is "Classifieds", and the page
    // heading has always read "Classified". Kept rather than silently renamed.
    title: "Classified",
    extraFields: (item) => {
      const meta = (item.classified ?? {}) as {
        meetupArea?: { city?: string };
        acceptsShipping?: boolean;
        city?: string;
      };
      return {
        location: toStringValue(meta.meetupArea?.city ?? meta.city, ""),
        shipping: meta.acceptsShipping ? "Ships" : "Meetup only",
      };
    },
    extraColumns: [
      textCell("location", "Location"),
      {
        key: "shipping",
        header: "Shipping",
        render: (row) => (
          <Badge variant={row.shipping === "Ships" ? "active" : "inactive"} size="xs">
            {row.shipping}
          </Badge>
        ),
      },
    ],
  },

  "digital-code": {
    editRoute: (id) => String(ROUTES.STORE.DIGITAL_CODES_EDIT(id)),
    newRoute: String(ROUTES.STORE.DIGITAL_CODES_NEW),
    createLabel: "New Digital Code",
    bulkKey: "digitalCodes",
    deleteLabel: "Digital Code Listing",
    searchPlaceholder: "Search digital code listings...",
    emptyLabel: "No digital code listings yet",
    titleHeader: "Product",
    deleteSuccess: "Code deleted.",
    extraFields: (item) => {
      const meta = (item.digitalCode ?? {}) as {
        codePoolSize?: number;
        codesAvailable?: number;
        codeDeliveryMethod?: string;
      };
      return {
        totalCodes: toStringValue(meta.codePoolSize, "0"),
        available: toStringValue(meta.codesAvailable, "0"),
        delivery: toStringValue(meta.codeDeliveryMethod, "").replace(/-/g, " "),
      };
    },
    extraColumns: [
      numberCell("totalCodes", "Total Codes"),
      numberCell("available", "Available"),
      {
        key: "delivery",
        header: "Delivery",
        render: (row) => (
          <Span size="xs" className="capitalize" padding="pill-sm" rounded="full" surface="subtle" color="muted">
            {row.delivery || "—"}
          </Span>
        ),
      },
    ],
  },

  live: {
    editRoute: (id) => String(ROUTES.STORE.LIVE_ITEMS_EDIT(id)),
    newRoute: String(ROUTES.STORE.LIVE_ITEMS_NEW),
    createLabel: "New Live Item",
    bulkKey: "live",
    deleteLabel: "Live Item Listing",
    searchPlaceholder: "Search live item listings...",
    emptyLabel: "No live item listings yet",
    titleHeader: "Item",
    createdHeader: "Listed",
    extraFields: (item) => {
      const meta = (item.liveItem ?? {}) as {
        species?: string;
        ageMonths?: number;
        vendorVerified?: boolean;
      };
      return {
        species: toStringValue(meta.species, ""),
        age: meta.ageMonths ? `${meta.ageMonths} mo` : "",
        verified: meta.vendorVerified ? "Verified" : "Unverified",
      };
    },
    extraColumns: [
      textCell("age", "Age"),
      {
        key: "verified",
        header: "Verified",
        render: (row) => (
          <Span size="xs" color={row.verified === "Verified" ? "success" : "warning"}>
            {row.verified}
          </Span>
        ),
      },
    ],
  },
};

/* ── The component ───────────────────────────────────────────────────────── */

export interface SellerListingTypeViewProps {
  onCreateClick?: () => void;
  onEditClick?: (id: string) => void;
  onDelete?: (id: string) => Promise<void>;
  onBulkDelete?: (ids: string[]) => Promise<void>;
}

interface ProductsResponse {
  products?: JsonValue;
  items?: JsonValue;
  meta?: { total?: number };
  total?: number;
}

export function SellerListingTypeView({
  type,
  onCreateClick,
  onEditClick,
  onDelete,
  onBulkDelete,
}: SellerListingTypeViewProps & { type: SellerListingTypeKey }) {
  const spec = SELLER_LISTING_TYPE_SPECS[type];
  const plugin = pluginFor(type as ListingType);

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const { deletingId, handleDelete: performDelete } = useEntityDelete({
    endpoint: SELLER_ENDPOINTS.PRODUCT_BY_ID,
    deleteFn: onDelete,
    successMessage: spec.deleteSuccess ?? "Listing deleted.",
    fetchOptions: { credentials: "include" },
  });

  const handleDelete = useCallback(
    async (id: string) => {
      await performDelete(id);
      setDeleteTargetId(null);
    },
    [performDelete],
  );

  const handleEdit = useCallback(
    (id: string) => {
      if (onEditClick) onEditClick(id);
      else window.location.href = spec.editRoute(id);
    },
    [onEditClick, spec],
  );

  const handleCreate = useCallback(() => {
    if (onCreateClick) onCreateClick();
    else window.location.href = spec.newRoute;
  }, [onCreateClick, spec]);

  /*
   * 🛑 Unconditional, and before any early return. `SellerPreOrdersView` called
   * this AFTER a conditional return — a rules-of-hooks violation that survived
   * because that view had no page rendering it.
   */
  const scope = useAvailabilityScope(React.useMemo(() => [type as ListingType], [type]));

  const columns: AdminTableColumn<SellerListingRow>[] = [
    {
      key: "title",
      header: spec.titleHeader ?? "Listing",
      render: (row) => (
        <>
          <Text size="sm" weight="medium">{row.title}</Text>
          {/* Live items carry a species subtitle; every other type has none. */}
          {row.species ? (
            <Text className="text-[var(--appkit-color-text-muted)]" size="xs">{row.species}</Text>
          ) : null}
        </>
      ),
    },
    { key: "price", header: "Price", render: (row) => <Text className="tabular-nums" size="sm">{row.price}</Text> },
    ...(spec.extraColumns ?? []),
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge variant={row.status === "active" ? "active" : "inactive"} size="xs" className="capitalize">
          {row.status}
        </Badge>
      ),
    },
    textCell("createdAt", spec.createdHeader ?? "Created"),
  ];

  const config: ListingViewConfig<ProductsResponse, SellerListingRow> = {
    portal: "seller",
    title: spec.title ?? plugin.pluralLabel,
    searchPlaceholder: spec.searchPlaceholder,
    emptyLabel: spec.emptyLabel,
    filterKeys: [],
    defaultSort: sortBy(PRODUCT_FIELDS.CREATED_AT, "DESC"),
    queryKey: ["seller", plugin.tabSlug],
    endpoint: SELLER_ENDPOINTS.PRODUCTS,
    // The registry's set, not a hand-copied array. Digital Codes had drifted to
    // four options where its four siblings offered five.
    sortOptions: [...plugin.sortOptions],
    columns,
    mapRows: (response) =>
      toRecordArray(response.products ?? response.items).map((item, index) => ({
        id: toStringValue(item.id, `${type}-${index}`),
        title: toStringValue(item.productTitle ?? item.title, "Untitled"),
        price: toCurrency(item.price),
        status: toStringValue(item.status, "draft"),
        createdAt: toRelativeDate(item.createdAt),
        ...(spec.extraFields?.(item) ?? {}),
      })),
    getTotal: (response, rows) =>
      typeof response.total === "number"
        ? response.total
        : typeof response.meta?.total === "number"
          ? response.meta.total
          : rows.length,
    // `sieveFilter`, not the raw `"listingType==art"` string literal all five
    // originals wrote — a hand-built clause is invisible to every audit that
    // checks field names against the schema.
    buildFilters: () => sieveFilter(PRODUCT_FIELDS.LISTING_TYPE, SIEVE_OP.EQ, type),
    buildExtraParams: () => scope.extraParams,
    renderAboveContent: scope.renderAboveContent,
    primaryAction: { label: spec.createLabel, onClick: handleCreate },
    onRowClick: (row) => handleEdit(row.id),
    // Rule #7 — the preset, never an inline action object.
    buildBulkActions: onBulkDelete
      ? (selection): BulkActionItem[] =>
          SELLER_BULK_ACTIONS[spec.bulkKey].map((id) => ({
            id,
            label: ROW_ACTION_META[id].label,
            destructive: ROW_ACTION_META[id].destructive,
            onClick: async () => {
              await onBulkDelete(selection.selectedIds);
              selection.clearSelection();
            },
          }))
      : undefined,
    renderRowActions: (row) => (
      <RowActionMenu
        actions={[
          { label: ACTIONS.STORE["edit-listing"].label, onClick: () => handleEdit(row.id) },
          {
            label: ACTIONS.STORE["delete-listing"].label,
            destructive: true,
            onClick: () => setDeleteTargetId(row.id),
            disabled: deletingId === row.id,
          },
        ]}
      />
    ),
  };

  return (
    <>
      <DataListingView config={config} />
      {deleteTargetId && (
        <ConfirmDeleteModal
          isOpen
          title={`Delete ${spec.deleteLabel}`}
          message={`Are you sure you want to delete this ${spec.deleteLabel.toLowerCase()}? This cannot be undone.`}
          onConfirm={() => handleDelete(deleteTargetId)}
          onClose={() => setDeleteTargetId(null)}
          isDeleting={deletingId === deleteTargetId}
        />
      )}
    </>
  );
}
