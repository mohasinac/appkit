"use client";

import React from "react";
import { Plus} from "lucide-react";
import { AdminViewCards } from "../../admin/components/AdminViewCards";
import { BulkActionBar, Button, FilterChipGroup, ListingFilterDrawer, ListingToolbar, Pagination, ListingLayout, SideDrawer } from "../../../ui";
import type { BulkActionItem, ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ADMIN_EVENT_STATUS_TABS } from "../../admin/constants/filter-tabs";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../../admin/hooks/useAdminListingData";
import { useAdminListing } from "../../admin/hooks/useAdminListing";
import { DataTable } from "../../admin/components/DataTable";
import { AdminEventEditorView } from "./AdminEventEditorView";
import { useBottomActions } from "../../layout";

const PAGE_SIZE = 25;
const FILTER_KEYS = ["status", "type"];
const DEFAULT_SORT = "-startsAt";
const SORT_OPTIONS = [
  { value: "-startsAt", label: "Starting soonest" },
  { value: "startsAt", label: "Starting latest" },
  { value: "-createdAt", label: "Newest" },
  { value: "title", label: "Title A–Z" },
];
const STATUS_OPTIONS = ADMIN_EVENT_STATUS_TABS;
// TODO(events): TYPE_OPTIONS list pre-dates the SB9 EventType union refresh
// (sale|offer|poll|survey|feedback|raffle|spin_wheel). Keep current values to
// avoid silently breaking saved-filter URLs — sync in a dedicated follow-up.
const TYPE_OPTIONS = [
  { id: "All", label: "All" },
  { id: "contest", label: "Contest" },
  { id: "giveaway", label: "Giveaway" },
  { id: "sale", label: "Sale" },
  { id: "poll", label: "Poll" },
  { id: "survey", label: "Survey" },
  { id: "flash-sale", label: "Flash Sale" },
] as const;

export interface AdminEventsViewProps extends ListingLayoutProps {
  getRowHref?: (row: { id: string }) => string;
}

interface AdminEventsApiResponse {
  items?: unknown[];
  total?: number;
}

export function AdminEventsView({ children, getRowHref, ...props }: AdminEventsViewProps) {
  const hasChildren = React.Children.count(children) > 0;

  const {
    view, setView, table, panel, searchInput, setSearchInput, commitSearch,
    filterOpen, setFilterOpen, openFilters, applyFilters, clearFilters,
    pendingFilters, setPendingFilters, activeFilterCount, hasActiveState, resetAll,
    rows, total, isLoading, errorMessage,
    currentPage, totalPages, selection,
  } = useAdminListing<
    AdminEventsApiResponse,
    { id: string; primary: string; secondary: string; status: string; updatedAt: string }
  >({
    filterKeys: FILTER_KEYS,
    defaultSort: DEFAULT_SORT,
    pageSize: PAGE_SIZE,
    queryKey: ["admin", "events", "listing"],
    endpoint: ADMIN_ENDPOINTS.EVENTS,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `event-${index}`),
        primary: toStringValue(item.title, "Untitled event"),
        secondary: [
          toStringValue(item.type, "event"),
          toStringValue(item.startsAt, ""),
        ].filter(Boolean).join(" · "),
        status: toStringValue(item.status, "active"),
        updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
      })),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
    buildFilters: (filterState) => {
      const parts: string[] = [];
      if (filterState.status && filterState.status !== "All") parts.push(`status==${filterState.status}`);
      if (filterState.type && filterState.type !== "All") parts.push(`type==${filterState.type}`);
      return parts.join(",") || undefined;
    },
  });

  if (hasChildren) {
    return <ListingLayout portal="admin" {...props}>{children}</ListingLayout>;
  }

  useBottomActions(selection.selectedCount > 0 ? { bulk: { selectedCount: selection.selectedCount, onClearSelection: selection.clearSelection, actions: ([
          { id: "delete", label: "Delete Selected", variant: "secondary", onClick: () => { selection.clearSelection(); } },
        ] satisfies BulkActionItem[]) } } : {});

  return (
    <div className="min-h-screen">
      <ListingToolbar
        filterCount={activeFilterCount}
        onFiltersClick={openFilters}
        searchValue={searchInput}
        searchPlaceholder="Search events by title or type"
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
          <Button size="sm" onClick={panel.openCreatePanel} className="flex items-center gap-1.5">
            <Plus className="h-4 w-4" />
            Add Event
          </Button>
        }
      />

      <BulkActionBar
        selectedCount={selection.selectedCount}
        onClearSelection={selection.clearSelection}
        actions={([
          { id: "delete", label: "Delete Selected", variant: "secondary", onClick: () => { selection.clearSelection(); } },
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
          <DataTable rows={rows} isLoading={isLoading} emptyLabel="No events found" onRowClick={(row) => panel.openEditPanel(row.id)} />
        ) : (
          <AdminViewCards rows={rows} view={view} isLoading={isLoading} emptyLabel="No events found" onRowClick={undefined} selectedIdSet={selection.selectedIdSet} onToggleSelect={selection.toggle} />
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
        title={panel.isCreateOpen ? "Add Event" : "Edit Event"}
        mode={panel.isCreateOpen ? "create" : "edit"}
      >
        {(panel.isCreateOpen || panel.isEditOpen) && (
          <AdminEventEditorView
            eventId={panel.editId ?? undefined}
            onSaved={panel.closePanel}
            embedded
          />
        )}
      </SideDrawer>
    </div>
  );
}
