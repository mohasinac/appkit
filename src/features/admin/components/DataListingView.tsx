"use client";

/**
 * DataListingView — config-driven listing scaffold for admin + seller dashboards.
 *
 * Replaces ~30 hand-wired admin/seller view components (AdminBrandsView, AdminCategoriesView,
 * SellerCouponsView, etc.) by accepting a single `config` object describing:
 *   - data layer (endpoint, queryKey, mapRows, buildFilters, sortOptions)
 *   - presentation (title, subtitle, columns, searchPlaceholder, emptyLabel)
 *   - actions (bulkActions, primaryAction, renderRowActions)
 *   - filter panel (renderFilterPanel)
 *   - editor side-drawer (renderEditor)
 *
 * Composes: useAdminListing (data + state) + ListingToolbar + BulkActionBar + Pagination
 *         + DataTable | AdminViewCards + ListingFilterDrawer + SideDrawer
 *         + useBottomActions (mobile bulk bar)
 *
 * Usage:
 *   const ADMIN_BRANDS_CONFIG: ListingViewConfig<BrandsResponse, BrandRow> = { ... };
 *   <DataListingView config={ADMIN_BRANDS_CONFIG} />
 *
 * Created 2026-05-23 as part of W6-12 (plan: read-this-files-and-modular-storm.md).
 */

import React from "react";
import { Plus } from "lucide-react";
import { BulkActionBar, Button, Div, ListingFilterDrawer, ListingToolbar, Pagination, Row, SideDrawer } from "../../../ui";
import type { BulkActionItem } from "../../../ui";
import { useBottomActions } from "../../layout";
import { useAdminListing } from "../hooks/useAdminListing";
import type { AdminListingConfig } from "../hooks/useAdminListing";
import type { AdminTableColumn } from "../types";
import { AdminViewCards } from "./AdminViewCards";
import { DataTable } from "./DataTable";

/**
 * Generic admin data row shape used by DataListingView and AdminViewCards.
 * Moved here from AdminListingScaffold (which is now deleted) so views that
 * need the base row type can import from this module instead.
 */
export interface AdminListingScaffoldRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  featured?: boolean;
  isPromoted?: boolean;
  isOnSale?: boolean;
  isSold?: boolean;
}

export interface ListingSortOption {
  value: string;
  label: string;
}

/**
 * Render context passed to filter panel + editor render-props.
 * Mirrors the shape returned by `useAdminListing`.
 */
export interface ListingPanelContext {
  pendingFilters: Record<string, string>;
  setPendingFilters: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  applyFilters: () => void;
  clearFilters: () => void;
}

export interface ListingEditorContext {
  isCreate: boolean;
  editId: string | null;
  closePanel: () => void;
}

export interface ListingSelectionContext<TRow extends { id: string }> {
  selectedIds: string[];
  selectedCount: number;
  clearSelection: () => void;
  toggleSelect: (id: string) => void;
  rows: TRow[];
  openEditPanel: (id: string) => void;
}

