import type { TableColumn, ColumnExtensionOpts } from "../../../contracts";
import { buildColumns, renderCurrencyCompact } from "../../../ui/columns";
import type { WishlistItem } from "../types";

/**
 * Default admin columns for wishlist items.
 * Use `buildWishlistColumns()` to customise via overrides / extras / omit.
 */
export const wishlistAdminColumns: TableColumn<WishlistItem>[] = [
  {
    key: "productTitle",
    header: "Product",
    sortable: false,
  },
  {
    key: "productPrice",
    header: "Price",
    sortable: true,
    render: (item) =>
      item.productPrice != null
        ? renderCurrencyCompact(item.productPrice, item.productCurrency)
        : "—",
  },
  {
    key: "productStatus",
    header: "Status",
    sortable: false,
  },
  {
    key: "addedAt",
    header: "Added",
    sortable: true,
  },
];

/**
 * Factory that returns columns for the wishlist admin table.
 *
 * @example
 * const cols = buildWishlistColumns<MyWishlistItem>({
 *   extras: [{ key: "alertPrice", header: "Alert", render: (w) => w.alertPrice }],
 *   omit: ["productStatus"],
 * });
 */
export function buildWishlistColumns<T extends WishlistItem = WishlistItem>(
  opts?: ColumnExtensionOpts<T>,
): TableColumn<T>[] {
  return buildColumns(wishlistAdminColumns as TableColumn<T>[], opts);
}
