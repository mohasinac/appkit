import type { TableColumn, ColumnExtensionOpts } from "@mohasinac/contracts";
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
    render: (s) => (s.isPublic ? "Yes" : "No"),
  },
  {
    key: "totalProducts",
    header: "Products",
    sortable: true,
    render: (s) => s.totalProducts?.toLocaleString() ?? "—",
  },
  {
    key: "itemsSold",
    header: "Sold",
    sortable: true,
    render: (s) => s.itemsSold?.toLocaleString() ?? "—",
  },
  {
    key: "averageRating",
    header: "Rating",
    sortable: true,
    render: (s) => (s.averageRating != null ? s.averageRating.toFixed(1) : "—"),
  },
  { key: "createdAt", header: "Created", sortable: true },
];

/**
 * Build a merged column list from the base store columns.
 */
export function buildStoreColumns<T extends StoreListItem = StoreListItem>(
  opts?: ColumnExtensionOpts<T>,
): TableColumn<T>[] {
  const base = storeAdminColumns as TableColumn<T>[];
  const omit = new Set(opts?.omit ?? []);
  const cols = base
    .filter((col) => !omit.has(col.key))
    .map((col) => {
      const ovr = opts?.overrides?.[col.key];
      return ovr ? { ...col, ...ovr } : col;
    });
  return opts?.extras ? [...cols, ...opts.extras] : cols;
}
