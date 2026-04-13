import type { TableColumn, ColumnExtensionOpts } from "../../../contracts";
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
    render: (f) => (f.isActive !== false ? "Yes" : "No"),
  },
  {
    key: "isPinned",
    header: "Pinned",
    render: (f) => (f.isPinned ? "Yes" : "No"),
  },
  {
    key: "showOnHomepage",
    header: "Homepage",
    render: (f) => (f.showOnHomepage ? "Yes" : "No"),
  },
  {
    key: "order",
    header: "Order",
    sortable: true,
    render: (f) => f.order?.toLocaleString() ?? "—",
  },
  {
    key: "views",
    header: "Views",
    sortable: true,
    render: (f) => f.stats?.views?.toLocaleString() ?? "—",
  },
  { key: "createdAt", header: "Created", sortable: true },
];

/**
 * Build a merged column list from the base FAQ columns.
 */
export function buildFaqColumns<T extends FAQ = FAQ>(
  opts?: ColumnExtensionOpts<T>,
): TableColumn<T>[] {
  const base = faqAdminColumns as TableColumn<T>[];
  const omit = new Set(opts?.omit ?? []);
  const cols = base
    .filter((col) => !omit.has(col.key))
    .map((col) => {
      const ovr = opts?.overrides?.[col.key];
      return ovr ? { ...col, ...ovr } : col;
    });
  return opts?.extras ? [...cols, ...opts.extras] : cols;
}
