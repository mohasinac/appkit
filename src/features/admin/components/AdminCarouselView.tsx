"use client";

import React, { useState, useCallback } from "react";
import { X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { ListingToolbar, ListingViewShell, Pagination } from "../../../ui";
import type { ListingViewShellProps } from "../../../ui";
import { ADMIN_ENDPOINTS, HOMEPAGE_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
  useAdminListingData,
} from "../hooks/useAdminListingData";
import { DataTable } from "./DataTable";
import { RowActionMenu } from "../../../ui/components/RowActionMenu";
import { apiClient } from "../../../http";
import type { AdminTableColumn } from "../types";

const PAGE_SIZE = 50;
const FILTER_KEYS = ["active"];
const DEFAULT_SORT = "order";

export interface AdminCarouselViewProps extends ListingViewShellProps {}

interface AdminCarouselResponse {
  data?: unknown;
  items?: unknown[];
  total?: number;
}

interface CarouselRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  order: number;
  thumbnailUrl: string;
}

export function AdminCarouselView({ children, ...props }: AdminCarouselViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [localRows, setLocalRows] = useState<CarouselRow[]>([]);
  const queryClient = useQueryClient();

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
  const hasActiveState = !!table.get("q") || activeFilterCount > 0;

  const activeRaw = table.get("active");
  const filterParts: string[] = [];
  if (activeRaw === "true") filterParts.push("active==true");
  else if (activeRaw === "false") filterParts.push("active==false");
  const filters = filterParts.join(",") || undefined;

  const { rows: fetchedRows, total, isLoading, errorMessage } = useAdminListingData<AdminCarouselResponse, CarouselRow>({
    queryKey: ["admin", "carousel", "listing"],
    endpoint: `${HOMEPAGE_ENDPOINTS.CAROUSEL}?includeInactive=true`,
    page: table.getNumber("page", 1),
    pageSize: PAGE_SIZE,
    filters,
    q: table.get("q") || undefined,
    mapRows: (response) => {
      const sourceItems = Array.isArray(response.data) ? response.data : response.items;
      return toRecordArray(sourceItems)
        .sort((a, b) => ((a.order as number) ?? 0) - ((b.order as number) ?? 0))
        .map((item, index) => {
          const bg = item.background as Record<string, unknown> | undefined;
          const legacyMedia = item.media as Record<string, unknown> | undefined;
          const thumbnailUrl = toStringValue(bg?.url, "") || toStringValue(legacyMedia?.url, "") || "";
          const orderValue = typeof item.order === "number" ? item.order : index + 1;
          const height = toStringValue((item.settings as Record<string, unknown> | undefined)?.height, "—");
          return {
            id: toStringValue(item.id, `slide-${index}`),
            primary: toStringValue(item.title, `Carousel slide ${index + 1}`),
            secondary: `Order: ${orderValue} · Height: ${height} · ${item.active ? "Active" : "Inactive"}`,
            status: typeof item.active === "boolean" ? (item.active ? "Active" : "Inactive") : "Inactive",
            updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
            order: orderValue,
            thumbnailUrl,
          };
        });
    },
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
  });

  React.useEffect(() => {
    setLocalRows(fetchedRows as CarouselRow[]);
  }, [fetchedRows]);

  const reorderMutation = useMutation({
    mutationFn: (ids: string[]) =>
      apiClient.post(ADMIN_ENDPOINTS.CAROUSEL_REORDER, { slideIds: ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "carousel", "listing"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(ADMIN_ENDPOINTS.CAROUSEL_BY_ID(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "carousel", "listing"] });
    },
  });

  const handleDragStart = (id: string) => setDraggingId(id);

  const handleDrop = (targetId: string) => {
    if (!draggingId || draggingId === targetId) { setDraggingId(null); return; }
    const from = localRows.findIndex((r) => r.id === draggingId);
    const to = localRows.findIndex((r) => r.id === targetId);
    if (from === -1 || to === -1) { setDraggingId(null); return; }
    const next = [...localRows];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setLocalRows(next);
    setDraggingId(null);
    reorderMutation.mutate(next.map((r) => r.id));
  };

  const currentPage = table.getNumber("page", 1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (hasChildren) {
    return <ListingViewShell portal="admin" {...props}>{children}</ListingViewShell>;
  }

  const displayRows = (localRows.length > 0 ? localRows : fetchedRows as CarouselRow[]).map((row) => ({
    ...row,
    secondary: (
      <div className="flex items-center gap-3">
        {row.thumbnailUrl && (
          <img src={row.thumbnailUrl} alt="" className="w-14 h-9 object-cover rounded flex-shrink-0 bg-zinc-200 dark:bg-zinc-800" />
        )}
        <span className="text-sm text-zinc-500 dark:text-zinc-400 truncate">{row.secondary}</span>
      </div>
    ) as unknown as string,
  }));

  const columns: AdminTableColumn<(typeof displayRows)[number]>[] = [
    {
      key: "drag",
      header: "",
      render: (row) => (
        <div
          draggable
          onDragStart={() => handleDragStart(row.id)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(row.id)}
          className="cursor-grab active:cursor-grabbing text-zinc-400 px-1 select-none"
          title="Drag to reorder"
        >
          ⠿
        </div>
      ),
    },
    {
      key: "primary",
      header: "Title",
      render: (row) => <span className="font-medium text-zinc-900 dark:text-zinc-100">{row.primary}</span>,
    },
    {
      key: "secondary",
      header: "Details",
      render: (row) => row.secondary as unknown as React.ReactNode,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${row.status === "Active" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}>
          {row.status}
        </span>
      ),
    },
    {
      key: "updatedAt",
      header: "Updated",
      render: (row) => <span className="text-sm text-zinc-500">{row.updatedAt}</span>,
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <RowActionMenu
          actions={[
            { label: "Edit", onClick: () => { window.location.href = `/admin/carousel/${row.id}/edit`; } },
            {
              label: "Delete",
              destructive: true,
              onClick: () => {
                if (confirm("Delete this carousel slide? This cannot be undone.")) {
                  deleteMutation.mutate(row.id);
                }
              },
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="min-h-screen">
      <ListingToolbar
        filterCount={activeFilterCount}
        onFiltersClick={openFilters}
        searchValue={searchInput}
        searchPlaceholder="Search slide titles"
        onSearchChange={setSearchInput}
        onSearchCommit={commitSearch}
        hideViewToggle
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
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
            {errorMessage}
          </div>
        )}
        <DataTable
          rows={displayRows as any}
          columns={columns as any}
          isLoading={isLoading}
          emptyLabel="No carousel slides — use 'New slide' to add one"
          getRowHref={(row) => `/admin/carousel/${row.id}/edit`}
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
                  {[{ label: "All", value: "" }, { label: "Active", value: "true" }, { label: "Inactive", value: "false" }].map((opt) => (
                    <button key={opt.label} type="button"
                      onClick={() => setPendingFilters((p) => ({ ...p, active: opt.value }))}
                      className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${(pendingFilters.active || "") === opt.value ? "bg-primary text-white border-primary" : "border-zinc-300 dark:border-slate-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-slate-800"}`}
                    >{opt.label}</button>
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
    </div>
  );
}
