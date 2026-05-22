"use client";

import React, { useState, useCallback } from "react";
import { X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useBulkSelection } from "../../../react/hooks/useBulkSelection";
import { BulkActionBar, Button,
  ConfirmDeleteModal,
  FilterChipGroup,
  ListingToolbar,
  ListingViewShell,
  Pagination,
  RowActionMenu,
  useToast, } from "../../../ui";
import { useBottomActions } from "../../layout";
import type { BulkActionItem, ListingViewShellProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { ADMIN_NEWSLETTER_STATUS_TABS } from "../constants/filter-tabs";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
  useAdminListingData,
} from "../hooks/useAdminListingData";
import { DataTable } from "./DataTable";
import { AdminViewCards } from "./AdminViewCards";
import { apiClient } from "../../../http";

const PAGE_SIZE = 25;
const FILTER_KEYS = ["status"];
const DEFAULT_SORT = "-subscribedAt";
const SORT_OPTIONS = [
  { value: "-subscribedAt", label: "Newest" },
  { value: "subscribedAt", label: "Oldest" },
];
const STATUS_OPTIONS = ADMIN_NEWSLETTER_STATUS_TABS;

export interface AdminNewsletterViewProps extends ListingViewShellProps {
  onBulkUnsubscribe?: (ids: string[]) => Promise<void>;
}

interface NewsletterFilterDrawerProps {
  filterOpen: boolean;
  setFilterOpen: (v: boolean) => void;
  activeFilterCount: number;
  clearFilters: () => void;
  pendingFilters: Record<string, string>;
  setPendingFilters: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  applyFilters: () => void;
}

function NewsletterFilterDrawer({
  filterOpen, setFilterOpen, activeFilterCount, clearFilters,
  pendingFilters, setPendingFilters, applyFilters,
}: NewsletterFilterDrawerProps) {
  if (!filterOpen) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" aria-hidden="true" onClick={() => setFilterOpen(false)} />
      <div className="fixed inset-y-0 left-0 z-50 flex w-80 flex-col bg-white dark:bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-slate-700 px-4 py-3.5">
          <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Filters</span>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <button type="button" onClick={clearFilters} className="text-xs text-zinc-500 hover:text-rose-500 dark:text-zinc-400 transition-colors">Clear all</button>
            )}
            <button type="button" onClick={() => setFilterOpen(false)} aria-label="Close" className="rounded-lg p-1.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          <FilterChipGroup
            label="Status"
            tabs={STATUS_OPTIONS}
            value={pendingFilters.status ?? ""}
            onChange={(id) => setPendingFilters((p) => ({ ...p, status: id }))}
          />
        </div>
        <div className="border-t border-zinc-200 dark:border-slate-700 px-4 py-3.5">
          <button type="button" onClick={applyFilters} className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors active:scale-[0.98]">
            Apply Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>
        </div>
      </div>
    </>
  );
}

interface AdminNewsletterResponse {
  subscribers?: unknown[];
  meta?: { filteredTotal?: number; total?: number };
}

interface NewsletterRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
}

