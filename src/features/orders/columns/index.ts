import type { TableColumn, ColumnExtensionOpts } from "@mohasinac/contracts";
import type { Order } from "../types";

/**
 * Default admin column definitions for an order table.
 *
 * @example
 * const columns = buildOrderColumns<MyOrder>({
 *   extras: [{ key: "giftMessage", header: "Gift", render: (o) => o.giftMessage ?? "—" }],
 * });
 */
export const orderAdminColumns: TableColumn<Order>[] = [
  { key: "id", header: "Order ID", sortable: true },
  {
    key: "total",
    header: "Total",
    sortable: true,
    render: (o) => `${o.currency} ${o.total.toLocaleString()}`,
  },
  { key: "orderStatus", header: "Status", sortable: true },
  { key: "paymentStatus", header: "Payment", sortable: true },
  {
    key: "items",
    header: "Items",
    render: (o) => o.items.length.toLocaleString(),
  },
  { key: "trackingNumber", header: "Tracking" },
  { key: "createdAt", header: "Placed", sortable: true },
  { key: "updatedAt", header: "Updated", sortable: true },
];

/**
 * Build a merged column list from the base order columns.
 */
export function buildOrderColumns<T extends Order = Order>(
  opts?: ColumnExtensionOpts<T>,
): TableColumn<T>[] {
  const base = orderAdminColumns as TableColumn<T>[];
  const omit = new Set(opts?.omit ?? []);
  const cols = base
    .filter((col) => !omit.has(col.key))
    .map((col) => {
      const ovr = opts?.overrides?.[col.key];
      return ovr ? { ...col, ...ovr } : col;
    });
  return opts?.extras ? [...cols, ...opts.extras] : cols;
}
