"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BulkActionBar, ConfirmDeleteModal,
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
import { ROW_ACTION_META, ROW_ACTION_ID } from "../../../features/products/constants/action-defs";
import { ADMIN_CONTACT_STATUS_TABS } from "../constants/filter-tabs";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { useAdminListing } from "../hooks/useAdminListing";
import { DataTable } from "./DataTable";
import { AdminViewCards } from "./AdminViewCards";
import { AdminContactEditorView } from "./AdminContactEditorView";
import { apiClient } from "../../../http";

const PAGE_SIZE = 25;
const FILTER_KEYS = ["status"];
const DEFAULT_SORT = "-createdAt";
const SORT_OPTIONS = [
  { value: "-createdAt", label: "Newest" },
  { value: "createdAt", label: "Oldest" },
];
const STATUS_OPTIONS = ADMIN_CONTACT_STATUS_TABS;

export interface AdminContactViewProps extends ListingLayoutProps {
  onBulkMarkRead?: (ids: string[]) => Promise<void>;
  onBulkArchive?: (ids: string[]) => Promise<void>;
  onBulkDelete?: (ids: string[]) => Promise<void>;
}

interface AdminContactResponse {
  submissions?: unknown[];
  meta?: { filteredTotal?: number; total?: number };
}

interface ContactRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  _raw?: Record<string, unknown>;
}

export function AdminContactView({ children, onBulkMarkRead, onBulkArchive, onBulkDelete, ...props }: AdminContactViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<ContactRow | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const {
    view, setView, table, searchInput, setSearchInput, commitSearch,
    filterOpen, setFilterOpen, openFilters, applyFilters, clearFilters,
    pendingFilters, setPendingFilters, activeFilterCount, hasActiveState, resetAll,
    rows, total, isLoading, errorMessage,
    currentPage, totalPages, selection, defaultSort,
  } = useAdminListing<AdminContactResponse, ContactRow>({
    filterKeys: FILTER_KEYS,
    defaultSort: DEFAULT_SORT,
    pageSize: PAGE_SIZE,
    queryKey: ["admin", "contact", "listing"],
    endpoint: ADMIN_ENDPOINTS.CONTACT_SUBMISSIONS,
    mapRows: (response) =>
      toRecordArray(response.submissions).map((item, index) => ({
        id: toStringValue(item.id, `msg-${index}`),
        primary: toStringValue(item.subject, "No subject"),
        secondary: [
          toStringValue(item.name, "Unknown"),
          toStringValue(item.email, ""),
        ].filter(Boolean).join(" · ") || "—",
        status: toStringValue(item.status, "new"),
        updatedAt: toRelativeDate((item as Record<string, unknown>).createdAt),
        _raw: item,
      })),
    getTotal: (response, mappedRows) => {
      if (typeof response.meta?.filteredTotal === "number") return response.meta.filteredTotal;
      if (typeof response.meta?.total === "number") return response.meta.total;
      return mappedRows.length;
    },
    buildFilters: (f) => {
      return f.status && f.status !== "All" ? `status==${f.status}` : undefined;
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "read" | "resolved" }) => {
      await apiClient.patch(ADMIN_ENDPOINTS.CONTACT_SUBMISSION_BY_ID(id), { action });
    },
    onSuccess: (_data, { action }) => {
      showToast(`${action === "read" ? "Marked as read" : "Archived"}.`, "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "contact"] });
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Action failed.", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(ADMIN_ENDPOINTS.CONTACT_SUBMISSION_BY_ID(id));
    },
    onSuccess: () => {
      showToast("Submission deleted.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "contact"] });
      setDeleteOpen(false);
      setSelectedRow(null);
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to delete.", "error");
    },
  });

  const bulkActions: BulkActionItem[] = [
    ...(onBulkMarkRead ? [buildBulkAction(ACTIONS.ADMIN["mark-contact-read"], async () => { await onBulkMarkRead(selection.selectedIds); selection.clearSelection(); })] : []),
    ...(onBulkArchive ? [buildBulkAction(ACTIONS.ADMIN["archive-contact"], async () => { await onBulkArchive(selection.selectedIds); selection.clearSelection(); })] : []),
    ...(onBulkDelete ? [buildBulkAction(ACTIONS.ADMIN["delete-contact"], async () => { await onBulkDelete(selection.selectedIds); selection.clearSelection(); })] : []),
  ];

  useBottomActions(selection.selectedCount > 0 ? { bulk: { selectedCount: selection.selectedCount, onClearSelection: selection.clearSelection, actions: bulkActions } } : {});

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
          searchPlaceholder="Search by subject, name, or email"
          onSearchChange={setSearchInput}
          onSearchCommit={commitSearch}
          sortValue={table.get("sort") || defaultSort}
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

        {selection.selectedCount > 0 && bulkActions.length > 0 && (
          <BulkActionBar
            selectedCount={selection.selectedCount}
            actions={bulkActions}
            onClearSelection={selection.clearSelection}
          />
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
            emptyLabel="No contact submissions found"
            renderRowActions={(row) => {
              const cr = row as ContactRow;
              return (
                <RowActionMenu
                  actions={[
                    { label: ROW_ACTION_META[ROW_ACTION_ID.VIEW].label, onClick: () => { setSelectedRow(cr); setDrawerOpen(true); } },
                    {
                      label: ACTIONS.ADMIN["mark-contact-read"].label,
                      disabled: cr.status === "read" || cr.status === "resolved",
                      onClick: () => actionMutation.mutate({ id: cr.id, action: "read" }),
                    },
                    {
                      label: ACTIONS.ADMIN["archive-contact"].label,
                      disabled: cr.status === "resolved",
                      onClick: () => actionMutation.mutate({ id: cr.id, action: "resolved" }),
                    },
                    { separator: true, label: "", onClick: () => {} },
                    {
                      label: ACTIONS.ADMIN["delete-contact"].label,
                      destructive: true,
                      onClick: () => { setSelectedRow(cr); setDeleteOpen(true); },
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

      <AdminContactEditorView
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedRow(null); }}
        submissionId={selectedRow?.id}
        subject={toStringValue(selectedRow?._raw?.subject, "No subject")}
        name={toStringValue(selectedRow?._raw?.name, "")}
        email={toStringValue(selectedRow?._raw?.email, "")}
        message={toStringValue(selectedRow?._raw?.message ?? selectedRow?._raw?.body, "")}
        currentStatus={selectedRow?.status}
      />

      <ConfirmDeleteModal
        isOpen={deleteOpen}
        onClose={() => { setDeleteOpen(false); setSelectedRow(null); }}
        onConfirm={() => { if (selectedRow) deleteMutation.mutate(selectedRow.id); }}
        isDeleting={deleteMutation.isPending}
        title="Delete submission?"
        message="This contact submission will be permanently removed."
        confirmText="Delete"
        variant="danger"
      />
    </>
  );
}
