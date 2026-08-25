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
import { BulkActionBar, Button, Div, ListingFilterDrawer, ListingToolbar, Pagination, Row, SideDrawer, StickyToolbar } from "../../../ui";
import type { BulkActionItem } from "../../../ui";
import { useBottomActions } from "../../layout";
import { useAdminListing } from "../hooks/useAdminListing";
import type { AdminListingConfig } from "../hooks/useAdminListing";
import type { AdminTableColumn } from "../types";
import { getResourceIcon } from "../../../ui/columns/column-renderers";
import { AdminViewCards } from "./AdminViewCards";
import { DataTable } from "./DataTable";
import { useBreakpoint } from "../../../react/hooks/useBreakpoint";

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
  barcodeId?: string;
  /** Row photo/thumbnail (avatar, product image, store logo, cover image, etc). Falls back to the table's resource icon when omitted. */
  image?: string;
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
  /** Portal context — admin/seller/user all share the same chrome. */
  portal: "admin" | "seller" | "user";

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

  /**
   * When set, the table renders rows as anchor links to this href. Prefer a
   * plain string with an `{id}` placeholder (e.g. "/admin/x/{id}/edit") —
   * it's the only form safe to build inside a Server Component page.tsx,
   * since RSC cannot pass function values across the server/client boundary.
   * A function is only safe when the config itself is assembled client-side.
   */
  rowHrefTemplate?: string | ((row: TRow) => string);

  /** Hide the table toggle in the toolbar; views with no table column set should use this. */
  hideTableView?: boolean;

  /** Initial view mode (defaults to "list" — the row-style card view). */
  initialView?: "grid" | "list" | "table";

  // -- Optional CSS class on root container
  className?: string;
}

export function DataListingView<TResponse, TRow extends { id: string }>({
  config,
}: {
  config: ListingViewConfig<TResponse, TRow>;
}) {
  /*
   * Below `md` the table view is suppressed entirely and the list/card view is
   * rendered instead.
   *
   * No amount of per-column hiding rescues a grid at 320px — even a two-column
   * table wraps its cells, so rows grow to different heights and stop being
   * scannable. `TableColumn.priority` handles density from `md` upward; this
   * handles the case below it, where the answer is "not a table at all".
   *
   * The user's stored preference is untouched, so widening the window brings
   * their table straight back.
   */
  const { isMobile } = useBreakpoint();
  const effectiveInitialView = config.initialView ?? "list";
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
    pageSize,
    setPageSize,
  } = listing;

  const selectionContext: ListingSelectionContext<TRow> = {
    selectedIds: selection.selectedIds,
    selectedCount: selection.selectedCount,
    clearSelection: selection.clearSelection,
    toggleSelect: selection.toggle,
    rows,
    openEditPanel: panel.openEditPanel,
  };

  const resourceIcon = getResourceIcon(
    typeof config.queryKey[1] === "string" ? config.queryKey[1] : undefined,
  );

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

  // Shared row-navigation resolver — the table branch and the default
  // AdminViewCards branch must agree on when a row is actually clickable.
  // Previously AdminViewCards unconditionally wired onRowClick to
  // openEditPanel even when the config had no renderEditor/onRowClick/
  // rowHrefTemplate, so cards always looked clickable (cursor-pointer,
  // hover state) but silently did nothing (or mutated the URL with no
  // visible drawer) while the table for the same config correctly showed
  // no click affordance at all — read as "table isn't clickable" by users.
  const resolvedRowClick = config.onRowClick
    ? (row: TRow) => config.onRowClick!(row, { openEditPanel: panel.openEditPanel })
    : config.renderEditor
      ? (row: TRow) => panel.openEditPanel(row.id)
      : config.rowHrefTemplate
        ? (row: TRow) => {
            const href =
              typeof config.rowHrefTemplate === "function"
                ? config.rowHrefTemplate(row)
                : config.rowHrefTemplate!.replace("{id}", encodeURIComponent(row.id));
            window.location.href = href;
          }
        : undefined;

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
                <Button gap="sm" 
                  size="sm"
                  onClick={() =>
                    config.primaryAction!.onClick({
                      openCreatePanel: panel.openCreatePanel,
                    })
                  }
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
        <StickyToolbar offset="header+pagination" tone="translucent" border padding="toolbar">
          <Row justify="center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(p) => table.setPage(p)}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            paginationConfig={{ showPageSizeSelector: true, pageSizeOptions: [10, 25, 50, 100] }}
          />
          </Row>
        </StickyToolbar>
      )}

      <Div paddingX="x-sm-md" padding="y-md">
        {errorMessage && (
          <Div textSize="sm" className="mb-4 border border-error/20" color="error" surface="danger-surface" padding="inline" rounded="xl">
            {errorMessage}
          </Div>
        )}
        {/* The view-mode preference is global (persisted across every listing
            page, not just this one) — a "table" choice made elsewhere must
            never leak into a hideTableView-only view like Coupons. */}
        {view === "table" && !config.hideTableView && !isMobile ? (
          <DataTable
            columns={config.columns}
            rows={rows}
            resourceIcon={resourceIcon}
            isLoading={isLoading}
            emptyLabel={config.emptyLabel ?? `No ${config.title.toLowerCase()} found`}
            selectedIds={selection.selectedIdSet}
            onToggleSelect={selection.toggle}
            onToggleSelectAll={(next) =>
              next
                ? selection.setSelectedIds(rows.map((r) => r.id))
                : selection.clearSelection()
            }
            rowHrefTemplate={config.rowHrefTemplate}
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
            // Note: rowHrefTemplate above already gives DataTable's own rows
            // `cursor-pointer`/navigate-on-click even when onRowClick is
            // undefined — resolvedRowClick (used by the card branch below)
            // additionally covers that same rowHrefTemplate-only case so the
            // two view modes never disagree on whether a row is clickable.
          />
        ) : config.renderCards ? (
          // The persisted view-mode preference is global, so a "table"
          // value can still reach here on a hideTableView-only view (see
          // the DataTable branch's guard above) — fall back to "grid".
          config.renderCards(rows, view === "table" ? "grid" : view, selectionContext, isLoading)
        ) : (
          <AdminViewCards
            rows={rows as unknown as Parameters<typeof AdminViewCards>[0]["rows"]}
            view={view === "table" ? "grid" : view}
            resourceIcon={resourceIcon}
            isLoading={isLoading}
            emptyLabel={config.emptyLabel ?? `No ${config.title.toLowerCase()} found`}
            onRowClick={
              resolvedRowClick
                ? (row) => resolvedRowClick(row as unknown as TRow)
                : undefined
            }
            selectedIdSet={selection.selectedIdSet}
            onToggleSelect={selection.toggle}
            renderRowActions={
              config.renderRowActions
                ? (row) => config.renderRowActions!(row as unknown as TRow)
                : undefined
            }
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
