import type { TableColumn, ColumnExtensionOpts } from "@mohasinac/contracts";
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
    render: (c) => (c.isFeatured ? "Yes" : "No"),
  },
  {
    key: "productCount",
    header: "Products",
    sortable: true,
    render: (c) => c.metrics?.productCount.toLocaleString() ?? "—",
  },
  {
    key: "isLeaf",
    header: "Leaf",
    render: (c) => (c.isLeaf ? "Yes" : "No"),
  },
  { key: "createdAt", header: "Created", sortable: true },
];

/**
 * Build a merged column list from the base category columns.
 */
export function buildCategoryColumns<T extends CategoryItem = CategoryItem>(
  opts?: ColumnExtensionOpts<T>,
): TableColumn<T>[] {
  const base = categoryAdminColumns as TableColumn<T>[];
  const omit = new Set(opts?.omit ?? []);
  const cols = base
    .filter((col) => !omit.has(col.key))
    .map((col) => {
      const ovr = opts?.overrides?.[col.key];
      return ovr ? { ...col, ...ovr } : col;
    });
  return opts?.extras ? [...cols, ...opts.extras] : cols;
}
