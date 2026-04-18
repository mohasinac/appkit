import type { TableColumn, ColumnExtensionOpts } from "../../../contracts";
import {
  buildColumns,
  renderBoolean,
  renderNullable,
} from "../../../ui/columns";
import type { CategoryItem } from "../types";

/**
 * Default admin column definitions for a category table.
 *
 * @example
 * const columns = buildCategoryColumns<MyCategory>({
 *   extras: [{ key: "colorHex", header: "Color", render: (c) => c.colorHex ?? "—" }],
 * });
 */
export const categoryAdminColumns: TableColumn<CategoryItem>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "type", header: "Type", sortable: true },
  { key: "slug", header: "Slug" },
  { key: "tier", header: "Tier", sortable: true },
  {
    key: "isFeatured",
    header: "Featured",
    render: (c) => renderBoolean(c.isFeatured),
  },
  {
    key: "productCount",
    header: "Products",
    sortable: true,
    render: (c) =>
      renderNullable(c.metrics?.productCount, (v) => v.toLocaleString()),
  },
  {
    key: "isLeaf",
    header: "Leaf",
    render: (c) => renderBoolean(c.isLeaf),
  },
  { key: "createdAt", header: "Created", sortable: true },
];

/**
 * Build a merged column list from the base category columns.
 */
export function buildCategoryColumns<T extends CategoryItem = CategoryItem>(
  opts?: ColumnExtensionOpts<T>,
): TableColumn<T>[] {
  return buildColumns(categoryAdminColumns as TableColumn<T>[], opts);
}
