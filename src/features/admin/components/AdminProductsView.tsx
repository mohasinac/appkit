"use client";

import React, { useState, useCallback } from "react";
import { Plus, X } from "lucide-react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { usePanelUrlSync } from "../../../react/hooks/use-panel-url-sync";
import { Button, ListingToolbar, ListingViewShell, Pagination, SideDrawer, Toggle, useToast } from "../../../ui";
import type { ListingViewShellProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  ADMIN_PRODUCT_STATUS_TABS,
  ADMIN_PRODUCT_LISTING_TYPE_TABS,
} from "../constants/filter-tabs";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
  useAdminListingData,
} from "../hooks/useAdminListingData";
import { DataTable } from "./DataTable";
import type { AdminListingScaffoldRow } from "./AdminListingScaffold";
import type { AdminTableColumn } from "../types";
import { apiClient } from "../../../http";
import { AdminProductEditorView } from "./AdminProductEditorView";
import { QuickEditMenu } from "./QuickEditMenu";

const PAGE_SIZE = 25;
const FILTER_KEYS = ["status", "type"];
const DEFAULT_SORT = "-createdAt";
const SORT_OPTIONS = [
  { value: "-createdAt", label: "Newest" },
  { value: "createdAt", label: "Oldest" },
  { value: "title", label: "Title A–Z" },
  { value: "-price", label: "Highest price" },
];
const STATUS_OPTIONS = ADMIN_PRODUCT_STATUS_TABS;
const TYPE_OPTIONS = ADMIN_PRODUCT_LISTING_TYPE_TABS;

export interface AdminProductsViewProps extends ListingViewShellProps {
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
          <p className="font-semibold text-zinc-900 dark:text-zinc-100">{row.primary}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{row.secondary}</p>
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

  const table = useUrlTable({ defaults: { pageSize: String(PAGE_SIZE), sort: DEFAULT_SORT } });
  const { openCreatePanel, openEditPanel, closePanel, isCreateOpen, isEditOpen, editId } = usePanelUrlSync();
  const [searchInput, setSearchInput] = useState(table.get("q") || "");
  const [filterOpen, setFilterOpen] = useState(false);
  const [pendingFilters, setPendingFilters] = useState<Record<string, string>>(
    () => Object.fromEntries(FILTER_KEYS.map((k) => [k, table.get(k)])),
  );

  const openFilters = useCallback(() => {
    setPendingFilters(Object.fromEntries(FILTER_KEYS.map((k) => [k, table.get(k)])));
    setFilterOpen(true);
  }, [table]);

  const applyFilters = useCallback(() => {
    const updates: Record<string, string> = { page: "1" };
    for (const k of FILTER_KEYS) updates[k] = pendingFilters[k] ?? "";
    table.setMany(updates);
    setFilterOpen(false);
  }, [pendingFilters, table]);

  const clearFilters = useCallback(() => {
    setPendingFilters(Object.fromEntries(FILTER_KEYS.map((k) => [k, ""])));
  }, []);

  const resetAll = useCallback(() => {
    const updates: Record<string, string> = { q: "", sort: "" };
    for (const k of FILTER_KEYS) updates[k] = "";
    table.setMany(updates);
    setSearchInput("");
  }, [table]);

  const commitSearch = useCallback(() => {
    table.set("q", searchInput.trim());
  }, [searchInput, table]);

  const activeFilterCount = FILTER_KEYS.filter((k) => !!table.get(k)).length;
  const hasActiveState = !!table.get("q") || table.get("sort") !== DEFAULT_SORT || activeFilterCount > 0;

  const filterParts: string[] = [];
  const statusRaw = table.get("status");
  if (statusRaw && statusRaw !== "All") filterParts.push(`status==${statusRaw}`);
  const typeRaw = table.get("type");
  if (typeRaw && typeRaw !== "All") {
    if (typeRaw === "Auctions") filterParts.push("listingType==auction");
    else if (typeRaw === "Pre-orders") filterParts.push("listingType==pre-order");
    else if (typeRaw === "Prize Draws") filterParts.push("listingType==prize-draw");
    else if (typeRaw === "Products") filterParts.push("listingType==standard");
  }
  const filters = filterParts.join(",") || undefined;

