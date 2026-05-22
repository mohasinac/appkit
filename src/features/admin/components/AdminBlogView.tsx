"use client";

import React, { useState, useCallback } from "react";
import { Plus, X } from "lucide-react";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { usePanelUrlSync } from "../../../react/hooks/use-panel-url-sync";
import { useBulkSelection } from "../../../react/hooks/useBulkSelection";
import { BulkActionBar, Button, FilterChipGroup, Heading, ListingToolbar, ListingViewShell, Pagination, SideDrawer } from "../../../ui";
import type { ListingViewShellProps, BulkActionItem } from "../../../ui";
import { AdminViewCards } from "./AdminViewCards";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ADMIN_BLOG_STATUS_TABS } from "../constants/filter-tabs";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
  useAdminListingData,
} from "../hooks/useAdminListingData";
import { DataTable } from "./DataTable";
import type { AdminListingScaffoldRow } from "./AdminListingScaffold";
import { AdminBlogEditorView } from "./AdminBlogEditorView";
import { useBottomActions } from "../../layout";

const PAGE_SIZE = 25;
const FILTER_KEYS = ["status", "isFeatured"];
const DEFAULT_SORT = "-publishedAt";
const SORT_OPTIONS = [
  { value: "-publishedAt", label: "Latest" },
  { value: "publishedAt", label: "Oldest" },
  { value: "-createdAt", label: "Newest draft" },
  { value: "title", label: "Title A–Z" },
];
const STATUS_OPTIONS = ADMIN_BLOG_STATUS_TABS;
const FEATURED_TABS = [
  { id: "", label: "All" },
  { id: "true", label: "Featured only" },
] as const;

interface AdminBlogResponse {
  posts?: unknown[];
  meta?: { filteredTotal?: number; total?: number };
}

export interface AdminBlogViewProps extends ListingViewShellProps {
  actionHref?: string;
  getRowHref?: (row: AdminListingScaffoldRow) => string;
}

interface BlogFilterDrawerProps {
  filterOpen: boolean;
  setFilterOpen: (v: boolean) => void;
  activeFilterCount: number;
  clearFilters: () => void;
  pendingFilters: Record<string, string>;
  setPendingFilters: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  applyFilters: () => void;
}

function BlogFilterDrawer({
  filterOpen, setFilterOpen, activeFilterCount, clearFilters,
  pendingFilters, setPendingFilters, applyFilters,
}: BlogFilterDrawerProps) {
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
          <FilterChipGroup
            label="Featured"
            tabs={FEATURED_TABS}
            value={pendingFilters.isFeatured ?? ""}
            onChange={(id) => setPendingFilters((p) => ({ ...p, isFeatured: id }))}
            allId=""
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

export function AdminBlogView({ children, getRowHref, ...props }: AdminBlogViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const [view, setView] = useState<"grid" | "list" | "table">("table");

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
  if (table.get("isFeatured") === "true") filterParts.push("isFeatured==true");
  const filters = filterParts.join(",") || undefined;

  const { rows, total, isLoading, errorMessage } = useAdminListingData<
    AdminBlogResponse,
    { id: string; primary: string; secondary: string; status: string; updatedAt: string }
  >({
    queryKey: ["admin", "blog", "listing"],
    endpoint: ADMIN_ENDPOINTS.BLOG,
    page: table.getNumber("page", 1),
    pageSize: PAGE_SIZE,
    sorts: table.get("sort") || DEFAULT_SORT,
    filters,
    q: table.get("q") || undefined,
    mapRows: (response) =>
      toRecordArray(response.posts).map((item, index) => ({
        id: toStringValue(item.id, `post-${index}`),
        primary: toStringValue(item.title, "Untitled post"),
        secondary: [
          toStringValue(item.authorName, "Unknown author"),
          toStringValue(item.category, "Uncategorized"),
        ].join(" · "),
        status: toStringValue(item.status, "Draft"),
        updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
      })),
    getTotal: (response, mappedRows) => {
      if (typeof response.meta?.filteredTotal === "number") return response.meta.filteredTotal;
      if (typeof response.meta?.total === "number") return response.meta.total;
      return mappedRows.length;
    },
  });

  const currentPage = table.getNumber("page", 1);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const selection = useBulkSelection({ items: rows, keyExtractor: (r) => r.id });

  if (hasChildren) {
    return <ListingViewShell portal="admin" {...props}>{children}</ListingViewShell>;
  }

  useBottomActions(selection.selectedCount > 0 ? { bulk: { selectedCount: selection.selectedCount, onClearSelection: selection.clearSelection, actions: ([
          { id: "publish", label: ACTIONS.ADMIN["publish-blog"].label, variant: "primary", onClick: () => { selection.clearSelection(); } },
          { id: "draft", label: ACTIONS.ADMIN["draft-blog"].label, variant: "secondary", onClick: () => { selection.clearSelection(); } },
        ] satisfies BulkActionItem[]) } } : {});

  return (
    <div className="min-h-screen">
      <Heading level={1} className="sr-only">Blog Posts</Heading>
      <ListingToolbar
        filterCount={activeFilterCount}
        onFiltersClick={openFilters}
        searchValue={searchInput}
        searchPlaceholder="Search articles, authors, or tags"
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
        extra={
          <Button size="sm" onClick={openCreatePanel} className="flex items-center gap-1.5">
            <Plus className="h-4 w-4" />
            New Post
          </Button>
        }
      />

      <BulkActionBar
        selectedCount={selection.selectedCount}
        onClearSelection={selection.clearSelection}
        actions={([
          { id: "publish", label: ACTIONS.ADMIN["publish-blog"].label, variant: "primary", onClick: () => { selection.clearSelection(); } },
          { id: "draft", label: ACTIONS.ADMIN["draft-blog"].label, variant: "secondary", onClick: () => { selection.clearSelection(); } },
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
        {view === "table" ? (
          <DataTable
            rows={rows}
            isLoading={isLoading}
            emptyLabel="No blog posts found"
            selectedIds={selection.selectedIdSet}
            onToggleSelect={selection.toggle}
            onToggleSelectAll={(next) => next ? selection.setSelectedIds(rows.map(r => r.id)) : selection.clearSelection()}
            onRowClick={(row) => openEditPanel(row.id)}
          />
        ) : (
          <AdminViewCards
            rows={rows}
            view={view}
            isLoading={isLoading}
            emptyLabel="No blog posts found"
            onRowClick={(row) => openEditPanel(row.id)}
            selectedIdSet={selection.selectedIdSet}
            onToggleSelect={selection.toggle}
          />
        )}
      </div>

      <BlogFilterDrawer
        filterOpen={filterOpen}
        setFilterOpen={setFilterOpen}
        activeFilterCount={activeFilterCount}
        clearFilters={clearFilters}
        pendingFilters={pendingFilters}
        setPendingFilters={setPendingFilters}
        applyFilters={applyFilters}
      />

      <SideDrawer
        isOpen={isCreateOpen || isEditOpen}
        onClose={closePanel}
        title={isCreateOpen ? "New Post" : "Edit Post"}
        mode={isCreateOpen ? "create" : "edit"}
      >
        {(isCreateOpen || isEditOpen) && (
          <AdminBlogEditorView
            postId={editId ?? undefined}
            onSaved={closePanel}
            onDeleted={closePanel}
            embedded
          />
        )}
      </SideDrawer>
    </div>
  );
}
