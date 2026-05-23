"use client";

import React from "react";
import { Plus } from "lucide-react";
import { BulkActionBar, Button, FilterChipGroup, Heading, ListingToolbar, ListingLayout, Pagination, SideDrawer, ListingFilterDrawer} from "../../../ui";
import type { ListingLayoutProps, BulkActionItem } from "../../../ui";
import { AdminViewCards } from "./AdminViewCards";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ADMIN_BLOG_STATUS_TABS } from "../constants/filter-tabs";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { useAdminListing } from "../hooks/useAdminListing";
import { DataTable } from "./DataTable";
import type { AdminListingScaffoldRow } from "./AdminListingScaffold";
import { AdminBlogEditorView } from "./AdminBlogEditorView";
import { useBottomActions } from "../../layout";

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

export interface AdminBlogViewProps extends ListingLayoutProps {
  actionHref?: string;
  getRowHref?: (row: AdminListingScaffoldRow) => string;
}

export function AdminBlogView({ children, getRowHref, ...props }: AdminBlogViewProps) {
  const hasChildren = React.Children.count(children) > 0;

  const listing = useAdminListing<
    AdminBlogResponse,
    { id: string; primary: string; secondary: string; status: string; updatedAt: string }
  >({
    filterKeys: FILTER_KEYS,
    defaultSort: DEFAULT_SORT,
    queryKey: ["admin", "blog", "listing"],
    endpoint: ADMIN_ENDPOINTS.BLOG,
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
    buildFilters: (state) => {
      const filterParts: string[] = [];
      if (state.status && state.status !== "All") filterParts.push(`status==${state.status}`);
      if (state.isFeatured === "true") filterParts.push("isFeatured==true");
      return filterParts.join(",") || undefined;
    },
  });

  const { view, setView, table, panel, searchInput, setSearchInput, commitSearch, filterOpen, setFilterOpen, openFilters, applyFilters, clearFilters, pendingFilters, setPendingFilters, activeFilterCount, hasActiveState, resetAll, rows, isLoading, errorMessage, currentPage, totalPages, selection } = listing;

  if (hasChildren) {
    return <ListingLayout portal="admin" {...props}>{children}</ListingLayout>;
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
          <Button size="sm" onClick={panel.openCreatePanel} className="flex items-center gap-1.5">
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
          <div className="mb-4 rounded-xl border border-red-200 bg-error-surface px-4 py-3 text-sm text-error dark:border-red-900/60">
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
            onRowClick={(row) => panel.openEditPanel(row.id)}
          />
        ) : (
          <AdminViewCards
            rows={rows}
            view={view}
            isLoading={isLoading}
            emptyLabel="No blog posts found"
            onRowClick={(row) => panel.openEditPanel(row.id)}
            selectedIdSet={selection.selectedIdSet}
            onToggleSelect={selection.toggle}
          />
        )}
      </div>

      <ListingFilterDrawer open={filterOpen} onClose={() => setFilterOpen(false)} onApply={applyFilters} onClear={clearFilters} activeCount={activeFilterCount}>
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
      </ListingFilterDrawer>

      <SideDrawer
        isOpen={panel.isCreateOpen || panel.isEditOpen}
        onClose={panel.closePanel}
        title={panel.isCreateOpen ? "New Post" : "Edit Post"}
        mode={panel.isCreateOpen ? "create" : "edit"}
      >
        {(panel.isCreateOpen || panel.isEditOpen) && (
          <AdminBlogEditorView
            postId={panel.editId ?? undefined}
            onSaved={panel.closePanel}
            onDeleted={panel.closePanel}
            embedded
          />
        )}
      </SideDrawer>
    </div>
  );
}
