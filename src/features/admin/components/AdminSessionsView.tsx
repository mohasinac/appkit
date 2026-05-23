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

const FILTER_KEYS = ["isActive"];
const DEFAULT_SORT = "-lastActivity";
const SORT_OPTIONS = [
  { value: "-lastActivity", label: "Most recent" },
  { value: "lastActivity", label: "Least recent" },
  { value: "-createdAt", label: "Newest" },
];

function maskIp(ip?: string): string {
  if (!ip) return "—";
  const parts = ip.split(".");
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.*`;
  return ip.replace(/:\w+$/, ":*");
}

export interface AdminSessionsViewProps extends ListingLayoutProps {}

interface AdminSessionsResponse {
  sessions?: unknown[];
  count?: number;
}

interface SessionRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
}

export function AdminSessionsView({ children, ...props }: AdminSessionsViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [revokeTarget, setRevokeTarget] = useState<SessionRow | null>(null);

  const {
    view, setView, table, searchInput, setSearchInput, commitSearch,
    filterOpen, setFilterOpen, openFilters, applyFilters, clearFilters,
    pendingFilters, setPendingFilters, activeFilterCount, hasActiveState, resetAll,
    rows, total, isLoading, errorMessage,
    currentPage, totalPages, selection,
  } = useAdminListing<AdminSessionsResponse, SessionRow>({
    filterKeys: FILTER_KEYS,
    defaultSort: DEFAULT_SORT,
    queryKey: ["admin", "sessions", "listing"],
    endpoint: ADMIN_ENDPOINTS.SESSIONS,
    buildFilters: (state) => {
      const isActiveRaw = state.isActive;
      return isActiveRaw ? `isActive==${isActiveRaw}` : undefined;
    },
    mapRows: (response) =>
      toRecordArray(response.sessions).map((item, index) => {
        const deviceInfo = (item.deviceInfo ?? {}) as Record<string, unknown>;
        const userLabel = toStringValue(
          (item as Record<string, unknown>).user &&
          ((item as Record<string, unknown>).user as Record<string, unknown>)?.displayName,
          toStringValue(item.userId, `user-${index}`)
        );
        const ipMasked = maskIp(toStringValue(deviceInfo.ip, ""));
        return {
          id: toStringValue(item.id, `session-${index}`),
          primary: userLabel,
          secondary: [
            toStringValue(deviceInfo.browser, "Unknown browser"),
            toStringValue(deviceInfo.os, ""),
            toStringValue(deviceInfo.device, ""),
            ipMasked,
          ].filter(Boolean).join(" · "),
          status: Boolean(item.isActive) ? "Active" : "Expired",
          updatedAt: toRelativeDate(item.lastActivity ?? item.createdAt),
        };
      }),
    getTotal: (response, mappedRows) =>
      typeof response.count === "number" ? response.count : mappedRows.length,
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(ADMIN_ENDPOINTS.SESSION_BY_ID(id));
    },
    onSuccess: () => {
      showToast("Session revoked.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "sessions"] });
      setRevokeTarget(null);
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to revoke session.", "error");
    },
  });

  if (hasChildren) {
    return <ListingLayout portal="admin" {...props}>{children}</ListingLayout>;
  }

  useBottomActions(selection.selectedCount > 0 ? { bulk: { selectedCount: selection.selectedCount, onClearSelection: selection.clearSelection, actions: ([
            { id: ROW_ACTION_ID.REVOKE, label: ACTIONS.ADMIN["revoke-session"].label, variant: "secondary", onClick: () => { selection.clearSelection(); } },
          ] satisfies BulkActionItem[]) } } : {});

  return (
    <>
      <div className="min-h-screen">
        <ListingToolbar
          filterCount={activeFilterCount}
          onFiltersClick={openFilters}
          searchValue={searchInput}
          searchPlaceholder="Search by user or device"
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
            { id: ROW_ACTION_ID.REVOKE, label: ACTIONS.ADMIN["revoke-session"].label, variant: "secondary", onClick: () => { selection.clearSelection(); } },
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
            emptyLabel="No sessions found"
            renderRowActions={(row) => (
              <RowActionMenu
                actions={[
                  {
                    label: ROW_ACTION_META[ROW_ACTION_ID.REVOKE].label,
                    destructive: ROW_ACTION_META[ROW_ACTION_ID.REVOKE].destructive,
                    onClick: () => setRevokeTarget(row as SessionRow),
                  },
                ]}
              />
            )}
          />
        </div>

        <ListingFilterDrawer open={filterOpen} onClose={() => setFilterOpen(false)} onApply={applyFilters} onClear={clearFilters} activeCount={activeFilterCount}>
        <div className="space-y-2">
            <Text className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Status</Text>
            <div className="flex flex-wrap gap-2">
              {[{ label: "All", value: "" }, { label: "Active only", value: "true" }].map((opt) => (
                <button key={opt.label} type="button"
                  onClick={() => setPendingFilters((p) => ({ ...p, isActive: opt.value }))}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${(pendingFilters.isActive || "") === opt.value ? "bg-primary text-white border-primary" : "border-zinc-300 dark:border-slate-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-slate-800"}`}
                >{opt.label}</button>
              ))}
            </div>
          </div>
      </ListingFilterDrawer>
      </div>

      <ConfirmDeleteModal
        isOpen={Boolean(revokeTarget)}
        onClose={() => setRevokeTarget(null)}
        onConfirm={() => { if (revokeTarget) revokeMutation.mutate(revokeTarget.id); }}
        isDeleting={revokeMutation.isPending}
        confirmText="Revoke"
        title="Revoke session?"
        message="This will sign the user out of this device immediately."
        variant="danger"
      />
    </>
  );
}
