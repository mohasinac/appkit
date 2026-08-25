/**
 * Generic column builder — replaces the copy-pasted `build*Columns()` factory
 * found in every feature's `columns/index.ts`.
 *
 * @example
 * export const buildOrderColumns = createColumnBuilder(orderAdminColumns);
 */

import type { TableColumn, ColumnExtensionOpts, ColumnPriority } from "../../contracts";

/*
 * Field-name → breakpoint, from the same vocabulary the form field-dictionary
 * uses. Applied ONLY when a column does not set `priority` itself.
 *
 * 🛑 The default for an unrecognised key is `"always"`, not `"lg"`.
 *
 * A `"lg"` default would have been tidier and would have silently hidden a
 * column on every one of the ~25 existing column sets the moment this shipped
 * — including, on some tables, the only identifying label. Safe-by-default
 * plus an audit that nudges wide tables to declare priorities gets the same
 * end state without a silent regression in between.
 */
const PRIORITY_BY_FIELD: Record<string, ColumnPriority> = {
  // md — one state and one number is enough to triage a row
  status: "md",
  price: "md",
  total: "md",
  totalAmount: "md",
  amount: "md",
  listingType: "md",
  type: "md",
  // lg — relational context
  category: "lg",
  categorySlug: "lg",
  brand: "lg",
  brandSlug: "lg",
  store: "lg",
  storeName: "lg",
  storeId: "lg",
  quantity: "lg",
  stockQuantity: "lg",
  rating: "lg",
  scope: "lg",
  role: "lg",
  // xl — audit metadata: useful, never urgent
  createdAt: "xl",
  updatedAt: "xl",
  publishedAt: "xl",
  id: "xl",
  slug: "xl",
  views: "xl",
  viewCount: "xl",
  productCount: "xl",
  createdBy: "xl",
  updatedBy: "xl",
};

/**
 * Resolve a column's breakpoint. An explicit `priority` always wins; otherwise
 * the field dictionary decides; otherwise the column shows at every width.
 */
export function resolveColumnPriority<T>(col: TableColumn<T>): ColumnPriority {
  return col.priority ?? PRIORITY_BY_FIELD[col.key] ?? "always";
}

/**
 * Build a merged column list from base columns + extension opts.
 * Handles omit, overrides, and extras in one pass.
 */
export function buildColumns<T>(
  base: TableColumn<T>[],
  opts?: ColumnExtensionOpts<T>,
): TableColumn<T>[] {
  if (!opts) return base;

  const omit = opts.omit?.length ? new Set(opts.omit) : undefined;

  const cols = base
    .filter((col) => !omit?.has(col.key))
    .map((col) => {
      const ovr = opts.overrides?.[col.key];
      return ovr ? { ...col, ...ovr } : col;
    });

  return opts.extras ? [...cols, ...opts.extras] : cols;
}

/**
 * Factory that binds a base column set, returning a single-arg builder.
 *
 * @example
 * export const buildOrderColumns = createColumnBuilder(orderAdminColumns);
 * // usage: buildOrderColumns({ omit: ["trackingNumber"] })
 */
export function createColumnBuilder<T>(base: TableColumn<T>[]) {
  return (opts?: ColumnExtensionOpts<T>): TableColumn<T>[] =>
    buildColumns(base, opts);
}
