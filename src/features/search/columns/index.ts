import type { TableColumn, ColumnExtensionOpts } from "../../../contracts";
import type { SearchProductItem } from "../types";

/**
 * Default admin columns for search result product items.
 * Use `buildSearchResultColumns()` to customise via overrides / extras / omit.
 */
export const searchResultAdminColumns: TableColumn<SearchProductItem>[] = [
  {
    key: "title",
    header: "Title",
    sortable: true,
  },
  {
    key: "price",
    header: "Price",
    sortable: true,
    render: (item) =>
      item.price != null ? `${item.currency ?? "INR"} ${item.price}` : "—",
  },
  {
    key: "status",
    header: "Status",
    sortable: false,
  },
  {
    key: "featured",
    header: "Featured",
    sortable: false,
    render: (item) => (item.featured ? "Yes" : "No"),
  },
  {
    key: "isAuction",
    header: "Auction",
    sortable: false,
    render: (item) => (item.isAuction ? "Yes" : "No"),
  },
];

/**
 * Factory that returns columns for the search results admin table.
 *
 * @example
 * const cols = buildSearchResultColumns<MySearchItem>({
 *   extras: [{ key: "brandTag", header: "Brand", render: (s) => s.brandTag }],
 *   omit: ["isAuction"],
 * });
 */
export function buildSearchResultColumns<T extends SearchProductItem = SearchProductItem>(
  opts?: ColumnExtensionOpts<T>
): TableColumn<T>[] {
  let base = searchResultAdminColumns as unknown as TableColumn<T>[];

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
