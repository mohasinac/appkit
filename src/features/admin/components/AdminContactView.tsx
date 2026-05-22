"use client";

import React, { useState, useCallback } from "react";
import { X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { useBulkSelection } from "../../../react/hooks/useBulkSelection";
import { BulkActionBar, ConfirmDeleteModal,
  FilterChipGroup,
  ListingToolbar,
  ListingViewShell,
  Pagination,
  RowActionMenu,
  useToast, } from "../../../ui";
import { useBottomActions } from "../../layout";
import type { BulkActionItem, ListingViewShellProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { ROW_ACTION_META, ROW_ACTION_ID } from "../../../features/products/constants/action-defs";
import { ADMIN_CONTACT_STATUS_TABS } from "../constants/filter-tabs";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
  useAdminListingData,
} from "../hooks/useAdminListingData";
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

export interface AdminContactViewProps extends ListingViewShellProps {
  onBulkMarkRead?: (ids: string[]) => Promise<void>;
  onBulkArchive?: (ids: string[]) => Promise<void>;
  onBulkDelete?: (ids: string[]) => Promise<void>;
}

interface ContactFilterDrawerProps {
  filterOpen: boolean;
  setFilterOpen: (v: boolean) => void;
  activeFilterCount: number;
  clearFilters: () => void;
  pendingFilters: Record<string, string>;
  setPendingFilters: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  applyFilters: () => void;
}

function ContactFilterDrawer({
  filterOpen, setFilterOpen, activeFilterCount, clearFilters,
  pendingFilters, setPendingFilters, applyFilters,
}: ContactFilterDrawerProps) {
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
            tabs={STATUS_OPTIONS}
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
  const [view, setView] = useState<"grid" | "list" | "table">("table");
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<ContactRow | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

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

  const statusRaw = table.get("status");
  const filters = statusRaw && statusRaw !== "All" ? `status==${statusRaw}` : undefined;

  const { rows, total, isLoading, errorMessage } = useAdminListingData<AdminContactResponse, ContactRow>({
    queryKey: ["admin", "contact", "listing"],
    endpoint: ADMIN_ENDPOINTS.CONTACT_SUBMISSIONS,
    page: table.getNumber("page", 1),
    pageSize: PAGE_SIZE,
    sorts: table.get("sort") || DEFAULT_SORT,
    filters,
    q: table.get("q") || undefined,
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

  const currentPage = table.getNumber("page", 1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const selection = useBulkSelection({ items: rows, keyExtractor: (r: { id: string }) => r.id });

  const bulkActions: BulkActionItem[] = [
    ...(onBulkMarkRead ? [{
      id: "bulk-mark-read",
      label: ACTIONS.ADMIN["mark-contact-read"].label,
      onClick: async () => { await onBulkMarkRead(selection.selectedIds); selection.clearSelection(); },
    }] : []),
    ...(onBulkArchive ? [{
      id: "bulk-archive",
      label: ACTIONS.ADMIN["archive-contact"].label,
      onClick: async () => { await onBulkArchive(selection.selectedIds); selection.clearSelection(); },
    }] : []),
    ...(onBulkDelete ? [{
      id: "bulk-delete",
      label: ACTIONS.ADMIN["delete-contact"].label,
      variant: "danger" as const,
      onClick: async () => { await onBulkDelete(selection.selectedIds); selection.clearSelection(); },
    }] : []),
  ];

  useBottomActions(selection.selectedCount > 0 ? { bulk: { selectedCount: selection.selectedCount, onClearSelection: selection.clearSelection, actions: bulkActions } } : {});

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
          searchPlaceholder="Search by subject, name, or email"
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

        <ContactFilterDrawer
          filterOpen={filterOpen}
          setFilterOpen={setFilterOpen}
          activeFilterCount={activeFilterCount}
          clearFilters={clearFilters}
          pendingFilters={pendingFilters}
          setPendingFilters={setPendingFilters}
          applyFilters={applyFilters}
        />
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
