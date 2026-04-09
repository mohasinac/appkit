import type { TableColumn, ColumnExtensionOpts } from "@mohasinac/contracts";
import type { PreorderItem } from "../types";

/**
 * Default admin columns for preorder product listings.
 * Use `buildPreorderColumns()` to customise via overrides / extras / omit.
 */
export const preorderAdminColumns: TableColumn<PreorderItem>[] = [
  {
    key: "name",
    header: "Name",
    sortable: true,
  },
  {
    key: "brand",
    header: "Brand",
    sortable: false,
  },
  {
    key: "franchise",
    header: "Franchise",
    sortable: false,
  },
  {
    key: "salePrice",
    header: "Sale",
    sortable: true,
    render: (item) => `${item.salePrice}`,
  },
  {
    key: "regularPrice",
    header: "Regular",
    sortable: true,
    render: (item) => `${item.regularPrice}`,
  },
  {
    key: "preorderShipDate",
    header: "Ship Date",
    sortable: true,
  },
  {
    key: "isFeatured",
    header: "Featured",
    sortable: false,
    render: (item) => (item.isFeatured ? "Yes" : "No"),
  },
  {
    key: "active",
    header: "Active",
    sortable: false,
    render: (item) => (item.active ? "Yes" : "No"),
  },
  {
    key: "createdAt",
    header: "Created",
    sortable: true,
  },
];

/**
 * Factory that returns columns for the preorders admin table.
 *
 * @example
 * const cols = buildPreorderColumns<MyPreorderItem>({
 *   extras: [{ key: "exclusiveTag", header: "Exclusive", render: (p) => p.exclusiveTag }],
 *   omit: ["franchise"],
 * });
 */
export function buildPreorderColumns<T extends PreorderItem = PreorderItem>(
  opts?: ColumnExtensionOpts<T>
): TableColumn<T>[] {
  let base = preorderAdminColumns as unknown as TableColumn<T>[];

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
