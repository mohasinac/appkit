"use client";

import React, { useState, useCallback } from "react";
import { Plus, X } from "lucide-react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { usePanelUrlSync } from "../../../react/hooks/use-panel-url-sync";
import { Button, FilterChipGroup, ListingToolbar, Pagination, ListingViewShell, SideDrawer } from "../../../ui";
import type { ListingViewShellProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ADMIN_EVENT_STATUS_TABS } from "../../admin/constants/filter-tabs";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
  useAdminListingData,
} from "../../admin/hooks/useAdminListingData";
import { DataTable } from "../../admin/components/DataTable";
import { AdminEventEditorView } from "./AdminEventEditorView";

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

export interface AdminEventsViewProps extends ListingViewShellProps {
  getRowHref?: (row: { id: string }) => string;
}

interface AdminEventsApiResponse {
  items?: unknown[];
  total?: number;
}

export function AdminEventsView({ children, getRowHref, ...props }: AdminEventsViewProps) {
  const hasChildren = React.Children.count(children) > 0;

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
  if (typeRaw && typeRaw !== "All") filterParts.push(`type==${typeRaw}`);
  const filters = filterParts.join(",") || undefined;

  const { rows, total, isLoading, errorMessage } = useAdminListingData<
    AdminEventsApiResponse,
    { id: string; primary: string; secondary: string; status: string; updatedAt: string }
  >({
    queryKey: ["admin", "events", "listing"],
    endpoint: ADMIN_ENDPOINTS.EVENTS,
    page: table.getNumber("page", 1),
    pageSize: PAGE_SIZE,
    sorts: table.get("sort") || DEFAULT_SORT,
    filters,
    q: table.get("q") || undefined,
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
  });

  const currentPage = table.getNumber("page", 1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (hasChildren) {
    return <ListingViewShell portal="admin" {...props}>{children}</ListingViewShell>;
  }

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
        hideViewToggle
        onResetAll={resetAll}
        hasActiveState={hasActiveState}
        extra={
          <Button size="sm" onClick={openCreatePanel} className="flex items-center gap-1.5">
            <Plus className="h-4 w-4" />
            Add Event
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
        <DataTable rows={rows} isLoading={isLoading} emptyLabel="No events found" onRowClick={(row) => openEditPanel(row.id)} />
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
        title={isCreateOpen ? "Add Event" : "Edit Event"}
        mode={isCreateOpen ? "create" : "edit"}
      >
        {(isCreateOpen || isEditOpen) && (
          <AdminEventEditorView
            eventId={editId ?? undefined}
            onSaved={closePanel}
            embedded
          />
        )}
      </SideDrawer>
    </div>
  );
}
