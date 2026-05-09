"use client";

import React, { useState, useCallback } from "react";
import { X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import {
  ConfirmDeleteModal,
  ListingToolbar,
  ListingViewShell,
  Pagination,
  RowActionMenu,
  useToast,
} from "../../../ui";
import type { ListingViewShellProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
  useAdminListingData,
} from "../hooks/useAdminListingData";
import { DataTable } from "./DataTable";
import { AdminContactEditorView } from "./AdminContactEditorView";
import { apiClient } from "../../../http";

const PAGE_SIZE = 25;
const FILTER_KEYS = ["status"];
const DEFAULT_SORT = "-createdAt";
const SORT_OPTIONS = [
  { value: "-createdAt", label: "Newest" },
  { value: "createdAt", label: "Oldest" },
];
const STATUS_OPTIONS = ["All", "new", "read", "resolved"];

export interface AdminContactViewProps extends ListingViewShellProps {}

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

export function AdminContactView({ children, ...props }: AdminContactViewProps) {
  const hasChildren = React.Children.count(children) > 0;
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
          onSortChange={(v) => { table.set("sort", v); table.setPage(1); }}
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
            rows={rows}
            isLoading={isLoading}
            emptyLabel="No contact submissions found"
            renderRowActions={(row) => {
              const cr = row as ContactRow;
              return (
                <RowActionMenu
                  actions={[
                    { label: "View", onClick: () => { setSelectedRow(cr); setDrawerOpen(true); } },
                    {
                      label: "Mark read",
                      disabled: cr.status === "read" || cr.status === "resolved",
                      onClick: () => actionMutation.mutate({ id: cr.id, action: "read" }),
                    },
                    {
                      label: "Archive",
                      disabled: cr.status === "resolved",
                      onClick: () => actionMutation.mutate({ id: cr.id, action: "resolved" }),
                    },
                    { separator: true, label: "", onClick: () => {} },
                    {
                      label: "Delete",
                      destructive: true,
                      onClick: () => { setSelectedRow(cr); setDeleteOpen(true); },
                    },
                  ]}
                />
              );
            }}
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
                    {STATUS_OPTIONS.map((opt) => (
                      <button key={opt} type="button"
                        onClick={() => setPendingFilters((p) => ({ ...p, status: opt === "All" ? "" : opt }))}
                        className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${(pendingFilters.status || "All") === opt ? "bg-primary text-white border-primary" : "border-zinc-300 dark:border-slate-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-slate-800"}`}
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
        )}
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
