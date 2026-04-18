import type { TableColumn, ColumnExtensionOpts } from "../../../contracts";
import type { CartItem } from "../types";
import { buildColumns } from "../../../ui/columns";
import { formatCurrency } from "../../../utils/number.formatter";

/**
 * Default admin columns for cart items.
 * Use `buildCartColumns()` to customise via overrides / extras / omit.
 */
export const cartAdminColumns: TableColumn<CartItem>[] = [
  {
    key: "meta",
    header: "Product",
    sortable: false,
    render: (item) =>
      (item.meta as { title?: string })?.title ?? item.productId,
  },
  {
    key: "quantity",
    header: "Qty",
    sortable: true,
  },
  {
    key: "meta",
    header: "Unit Price",
    sortable: false,
    render: (item) => {
      const meta = item.meta as
        | { price?: number; currency?: string }
        | undefined;
      if (!meta?.price) return "—";
      return formatCurrency(meta.price, meta.currency);
    },
  },
  {
    key: "userId",
    header: "User / Session",
    sortable: false,
    render: (item) => item.userId ?? item.sessionId ?? "—",
  },
  {
    key: "addedAt",
    header: "Added",
    sortable: true,
  },
];

/**
 * Factory that returns columns for the cart admin table.
 *
 * @example
 * const cols = buildCartColumns<MyCartItem>({
 *   extras: [{ key: "giftMessage", header: "Gift Msg", render: (c) => c.giftMessage }],
 *   omit: ["userId"],
 * });
 */
export function buildCartColumns<T extends CartItem = CartItem>(
  opts?: ColumnExtensionOpts<T>,
): TableColumn<T>[] {
  return buildColumns(cartAdminColumns as TableColumn<T>[], opts);
}
