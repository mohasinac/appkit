import type { TableColumn, ColumnExtensionOpts } from "../../../contracts";
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
        ? `${item.productCurrency ?? "INR"} ${item.productPrice}`
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
  opts?: ColumnExtensionOpts<T>
): TableColumn<T>[] {
  let base = wishlistAdminColumns as unknown as TableColumn<T>[];

  if (opts?.omit?.length) {
    base = base.filter((c) => !opts.omit!.includes(c.key as string));
  }

  if (opts?.overrides) {
    base = base.map((c) => {
      const override = (opts.overrides as Record<string, Partial<TableColumn<T>>>)[c.key as string];
      return override ? { ...c, ...override } : c;
    });
  }

  if (opts?.extras?.length) {
    base = [...base, ...opts.extras];
  }

  return base;
}
