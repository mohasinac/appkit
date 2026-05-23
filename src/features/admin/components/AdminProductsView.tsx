"use client";

import React, { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { useBottomActions } from "../../layout";
import { BulkActionBar, Button, FilterChipGroup, Heading, ListingFilterDrawer, ListingToolbar, ListingLayout, Pagination, SideDrawer, Text, Toggle, useToast } from "../../../ui";
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
import { useAdminListing } from "../hooks/useAdminListing";
import { DataTable } from "./DataTable";
import type { AdminListingScaffoldRow } from "./AdminListingScaffold";
import { AdminViewCards } from "./AdminViewCards";
import type { AdminTableColumn } from "../types";
import { apiClient } from "../../../http";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { AdminProductEditorView } from "./AdminProductEditorView";
import { QuickEditMenu } from "./QuickEditMenu";

const PAGE_SIZE = 25;
const FILTER_KEYS = ["status", "type", "showSold"];
const DEFAULT_SORT = "-createdAt";
const SORT_OPTIONS = [
  { value: "-createdAt", label: "Newest" },
  { value: "createdAt", label: "Oldest" },
  { value: "title", label: "Title A–Z" },
  { value: "-price", label: "Highest price" },
];
const STATUS_OPTIONS = ADMIN_PRODUCT_STATUS_TABS;
const TYPE_OPTIONS = ADMIN_PRODUCT_LISTING_TYPE_TABS;

export interface AdminProductsViewProps extends ListingLayoutProps {
  actionHref?: string;
  getRowHref?: (row: AdminListingScaffoldRow) => string;
}

interface AdminProductsResponse {
  items?: unknown[];
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

function buildBaseColumns(): AdminTableColumn<ProductRow>[] {
  return [
    {
      key: "primary",
      header: "Item",
      sortable: true,
      render: (row) => (
        <div className="space-y-1">
          <Text className="font-semibold text-zinc-900 dark:text-zinc-100">{row.primary}</Text>
          <Text className="text-xs text-zinc-500 dark:text-zinc-400">{row.secondary}</Text>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      className: "w-36",
      render: (row) => (
        <span className="inline-flex rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-800 dark:bg-secondary-900/30 dark:text-secondary-300">
          {row.status}
        </span>
      ),
    },
    {
      key: "updatedAt",
      header: "Updated",
      sortable: true,
      className: "w-36",
      render: (row) => (
        <span className="text-sm text-zinc-600 dark:text-zinc-300">{row.updatedAt}</span>
      ),
    },
  ];
}


export function AdminProductsView({ children, actionHref, getRowHref, ...props }: AdminProductsViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const [overrides, setOverrides] = useState<Record<string, Partial<ProductRow>>>({});
  const { showToast } = useToast();

  const listing = useAdminListing<AdminProductsResponse, ProductRow>({
    filterKeys: FILTER_KEYS,
    defaultSort: DEFAULT_SORT,
    pageSize: PAGE_SIZE,
    queryKey: ["admin", "products", "listing"],
    endpoint: ADMIN_ENDPOINTS.PRODUCTS,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `product-${index}`),
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
      })),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
    buildFilters: (filterState) => {
      const parts: string[] = [];
      if (filterState.showSold !== "true") parts.push("isSold==false");
      const statusRaw = filterState.status;
      if (statusRaw && statusRaw !== "All") parts.push(`status==${statusRaw}`);
      const typeRaw = filterState.type;
      if (typeRaw && typeRaw !== "All") {
        const TYPE_FILTER: Record<string, string> = {
          Auctions: "listingType==auction",
          "Pre-orders": "listingType==pre-order",
          "Prize Draws": "listingType==prize-draw",
          Products: "listingType==standard",
          Classifieds: "listingType==classified",
          "Digital Codes": "listingType==digital-code",
          "Live Items": "listingType==live",
        };
        const typeFilter = TYPE_FILTER[typeRaw];
        if (typeFilter) parts.push(typeFilter);
      }
      return parts.join(",") || undefined;
    },
  });

  const {
    view, setView, table, panel, searchInput, setSearchInput, commitSearch,
    filterOpen, setFilterOpen, openFilters, applyFilters, clearFilters,
    pendingFilters, setPendingFilters, hasActiveState: baseHasActiveState,
    rows: fetchedRows, total, isLoading, errorMessage,
    currentPage, totalPages, selection,
  } = listing;

  const showSold = table.get("showSold") === "true";
  // Exclude showSold from filter chip count — it has its own toggle
  const activeFilterCount = ["status", "type"].filter((k) => !!table.get(k)).length;
  const hasActiveState = baseHasActiveState || showSold;

  const resetAll = useCallback(() => {
    table.setMany({ q: "", sort: "", showSold: "", status: "", type: "" });
    listing.setSearchInput("");
  }, [table, listing]);

  const rows: ProductRow[] = fetchedRows.map((r) =>
    overrides[r.id] ? { ...r, ...overrides[r.id] } : r,
  );

  const handleToggle = async (id: string, field: FlagField, value: boolean) => {
    const prev = fetchedRows.find((r) => r.id === id)?.[field];
    setOverrides((o) => ({ ...o, [id]: { ...o[id], [field]: value } }));
    try {
      await apiClient.patch(ADMIN_ENDPOINTS.PRODUCT_BY_ID(id), { [field]: value });
    } catch (err) {
      setOverrides((o) => ({ ...o, [id]: { ...o[id], [field]: prev } }));
      showToast((err as Error)?.message ?? "Failed to update product.", "error");
    }
  };

  const handleQuickEdit = useCallback(async (id: string, values: Record<string, unknown>) => {
    const prev = fetchedRows.find((r) => r.id === id);
    setOverrides((o) => ({ ...o, [id]: { ...o[id], ...values } }));
    try {
      await apiClient.patch(ADMIN_ENDPOINTS.PRODUCT_BY_ID(id), values);
      showToast("Product updated.", "success");
    } catch (err) {
      if (prev) setOverrides((o) => ({ ...o, [id]: prev }));
      showToast((err as Error)?.message ?? "Failed to update product.", "error");
      throw err;
    }
  }, [fetchedRows, showToast]);

  if (hasChildren) {
    return <ListingLayout portal="admin" {...props}>{children}</ListingLayout>;
  }

  const flagColumn: AdminTableColumn<ProductRow> = {
    key: "flags",
    header: "Flags",
    className: "w-56",
    render: (row) => (
      <div
        className="flex flex-wrap gap-x-3 gap-y-1"
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
            onChange={(v) => { void handleToggle(row.id, key, v); }}
          />
        ))}
      </div>
    ),
  };

  useBottomActions(selection.selectedCount > 0 ? { bulk: { selectedCount: selection.selectedCount, onClearSelection: selection.clearSelection, actions: [
    { id: "feature", label: ACTIONS.ADMIN["toggle-featured"].label, variant: "secondary", onClick: () => { for (const id of selection.selectedIds) void handleToggle(id, "featured", !rows.find(r => r.id === id)?.featured); selection.clearSelection(); } },
    { id: "promote", label: ACTIONS.ADMIN["toggle-promoted"].label, variant: "secondary", onClick: () => { for (const id of selection.selectedIds) void handleToggle(id, "isPromoted", !rows.find(r => r.id === id)?.isPromoted); selection.clearSelection(); } },
    { id: "sale", label: ACTIONS.ADMIN["toggle-on-sale"].label, variant: "secondary", onClick: () => { for (const id of selection.selectedIds) void handleToggle(id, "isOnSale", !rows.find(r => r.id === id)?.isOnSale); selection.clearSelection(); } },
  ] } } : {});

  return (
    <div className="min-h-screen">
      <Heading level={1} className="sr-only">Products</Heading>
      <ListingToolbar
        filterCount={activeFilterCount}
        onFiltersClick={openFilters}
        searchValue={searchInput}
        searchPlaceholder="Search products, SKUs, or seller names"
        onSearchChange={setSearchInput}
        onSearchCommit={commitSearch}
        sortValue={table.get("sort") || DEFAULT_SORT}
        sortOptions={SORT_OPTIONS}
        onSortChange={(v) => { table.set("sort", v); }}
        showTableView
        view={view}
        onViewChange={(v) => setView(v)}
        onResetAll={resetAll}
        hasActiveState={hasActiveState}
        toggles={[
          { label: "Show sold", active: showSold, onChange: (next) => table.set("showSold", next ? "true" : "") },
        ]}
        extra={
          <Button size="sm" onClick={panel.openCreatePanel} className="flex items-center gap-1.5">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        }
      />

      <BulkActionBar
        selectedCount={selection.selectedCount}
        onClearSelection={selection.clearSelection}
        actions={([
          { id: "feature", label: ACTIONS.ADMIN["toggle-featured"].label, variant: "secondary", onClick: () => { for (const id of selection.selectedIds) void handleToggle(id, "featured", !rows.find(r => r.id === id)?.featured); selection.clearSelection(); } },
          { id: "promote", label: ACTIONS.ADMIN["toggle-promoted"].label, variant: "secondary", onClick: () => { for (const id of selection.selectedIds) void handleToggle(id, "isPromoted", !rows.find(r => r.id === id)?.isPromoted); selection.clearSelection(); } },
          { id: "sale", label: ACTIONS.ADMIN["toggle-on-sale"].label, variant: "secondary", onClick: () => { for (const id of selection.selectedIds) void handleToggle(id, "isOnSale", !rows.find(r => r.id === id)?.isOnSale); selection.clearSelection(); } },
        ] satisfies BulkActionItem[])}
      />

      {totalPages > 1 && (
        <div className="sticky top-[calc(var(--header-height,0px)+44px)] z-10 flex justify-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-slate-700 px-3 py-1.5">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => table.setPage(p)} />
        </div>
      )}

      <div className="py-4 px-3 sm:px-4">
        {errorMessage && (
          <div className="mb-4 rounded-xl border border-red-200 bg-error-surface px-4 py-3 text-sm text-error dark:border-red-900/60">
            {errorMessage}
          </div>
        )}
        {view === "table" ? (
          <DataTable
            rows={rows}
            columns={[...buildBaseColumns(), flagColumn]}
            isLoading={isLoading}
            emptyLabel="No products found"
            onRowClick={(row) => panel.openEditPanel(row.id)}
            selectedIds={selection.selectedIdSet}
            onToggleSelect={selection.toggle}
            onToggleSelectAll={(next) => next ? selection.setSelectedIds(rows.map(r => r.id)) : selection.clearSelection()}
            renderRowActions={(row) => (
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
                      { name: "status", label: "Status", type: "select", required: true,
                        options: STATUS_OPTIONS.filter((t) => t.id !== "All").map((t) => ({ value: t.id, label: t.label })) },
                      { name: "featured", label: "Featured", type: "toggle" },
                      { name: "isPromoted", label: "Promoted", type: "toggle" },
                    ],
                    defaultValues: { status: row.status, featured: row.featured, isPromoted: row.isPromoted },
                    onSubmit: (vals) => handleQuickEdit(row.id, vals),
                    submitLabel: "Save",
                  },
                  {
                    label: "Open full editor",
                    separator: true,
                    onClick: () => panel.openEditPanel(row.id),
                  },
                ]}
              />
            )}
          />
        ) : (
          <AdminViewCards
            rows={rows}
            view={view}
            isLoading={isLoading}
            emptyLabel="No products found"
            onRowClick={(row) => panel.openEditPanel(row.id)}
            selectedIdSet={selection.selectedIdSet}
            onToggleSelect={selection.toggle}
          />
        )}
      </div>

      <ListingFilterDrawer open={filterOpen} onClose={() => setFilterOpen(false)} onApply={applyFilters} onClear={clearFilters} activeCount={activeFilterCount}>
          <FilterChipGroup
            label="Status"
            tabs={STATUS_OPTIONS}
            value={pendingFilters.status ?? ""}
            onChange={(id) => setPendingFilters((p) => ({ ...p, status: id }))}
          />
          <FilterChipGroup
            label="Type"
            tabs={TYPE_OPTIONS}
            value={pendingFilters.type ?? ""}
            onChange={(id) => setPendingFilters((p) => ({ ...p, type: id }))}
          />
      </ListingFilterDrawer>

      <SideDrawer
        isOpen={panel.isCreateOpen || panel.isEditOpen}
        onClose={panel.closePanel}
        title={panel.isCreateOpen ? "Add Product" : "Edit Product"}
        mode={panel.isCreateOpen ? "create" : "edit"}
      >
        {(panel.isCreateOpen || panel.isEditOpen) && (
          <AdminProductEditorView
            productId={panel.editId ?? undefined}
            onSaved={panel.closePanel}
            onDeleted={panel.closePanel}
            embedded
          />
        )}
      </SideDrawer>
    </div>
  );
}