export interface ListingViewConfig<TResponse, TRow extends { id: string }>
  extends AdminListingConfig<TResponse, TRow> {
  /** Portal context — currently admin/seller share the same chrome. */
  portal: "admin" | "seller";

  // -- Header
  title: string;
  subtitle?: string;
  searchPlaceholder: string;
  emptyLabel?: string;

  // -- Sort options for the toolbar dropdown
  sortOptions: ListingSortOption[];

  // -- Table view (omit to use DataTable's primary/status/updatedAt defaults)
  columns?: AdminTableColumn<TRow>[];
  /** Optional alt-view (grid/list) renderer. When omitted, AdminViewCards is used. */
  renderCards?: (
    rows: TRow[],
    view: "grid" | "list",
    selection: ListingSelectionContext<TRow>,
    isLoading: boolean,
  ) => React.ReactNode;

  // -- Primary "Add X" CTA in the toolbar
  primaryAction?: {
    label: string;
    onClick: (panel: { openCreatePanel: () => void }) => void;
    icon?: React.ReactNode;
  };

  /** Extra arbitrary content in the toolbar (e.g. export buttons). Rendered alongside primaryAction. */
  toolbarExtra?: React.ReactNode;

  /** Slot rendered between the toolbar and the table content (e.g. URL-driven scope tabs). */
  renderAboveContent?: () => React.ReactNode;

  /** Pill toggles displayed alongside the search/sort/filter row in ListingToolbar. */
  toggles?: Array<{
    label: string;
    active: boolean;
    onChange: (next: boolean) => void;
  }>;

  // -- Row actions menu
  renderRowActions?: (row: TRow) => React.ReactNode;

  // -- Bulk actions when items are selected
  buildBulkActions?: (
    selection: ListingSelectionContext<TRow>,
  ) => BulkActionItem[];

  // -- Filter drawer content
  renderFilterPanel?: (ctx: ListingPanelContext) => React.ReactNode;

  // -- Optional side-drawer editor; when omitted, the SideDrawer is not rendered.
  renderEditor?: (ctx: ListingEditorContext) => React.ReactNode;
  /** Drawer title resolver — defaults to "Add X" / "Edit X" using `title`. */
  resolveEditorTitle?: (ctx: ListingEditorContext) => string;

  // -- Row click behavior
  onRowClick?: (
    row: TRow,
    panel: { openEditPanel: (id: string) => void },
  ) => void;

  /** When set, the table renders rows as anchor links to this href. */
  getRowHref?: (row: TRow) => string;

  /** Hide the table toggle in the toolbar; views with no table column set should use this. */
  hideTableView?: boolean;

  /** Initial view mode (defaults to "table" when not hidden, "grid" when hidden). */
  initialView?: "grid" | "list" | "table";

  // -- Optional CSS class on root container
  className?: string;
}

