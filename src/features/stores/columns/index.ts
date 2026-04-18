import type { TableColumn, ColumnExtensionOpts } from "../../../contracts";
import {
  buildColumns,
  renderBoolean,
  renderCount,
  renderNullable,
  renderRating,
} from "../../../ui/columns";
import type { StoreListItem } from "../types";

/**
 * Default admin column definitions for a store table.
 *
 * @example
 * const columns = buildStoreColumns<MyStore>({
 *   overrides: { storeName: { render: (s) => <StoreLink store={s} /> } },
 *   extras: [{ key: "tier", header: "Tier", render: (s) => s.tier ?? "basic" }],
 * });
 */
export const storeAdminColumns: TableColumn<StoreListItem>[] = [
  { key: "storeName", header: "Store Name", sortable: true },
  { key: "storeCategory", header: "Category", sortable: true },
  { key: "status", header: "Status", sortable: true },
  {
    key: "isPublic",
    header: "Public",
    render: (s) => renderBoolean(s.isPublic),
  },
  {
    key: "totalProducts",
    header: "Products",
    sortable: true,
    render: (s) => renderNullable(s.totalProducts, (v) => v.toLocaleString()),
  },
  {
    key: "itemsSold",
    header: "Sold",
    sortable: true,
    render: (s) => renderNullable(s.itemsSold, (v) => v.toLocaleString()),
  },
  {
    key: "averageRating",
    header: "Rating",
    sortable: true,
    render: (s) => renderRating(s.averageRating, null, { showCount: false }),
  },
  { key: "createdAt", header: "Created", sortable: true },
];

/**
 * Build a merged column list from the base store columns.
 */
export function buildStoreColumns<T extends StoreListItem = StoreListItem>(
  opts?: ColumnExtensionOpts<T>,
): TableColumn<T>[] {
  return buildColumns(storeAdminColumns as TableColumn<T>[], opts);
}
