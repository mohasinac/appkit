import type { TableColumn, ColumnExtensionOpts } from "../../../contracts";
import {
  buildColumns,
  renderCurrencyCompact,
  renderCount,
} from "../../../ui/columns";
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
    render: (o) => renderCurrencyCompact(o.total, o.currency),
  },
  { key: "orderStatus", header: "Status", sortable: true },
  { key: "paymentStatus", header: "Payment", sortable: true },
  {
    key: "items",
    header: "Items",
    render: (o) => renderCount(o.items.length),
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
  return buildColumns(orderAdminColumns as TableColumn<T>[], opts);
}