  const { rows: fetchedRows, total, isLoading, errorMessage } = useAdminListingData<AdminProductsResponse, ProductRow>({
    queryKey: ["admin", "products", "listing"],
    endpoint: ADMIN_ENDPOINTS.PRODUCTS,
    page: table.getNumber("page", 1),
    pageSize: PAGE_SIZE,
    sorts: table.get("sort") || DEFAULT_SORT,
    filters,
    q: table.get("q") || undefined,
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
  });

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

  const currentPage = table.getNumber("page", 1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (hasChildren) {
    return <ListingViewShell portal="admin" {...props}>{children}</ListingViewShell>;
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

  return (
    <div className="min-h-screen">
      <ListingToolbar
        filterCount={activeFilterCount}
        onFiltersClick={openFilters}
        searchValue={searchInput}
        searchPlaceholder="Search products, SKUs, or seller names"
        onSearchChange={setSearchInput}
        onSearchCommit={commitSearch}
        sortValue={table.get("sort") || DEFAULT_SORT}
        sortOptions={SORT_OPTIONS}
        onSortChange={(v) => { table.set("sort", v); table.setPage(1); }}
        hideViewToggle
        onResetAll={resetAll}
        hasActiveState={hasActiveState}
        extra={
          <Button size="sm" onClick={openCreatePanel} className="flex items-center gap-1.5">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        }
      />

      {totalPages > 1 && (
        <div className="sticky top-[calc(var(--header-height,0px)+44px)] z-10 flex justify-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-slate-700 px-3 py-1.5">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => table.setPage(p)} />
        </div>
      )}

      <div className="py-4 px-3 sm:px-4">
        {errorMessage && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
            {errorMessage}
          </div>
        )}
        <DataTable
          rows={rows}
          columns={[...buildBaseColumns(), flagColumn]}
          isLoading={isLoading}
          emptyLabel="No products found"
          onRowClick={(row) => openEditPanel(row.id)}
          renderRowActions={(row) => (
            <QuickEditMenu
              actions={[
                {
                  label: "Quick edit",
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
                  onClick: () => openEditPanel(row.id),
                },
              ]}
            />
          )}
        />
      </div>

      {filterOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" aria-hidden="true" onClick={() => setFilterOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 flex w-80 flex-col bg-white dark:bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-slate-700 px-4 py-3.5">
              <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Filters</span>
              <div className="flex items-center gap-2">
                {activeFilterCount > 0 && (
                  <button type="button" onClick={clearFilters} className="text-xs text-zinc-500 hover:text-rose-500 dark:text-zinc-400 transition-colors">Clear all</button>
                )}
                <button type="button" onClick={() => setFilterOpen(false)} aria-label="Close" className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Status</p>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((tab) => (
                    <button key={tab.id} type="button"
                      onClick={() => setPendingFilters((p) => ({ ...p, status: tab.id === "All" ? "" : tab.id }))}
                      className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${(pendingFilters.status || "All") === tab.id ? "bg-primary text-white border-primary" : "border-zinc-300 dark:border-slate-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-slate-800"}`}
                    >{tab.label}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Type</p>
                <div className="flex flex-wrap gap-2">
                  {TYPE_OPTIONS.map((tab) => (
                    <button key={tab.id} type="button"
                      onClick={() => setPendingFilters((p) => ({ ...p, type: tab.id === "All" ? "" : tab.id }))}
                      className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${(pendingFilters.type || "All") === tab.id ? "bg-primary text-white border-primary" : "border-zinc-300 dark:border-slate-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-slate-800"}`}
                    >{tab.label}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="border-t border-zinc-200 dark:border-slate-700 px-4 py-3.5">
              <button type="button" onClick={applyFilters} className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors active:scale-[0.98]">
                Apply Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </button>
            </div>
          </div>
        </>
      )}

      <SideDrawer
        isOpen={isCreateOpen || isEditOpen}
        onClose={closePanel}
        title={isCreateOpen ? "Add Product" : "Edit Product"}
        mode={isCreateOpen ? "create" : "edit"}
      >
        {(isCreateOpen || isEditOpen) && (
          <AdminProductEditorView
            productId={editId ?? undefined}
            onSaved={closePanel}
            onDeleted={closePanel}
            embedded
          />
        )}
      </SideDrawer>
    </div>
  );
}
