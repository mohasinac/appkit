import type { TableColumn, ColumnExtensionOpts } from "../../../contracts";
import {
  buildColumns,
  renderCurrencyCompact,
  renderBoolean,
} from "../../../ui/columns";
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
      item.price != null
        ? renderCurrencyCompact(item.price, item.currency)
        : "—",
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
    render: (item) => renderBoolean(item.featured),
  },
  {
    key: "listingType",
    header: "Type",
    sortable: false,
    render: (item) => item.listingType ?? "standard",
  },
];

/**
 * Factory that returns columns for the search results admin table.
 *
 * @example
 * const cols = buildSearchResultColumns<MySearchItem>({
 *   extras: [{ key: "brandTag", header: "Brand", render: (s) => s.brandTag }],
 *   omit: ["listingType"],
 * });
 */
export function buildSearchResultColumns<
  T extends SearchProductItem = SearchProductItem,
>(opts?: ColumnExtensionOpts<T>): TableColumn<T>[] {
  return buildColumns(searchResultAdminColumns as TableColumn<T>[], opts);
}
