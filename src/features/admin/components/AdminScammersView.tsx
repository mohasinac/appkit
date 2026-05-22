"use client";

import React, { useState, useCallback } from "react";
import { X } from "lucide-react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useBulkSelection } from "../../../react/hooks/useBulkSelection";
import { BulkActionBar, FilterChipGroup, ListingToolbar, ListingViewShell, Pagination, RowActionMenu, Text } from "../../../ui";
import type { BulkActionItem, ListingViewShellProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { ADMIN_SCAMMER_STATUS_TABS } from "../constants/filter-tabs";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
  useAdminListingData,
} from "../hooks/useAdminListingData";
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

export interface AdminScammersViewProps extends ListingViewShellProps {}

interface ScammersFilterDrawerProps {
  filterOpen: boolean;
  setFilterOpen: (v: boolean) => void;
  activeFilterCount: number;
  clearFilters: () => void;
  pendingFilters: Record<string, string>;
  setPendingFilters: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  applyFilters: () => void;
}

function ScammersFilterDrawer({
  filterOpen, setFilterOpen, activeFilterCount, clearFilters,
  pendingFilters, setPendingFilters, applyFilters,
}: ScammersFilterDrawerProps) {
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
            tabs={ADMIN_SCAMMER_STATUS_TABS}
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
  pending_review: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  verified: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  removed: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

export function AdminScammersView({ children, ...props }: AdminScammersViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const [view, setView] = useState<"grid" | "list" | "table">("table");

  const table = useUrlTable({ defaults: { pageSize: String(PAGE_SIZE), sort: DEFAULT_SORT } });
  const [searchInput, setSearchInput] = useState(table.get("q") || "");
  const [filterOpen, setFilterOpen] = useState(false);
  const [pendingFilters, setPendingFilters] = useState<Record<string, string>>(
    () => Object.fromEntries(FILTER_KEYS.map((k) => [k, table.get(k)])),
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<ScammerRow | null>(null);

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
  const hasActiveState =
    !!table.get("q") || table.get("sort") !== DEFAULT_SORT || activeFilterCount > 0;

  const filterParts: string[] = [];
  const statusRaw = table.get("status");
  if (statusRaw && statusRaw !== "All") filterParts.push(`status==${statusRaw}`);
  const filters = filterParts.join(",") || undefined;

  const { rows, total, isLoading, errorMessage } = useAdminListingData<
    AdminScammersResponse,
    ScammerRow
  >({
    queryKey: ["admin", "scammers", "listing"],
    endpoint: ADMIN_ENDPOINTS.SCAMMERS,
    page: table.getNumber("page", 1),
    pageSize: PAGE_SIZE,
    sorts: table.get("sort") || DEFAULT_SORT,
    filters,
    q: table.get("q") || undefined,
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
  });

  const currentPage = table.getNumber("page", 1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const selection = useBulkSelection({ items: rows, keyExtractor: (r: { id: string }) => r.id });

  if (hasChildren) {
    return (
      <ListingViewShell portal="admin" {...props}>
        {children}
      </ListingViewShell>
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
          sortValue={table.get("sort") || DEFAULT_SORT}
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
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
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

        <ScammersFilterDrawer
          filterOpen={filterOpen}
          setFilterOpen={setFilterOpen}
          activeFilterCount={activeFilterCount}
          clearFilters={clearFilters}
          pendingFilters={pendingFilters}
          setPendingFilters={setPendingFilters}
          applyFilters={applyFilters}
        />
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
