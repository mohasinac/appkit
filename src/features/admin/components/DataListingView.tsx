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
import { BulkActionBar, Button, Div, Heading, Icon, IconButton, ListingFilterDrawer, ListingToolbar, Pagination, Row, SideDrawer, Stack, StickyToolbar, Text, TextLink } from "../../../ui";
import type { BulkActionItem } from "../../../ui";
import { ROW_ACTION_ID, ROW_ACTION_META } from "../../products/constants/action-defs";
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
  /**
   * The storage box this row's item is in — `AC60-03`.
   *
   * 🛑 OPTIONAL, AND ONLY A ROW MAPPER THAT ACTUALLY HAS IT MAY SET IT. A
   * placement lives in `inventoryPlacements`, keyed `{boxId}__{productId}`, so
   * a listing query does not carry it for free: a mapper that wants this
   * column has to join, and most should not — one placements read per row is
   * an N+1 against Rule #6's ~3-round-trip budget.
   *
   * It is declared here rather than left to a bespoke column because "where
   * is this thing" is the question a warehouse screen exists to answer, and
   * the alternative was the free-text `physicalLocation` that was retired for
   * being three uncontrolled inputs nothing could group.
   *
   * 🛑 A row with no placement renders NOTHING here, never "—" and never
   * "Unknown". An item that has not been put in a box yet and an item whose
   * placement we failed to read are different facts, and a dash asserts the
   * first about both.
   */
  boxCode?: string;
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
  /**
   * Suppress the `<h1>` this view renders from `title`.
   *
   * For the handful of pages that already author their own heading — a second
   * `<h1>` is a worse outline than none, which is the defect this header was
   * added to fix. Everything else leaves it unset and gets the heading.
   */
  hideHeader?: boolean;
  /**
   * Search box copy. OPTIONAL — declaring it is what makes the box exist.
   *
   * It was REQUIRED, and `DataListingView` passed `onSearchChange`
   * unconditionally, so a developer could not build a listing view without
   * rendering a search box. `ListingToolbar` has always gated the box on
   * `onSearchChange` being supplied; nothing ever declined to supply it.
   *
   * That is the structural cause of the dead boxes: ~39 views render a search
   * input whose endpoint never reads `q`. The box accepts typing, the request
   * carries the term, and the results do not change — no error anywhere.
   *
   * Omit it when the endpoint cannot search. Do not pass a placeholder
   * describing a capability the endpoint lacks.
   */
  searchPlaceholder?: string;
  /**
   * Explicit search capability. Prefer this over a bare `searchPlaceholder`
   * when the match semantics matter to the user — PII-backed fields are
   * exact-match by construction (encryption and partial-match search are
   * mutually exclusive), and a placeholder promising "search by email" over a
   * blind index is a promise the backend cannot keep.
   */
  search?: {
    placeholder: string;
    /** `exact` for a field resolved through an HMAC blind index. */
    mode?: "partial" | "exact";
    /**
     * Fields the endpoint actually matches on.
     *
     * Not decoration: this is what lets the audit check that the placeholder
     * does not promise a match the corpus cannot make. A box reading "search
     * by buyer" over an index built from productTitle/storeName/trackingNumber
     * is the same lie as a box the endpoint ignores entirely — just harder to
     * notice, because it returns a plausible empty list instead of nothing.
     */
    fields?: readonly string[];
    /**
     * When the term reaches the URL. Defaults to `"enter"`, which is the
     * behaviour every existing box already had.
     *
     * 🛑 `"debounce"` is invalid with `mode: "exact"` and the audit blocks the
     * pairing. An exact search resolves an HMAC blind index or a whole-value
     * equality, so every keystroke before the last is a query GUARANTEED to
     * match nothing — the user watches "no results" while typing a value that
     * is in fact present, and each of those round trips is a billed read.
     */
    commit?: "enter" | "debounce";
    /** Debounce delay in ms. Ignored unless `commit: "debounce"`. */
    debounceMs?: number;
  };
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

  /*
   * -- Primary "Add X" CTA in the toolbar
   *
   * `onClick` opens a create DRAWER; `href` navigates to a create PAGE. Pass
   * exactly one.
   *
   * `href` exists because a create page was previously unexpressible here, so
   * four views hand-rolled a `<TextLink>` styled to look like a button inside
   * `toolbarExtra` (and `audit-create-affordance` had to grow a regex to
   * recognise those). A config built in a `.ts` file — which is every
   * `buildXListingConfig` factory — cannot author that JSX at all, which is
   * why the five per-type admin listing pages had no create control.
   */
  primaryAction?: {
    label: string;
    onClick?: (panel: { openCreatePanel: () => void }) => void;
    href?: string;
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
    // Mapped explicitly: `...config` cannot reach these, they live one level
    // down under `search`. An exact-match search is never debounced — every
    // keystroke before the last is a query guaranteed to match nothing — so
    // the mode forces "enter" regardless of what the view asked for, and the
    // audit blocks the pairing at author time rather than relying on this.
    searchCommit: config.search?.mode === "exact" ? "enter" : config.search?.commit,
    searchDebounceMs: config.search?.debounceMs,
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

  /**
   * ONE renderer for `config.primaryAction`, used by the toolbar AND by the
   * empty state.
   *
   * 🛑 WHY THIS EXISTS: the action was rendered in the toolbar and nowhere
   * else, so an admin landing on an EMPTY list was told "No X found" with no
   * way forward — while the button that creates the first record sat in a
   * toolbar above an empty table. 27 of ~84 listing configs declare a
   * `primaryAction`; all 27 had that hole.
   *
   * 🛑 And it is a FUNCTION rather than two copies, because the alternative is
   * the shape Root Cause #75 is about: a rule spelled out twice, where the
   * copy made first learns nothing when the other gains a branch. The `href`
   * vs `onClick` split and the `asChild` anchor are exactly the sort of detail
   * that would drift.
   *
   * `size` is the only difference between the two placements — a toolbar
   * button is `sm`, and an empty state is the one thing on screen, so it gets
   * the default.
   */
  /*
   * 🛑 TWO DIFFERENT EMPTY STATES, and offering the wrong action is worse than
   * offering none.
   *
   * "No products found" with a New Product button is right on a fresh install
   * and actively misleading when the admin has just filtered to
   * `status=archived` — there may be a thousand products, and the useful move
   * is to clear the filter, not to create a thousand-and-first. `resetAll`
   * and `hasActiveState` already exist for the toolbar's own Reset control,
   * so this needs no new state and cannot disagree with it.
   */
  const emptyIsFiltered = hasActiveState;
  const emptyLabel =
    config.emptyLabel ?? `No ${config.title.toLowerCase()} found`;
  const resolvedEmptyLabel = emptyIsFiltered
    ? `No ${config.title.toLowerCase()} match these filters`
    : emptyLabel;

  const renderPrimaryAction = (size?: "sm") => {
    const action = config.primaryAction;
    if (!action) return null;
    const icon = action.icon ?? <Plus className="h-4 w-4" />;
    return action.href ? (
      // `asChild` so a create PAGE is a real anchor — middle-click and
      // copy-link work, and it is not a button that happens to navigate (a
      // Known-TS-Pattern this repo bans outright).
      <Button gap="sm" size={size} asChild>
        <TextLink variant="inherit" href={action.href}>
          {icon}
          {action.label}
        </TextLink>
      </Button>
    ) : (
      <Button
        gap="sm"
        size={size}
        onClick={() => action.onClick?.({ openCreatePanel: panel.openCreatePanel })}
      >
        {icon}
        {action.label}
      </Button>
    );
  };

  /** What an empty list offers: clear the filters, or create the first record. */
  const renderEmptyAction = () =>
    emptyIsFiltered ? (
      <Button variant="secondary" onClick={resetAll}>
        Clear filters
      </Button>
    ) : (
      renderPrimaryAction()
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

  /*
   * ── A DIRECT EDIT AFFORDANCE ON EVERY ROW ─────────────────────────────────
   *
   * Measured across 16 admin and store listings: ZERO edit links in rows and
   * zero pencils on admin. Editing meant opening a `⋯` menu first — two
   * clicks and a hidden menu for the single most common action an admin
   * performs. `/store/products` had 15 pencil-labelled buttons and admin had
   * none, so the two halves of the product did not even agree.
   *
   * Composed here rather than added to each config because ~105 listing
   * screens render through this one component, and both row renderers
   * (`DataTable` and `AdminViewCards`) already drop `renderRowActions` into a
   * click-stopped container — so one wrapper reaches every surface.
   *
   * 🛑 ONLY WHEN AN EDIT TARGET ACTUALLY RESOLVES. This file already carries a
   * long note about `AdminViewCards` once wiring every card to
   * `openEditPanel` whether or not the config had anywhere to go, so cards
   * looked clickable and silently did nothing. A pencil that opens nothing is
   * that same lie with a sharper point on it: the two real targets are a
   * drawer (`renderEditor`) and a route (`rowHrefTemplate`), and a config with
   * neither keeps exactly the actions it declared.
   *
   * 🛑 `onRowClick` is deliberately NOT a target. It is an arbitrary callback
   * — several configs use it to open a *view* modal, toggle a selection, or
   * navigate somewhere that is not an editor — so labelling it "Edit" would
   * promise one thing and do another.
   *
   * Label and icon come from `ROW_ACTION_META[ROW_ACTION_ID.EDIT]` per Rule
   * #7, so this shares one definition with every `⋯` menu's own Edit entry
   * rather than hardcoding a second "Edit" string.
   */
  const rowEditHref = React.useCallback(
    (row: TRow): string | null => {
      const t = config.rowHrefTemplate;
      if (!t) return null;
      return typeof t === "function"
        ? t(row)
        : t.replace("{id}", encodeURIComponent(row.id));
    },
    [config.rowHrefTemplate],
  );

  const hasEditTarget = Boolean(config.renderEditor ?? config.rowHrefTemplate);

  /*
   * The row's own name for the accessible label, falling back to its id.
   *
   * 🛑 A RUNTIME CHECK, not a cast. `TRow` is only `{ id: string }` here, but
   * every config maps its rows through `mapRows` into `AdminDataRow`, so
   * `primary` is present in practice — which is exactly the situation where
   * `(row as AdminDataRow).primary` would compile and then read `undefined`
   * on the one config that is shaped differently. `typeof` proves it instead.
   *
   * It matters because the alternative is ~50 buttons on a page all announcing
   * "Edit product": a screen-reader user hears the control and not the record,
   * which is the same as having no label at all.
   */
  const rowEditLabel = React.useCallback(
    (row: TRow): string => {
      // `string | undefined`, not `unknown`: a row primary is a label or it
      // is absent, and the `typeof` test below is a real narrowing either way.
      const primary = (row as { primary?: string }).primary;
      const name =
        typeof primary === "string" && primary.trim() ? primary.trim() : row.id;
      return `${ROW_ACTION_META[ROW_ACTION_ID.EDIT].label} ${name}`;
    },
    [],
  );

  /*
   * Hoisted so the memo below depends on plain identifiers.
   * `react-hooks/exhaustive-deps` cannot track a property read inside the
   * nested function the memo RETURNS, so reading `config.x` there asks for
   * `config` itself as a dependency — and `config` is a fresh object on every
   * render for every inline config, which would make the memo recompute each
   * time and hand `DataTable` a new prop identity on every render.
   */
  const { renderEditor, renderRowActions } = config;
  const { openEditPanel } = panel;

  const renderRowActionsWithEdit = React.useMemo(() => {
    if (!hasEditTarget) return renderRowActions;
    return (row: TRow) => {
      const href = rowEditHref(row);
      return (
        <Row align="center" justify="end" gap="xs">
          {renderEditor ? (
            <IconButton
              aria-label={rowEditLabel(row)}
              size="sm"
              variant="ghost"
              icon={<Icon name="edit" />}
              onClick={() => openEditPanel(row.id)}
            />
          ) : href ? (
            /*
             * A real link, not a click handler calling `window.location`.
             * The row's own navigation still does that — changing it is the
             * Phase 3 chrome work — but a NEW affordance has no reason to
             * inherit a full page load, and a link is also middle-clickable,
             * which is how an admin opens three records to compare them.
             *
             * Conditional rather than falling back to `href="#"`: the branch
             * already guarantees a template exists, so a null here would mean
             * one returned nothing — and a pencil linking to the current page
             * is worse than no pencil.
             */
            <TextLink href={href} variant="bare" aria-label={rowEditLabel(row)}>
              <Icon name="edit" size="sm" />
            </TextLink>
          ) : null}
          {renderRowActions?.(row)}
        </Row>
      );
    };
  }, [
    hasEditTarget,
    renderRowActions,
    renderEditor,
    rowEditHref,
    rowEditLabel,
    openEditPanel,
  ]);

  // A box exists only when the config asks for one.
  const searchEnabled = Boolean(config.search ?? config.searchPlaceholder);

  return (
    <Div className={config.className ?? "min-h-screen"}>
      {/*
        ── THE PAGE HEADING ────────────────────────────────────────────────────
        🛑 `config.title` HAS ALWAYS BEEN DECLARED AND NEVER RENDERED.

        Every one of the ~86 configs sets `title`, and this component used it
        for exactly two things: the editor drawer's label ("Edit Product") and
        the empty-state sentence ("No products found"). It never put it on the
        page. That is the audit's "no `<h1>` on 87 listing pages" — not a
        missing string, a string with no renderer.

        The consequence is bigger than a missing line of text. With no `<h1>`,
        a screen reader's document outline for `/admin/products` begins at
        whatever the first `<h2>` inside a card happens to be, and the heading
        order skips a level on every one of those pages. The audit scored the
        skip separately on 299 pages.

        `subtitle` was in the same position and is rendered here too.

        🛑 Rendered BY THE SHELL rather than asked of each page, because the
        ~86 pages are thin shims — `/admin/products/page.tsx` is four lines
        that render `<AdminProductsView>`. There is nowhere in a consumer page
        to put a heading without rebuilding the shim, and a per-page heading
        is what let all 86 go missing in the first place.

        Pages that DO author their own `<h1>` pass `hideHeader` so the outline
        never gains a second one.
      */}
      {!config.hideHeader && (
        <Stack gap="xs" className="mb-[var(--appkit-space-4)]">
          <Heading level={1} size="2xl" weight="bold">
            {config.title}
          </Heading>
          {config.subtitle && (
            <Text size="sm" color="muted">
              {config.subtitle}
            </Text>
          )}
        </Stack>
      )}
      <ListingToolbar
        filterCount={activeFilterCount}
        onFiltersClick={openFilters}
        searchValue={searchInput}
        searchPlaceholder={config.search?.placeholder ?? config.searchPlaceholder}
        // Passing this is what renders the box — ListingToolbar gates on it.
        // Undefined when the config declares no search, so a view whose
        // endpoint cannot search no longer shows an input that does nothing.
        onSearchChange={searchEnabled ? setSearchInput : undefined}
        onSearchCommit={searchEnabled ? commitSearch : undefined}
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
              {renderPrimaryAction("sm")}
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
            emptyLabel={resolvedEmptyLabel}
            emptyAction={renderEmptyAction()}
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
            renderRowActions={renderRowActionsWithEdit}
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
            emptyLabel={resolvedEmptyLabel}
            emptyAction={renderEmptyAction()}
            onRowClick={
              resolvedRowClick
                ? (row) => resolvedRowClick(row as unknown as TRow)
                : undefined
            }
            selectedIdSet={selection.selectedIdSet}
            onToggleSelect={selection.toggle}
            renderRowActions={
              renderRowActionsWithEdit
                ? (row) => renderRowActionsWithEdit(row as unknown as TRow)
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
