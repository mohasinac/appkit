import { ReactNode, useState, useMemo } from "react";
import { Button } from "./components/Button";
import { Spinner } from "./components/Spinner";
import { Pagination } from "./components/Pagination";
import { Text } from "./components/Typography";
import { GRID_MAP } from "./components/Layout";
import type { GridCols } from "./components/Layout";
import { Row } from "./components/Layout";
import type { TableColumn, TableConfig, PaginationConfig } from "../contracts";
import { mergeTableConfig, DEFAULT_PAGINATION_CONFIG } from "../contracts";

/**
 * DataTable — generic sortable + paginated table promoted to @mohasinac/ui.
 *
 * Accepts `tableConfig` and `paginationConfig` for composable configuration.
 * Apps can spread-merge DEFAULT_TABLE_CONFIG / DEFAULT_PAGINATION_CONFIG and
 * override only the values they need, then pass the result once.
 *
 * Individual flat props (pageSize, stickyHeader, striped, …) still work and
 * take precedence over anything in tableConfig when explicitly provided.
 */

type ViewMode = "table" | "grid" | "list";
type SortDirection = "asc" | "desc" | null;

/**
 * Column descriptor for the DataTable component.
 * Narrows `render` to return `ReactNode` (TableColumn uses `unknown` so
 * contracts stays React-free). Fully compatible with `TableColumn<T>`.
 */
export type DataTableColumn<T> = Omit<TableColumn<T>, "render"> & {
  render?: (item: T) => ReactNode;
};

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  /** Derives a stable key per row. Defaults to `(item) => (item as Record<string,string>).id`. */
  keyExtractor?: (item: T) => string;
  onRowClick?: (item: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  actions?: (item: T) => ReactNode;
  /** When true, disables internal pagination — render your own externally. Default: false */
  externalPagination?: boolean;
  /**
   * Composable table configuration.
   * Deep-merged with DEFAULT_TABLE_CONFIG. Individual flat props (pageSize,
   * stickyHeader, etc.) override this when explicitly provided.
   */
  tableConfig?: Partial<TableConfig>;
  /**
   * Composable pagination configuration.
   * Merged with DEFAULT_PAGINATION_CONFIG. Individual flat props override this.
   */
  paginationConfig?: Partial<PaginationConfig>;
  /** Items per page. Explicit value overrides tableConfig.pageSize. Default: 20 */
  pageSize?: number;
  // Mobile view
  mobileCardRender?: (item: T) => ReactNode;
  // Custom empty state
  emptyState?: ReactNode;
  emptyIcon?: ReactNode;
  emptyTitle?: string;
  // Table enhancements — explicit values override tableConfig values
  stickyHeader?: boolean;
  striped?: boolean;
  // View toggle
  showViewToggle?: boolean;
  showTableView?: boolean;
  viewMode?: ViewMode;
  defaultViewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  // Row selection
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  /**
   * Number of grid columns for card grid view.
   * Matches Layout GRID_MAP keys: 1–6, "autoSm", "autoMd", "autoLg".
   * Default: 6 (2→3→4→5→6 across breakpoints).
   */
  gridCols?: GridCols;
  // Labels (override defaults for i18n)
  labels?: {
    loading?: string;
    noDataTitle?: string;
    noDataDescription?: string;
    actions?: string;
    tableView?: string;
    gridView?: string;
    listView?: string;
  };
}

