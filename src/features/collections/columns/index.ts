import type { TableColumn, ColumnExtensionOpts } from "@mohasinac/contracts";
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
    render: (item) => (item.active ? "Yes" : "No"),
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
export function buildCollectionColumns<T extends CollectionItem = CollectionItem>(
  opts?: ColumnExtensionOpts<T>
): TableColumn<T>[] {
  let base = collectionAdminColumns as unknown as TableColumn<T>[];

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
