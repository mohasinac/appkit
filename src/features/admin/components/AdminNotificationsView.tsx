"use client";

import React, { useState, useCallback } from "react";
import { X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useBulkSelection } from "../../../react/hooks/useBulkSelection";
import { BulkActionBar, ConfirmDeleteModal, ListingToolbar, ListingViewShell, Pagination, RowActionMenu, Text, useToast } from "../../../ui";
import type { BulkActionItem, ListingViewShellProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { ROW_ACTION_META, ROW_ACTION_ID } from "../../products/constants/action-defs";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
  useAdminListingData,
} from "../hooks/useAdminListingData";
import { DataTable } from "./DataTable";
import { AdminViewCards } from "./AdminViewCards";
import { apiClient } from "../../../http";
import { useBottomActions } from "../../layout";

const PAGE_SIZE = 25;
const FILTER_KEYS = ["type"];
const DEFAULT_SORT = "-createdAt";
const SORT_OPTIONS = [
  { value: "-createdAt", label: "Newest" },
  { value: "createdAt", label: "Oldest" },
];
const NOTIF_TYPES = [
  "All", "order_placed", "order_shipped", "order_delivered", "order_cancelled",
  "bid_placed", "bid_outbid", "bid_won", "review_posted", "payout_processed",
];

export interface AdminNotificationsViewProps extends ListingViewShellProps {}

interface NotificationsFilterDrawerProps {
  filterOpen: boolean;
  setFilterOpen: (v: boolean) => void;
  activeFilterCount: number;
  clearFilters: () => void;
  pendingFilters: Record<string, string>;
  setPendingFilters: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  applyFilters: () => void;
}

function NotificationsFilterDrawer({
  filterOpen, setFilterOpen, activeFilterCount, clearFilters,
  pendingFilters, setPendingFilters, applyFilters,
}: NotificationsFilterDrawerProps) {
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
          <div className="space-y-2">
            <Text className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Type</Text>
            <div className="flex flex-wrap gap-2">
              {NOTIF_TYPES.map((opt) => (
                <button key={opt} type="button"
                  onClick={() => setPendingFilters((p) => ({ ...p, type: opt === "All" ? "" : opt }))}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${(pendingFilters.type || "All") === opt ? "bg-primary text-white border-primary" : "border-zinc-300 dark:border-slate-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-slate-800"}`}
                >{opt}</button>
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
  );
}

interface AdminNotificationsResponse {
  items?: unknown[];
  total?: number;
}

interface NotifRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  type?: string;
}

export function AdminNotificationsView({ children, ...props }: AdminNotificationsViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const [view, setView] = useState<"grid" | "list" | "table">("table");
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<NotifRow | null>(null);

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

  const typeRaw = table.get("type");
  const filters = typeRaw && typeRaw !== "All" ? `type==${typeRaw}` : undefined;

  const { rows, total, isLoading, errorMessage } = useAdminListingData<AdminNotificationsResponse, NotifRow>({
    queryKey: ["admin", "notifications", "listing"],
    endpoint: ADMIN_ENDPOINTS.ADMIN_NOTIFICATIONS,
    page: table.getNumber("page", 1),
    pageSize: PAGE_SIZE,
    sorts: table.get("sort") || DEFAULT_SORT,
    filters,
    q: table.get("q") || undefined,
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => ({
        id: toStringValue(item.id, `notif-${index}`),
        primary: toStringValue(item.title, "Notification"),
        secondary: [
          toStringValue(item.userId, ""),
          toStringValue(item.type, ""),
        ].filter(Boolean).join(" · "),
        status: Boolean(item.isRead) ? "Read" : "Unread",
        updatedAt: toRelativeDate(item.createdAt),
        type: toStringValue(item.type, ""),
      })),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(ADMIN_ENDPOINTS.ADMIN_NOTIFICATION_BY_ID(id));
    },
    onSuccess: () => {
      showToast("Notification deleted.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "notifications"] });
      setDeleteTarget(null);
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to delete notification.", "error");
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(ADMIN_ENDPOINTS.ADMIN_NOTIFICATION_RESEND(id), {});
    },
    onSuccess: () => {
      showToast("Notification resent.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "notifications"] });
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to resend notification.", "error");
    },
  });

  const currentPage = table.getNumber("page", 1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const selection = useBulkSelection({ items: rows, keyExtractor: (r: { id: string }) => r.id });

  if (hasChildren) {
    return <ListingViewShell portal="admin" {...props}>{children}</ListingViewShell>;
  }

  return (
    <>
      <div className="min-h-screen">
        <ListingToolbar
          filterCount={activeFilterCount}
          onFiltersClick={openFilters}
          searchValue={searchInput}
          searchPlaceholder="Search by title or user ID"
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

        <BulkActionBar
          selectedCount={selection.selectedCount}
          onClearSelection={selection.clearSelection}
          actions={([
            { id: ROW_ACTION_ID.MARK_READ, label: ACTIONS.ADMIN["mark-read"].label, variant: "primary", onClick: () => { selection.clearSelection(); } },
            { id: ROW_ACTION_ID.DELETE, label: ACTIONS.ADMIN["delete-notification"].label, variant: "secondary", onClick: () => { selection.clearSelection(); } },
          ] satisfies BulkActionItem[])}
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
            isLoading={isLoading}
            emptyLabel="No notifications found"
            renderRowActions={(row) => {
              const nr = row as NotifRow;
              useBottomActions(selection.selectedCount > 0 ? { bulk: { selectedCount: selection.selectedCount, onClearSelection: selection.clearSelection, actions: ([
            { id: ROW_ACTION_ID.MARK_READ, label: ACTIONS.ADMIN["mark-read"].label, variant: "primary", onClick: () => { selection.clearSelection(); } },
            { id: ROW_ACTION_ID.DELETE, label: ACTIONS.ADMIN["delete-notification"].label, variant: "secondary", onClick: () => { selection.clearSelection(); } },
          ] satisfies BulkActionItem[]) } } : {});

  return (
                <RowActionMenu
                  actions={[
                    { label: ACTIONS.ADMIN["resend-notification"].label, onClick: () => resendMutation.mutate(nr.id) },
                    { label: ROW_ACTION_META[ROW_ACTION_ID.DELETE].label, destructive: ROW_ACTION_META[ROW_ACTION_ID.DELETE].destructive, onClick: () => setDeleteTarget(nr) },
                  ]}
                />
              );
            }}
          />
        </div>

        <NotificationsFilterDrawer
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
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); }}
        isDeleting={deleteMutation.isPending}
        title="Delete notification?"
        message="This notification will be permanently removed."
        confirmText="Delete"
        variant="danger"
      />
    </>
  );
}
