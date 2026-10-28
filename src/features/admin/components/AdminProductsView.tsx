"use client";
import { normalizeError } from "../../../errors/normalize";

import { SIEVE_OP, Stack, sieveFilter, type JsonArray, Row } from "@mohasinac/appkit/client";
import { sortBy } from "@mohasinac/appkit/client";
import React, { useState, useCallback } from "react";
import { ListingLayout } from "../../../ui/components/ListingLayout";
import { Span, Text } from "../../../ui/components/Typography";
import { Toggle } from "../../../ui/components/Toggle";
import { useToast } from "../../../ui/components/toast-context";
import type { ListingLayoutProps } from "../../../ui/components/ListingLayout";
import type { BulkActionItem } from "../../../ui/components/BulkActionBar";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  ADMIN_PRODUCT_STATUS_TABS,
  ADMIN_PRODUCT_LISTING_TYPE_TABS,
} from "../constants/filter-tabs";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { AdminListingScaffoldRow, ListingViewConfig } from "./DataListingView";
import { FilterChipGroup } from "../../../ui/components/FilterChipGroup";
import type { AdminTableColumn } from "../types";
import { apiClient } from "../../../http";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { AdminProductEditorView } from "./AdminProductEditorView";
import { QuickEditMenu } from "./QuickEditMenu";
import { ADMIN_BULK_ACTIONS, ROW_ACTION_META, ROW_ACTION_ID } from "../../products/constants/action-defs";
import { parseSelectedListingTypes } from "../../products/utils/listing-type";
import { useAvailabilityScope } from "../../products/hooks/useAvailabilityScope";
import { ALL_LISTING_TYPES } from "../../../_internal/shared/listing-types/feature-flags";
import { formatMoney } from "../../../utils/number.formatter";

export interface AdminProductsViewProps extends ListingLayoutProps {
  actionHref?: string;
  getRowHref?: (row: AdminListingScaffoldRow) => string;
}

interface AdminProductsResponse {
  items?: JsonArray;
  total?: number;
}

type ProductRow = AdminListingScaffoldRow;
type FlagField = "featured" | "isPromoted" | "isOnSale" | "isSold";

/** `POST /api/admin/products/bulk` — named so the partial-failure shape is
 *  type-checked rather than read off an inline generic. */
interface BulkFlagResult {
  updated: string[];
  failed: { id: string; reason: string }[];
  summary: { requested: number; updated: number; failed: number };
}

const FLAG_DEFS: { key: FlagField; label: string }[] = [
  { key: "featured", label: "Featured" },
  { key: "isPromoted", label: "Promoted" },
  { key: "isOnSale", label: "On Sale" },
  { key: "isSold", label: "Sold" },
];

// TYPE_FILTER_MAP (label -> Sieve clause) was deleted 2026-08-21. Chip ids are
// now canonical ListingType values, so the clause is built directly and the
// array is covered by audit-filter-tab-enums. The map had no `art`/`stickers`
// entries, which is why admin could never filter to either type.

