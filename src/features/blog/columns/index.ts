import type { TableColumn, ColumnExtensionOpts } from "../../../contracts";
import type { BlogPost } from "../types";

/**
 * Default admin column definitions for a blog post table.
 *
 * @example — extend with app-specific columns
 * ```ts
 * import { buildBlogColumns } from "@mohasinac/feat-blog";
 *
 * const columns = buildBlogColumns<MyPost>({
 *   overrides: { title: { render: (p) => <Link href={p.slug}>{p.title}</Link> } },
 *   extras: [{ key: "series", header: "Series", render: (p) => p.series ?? "—" }],
 * });
 * ```
 */
export const blogAdminColumns: TableColumn<BlogPost>[] = [
  { key: "title", header: "Title", sortable: true },
  { key: "category", header: "Category", sortable: true },
  {
    key: "status",
    header: "Status",
    sortable: true,
  },
  {
    key: "isFeatured",
    header: "Featured",
    render: (p) => (p.isFeatured ? "Yes" : "No"),
  },
  {
    key: "readTimeMinutes",
    header: "Read Time",
    render: (p) =>
      p.readTimeMinutes !== undefined ? `${p.readTimeMinutes} min` : "—",
  },
  {
    key: "views",
    header: "Views",
    sortable: true,
    render: (p) => p.views?.toLocaleString() ?? "—",
  },
  { key: "authorName", header: "Author" },
  { key: "publishedAt", header: "Published", sortable: true },
];

/**
 * Build a merged column list from the base blog columns.
 *
 * @example
 * const cols = buildBlogColumns<MyPost>({
 *   overrides: { title: { sortable: false } },
 *   extras: [{ key: "series", header: "Series", render: (p) => p.series }],
 *   omit: ["views"],
 * });
 */
export function buildBlogColumns<T extends BlogPost = BlogPost>(
  opts?: ColumnExtensionOpts<T>,
): TableColumn<T>[] {
  const base = blogAdminColumns as TableColumn<T>[];
  const omit = new Set(opts?.omit ?? []);
  const cols = base
    .filter((col) => !omit.has(col.key))
    .map((col) => {
      const ovr = opts?.overrides?.[col.key];
      return ovr ? { ...col, ...ovr } : col;
    });
  return opts?.extras ? [...cols, ...opts.extras] : cols;
}
