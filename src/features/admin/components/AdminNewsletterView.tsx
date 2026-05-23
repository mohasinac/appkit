"use client";

import React, { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BulkActionBar, Button,
  ConfirmDeleteModal,
  FilterChipGroup,
  ListingToolbar,
  ListingLayout,
  Pagination,
  RowActionMenu,
  useToast, ListingFilterDrawer} from "../../../ui";
import { useBottomActions } from "../../layout";
import type { BulkActionItem, ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { buildBulkAction } from "../../../_internal/shared/actions/bulk-helpers";
import { ADMIN_NEWSLETTER_STATUS_TABS } from "../constants/filter-tabs";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { useAdminListing } from "../hooks/useAdminListing";
import { DataTable } from "./DataTable";
import { AdminViewCards } from "./AdminViewCards";
import { apiClient } from "../../../http";

const FILTER_KEYS = ["status"];
const DEFAULT_SORT = "-subscribedAt";
const SORT_OPTIONS = [
  { value: "-subscribedAt", label: "Newest" },
  { value: "subscribedAt", label: "Oldest" },
];
const STATUS_OPTIONS = ADMIN_NEWSLETTER_STATUS_TABS;

export interface AdminNewsletterViewProps extends ListingLayoutProps {
  onBulkUnsubscribe?: (ids: string[]) => Promise<void>;
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
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [unsubscribeOpen, setUnsubscribeOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<NewsletterRow | null>(null);

  const {
    view, setView, table, searchInput, setSearchInput, commitSearch,
    filterOpen, setFilterOpen, openFilters, applyFilters, clearFilters,
    pendingFilters, setPendingFilters, activeFilterCount, hasActiveState, resetAll,
    rows, total, isLoading, errorMessage,
    currentPage, totalPages, selection,
  } = useAdminListing<AdminNewsletterResponse, NewsletterRow>({
    filterKeys: FILTER_KEYS,
    defaultSort: DEFAULT_SORT,
    queryKey: ["admin", "newsletter", "listing"],
    endpoint: ADMIN_ENDPOINTS.NEWSLETTER,
    buildFilters: (state) => {
      const statusRaw = state.status;
      return statusRaw && statusRaw !== "All" ? `status==${statusRaw}` : undefined;
    },
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

  const bulkActions: BulkActionItem[] = [
    ...(onBulkUnsubscribe ? [buildBulkAction(ACTIONS.ADMIN["unsubscribe-newsletter"], async () => { await onBulkUnsubscribe(selection.selectedIds); selection.clearSelection(); })] : []),
  ];

  useBottomActions(selection.selectedCount > 0 ? { bulk: { selectedCount: selection.selectedCount, onClearSelection: selection.clearSelection, actions: bulkActions } } : {});

  if (hasChildren) {
    return <ListingLayout portal="admin" {...props}>{children}</ListingLayout>;
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

        <ListingFilterDrawer open={filterOpen} onClose={() => setFilterOpen(false)} onApply={applyFilters} onClear={clearFilters} activeCount={activeFilterCount}>
        <FilterChipGroup
            label="Status"
            tabs={STATUS_OPTIONS}
            value={pendingFilters.status ?? ""}
            onChange={(id) => setPendingFilters((p) => ({ ...p, status: id }))}
          />
      </ListingFilterDrawer>
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
