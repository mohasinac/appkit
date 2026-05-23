"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BulkActionBar, ConfirmDeleteModal, ListingToolbar, ListingLayout, Pagination, RowActionMenu, Text, useToast, ListingFilterDrawer} from "../../../ui";
import type { BulkActionItem, ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { ROW_ACTION_META, ROW_ACTION_ID } from "../../products/constants/action-defs";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { useAdminListing } from "../hooks/useAdminListing";
import { DataTable } from "./DataTable";
import { AdminViewCards } from "./AdminViewCards";
import { apiClient } from "../../../http";
import { useBottomActions } from "../../layout";

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

export interface AdminNotificationsViewProps extends ListingLayoutProps {}

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
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<NotifRow | null>(null);

  const {
    view, setView, table, searchInput, setSearchInput, commitSearch,
    filterOpen, setFilterOpen, openFilters, applyFilters, clearFilters,
    pendingFilters, setPendingFilters, activeFilterCount, hasActiveState, resetAll,
    rows, total, isLoading, errorMessage,
    currentPage, totalPages, selection,
  } = useAdminListing<AdminNotificationsResponse, NotifRow>({
    filterKeys: FILTER_KEYS,
    defaultSort: DEFAULT_SORT,
    queryKey: ["admin", "notifications", "listing"],
    endpoint: ADMIN_ENDPOINTS.ADMIN_NOTIFICATIONS,
    buildFilters: (state) => {
      const typeRaw = state.type;
      return typeRaw && typeRaw !== "All" ? `type==${typeRaw}` : undefined;
    },
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

  if (hasChildren) {
    return <ListingLayout portal="admin" {...props}>{children}</ListingLayout>;
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
            <div className="mb-4 rounded-xl border border-red-200 bg-error-surface px-4 py-3 text-sm text-error dark:border-red-900/60">
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

        <ListingFilterDrawer open={filterOpen} onClose={() => setFilterOpen(false)} onApply={applyFilters} onClear={clearFilters} activeCount={activeFilterCount}>
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
      </ListingFilterDrawer>
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