export function DataTable<T extends object>({
  data,
  columns,
  keyExtractor: keyExtractorProp,
  onRowClick,
  loading = false,
  emptyMessage,
  actions,
  mobileCardRender,
  emptyState,
  emptyIcon,
  emptyTitle,
  tableConfig,
  paginationConfig,
  externalPagination = false,
  // Explicit flat props — override tableConfig when provided
  pageSize: pageSizeProp,
  stickyHeader: stickyHeaderProp,
  striped: stripedProp,
  showViewToggle: showViewToggleProp,
  showTableView = true,
  viewMode: controlledViewMode,
  defaultViewMode: defaultViewModeProp,
  onViewModeChange,
  selectable: selectableProp,
  selectedIds = [],
  onSelectionChange,
  gridCols = "cards",
  labels = {},
}: DataTableProps<T>) {
  // Merge tableConfig + paginationConfig with defaults; explicit flat props win
  const resolvedTable = mergeTableConfig(tableConfig);
  const resolvedPag = {
    ...DEFAULT_PAGINATION_CONFIG,
    ...tableConfig?.pagination,
    ...paginationConfig,
  };

  const keyExtractor: (item: T) => string =
    keyExtractorProp ??
    ((item) => (item as Record<string, string>).id ?? JSON.stringify(item));

  const pageSize = pageSizeProp ?? resolvedTable.pageSize;
  const stickyHeader = stickyHeaderProp ?? resolvedTable.sticky.enabled;
  const striped = stripedProp ?? resolvedTable.striped;
  const showViewToggle = showViewToggleProp ?? resolvedTable.showViewToggle;
  const selectable = selectableProp ?? resolvedTable.selectable;
  const defaultViewMode: ViewMode =
    defaultViewModeProp ?? resolvedTable.defaultViewMode;

  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [internalViewMode, setInternalViewMode] =
    useState<ViewMode>(defaultViewMode);

  const activeViewMode: ViewMode = controlledViewMode ?? internalViewMode;

  const {
    loading: labelLoading = "Loading…",
    noDataTitle = "No data found",
    noDataDescription = "There are no items to display.",
    actions: labelActions = "Actions",
    tableView = "Table view",
    gridView = "Grid view",
    listView = "List view",
  } = labels;

  const handleViewModeChange = (mode: ViewMode) => {
    if (controlledViewMode === undefined) setInternalViewMode(mode);
    onViewModeChange?.(mode);
  };

  const handleSort = (key: string) => {
    const col = columns.find((c) => c.key === key);
    if (!col?.sortable) return;
    if (sortKey === key) {
      if (sortDirection === "asc") setSortDirection("desc");
      else {
        setSortKey(null);
        setSortDirection(null);
      }
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const sortedData = useMemo(() => {
    const sorted = [...data];
    if (sortKey && sortDirection) {
      sorted.sort((a, b) => {
        const aVal = (a as Record<string, unknown>)[sortKey];
        const bVal = (b as Record<string, unknown>)[sortKey];
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        if (typeof aVal === "string" && typeof bVal === "string") {
          return sortDirection === "asc"
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }
        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  }, [data, sortKey, sortDirection]);

  const paginatedData = useMemo(() => {
    if (externalPagination) return sortedData;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, externalPagination, pageSize]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  // ─── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="appkit-data-table__wrapper">
        <div className="appkit-data-table__loading">
          <Spinner size="lg" label={labelLoading} />
        </div>
      </div>
    );
  }

  // ─── Empty state ────────────────────────────────────────────────────────────
  if (data.length === 0) {
    if (emptyState) return <>{emptyState}</>;
    return (
      <div className="appkit-data-table__wrapper">
        <div className="appkit-data-table__empty">
          <div className="text-center px-4">
            {emptyIcon ?? (
              <svg
                className="mx-auto h-12 w-12 text-zinc-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
            )}
            <Text size="sm" weight="semibold" className="mt-4">
              {emptyTitle ?? noDataTitle}
            </Text>
            <Text size="sm" variant="secondary" className="mt-1">
              {emptyMessage ?? noDataDescription}
            </Text>
          </div>
        </div>
      </div>
    );
  }

  const renderViewToggle = () => {
    if (!showViewToggle) return null;
    return (
      <div
        className="appkit-data-table__view-toggle"
        role="toolbar"
        aria-label="View mode"
      >
        {showTableView && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleViewModeChange("table")}
            aria-label={tableView}
            aria-pressed={activeViewMode === "table"}
            className={`appkit-data-table__view-btn ${activeViewMode === "table" ? "appkit-data-table__view-btn--active" : ""} hidden sm:flex`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 10h18M3 6h18M3 14h18M3 18h18"
              />
            </svg>
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleViewModeChange("grid")}
          aria-label={gridView}
          aria-pressed={activeViewMode === "grid"}
          className={`appkit-data-table__view-btn ${activeViewMode === "grid" ? "appkit-data-table__view-btn--active" : ""}`}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
            />
          </svg>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleViewModeChange("list")}
          aria-label={listView}
          aria-pressed={activeViewMode === "list"}
          className={`appkit-data-table__view-btn ${activeViewMode === "list" ? "appkit-data-table__view-btn--active" : ""}`}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
            />
          </svg>
        </Button>
      </div>
    );
  };

  // ─── Card views (grid / list) ────────────────────────────────────────────────
  const renderCardGrid = (mode: "grid" | "list") => {
    if (!mobileCardRender) return null;
    return (
      <div
        className={
          mode === "grid"
            ? `${GRID_MAP[gridCols]} gap-6`
            : "flex flex-col gap-4"
        }
      >
        {paginatedData.map((item) => (
          <SelectableCard
            key={keyExtractor(item)}
            id={keyExtractor(item)}
            selectable={selectable}
            selected={selectedIds.includes(keyExtractor(item))}
            listMode={mode === "list"}
            onToggle={(id, checked) =>
              onSelectionChange?.(
                checked
                  ? [...selectedIds, id]
                  : selectedIds.filter((s) => s !== id),
              )
            }
          >
            {mobileCardRender(item)}
          </SelectableCard>
        ))}
      </div>
    );
  };

  // ─── Main render ─────────────────────────────────────────────────────────────
  return (
    <div className="appkit-data-table">
      {renderViewToggle()}

      {/* Non-table views */}
      {activeViewMode !== "table" &&
        mobileCardRender &&
        renderCardGrid(activeViewMode as "grid" | "list")}

      {/* Mobile cards in table mode */}
      {activeViewMode === "table" && mobileCardRender && (
        <div className="appkit-data-table__mobile-cards">
          {paginatedData.map((item) => (
            <SelectableCard
              key={keyExtractor(item)}
              id={keyExtractor(item)}
              selectable={selectable}
              selected={selectedIds.includes(keyExtractor(item))}
              onToggle={(id, checked) =>
                onSelectionChange?.(
                  checked
                    ? [...selectedIds, id]
                    : selectedIds.filter((s) => s !== id),
                )
              }
            >
              {mobileCardRender(item)}
            </SelectableCard>
          ))}
        </div>
      )}

      {/* Desktop table */}
      {activeViewMode === "table" && (
        <div className="appkit-data-table__wrapper">
          <div
            className={`appkit-data-table__scroll ${stickyHeader ? "appkit-data-table__scroll--sticky" : ""}`}
          >
            <table className="appkit-data-table__table">
              <thead
                className={`appkit-data-table__thead ${stickyHeader ? "appkit-data-table__thead--sticky" : ""}`}
              >
                <tr>
                  {selectable && (
                    <th scope="col" className="px-4 py-3 w-8">
                      <input
                        type="checkbox"
                        className="rounded border-zinc-300"
                        aria-label="Select all on page"
                        checked={
                          paginatedData.length > 0 &&
                          paginatedData.every((item) =>
                            selectedIds.includes(keyExtractor(item)),
                          )
                        }
                        onChange={(e) => {
                          const pageIds = paginatedData.map(keyExtractor);
                          onSelectionChange?.(
                            e.target.checked
                              ? [...new Set([...selectedIds, ...pageIds])]
                              : selectedIds.filter(
                                  (id) => !pageIds.includes(id),
                                ),
                          );
                        }}
                      />
                    </th>
                  )}
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      scope="col"
                      aria-sort={
                        col.sortable
                          ? sortKey === col.key
                            ? sortDirection === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                          : undefined
                      }
                      className={`appkit-data-table__th ${col.sortable ? "appkit-data-table__th--sortable" : ""}`}
                      style={{ width: col.width }}
                      onClick={() => col.sortable && handleSort(col.key)}
                    >
                      <Row gap="sm">
                        {col.header}
                        {col.sortable && (
                          <span className="text-zinc-400" aria-hidden="true">
                            {sortKey === col.key ? (
                              sortDirection === "asc" ? (
                                "↑"
                              ) : (
                                "↓"
                              )
                            ) : (
                              <span className="opacity-30">↕</span>
                            )}
                          </span>
                        )}
                      </Row>
                    </th>
                  ))}
                  {actions && (
                    <th
                      scope="col"
                      className="appkit-data-table__th appkit-data-table__td--actions"
                    >
                      {labelActions}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="appkit-data-table__tbody divide-y divide-zinc-200 dark:divide-slate-700">
                {paginatedData.map((item, index) => (
                  <tr
                    key={keyExtractor(item)}
                    className={[
                      "appkit-data-table__row",
                      striped && index % 2 === 1
                        ? "appkit-data-table__row--striped"
                        : "",
                      onRowClick ? "appkit-data-table__row--clickable" : "",
                    ].join(" ")}
                    onClick={() => onRowClick?.(item)}
                  >
                    {selectable && (
                      <td
                        className="px-4 py-4 w-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          className="rounded border-zinc-300"
                          aria-label="Select row"
                          checked={selectedIds.includes(keyExtractor(item))}
                          onChange={(e) => {
                            const id = keyExtractor(item);
                            onSelectionChange?.(
                              e.target.checked
                                ? [...selectedIds, id]
                                : selectedIds.filter((s) => s !== id),
                            );
                          }}
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className="appkit-data-table__td">
                        {col.render
                          ? col.render(item)
                          : (((item as Record<string, unknown>)[
                              col.key
                            ] as string) ?? "-")}
                      </td>
                    ))}
                    {actions && (
                      <td
                        className="appkit-data-table__td appkit-data-table__td--actions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {actions(item)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!externalPagination && totalPages > 1 && (
        <div className="appkit-data-table__pagination">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            maxVisible={resolvedPag.maxVisible}
            showFirstLast={resolvedPag.showFirstLast}
            showPrevNext={resolvedPag.showPrevNext}
            size={resolvedPag.size}
          />
        </div>
      )}
    </div>
  );
}

// ─── SelectableCard (internal) ───────────────────────────────────────────────

interface SelectableCardProps {
  id: string;
  selectable: boolean;
  selected: boolean;
  onToggle: (id: string, checked: boolean) => void;
  children: ReactNode;
  listMode?: boolean;
}

function SelectableCard({
  id,
  selectable,
  selected,
  onToggle,
  children,
  listMode = false,
}: SelectableCardProps) {
  if (!selectable) return <div className="h-full">{children}</div>;
  return (
    <div className="relative group h-full">
      {/* Checkbox overlay — always visible, bg/shadow ensures contrast over any card background */}
      <div
        className={[
          "absolute z-10",
          listMode ? "left-2 top-1/2 -translate-y-1/2" : "top-2 left-2",
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-6 h-6 rounded-md bg-white/95 dark:bg-slate-800/95 shadow-md flex items-center justify-center">
          {/* relative wrapper ensures checkmark SVG centers over the input */}
          <div className="relative flex items-center justify-center">
            <input
              type="checkbox"
              className={[
                "w-4 h-4 rounded cursor-pointer transition-all appearance-none",
                selected
                  ? "border-2 border-primary bg-primary"
                  : "border-2 border-zinc-500 dark:border-slate-400 bg-transparent group-hover:border-primary",
              ].join(" ")}
              checked={selected}
              onChange={(e) => onToggle(id, e.target.checked)}
              aria-label="Select item"
            />
            {selected && (
              <svg
                className="absolute inset-0 m-auto w-2.5 h-2.5 text-white pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </div>
        </div>
      </div>
      {selected && (
        <div
          className="absolute inset-0 z-[5] rounded-xl ring-2 ring-primary ring-offset-0 pointer-events-none"
          aria-hidden="true"
        />
      )}
      {children}
    </div>
  );
}
