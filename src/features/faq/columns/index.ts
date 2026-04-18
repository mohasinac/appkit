import type { TableColumn, ColumnExtensionOpts } from "../../../contracts";
import {
  buildColumns,
  renderBoolean,
  renderNullable,
} from "../../../ui/columns";
import type { FAQ } from "../types";

/**
 * Default admin column definitions for a FAQ table.
 *
 * @example
 * const columns = buildFaqColumns<MyFaq>({
 *   extras: [{ key: "videoUrl", header: "Video", render: (f) => f.videoUrl ?? "—" }],
 * });
 */
export const faqAdminColumns: TableColumn<FAQ>[] = [
  { key: "question", header: "Question", sortable: true },
  { key: "category", header: "Category", sortable: true },
  {
    key: "isActive",
    header: "Active",
    render: (f) => renderBoolean(f.isActive !== false),
  },
  {
    key: "isPinned",
    header: "Pinned",
    render: (f) => renderBoolean(f.isPinned),
  },
  {
    key: "showOnHomepage",
    header: "Homepage",
    render: (f) => renderBoolean(f.showOnHomepage),
  },
  {
    key: "order",
    header: "Order",
    sortable: true,
    render: (f) => renderNullable(f.order, (v) => v.toLocaleString()),
  },
  {
    key: "views",
    header: "Views",
    sortable: true,
    render: (f) => renderNullable(f.stats?.views, (v) => v.toLocaleString()),
  },
  { key: "createdAt", header: "Created", sortable: true },
];

/**
 * Build a merged column list from the base FAQ columns.
 */
export function buildFaqColumns<T extends FAQ = FAQ>(
  opts?: ColumnExtensionOpts<T>,
): TableColumn<T>[] {
  return buildColumns(faqAdminColumns as TableColumn<T>[], opts);
}
