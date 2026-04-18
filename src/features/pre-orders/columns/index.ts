import type { TableColumn, ColumnExtensionOpts } from "../../../contracts";
import { buildColumns, renderBoolean } from "../../../ui/columns";
import type { PreorderItem } from "../types";

/**
 * Default admin columns for preorder product listings.
 * Use `buildPreorderColumns()` to customise via overrides / extras / omit.
 */
export const preorderAdminColumns: TableColumn<PreorderItem>[] = [
  {
    key: "name",
    header: "Name",
    sortable: true,
  },
  {
    key: "brand",
    header: "Brand",
    sortable: false,
  },
  {
    key: "franchise",
    header: "Franchise",
    sortable: false,
  },
  {
    key: "salePrice",
    header: "Sale",
    sortable: true,
    render: (item) => `${item.salePrice}`,
  },
  {
    key: "regularPrice",
    header: "Regular",
    sortable: true,
    render: (item) => `${item.regularPrice}`,
  },
  {
    key: "preorderShipDate",
    header: "Ship Date",
    sortable: true,
  },
  {
    key: "isFeatured",
    header: "Featured",
    sortable: false,
    render: (item) => renderBoolean(item.isFeatured),
  },
  {
    key: "active",
    header: "Active",
    sortable: false,
    render: (item) => renderBoolean(item.active),
  },
  {
    key: "createdAt",
    header: "Created",
    sortable: true,
  },
];

/**
 * Factory that returns columns for the preorders admin table.
 *
 * @example
 * const cols = buildPreorderColumns<MyPreorderItem>({
 *   extras: [{ key: "exclusiveTag", header: "Exclusive", render: (p) => p.exclusiveTag }],
 *   omit: ["franchise"],
 * });
 */
export function buildPreorderColumns<T extends PreorderItem = PreorderItem>(
  opts?: ColumnExtensionOpts<T>,
): TableColumn<T>[] {
  return buildColumns(preorderAdminColumns as TableColumn<T>[], opts);
}
