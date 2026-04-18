/**
 * Generic column builder — replaces the copy-pasted `build*Columns()` factory
 * found in every feature's `columns/index.ts`.
 *
 * @example
 * export const buildOrderColumns = createColumnBuilder(orderAdminColumns);
 */

import type { TableColumn, ColumnExtensionOpts } from "../../contracts";

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
