"use client";

import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FilterChipGroup, ListingToolbar, Pagination, ListingLayout, RowActionMenu, useToast, ListingFilterDrawer} from "../../../ui";
import type { ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { ADMIN_EVENT_ENTRY_STATUS_TABS } from "../constants/filter-tabs";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { useAdminListing } from "../hooks/useAdminListing";
import { DataTable } from "./DataTable";
import { AdminViewCards } from "./AdminViewCards";
import { apiClient } from "../../../http";

const DEFAULT_SORT = "-submittedAt";
const SORT_OPTIONS = [
  { value: "-submittedAt", label: "Newest" },
  { value: "submittedAt", label: "Oldest" },
];
const STATUS_OPTIONS = ADMIN_EVENT_ENTRY_STATUS_TABS;

export interface AdminAllEventEntriesViewProps extends ListingLayoutProps {}

interface AdminEventEntriesResponse {
  items?: unknown[];
  total?: number;
}

interface EntryRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  eventId?: string;
}

export function AdminAllEventEntriesView({ children, ...props }: AdminAllEventEntriesViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const {
    view, setView, table, searchInput, setSearchInput, commitSearch,
    filterOpen, setFilterOpen, openFilters, applyFilters, clearFilters,
    pendingFilters, setPendingFilters,
    activeFilterCount, hasActiveState, resetAll,
    rows, total, isLoading, errorMessage,
    currentPage, totalPages, selection,
  } = useAdminListing<AdminEventEntriesResponse, EntryRow>({
    filterKeys: ["status"],
    defaultSort: DEFAULT_SORT,
    queryKey: ["admin", "event-entries", "listing"],
    endpoint: ADMIN_ENDPOINTS.ADMIN_EVENT_ENTRIES,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `entry-${index}`),
        primary: toStringValue(item.userDisplayName ?? item.userName, "Unknown user"),
        secondary: [
          toStringValue(item.eventId, ""),
          toStringValue(item.userEmail, ""),
        ].filter(Boolean).join(" · "),
        status: toStringValue(item.status ?? item.reviewStatus, "PENDING"),
        updatedAt: toRelativeDate(item.submittedAt ?? item.createdAt),
        eventId: toStringValue(item.eventId, ""),
      })),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
    buildFilters: (filterState) => {
      const statusRaw = filterState.status;
      return statusRaw && statusRaw !== "All" ? `status==${statusRaw}` : undefined;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiClient.patch(ADMIN_ENDPOINTS.ADMIN_EVENT_ENTRY_BY_ID(id), { status });
    },
    onSuccess: () => {
      showToast("Entry updated.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "event-entries"] });
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to update entry.", "error");
    },
  });

  if (hasChildren) {
    return <ListingLayout portal="admin" {...props}>{children}</ListingLayout>;
  }

  return (
    <div className="min-h-screen">
      <ListingToolbar
        filterCount={activeFilterCount}
        onFiltersClick={openFilters}
        searchValue={searchInput}
        searchPlaceholder="Search by user name or event ID"
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
          emptyLabel="No entries found"
          renderRowActions={(row) => {
            const er = row as EntryRow;
            return (
              <RowActionMenu
                actions={[
                  { label: ACTIONS.ADMIN["confirm-entry"].label, onClick: () => updateMutation.mutate({ id: er.id, status: "CONFIRMED" }) },
                  { label: ACTIONS.ADMIN["waitlist-entry"].label, onClick: () => updateMutation.mutate({ id: er.id, status: "WAITLISTED" }) },
                  { label: ACTIONS.ADMIN["cancel-entry"].label, destructive: true, onClick: () => updateMutation.mutate({ id: er.id, status: "CANCELLED" }) },
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
  );
}
