/**
 * Table, pagination and sticky-header configuration types.
 *
 * Every table/list view in every feat-* package accepts these config objects.
 * Apps can spread-merge over the exported defaults to override only what they need:
 *
 * @example
 * // App-level base config (one file, reused everywhere)
 * import { DEFAULT_TABLE_CONFIG, DEFAULT_PAGINATION_CONFIG } from "./";
 *
 * export const myTableConfig: TableConfig = {
 *   ...DEFAULT_TABLE_CONFIG,
 *   pageSize: 10,
 *   showViewToggle: true,
 * };
 *
 * export const myPaginationConfig: PaginationConfig = {
 *   ...DEFAULT_PAGINATION_CONFIG,
 *   perPage: 10,
 *   showPageSizeSelector: true,
 *   pageSizeOptions: [10, 25, 50],
 * };
 *
 * // In a component
 * <DataTable tableConfig={myTableConfig} paginationConfig={myPaginationConfig} ... />
 *
 * // In a hook
 * const { products } = useProducts(params, { paginationConfig: myPaginationConfig });
 */

// ─── Pagination ────────────────────────────────────────────────────────────────

/**
 * Composable pagination configuration.
 * All fields are optional so apps can spread-merge over the defaults.
 */
export interface PaginationConfig {
  /** Items per page sent to the API. Default: 20 */
  perPage?: number;
  /** Hard cap on perPage (for page-size selector). Default: 100 */
  maxPerPage?: number;
  /** Show a page-size selector UI element. Default: false */
  showPageSizeSelector?: boolean;
  /** Options for the page-size selector. Default: [10, 20, 50, 100] */
  pageSizeOptions?: number[];
  /** Show first / last page buttons. Default: true */
  showFirstLast?: boolean;
  /** Show previous / next buttons. Default: true */
  showPrevNext?: boolean;
  /** Max visible page number buttons before ellipsis. Default: 7 */
  maxVisible?: number;
  /** Size variant for pagination button sizing. Default: "md" */
  size?: "sm" | "md" | "lg";
}

export const DEFAULT_PAGINATION_CONFIG: Required<PaginationConfig> = {
  perPage: 20,
  maxPerPage: 100,
  showPageSizeSelector: false,
  pageSizeOptions: [10, 20, 50, 100],
  showFirstLast: true,
  showPrevNext: true,
  maxVisible: 7,
  size: "md",
};

// ─── Sticky header ─────────────────────────────────────────────────────────────

/**
 * Sticky header configuration for data tables.
 * When `enabled` is true the thead is pinned while the tbody scrolls.
 */
export interface StickyConfig {
  /** Pin the header while the body scrolls. Default: false */
  enabled?: boolean;
  /** Tailwind `top-*` class applied to the sticky thead. Default: "top-0" */
  topOffset?: string;
  /** Max height of the scrollable container. Default: "600px" */
  maxHeight?: string;
  /** z-index of the sticky header. Default: 10 */
  zIndex?: number;
}

export const DEFAULT_STICKY_CONFIG: Required<StickyConfig> = {
  enabled: false,
  topOffset: "top-0",
  maxHeight: "600px",
  zIndex: 10,
};

// ─── Table ─────────────────────────────────────────────────────────────────────

/** View mode options for DataTable. */
export type TableViewMode = "table" | "grid" | "list";

/**
 * Composable table configuration.
 * Pass a Partial<TableConfig> to any DataTable / admin-list hook; values are
 * deep-merged with DEFAULT_TABLE_CONFIG at the use site.
 */
export interface TableConfig {
  /** Items shown per page (internal pagination). Default: 20 */
  pageSize?: number;
  /** Sticky header behaviour. Default: disabled */
  sticky?: StickyConfig;
  /** Alternate row background colour. Default: false */
  striped?: boolean;
  /** Enable row checkbox selection. Default: false */
  selectable?: boolean;
  /** Show view-mode toggle (table / grid / list). Default: false */
  showViewToggle?: boolean;
  /** Default view mode. Default: "table" */
  defaultViewMode?: TableViewMode;
  /** Pagination widget configuration. */
  pagination?: PaginationConfig;
}

export const DEFAULT_TABLE_CONFIG: {
  pageSize: number;
  sticky: Required<StickyConfig>;
  striped: boolean;
  selectable: boolean;
  showViewToggle: boolean;
  defaultViewMode: TableViewMode;
  pagination: Required<PaginationConfig>;
} = {
  pageSize: DEFAULT_PAGINATION_CONFIG.perPage,
  sticky: DEFAULT_STICKY_CONFIG,
  striped: false,
  selectable: false,
  showViewToggle: false,
  defaultViewMode: "table",
  pagination: DEFAULT_PAGINATION_CONFIG,
};

/**
 * Utility: merge a Partial<TableConfig> over the defaults.
 * Performs a shallow merge at the top level and deep merge for nested objects.
 */
export function mergeTableConfig(override?: Partial<TableConfig>): typeof DEFAULT_TABLE_CONFIG {
  if (!override) return DEFAULT_TABLE_CONFIG;
  return {
    ...DEFAULT_TABLE_CONFIG,
    ...override,
    sticky: { ...DEFAULT_STICKY_CONFIG, ...override.sticky },
    pagination: { ...DEFAULT_PAGINATION_CONFIG, ...override.pagination },
  };
}