function buildBaseColumns(): AdminTableColumn<ProductRow>[] {
  return [
    {
      key: "primary",
      header: "Item",
      sortable: true,
      render: (row) => (
        <Stack gap="xs">
          <Text weight="semibold" color="primary">{row.primary}</Text>
          <Text size="xs" color="muted">{row.secondary}</Text>
        </Stack>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      className: "w-36",
      render: (row) => (
        <Span size="xs" weight="medium" className="inline-flex bg-primary-50 text-primary-800 dark:bg-secondary-900/30 dark:text-secondary-300" rounded="full" padding="pill-sm-tall">
          {row.status}
        </Span>
      ),
    },
    {
      key: "updatedAt",
      header: "Updated",
      sortable: true,
      className: "w-36",
      render: (row) => (
        <Span size="sm" color="muted">{row.updatedAt}</Span>
      ),
    },
  ];
}

export function AdminProductsView({ children, ...props }: AdminProductsViewProps) {
  const [overrides, setOverrides] = useState<Record<string, Partial<ProductRow>>>({});
  const { showToast } = useToast();
  // Mirrors the raw API record per row id (ProductRow itself is the shared
  // AdminListingScaffoldRow display shape, not the full record) so
  // renderEditor can seed AdminProductEditorView with data already in
  // memory instead of re-fetching a record the table already has.
  const rawByIdRef = React.useRef<Record<string, Record<string, unknown>>>({});

  const handleToggle = useCallback(
    async (id: string, field: FlagField, value: boolean) => {
      const prev = overrides[id]?.[field];
      setOverrides((o) => ({ ...o, [id]: { ...o[id], [field]: value } }));
      try {
        await apiClient.patch(ADMIN_ENDPOINTS.PRODUCT_BY_ID(id), { [field]: value });
      } catch (err) {
        void normalizeError(err);
        setOverrides((o) => ({ ...o, [id]: { ...o[id], [field]: prev } }));
        showToast((err as Error)?.message ?? "Failed to update product.", "error");
      }
    },
    [showToast, overrides],
  );

  /** Flip one flag across a selection, optimistically, in chunks. */
  const setFlagOverrides = useCallback(
    (ids: readonly string[], field: FlagField, value: boolean) => {
      setOverrides((o) => {
        const next = { ...o };
        for (const id of ids) next[id] = { ...next[id], [field]: value };
        return next;
      });
    },
    [],
  );

  const handleBulkToggle = useCallback(
    async (ids: string[], field: FlagField, value: boolean) => {
      setFlagOverrides(ids, field, value);

      /*
       * Chunked at the route's own bound.
       *
       * Select-all takes the CURRENT PAGE (`setSelectedIds(rows.map(...))` in
       * DataListingView) and `pageSize` is user-settable from the pagination
       * control, so a selection larger than the route's `max(50)` is
       * reachable — sending it whole would 400 the entire batch on a Zod
       * error. Chunking keeps the server's bound honest without making the UI
       * enforce a number it does not own.
       *
       * Still a collapse, not a fan-out: 200 rows is 4 sequential requests
       * rather than the 200 concurrent ones this replaced.
       */
      const CHUNK = 50;
      let updated = 0;
      let failedCount = 0;
      const failedIds: string[] = [];

      try {
        for (let i = 0; i < ids.length; i += CHUNK) {
          const part = await apiClient.post<BulkFlagResult>(
            ADMIN_ENDPOINTS.PRODUCTS_BULK,
            { field, value, ids: ids.slice(i, i + CHUNK) },
          );
          updated += part?.summary?.updated ?? 0;
          failedCount += part?.summary?.failed ?? 0;
          for (const f of part?.failed ?? []) failedIds.push(f.id);
        }
      } catch (err) {
        void normalizeError(err);
        // The request itself failed — roll every row back, including any
        // earlier chunk, because the admin cannot tell which landed.
        setFlagOverrides(ids, field, !value);
        showToast((err as Error)?.message ?? "Bulk update failed.", "error");
        return;
      }

      if (failedIds.length > 0) {
        // Roll back ONLY the rows the server named, so the ones that
        // succeeded keep their new state.
        setFlagOverrides(failedIds, field, !value);
        showToast(
          `Updated ${updated} of ${ids.length}; ${failedCount} failed.`,
          "warning",
        );
        return;
      }
      showToast(`Updated ${updated} product${updated === 1 ? "" : "s"}.`, "success");
    },
    [setFlagOverrides, showToast],
  );

  const handleQuickEdit = useCallback(
    async (id: string, values: Record<string, unknown>) => {
      const prev = overrides[id];
      setOverrides((o) => ({ ...o, [id]: { ...o[id], ...values } }));
      try {
        await apiClient.patch(ADMIN_ENDPOINTS.PRODUCT_BY_ID(id), values);
        showToast("Product updated.", "success");
      } catch (err) {
        if (prev) setOverrides((o) => ({ ...o, [id]: prev }));
        showToast((err as Error)?.message ?? "Failed to update product.", "error");
        throw err;
      }
    },
    [showToast, overrides],
  );

  /*
   * 🛑 ABOVE the `children` short-circuit, for the same reason as its twin in
   * `AdminOrdersView`: a hook below a conditional return does not run on every
   * render, so the hook ORDER differs between the two paths and React reads one
   * hook's state into another's slot.
   *
   * Spans every listing type unless the Type chips narrow it, which is what
   * makes the middle tab read "Sold & Ended" here rather than one or the other.
   */
  const scope = useAvailabilityScope(ALL_LISTING_TYPES);

  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }

  const flagColumn: AdminTableColumn<ProductRow> = {
    key: "flags",
    header: "Flags",
    className: "w-56",
    render: (row) => (
      <Row
        wrap
        gap="none"
        className="gap-x-3 gap-y-1"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="presentation"
      >
        {FLAG_DEFS.map(({ key, label }) => (
          <Toggle
            key={key}
            size="sm"
            label={label}
            checked={!!row[key]}
            onChange={(v) => {
              void handleToggle(row.id, key, v);
            }}
          />
        ))}
      </Row>
    ),
  };


  const config: ListingViewConfig<AdminProductsResponse, ProductRow> = {
    portal: "admin",
    title: "Products",
    /*
     * 🛑 THE BOX PROMISED TWO MATCHES THE INDEX CANNOT MAKE. It read "Search
     * products, SKUs, or seller names", and product search is
     * `array-contains` over `searchTxt`, which `buildProductSearchTxt` feeds
     * from title, description, brand, categoryNames, tags, features,
     * condition, card and grading fields and part-code aliases.
     *
     * Neither promise was keepable. There is NO SKU FIELD on
     * `ProductDocument` at all, and `storeName` — the real seller-name field
     * — is not among the tokens. So an admin searching a seller got a
     * plausible empty list, which is the harder version of a dead box: it
     * looks like an answer.
     *
     * Declared through the structured `search` capability rather than a bare
     * `searchPlaceholder`, so `fields` records what the corpus actually
     * matches and the audit can check the placeholder against it.
     *
     * 🛑 The promise is narrowed rather than the index widened, deliberately.
     * Adding `storeName` to `buildProductSearchTxt` would make the sentence
     * true only for products written AFTER the change — every existing row
     * keeps its stored `searchTxt` until something re-saves it — so it needs
     * a backfill, and that builder already truncates at 600 tokens with a
     * documented eviction order. A real "search by seller" is its own change.
     */
    search: {
      placeholder: "Search by title, brand, category or tag",
      fields: [
        "title",
        "description",
        "brand",
        "categoryNames",
        "tags",
        "features",
        "condition",
      ],
    },
    emptyLabel: "No products found",
    filterKeys: ["status", "type"],
    defaultSort: sortBy("createdAt", "DESC"),
    queryKey: ["admin", "products", "listing"],
    endpoint: ADMIN_ENDPOINTS.PRODUCTS,
    // "Featured first" / "Promoted first" existed in STANDARD_SORT_OPTIONS but
    // were offered nowhere, and would not have worked if they had been:
    // `featured`/`isPromoted` were `canSort: false`, so sievejs dropped the
    // sort silently. Both are now sortable (products.repository.ts) with
    // matching composite indexes, and admin is where curating them matters.
    //
    // Deliberately a curated set, not the full 10-option STANDARD_SORT_OPTIONS:
    // every additional sort field multiplies out against this view's
    // isSold/status/listingType filter combinations into more composite
    // indexes, and Rule #6 says spend those only where they earn their keep.
    sortOptions: [
      { value: sortBy("createdAt", "DESC"), label: "Newest" },
      { value: sortBy("createdAt", "ASC"), label: "Oldest" },
      { value: "title", label: "Title A–Z" },
      { value: sortBy("price", "DESC"), label: "Highest price" },
      { value: sortBy("featured", "DESC"), label: "Featured first" },
      { value: sortBy("isPromoted", "DESC"), label: "Promoted first" },
    ],
    columns: [...buildBaseColumns(), flagColumn],
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => {
        const id = toStringValue(item.id, `product-${index}`);
        rawByIdRef.current[id] = item;
        // Auction listings lost their reserve/bid/end-date summary when this
        // view was consolidated onto the shared Products listing — restore
        // it into `secondary` instead of seller/SKU, which admins reviewing
        // an auction care about far less than bid activity.
        const auctionSecondary =
          item.listingType === "auction"
            ? [
                typeof item.reservePrice === "number"
                  ? `Reserve ${formatMoney(item.reservePrice)}`
                  : null,
                `${typeof item.bidCount === "number" ? item.bidCount : 0} bids`,
                item.auctionEndDate
                  ? `Ends ${new Date(item.auctionEndDate as string).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")
            : "";
        const base: ProductRow = {
          id,
          primary: toStringValue(item.title ?? item.name, "Untitled product"),
          /*
           * 🛑 EVERY ROW READ "Unknown seller · No SKU", and both halves were
           * fallbacks for fields that do not exist.
           *
           * `sellerName` is not on `ProductDocument` — the real field is
           * `storeName`, which a dedicated `storeNameBackfill` job keeps
           * populated precisely so a list row needs no second read. And there
           * is NO SKU FIELD ANYWHERE on the document, so "No SKU" was not a
           * missing value, it was a column for a concept the schema has never
           * had. Same shape as the fix recorded in `AdminOrdersView`, where
           * `buyerName ?? customerName` named two fields the order document
           * never carried.
           *
           * A fallback with no real field behind it is worse than a blank: it
           * reads as data about the record, so "Unknown seller" looked like a
           * catalogue of orphaned listings rather than a view asking for the
           * wrong key.
           *
           * Price and stock replace the SKU slot because they are what an
           * admin scanning this list is actually checking, and they are the
           * two facts the audit named as missing from the row — it measured
           * ~550px of empty space between the title and the status with "no
           * price, stock, category or location column to fill it".
           *
           * 🛑 `sku` stays unprinted rather than being invented. Phase 5 of
           * the plan adds a real SKU field with a generator, a backfill and an
           * index; until it exists, a row that says "No SKU" on every product
           * tells an admin nothing except that we asked.
           */
          secondary:
            auctionSecondary ||
            [
              toStringValue(item.storeName, "No store"),
              typeof item.price === "number"
                ? formatMoney(item.price)
                : null,
              typeof item.stockQuantity === "number"
                ? `${item.stockQuantity} in stock`
                : null,
            ]
              .filter(Boolean)
              .join(" · "),
          status: toStringValue(item.status, "Unknown"),
          updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
          featured: Boolean(item.featured),
          isPromoted: Boolean(item.isPromoted),
          isOnSale: Boolean(item.isOnSale),
          isSold: Boolean(item.isSold),
          barcodeId: typeof item.barcodeId === "string" ? item.barcodeId : undefined,
          image: toStringValue(item.mainImage, "") || undefined,
        };
        return overrides[id] ? { ...base, ...overrides[id] } : base;
      }),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
    buildFilters: (state) => {
      const parts: string[] = [];
      if (state.status && state.status !== "All") parts.push(sieveFilter("status", SIEVE_OP.EQ, state.status));

      // `state.type` is a pipe-joined set of canonical ListingType values
      // (multi-select chips). It used to be a single display LABEL resolved
      // through a TYPE_FILTER_MAP lookup — an indirection that silently
      // dropped `art` and `stickers`, which had no map entry.
      const selectedTypes = parseSelectedListingTypes(state.type);
      if (selectedTypes.length > 0) {
        parts.push(sieveFilter("listingType", SIEVE_OP.EQ, selectedTypes.join("|")));
      }

      // Three drawer chips (Sold / Ended / Closed) used to live here, each
      // emitting its own clause and each guarded by an `onlyType` check
      // because `auctionEndDate` and `prizeRevealWindowEnd` do not exist on
      // the other seven types. That guard meant the ended/closed filters
      // silently did nothing on any mixed selection. The scope param replaces
      // all three, and resolves the per-type meaning server-side — so it works
      // across a mixed selection, which is the common case here.
      return parts.join(",") || undefined;
    },
    buildExtraParams: () => scope.extraParams,
    renderAboveContent: scope.renderAboveContent,
    primaryAction: {
      label: "Add Product",
      onClick: ({ openCreatePanel }) => openCreatePanel(),
    },
    // Rule #7: bulk-action array sourced from the ADMIN_BULK_ACTIONS preset.
    buildBulkActions: (selection): BulkActionItem[] => {
      const fieldByAction: Partial<Record<(typeof ADMIN_BULK_ACTIONS.products)[number], FlagField>> = {
        [ROW_ACTION_ID.FEATURE]: "featured",
        [ROW_ACTION_ID.PROMOTE]: "isPromoted",
        [ROW_ACTION_ID.SALE]: "isOnSale",
      };
      /*
       * 🛑 ONE request, not one per row.
       *
       * This was `selectedIds.forEach((rowId) => toggleField(rowId, field))`
       * — a fire-and-forget `forEach` of single-row PATCHes. Selecting 200
       * products and clicking Feature fired **200 concurrent requests**, each
       * its own function invocation, with `clearSelection()` running
       * immediately so nothing reported what actually happened. A row that
       * failed raised its own toast, up to 200 of them.
       *
       * The bulk route returns `{updated, failed, summary}`, so a partial
       * failure is now a single message naming the count instead of silence.
       * Selection is cleared only AFTER the request resolves — clearing first
       * is what made it look finished the instant it was clicked.
       *
       * The optimistic `overrides` are still applied per row so the switches
       * move immediately; a failure rolls back only the ids the server names.
       */
      const bulkToggle = (field: FlagField) => async () => {
        const ids = [...selection.selectedIds];
        if (ids.length === 0) return;
        const value = !selection.rows.find((r) => r.id === ids[0])?.[field];
        await handleBulkToggle(ids, field, value);
        selection.clearSelection();
      };
      return ADMIN_BULK_ACTIONS.products.map((id) => ({
        id,
        label: ROW_ACTION_META[id].label,
        variant: "secondary" as const,
        onClick: bulkToggle(fieldByAction[id]!),
      }));
    },
    renderRowActions: (row) => (
      <QuickEditMenu
        actions={[
          {
            label: ACTIONS.ADMIN["approve-product"].label,
            onClick: () => handleQuickEdit(row.id, { status: "published" }),
            disabled: row.status === "published",
          },
          {
            label: ACTIONS.ADMIN["reject-product"].label,
            destructive: true,
            onClick: () => handleQuickEdit(row.id, { status: "rejected" }),
            disabled: row.status === "rejected",
          },
          {
            label: "Quick edit",
            separator: true,
            formTitle: "Quick Edit Product",
            fields: [
              {
                name: "status",
                label: "Status",
                type: "select",
                required: true,
                options: ADMIN_PRODUCT_STATUS_TABS.filter((t) => t.id !== "All").map((t) => ({
                  value: t.id,
                  label: t.label,
                })),
              },
              { name: "featured", label: "Featured", type: "toggle" },
              { name: "isPromoted", label: "Promoted", type: "toggle" },
              { name: "barcodeId", label: "Barcode ID", type: "text" },
            ],
            defaultValues: {
              status: row.status,
              featured: row.featured,
              isPromoted: row.isPromoted,
              barcodeId: String(row.barcodeId ?? ""),
            },
            onSubmit: (vals) => handleQuickEdit(row.id, vals),
            submitLabel: "Save",
          },
        ]}
      />
    ),
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <>
        <FilterChipGroup
          label="Status"
          tabs={ADMIN_PRODUCT_STATUS_TABS}
          value={pendingFilters.status ?? ""}
          onChange={(id) => setPendingFilters((p) => ({ ...p, status: id }))}
        />
        {/* Multi-select: an admin reviewing the queue usually wants two or
            three types at once (e.g. auctions + prize draws), which the old
            single-select chips made impossible. */}
        <FilterChipGroup
          multiple
          label="Type"
          tabs={ADMIN_PRODUCT_LISTING_TYPE_TABS}
          value={pendingFilters.type ?? ""}
          onChange={(ids) => setPendingFilters((p) => ({ ...p, type: ids }))}
        />
      </>
    ),
    renderEditor: ({ editId, closePanel }) => (
      <AdminProductEditorView
        productId={editId ?? undefined}
        initialData={editId ? (rawByIdRef.current[editId] as any) : undefined}
        onSaved={closePanel}
        onDeleted={closePanel}
        embedded
      />
    ),
    resolveEditorTitle: ({ isCreate }) => (isCreate ? "Add Product" : "Edit Product"),
  };

  return <DataListingView config={config} />;
}