export function AdminNewsletterView({ children, onBulkUnsubscribe, ...props }: AdminNewsletterViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const [view, setView] = useState<"grid" | "list" | "table">("table");
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [unsubscribeOpen, setUnsubscribeOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<NewsletterRow | null>(null);

  const table = useUrlTable({ defaults: { pageSize: String(PAGE_SIZE), sort: DEFAULT_SORT } });
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

  const statusRaw = table.get("status");
  const filters = statusRaw && statusRaw !== "All" ? `status==${statusRaw}` : undefined;

  const { rows, total, isLoading, errorMessage } = useAdminListingData<AdminNewsletterResponse, NewsletterRow>({
    queryKey: ["admin", "newsletter", "listing"],
    endpoint: ADMIN_ENDPOINTS.NEWSLETTER,
    page: table.getNumber("page", 1),
    pageSize: PAGE_SIZE,
    sorts: table.get("sort") || DEFAULT_SORT,
    filters,
    q: table.get("q") || undefined,
    mapRows: (response) =>
      toRecordArray(response.subscribers).map((item, index) => ({
        id: toStringValue(item.id, `sub-${index}`),
        primary: toStringValue(item.email, "Unknown email"),
        secondary: [
          toStringValue(item.source, ""),
          item.ipAddress ? "IP logged" : "",
        ].filter(Boolean).join(" · ") || "—",
        status: toStringValue(item.status, "unknown"),
        updatedAt: toRelativeDate((item as Record<string, unknown>).subscribedAt ?? (item as Record<string, unknown>).createdAt),
      })),
    getTotal: (response, mappedRows) => {
      if (typeof response.meta?.filteredTotal === "number") return response.meta.filteredTotal;
      if (typeof response.meta?.total === "number") return response.meta.total;
      return mappedRows.length;
    },
  });

  const unsubscribeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(ADMIN_ENDPOINTS.NEWSLETTER_BY_ID(id));
    },
    onSuccess: () => {
      showToast("Subscriber unsubscribed.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "newsletter"] });
      setUnsubscribeOpen(false);
      setSelectedRow(null);
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to unsubscribe.", "error");
    },
  });

  const handleExportCsv = useCallback(async () => {
    try {
      const response = await fetch(ADMIN_ENDPOINTS.NEWSLETTER_EXPORT);
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "newsletter-subscribers.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast("Failed to export CSV.", "error");
    }
  }, [showToast]);

  const currentPage = table.getNumber("page", 1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const selection = useBulkSelection({ items: rows, keyExtractor: (r: { id: string }) => r.id });

  const bulkActions: BulkActionItem[] = [
    ...(onBulkUnsubscribe ? [{
      id: "bulk-unsubscribe",
      label: ACTIONS.ADMIN["unsubscribe-newsletter"].label,
      variant: "danger" as const,
      onClick: async () => { await onBulkUnsubscribe(selection.selectedIds); selection.clearSelection(); },
    }] : []),
  ];

  useBottomActions(selection.selectedCount > 0 ? { bulk: { selectedCount: selection.selectedCount, onClearSelection: selection.clearSelection, actions: bulkActions } } : {});

  if (hasChildren) {
    return <ListingViewShell portal="admin" {...props}>{children}</ListingViewShell>;
  }

  return (
    <>
      {selection.selectedCount > 0 && bulkActions.length > 0 && (
        <BulkActionBar
          selectedCount={selection.selectedCount}
          actions={bulkActions}
          onClearSelection={selection.clearSelection}
        />
      )}

      <div className="min-h-screen">
        <ListingToolbar
          filterCount={activeFilterCount}
          onFiltersClick={openFilters}
          searchValue={searchInput}
          searchPlaceholder="Search by email or source"
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
          extra={
            <Button type="button" variant="outline" size="sm" onClick={handleExportCsv}>
              {ACTIONS.ADMIN["export-csv"].label}
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
            <div className="mb-4 rounded-xl border border-red-200 bg-error-surface px-4 py-3 text-sm text-error dark:border-red-900/60">
              {errorMessage}
            </div>
          )}
          <DataTable
            rows={rows}
            isLoading={isLoading}
            emptyLabel="No subscribers found"
            renderRowActions={(row) => {
              const nr = row as NewsletterRow;
              return (
                <RowActionMenu
                  actions={[
                    {
                      label: ACTIONS.ADMIN["unsubscribe-newsletter"].label,
                      destructive: true,
                      disabled: nr.status === "unsubscribed",
                      onClick: () => { setSelectedRow(nr); setUnsubscribeOpen(true); },
                    },
                  ]}
                />
              );
            }}
          />
        </div>

        <NewsletterFilterDrawer
          filterOpen={filterOpen}
          setFilterOpen={setFilterOpen}
          activeFilterCount={activeFilterCount}
          clearFilters={clearFilters}
          pendingFilters={pendingFilters}
          setPendingFilters={setPendingFilters}
          applyFilters={applyFilters}
        />
      </div>

      <ConfirmDeleteModal
        isOpen={unsubscribeOpen}
        onClose={() => { setUnsubscribeOpen(false); setSelectedRow(null); }}
        onConfirm={() => { if (selectedRow) unsubscribeMutation.mutate(selectedRow.id); }}
        isDeleting={unsubscribeMutation.isPending}
        title={`Unsubscribe ${selectedRow?.primary ?? "subscriber"}?`}
        message="The subscriber will be marked as unsubscribed and will no longer receive newsletter emails."
        confirmText="Unsubscribe"
        variant="warning"
      />
    </>
  );
}
