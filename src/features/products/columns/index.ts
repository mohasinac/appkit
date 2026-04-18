import type { TableColumn, ColumnExtensionOpts } from "../../../contracts";
import {
  buildColumns,
  renderBoolean,
  renderRating,
  renderCurrencyCompact,
} from "../../../ui/columns";
import type { ProductItem } from "../types";
export { getProductTableColumns } from "./productTableColumns";
export type {
  ProductTableColumnLabels,
  ProductTableColumnsConfig,
} from "./productTableColumns";

export const PRODUCT_SORT_VALUES = {
  NEWEST: "-createdAt",
  OLDEST: "createdAt",
  PRICE_LOW: "price",
  PRICE_HIGH: "-price",
  RATING_HIGH: "-avgRating",
  POPULAR: "-viewCount",
  NAME_AZ: "title",
  NAME_ZA: "-title",
} as const;

export type ProductSortValue =
  (typeof PRODUCT_SORT_VALUES)[keyof typeof PRODUCT_SORT_VALUES];

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
    render: (p) => renderCurrencyCompact(p.price, p.currency),
  },
  { key: "category", header: "Category", sortable: true },
  { key: "status", header: "Status", sortable: true },
  { key: "condition", header: "Condition" },
  {
    key: "inStock",
    header: "In Stock",
    render: (p) => renderBoolean(p.inStock),
  },
  {
    key: "rating",
    header: "Rating",
    render: (p) => renderRating(p.rating, p.reviewCount),
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
  return buildColumns(productAdminColumns as TableColumn<T>[], opts);
}
