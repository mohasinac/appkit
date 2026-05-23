"use client";

import React, { useState } from "react";
import { FilterChipGroup, ListingToolbar, ListingLayout, Pagination, RowActionMenu, Text, ListingFilterDrawer} from "../../../ui";
import type { ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { ADMIN_SCAMMER_STATUS_TABS } from "../constants/filter-tabs";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { useAdminListing } from "../hooks/useAdminListing";
import { DataTable } from "./DataTable";
import { AdminViewCards } from "./AdminViewCards";
import { AdminScammerEditorView } from "./AdminScammerEditorView";

const PAGE_SIZE = 25;
const FILTER_KEYS = ["status"];
const DEFAULT_SORT = "-createdAt";
const SORT_OPTIONS = [
  { value: "-createdAt", label: "Newest" },
  { value: "createdAt", label: "Oldest" },
  { value: "-views", label: "Most viewed" },
  { value: "-incidentCount", label: "Most incidents" },
];

interface AdminScammersResponse {
  scammers?: unknown[];
  meta?: { total?: number; filteredTotal?: number };
  total?: number;
}

interface ScammerRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  _raw?: Record<string, unknown>;
}

export interface AdminScammersViewProps extends ListingLayoutProps {}

function buildScammerColumns(
  setSelectedRow: (row: ScammerRow) => void,
  setDrawerOpen: (v: boolean) => void,
) {
  return [
    {
      key: "primary",
      header: "Name / Aliases",
      render: (row: ScammerRow) => (
        <div className="space-y-0.5">
          <Text className="font-medium text-zinc-900 dark:text-zinc-100">{row.primary}</Text>
          {row.secondary ? (
            <Text className="text-xs text-zinc-500 dark:text-zinc-400">{row.secondary}</Text>
          ) : null}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "w-36",
      render: (row: ScammerRow) => (
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE[row.status] ?? STATUS_BADGE.pending_review}`}>
          {row.status.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "updatedAt",
      header: "Updated",
      className: "w-32",
      render: (row: ScammerRow) => (
        <span className="text-sm text-zinc-500 dark:text-zinc-400">{row.updatedAt}</span>
      ),
    },
  ] as const;
}

const STATUS_BADGE: Record<string, string> = {
  pending_review: "bg-warning-surface text-warning",
  verified: "bg-success-surface text-success",
  rejected: "bg-error-surface text-error",
  removed: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

export function AdminScammersView({ children, ...props }: AdminScammersViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<ScammerRow | null>(null);

  const {
    view, setView, table, searchInput, setSearchInput, commitSearch,
    filterOpen, setFilterOpen, openFilters, applyFilters, clearFilters,
    pendingFilters, setPendingFilters, activeFilterCount, hasActiveState, resetAll,
    rows, total, isLoading, errorMessage,
    currentPage, totalPages, selection, defaultSort,
  } = useAdminListing<AdminScammersResponse, ScammerRow>({
    filterKeys: FILTER_KEYS,
    defaultSort: DEFAULT_SORT,
    pageSize: PAGE_SIZE,
    queryKey: ["admin", "scammers", "listing"],
    endpoint: ADMIN_ENDPOINTS.SCAMMERS,
    mapRows: (response) =>
      toRecordArray(response.scammers).map((item, index) => ({
        id: toStringValue(item.id, `scammer-${index}`),
        primary: Array.isArray(item.displayNames)
          ? (item.displayNames as string[]).join(", ")
          : toStringValue(item.displayNames, "Unknown"),
        secondary: [
          toStringValue(item.scamType, ""),
          Array.isArray(item.phones) ? `${(item.phones as string[]).length} phone(s)` : null,
          `${Number(item.incidentCount ?? 0)} incident(s)`,
        ]
          .filter(Boolean)
          .join(" · "),
        status: toStringValue(item.status, "pending_review"),
        updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
        _raw: item,
      })),
    getTotal: (response, mappedRows) => {
      if (typeof response.meta?.filteredTotal === "number") return response.meta.filteredTotal;
      if (typeof response.meta?.total === "number") return response.meta.total;
      if (typeof response.total === "number") return response.total;
      return mappedRows.length;
    },
    buildFilters: (f) => {
      const parts: string[] = [];
      if (f.status && f.status !== "All") parts.push(`status==${f.status}`);
      return parts.join(",") || undefined;
    },
  });

  if (hasChildren) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }

  return (
    <>
      <div className="min-h-screen">
        <ListingToolbar
          filterCount={activeFilterCount}
          onFiltersClick={openFilters}
          searchValue={searchInput}
          searchPlaceholder="Search by name, phone, UPI ID"
          onSearchChange={setSearchInput}
          onSearchCommit={commitSearch}
          sortValue={table.get("sort") || defaultSort}
          sortOptions={SORT_OPTIONS}
          onSortChange={(v) => {
            table.set("sort", v);
          }}
        showTableView
        view={view}
        onViewChange={(v) => setView(v)}
          onResetAll={resetAll}
          hasActiveState={hasActiveState}
        />

        {totalPages > 1 && (
          <div className="sticky top-[calc(var(--header-height,0px)+44px)] z-10 flex justify-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-slate-700 px-3 py-1.5">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(p) => table.setPage(p)}
            />
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
            emptyLabel="No scammer profiles found"
            renderRowActions={(row) => (
              <RowActionMenu
                actions={[
                  {
                    label: ACTIONS.ADMIN["review-scammer"].label,
                    onClick: () => {
                      setSelectedRow(row as ScammerRow);
                      setDrawerOpen(true);
                    },
                  },
                ]}
              />
            )}
            columns={buildScammerColumns(setSelectedRow, setDrawerOpen) as any}
          />
        </div>

        <ListingFilterDrawer open={filterOpen} onClose={() => setFilterOpen(false)} onApply={applyFilters} onClear={clearFilters} activeCount={activeFilterCount}>
        <FilterChipGroup
            label="Status"
            tabs={ADMIN_SCAMMER_STATUS_TABS}
            value={pendingFilters.status ?? ""}
            onChange={(id) => setPendingFilters((p) => ({ ...p, status: id }))}
          />
      </ListingFilterDrawer>
      </div>

      <AdminScammerEditorView
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        scammerId={selectedRow?.id}
        displayNames={
          Array.isArray(selectedRow?._raw?.displayNames)
            ? (selectedRow!._raw!.displayNames as string[])
            : [selectedRow?.primary ?? ""]
        }
        scamType={toStringValue(selectedRow?._raw?.scamType, "")}
        description={toStringValue(selectedRow?._raw?.description, "")}
        phones={
          Array.isArray(selectedRow?._raw?.phones)
            ? (selectedRow!._raw!.phones as string[])
            : []
        }
        upiIds={
          Array.isArray(selectedRow?._raw?.upiIds)
            ? (selectedRow!._raw!.upiIds as string[])
            : []
        }
        currentStatus={selectedRow?.status}
        verificationNote={toStringValue(selectedRow?._raw?.verificationNote, "") || undefined}
        reportedBy={toStringValue(selectedRow?._raw?.reportedBy, "")}
        reportedByAnon={Boolean(selectedRow?._raw?.reportedByAnon)}
      />
    </>
  );
}
