"use client";
import { normalizeError } from "../../../errors/normalize";

import { SIEVE_OP, Stack, sieveFilter, type JsonArray, Row } from "@mohasinac/appkit";
import { sortBy } from "@mohasinac/appkit";
import React, { useState, useCallback } from "react";
import { ListingLayout, Span, Text, Toggle, useToast } from "../../../ui";
import type { ListingLayoutProps, BulkActionItem } from "../../../ui";
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
import { FilterChipGroup } from "../../../ui";
import type { AdminTableColumn } from "../types";
import { apiClient } from "../../../http";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { AdminProductEditorView } from "./AdminProductEditorView";
import { QuickEditMenu } from "./QuickEditMenu";
import { ADMIN_BULK_ACTIONS, ROW_ACTION_META, ROW_ACTION_ID } from "../../products/constants/action-defs";

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

const FLAG_DEFS: { key: FlagField; label: string }[] = [
  { key: "featured", label: "Featured" },
  { key: "isPromoted", label: "Promoted" },
  { key: "isOnSale", label: "On Sale" },
  { key: "isSold", label: "Sold" },
];

const TYPE_FILTER_MAP: Record<string, string> = {
  Auctions: "listingType==auction",
  "Pre-orders": "listingType==pre-order",
  "Prize Draws": "listingType==prize-draw",
  Products: "listingType==standard",
  Classifieds: "listingType==classified",
  "Digital Codes": "listingType==digital-code",
  "Live Items": "listingType==live",
};

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

  // We need showSold state to be derived from URL — read it via a small inner component
  // that uses the listing's own table state. To keep things simple, use a ref into the
  // config's render-prop chain via `renderAboveContent` which has no useUrlTable.
  // Simplest: use buildFilters which gets the full filterState, and add showSold to filterKeys.

  const config: ListingViewConfig<AdminProductsResponse, ProductRow> = {
    portal: "admin",
    title: "Products",
    searchPlaceholder: "Search products, SKUs, or seller names",
    emptyLabel: "No products found",
    filterKeys: ["status", "type", "showSold", "showEnded", "showClosed"],
    defaultSort: sortBy("createdAt", "DESC"),
    queryKey: ["admin", "products", "listing"],
    endpoint: ADMIN_ENDPOINTS.PRODUCTS,
    sortOptions: [
      { value: sortBy("createdAt", "DESC"), label: "Newest" },
      { value: sortBy("createdAt", "ASC"), label: "Oldest" },
      { value: "title", label: "Title A–Z" },
      { value: sortBy("price", "DESC"), label: "Highest price" },
    ],
    columns: [...buildBaseColumns(), flagColumn],
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => {
        const id = toStringValue(item.id, `product-${index}`);
        rawByIdRef.current[id] = item;
        const base: ProductRow = {
          id,
          primary: toStringValue(item.title ?? item.name, "Untitled product"),
          secondary: [
            toStringValue(item.sellerName, "Unknown seller"),
            toStringValue(item.sku, "No SKU"),
          ].join(" · "),
          status: toStringValue(item.status, "Unknown"),
          updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
          featured: Boolean(item.featured),
          isPromoted: Boolean(item.isPromoted),
          isOnSale: Boolean(item.isOnSale),
          isSold: Boolean(item.isSold),
          barcodeId: typeof item.barcodeId === "string" ? item.barcodeId : undefined,
        };
        return overrides[id] ? { ...base, ...overrides[id] } : base;
      }),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
    buildFilters: (state) => {
      const parts: string[] = [];
      if (state.showSold !== "true") parts.push("isSold==false");
      if (state.status && state.status !== "All") parts.push(sieveFilter("status", SIEVE_OP.EQ, state.status));
      const typeFilter = TYPE_FILTER_MAP[state.type];
      if (typeFilter) parts.push(typeFilter);
      // Ended/closed only apply to auctions/prize-draws — auctionEndDate
      // and prizeRevealWindowEnd do not exist on other listing types, so
      // these are no-ops unless the matching Type tab is also selected.
      if (typeFilter === "listingType==auction" && state.showEnded !== "true") {
        parts.push(sieveFilter("auctionEndDate", SIEVE_OP.GTE, new Date().toISOString()));
      }
      if (typeFilter === "listingType==prize-draw" && state.showClosed !== "true") {
        parts.push(sieveFilter("prizeRevealWindowEnd", SIEVE_OP.GTE, new Date().toISOString()));
      }
      return parts.join(",") || undefined;
    },
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
      const toggleField = (rowId: string, field: FlagField) => {
        const row = selection.rows.find((r) => r.id === rowId);
        if (row) void handleToggle(rowId, field, !row[field]);
      };
      const bulkToggle = (field: FlagField) => () => {
        selection.selectedIds.forEach((rowId) => toggleField(rowId, field));
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
        <FilterChipGroup
          label="Type"
          tabs={ADMIN_PRODUCT_LISTING_TYPE_TABS}
          value={pendingFilters.type ?? ""}
          onChange={(id) => setPendingFilters((p) => ({ ...p, type: id }))}
        />
        <FilterChipGroup
          label="Sold"
          tabs={[
            { id: "", label: "Hide sold" },
            { id: "true", label: "Show sold" },
          ]}
          value={pendingFilters.showSold ?? ""}
          onChange={(id) => setPendingFilters((p) => ({ ...p, showSold: id }))}
          allId=""
        />
        <FilterChipGroup
          label="Ended"
          tabs={[
            { id: "", label: "Hide ended" },
            { id: "true", label: "Show ended" },
          ]}
          value={pendingFilters.showEnded ?? ""}
          onChange={(id) => setPendingFilters((p) => ({ ...p, showEnded: id }))}
          allId=""
        />
        <FilterChipGroup
          label="Closed"
          tabs={[
            { id: "", label: "Hide closed" },
            { id: "true", label: "Show closed" },
          ]}
          value={pendingFilters.showClosed ?? ""}
          onChange={(id) => setPendingFilters((p) => ({ ...p, showClosed: id }))}
          allId=""
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
