import type { TableColumn, ColumnExtensionOpts } from "@mohasinac/contracts";
import type { ProductItem } from "../types";

/**
 * Default admin column definitions for a product table.
 * These are plain data — no React imports, no JSX.
 *
 * Use with `DataTable<T>` from `@mohasinac/feat-admin`.
 *
 * @example — consumer app overrides/extends columns
 * ```ts
 * import { productAdminColumns } from "@mohasinac/feat-products";
 * import type { ProductDocument } from "@/db/schema/product.schema";
 *
 * const columns: AdminTableColumn<ProductDocument>[] = [
 *   // keep base columns (cast is safe because ProductDocument extends ProductItem)
 *   ...(productAdminColumns as AdminTableColumn<ProductDocument>[]),
 *   // add app-specific column
 *   {
 *     key: "brand",
 *     header: "Brand",
 *     render: (p) => p.brand ?? "—",
 *   },
 * ];
 * ```
 *
 * @example — replace a single column's renderer
 * ```ts
 * const columns = productAdminColumns.map((col) =>
 *   col.key === "title"
 *     ? { ...col, render: (p: ProductDocument) => <Link href={p.slug}>{p.title}</Link> }
 *     : col
 * );
 * ```
 */
export const productAdminColumns: TableColumn<ProductItem>[] = [
  { key: "title", header: "Product", sortable: true },
  {
    key: "price",
    header: "Price",
    sortable: true,
    render: (p) => `${p.currency ?? "₹"}${p.price.toLocaleString()}`,
  },
  { key: "category", header: "Category", sortable: true },
  { key: "status", header: "Status", sortable: true },
  { key: "condition", header: "Condition" },
  {
    key: "inStock",
    header: "In Stock",
    render: (p) => (p.inStock ? "Yes" : "No"),
  },
  {
    key: "rating",
    header: "Rating",
    render: (p) =>
      p.rating !== undefined
        ? `${p.rating.toFixed(1)} (${p.reviewCount ?? 0})`
        : "—",
  },
  { key: "createdAt", header: "Created", sortable: true },
];

/**
 * Build a merged column list from the base product columns.
 * - `overrides`: replace or augment a column by key
 * - `extras`: append additional columns at the end
 * - `omit`: remove columns by key
 *
 * @example
 * const cols = buildProductColumns<ProductDocument>({
 *   overrides: {
 *     title: { render: (p) => <TitleWithBadge product={p} /> },
 *   },
 *   extras: [{ key: "brand", header: "Brand", render: (p) => p.brand }],
 *   omit: ["condition"],
 * });
 */
export function buildProductColumns<T extends ProductItem = ProductItem>(
  opts?: ColumnExtensionOpts<T>,
): TableColumn<T>[] {
  const base = productAdminColumns as TableColumn<T>[];
  const omit = new Set(opts?.omit ?? []);
  const cols = base
    .filter((col) => !omit.has(col.key))
    .map((col) => {
      const ovr = opts?.overrides?.[col.key];
      return ovr ? { ...col, ...ovr } : col;
    });
  return opts?.extras ? [...cols, ...opts.extras] : cols;
}
