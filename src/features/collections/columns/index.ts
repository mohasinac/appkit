import type { TableColumn, ColumnExtensionOpts } from "../../../contracts";
import { buildColumns, renderBoolean } from "../../../ui/columns";
import type { CollectionItem } from "../types";

/**
 * Default admin columns for collections.
 * Use `buildCollectionColumns()` to customise via overrides / extras / omit.
 */
export const collectionAdminColumns: TableColumn<CollectionItem>[] = [
  {
    key: "title",
    header: "Title",
    sortable: true,
  },
  {
    key: "slug",
    header: "Slug",
    sortable: false,
  },
  {
    key: "brandSlug",
    header: "Brand",
    sortable: false,
  },
  {
    key: "productCount",
    header: "Products",
    sortable: true,
  },
  {
    key: "active",
    header: "Active",
    sortable: false,
    render: (item) => renderBoolean(item.active),
  },
  {
    key: "sortOrder",
    header: "Order",
    sortable: true,
  },
  {
    key: "createdAt",
    header: "Created",
    sortable: true,
  },
];

/**
 * Factory that returns columns for the collections admin table.
 *
 * @example
 * const cols = buildCollectionColumns<MyCollection>({
 *   extras: [{ key: "seasonTag", header: "Season", render: (c) => c.seasonTag }],
 *   omit: ["brandSlug"],
 * });
 */
export function buildCollectionColumns<
  T extends CollectionItem = CollectionItem,
>(opts?: ColumnExtensionOpts<T>): TableColumn<T>[] {
  return buildColumns(collectionAdminColumns as TableColumn<T>[], opts);
}