export function DataListingView<TResponse, TRow extends { id: string }>({
  config,
}: {
  config: ListingViewConfig<TResponse, TRow>;
}) {
  const effectiveInitialView =
    config.initialView ?? (config.hideTableView ? "grid" : "table");
  const listing = useAdminListing<TResponse, TRow>({
    ...config,
    initialView: effectiveInitialView,
  });
  const {
    view,
    setView,
    table,
    panel,
    searchInput,
    setSearchInput,
    commitSearch,
    filterOpen,
    setFilterOpen,
    openFilters,
    applyFilters,
    clearFilters,
    pendingFilters,
    setPendingFilters,
    activeFilterCount,
    hasActiveState,
    resetAll,
    rows,
    isLoading,
    errorMessage,
    currentPage,
    totalPages,
    selection,
  } = listing;

  const selectionContext: ListingSelectionContext<TRow> = {
    selectedIds: selection.selectedIds,
    selectedCount: selection.selectedCount,
    clearSelection: selection.clearSelection,
    toggleSelect: selection.toggle,
    rows,
    openEditPanel: panel.openEditPanel,
  };

  const bulkActionItems = config.buildBulkActions?.(selectionContext);

  // Mobile bulk bar
  useBottomActions(
    selection.selectedCount > 0 && bulkActionItems
      ? {
          bulk: {
            selectedCount: selection.selectedCount,
            onClearSelection: selection.clearSelection,
            actions: bulkActionItems,
          },
        }
      : {},
  );

  const editorTitle = config.resolveEditorTitle
    ? config.resolveEditorTitle({
        isCreate: panel.isCreateOpen,
        editId: panel.editId,
        closePanel: panel.closePanel,
      })
    : panel.isCreateOpen
      ? `Add ${config.title.replace(/s$/, "")}`
      : `Edit ${config.title.replace(/s$/, "")}`;

  const isEditorOpen = panel.isCreateOpen || panel.isEditOpen;

  return (
    <Div className={config.className ?? "min-h-screen"}>
      <ListingToolbar
        filterCount={activeFilterCount}
        onFiltersClick={openFilters}
        searchValue={searchInput}
        searchPlaceholder={config.searchPlaceholder}
        onSearchChange={setSearchInput}
        onSearchCommit={commitSearch}
        sortValue={table.get("sort") || config.defaultSort}
        sortOptions={config.sortOptions}
        onSortChange={(v) => table.set("sort", v)}
        showTableView={!config.hideTableView}
        toggles={config.toggles}
        view={view}
        onViewChange={(v) => setView(v)}
        onResetAll={resetAll}
        hasActiveState={hasActiveState}
        extra={
          config.primaryAction || config.toolbarExtra ? (
            <Row align="center" gap="sm">
              {config.toolbarExtra}
              {config.primaryAction && (
                <Button
                  size="sm"
                  onClick={() =>
                    config.primaryAction!.onClick({
                      openCreatePanel: panel.openCreatePanel,
                    })
                  }
                  className="flex items-center gap-1.5"
                >
                  {config.primaryAction.icon ?? <Plus className="h-4 w-4" />}
                  {config.primaryAction.label}
                </Button>
              )}
            </Row>
          ) : undefined
        }
      />

      {config.renderAboveContent?.()}

      {bulkActionItems && (
        <BulkActionBar
          selectedCount={selection.selectedCount}
          onClearSelection={selection.clearSelection}
          actions={bulkActionItems}
        />
      )}

      {totalPages > 1 && (
        <Row className="sticky top-[calc(var(--header-height,0px)+44px)] z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-slate-700 px-3 py-1.5" justify="center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(p) => table.setPage(p)}
          />
        </Row>
      )}

      <Div className="px-3 sm:px-4" padding="y-md">
        {errorMessage && (
          <Div className="mb-4 border border-error/20 bg-error-surface px-4 text-sm text-error" padding="y-sm" rounded="xl">
            {errorMessage}
          </Div>
        )}
        {view === "table" ? (
          <DataTable
            columns={config.columns}
            rows={rows}
            isLoading={isLoading}
            emptyLabel={config.emptyLabel ?? `No ${config.title.toLowerCase()} found`}
            selectedIds={selection.selectedIdSet}
            onToggleSelect={selection.toggle}
            onToggleSelectAll={(next) =>
              next
                ? selection.setSelectedIds(rows.map((r) => r.id))
                : selection.clearSelection()
            }
            getRowHref={config.getRowHref}
            onRowClick={
              config.onRowClick
                ? (row) =>
                    config.onRowClick!(row, {
                      openEditPanel: panel.openEditPanel,
                    })
                : config.renderEditor
                  ? (row) => panel.openEditPanel(row.id)
                  : undefined
            }
            renderRowActions={config.renderRowActions}
          />
        ) : config.renderCards ? (
          config.renderCards(rows, view as "grid" | "list", selectionContext, isLoading)
        ) : (
          <AdminViewCards
            rows={rows as unknown as Parameters<typeof AdminViewCards>[0]["rows"]}
            view={view}
            isLoading={isLoading}
            emptyLabel={config.emptyLabel ?? `No ${config.title.toLowerCase()} found`}
            onRowClick={(row) => panel.openEditPanel(row.id)}
            selectedIdSet={selection.selectedIdSet}
            onToggleSelect={selection.toggle}
          />
        )}
      </Div>

      {config.renderFilterPanel && (
        <ListingFilterDrawer
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          onApply={applyFilters}
          onClear={clearFilters}
          activeCount={activeFilterCount}
        >
          {config.renderFilterPanel({
            pendingFilters,
            setPendingFilters,
            applyFilters,
            clearFilters,
          })}
        </ListingFilterDrawer>
      )}

      {config.renderEditor && (
        <SideDrawer
          isOpen={isEditorOpen}
          onClose={panel.closePanel}
          title={editorTitle}
          mode={panel.isCreateOpen ? "create" : "edit"}
        >
          {isEditorOpen &&
            config.renderEditor({
              isCreate: panel.isCreateOpen,
              editId: panel.editId,
              closePanel: panel.closePanel,
            })}
        </SideDrawer>
      )}
    </Div>
  );
}
