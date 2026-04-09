import type { TableColumn, ColumnExtensionOpts } from "@mohasinac/contracts";
import type { EventItem } from "../types";

/**
 * Default admin column definitions for an event table.
 *
 * @example
 * const columns = buildEventColumns<MyEvent>({
 *   overrides: { title: { render: (e) => <Link href={e.id}>{e.title}</Link> } },
 *   extras: [{ key: "brandId", header: "Brand", render: (e) => e.brandId ?? "—" }],
 * });
 */
export const eventAdminColumns: TableColumn<EventItem>[] = [
  { key: "title", header: "Title", sortable: true },
  { key: "type", header: "Type", sortable: true },
  { key: "status", header: "Status", sortable: true },
  { key: "startsAt", header: "Starts At", sortable: true },
  { key: "endsAt", header: "Ends At", sortable: true },
  {
    key: "totalEntries",
    header: "Entries",
    sortable: true,
    render: (e) => e.stats.totalEntries.toLocaleString(),
  },
  {
    key: "flaggedEntries",
    header: "Flagged",
    render: (e) => e.stats.flaggedEntries.toLocaleString(),
  },
  { key: "createdAt", header: "Created", sortable: true },
];

/**
 * Build a merged column list from the base event columns.
 *
 * @example
 * const cols = buildEventColumns<MyEvent>({
 *   omit: ["flaggedEntries"],
 *   extras: [{ key: "rewardPoints", header: "Points", render: (e) => e.rewardPoints }],
 * });
 */
export function buildEventColumns<T extends EventItem = EventItem>(
  opts?: ColumnExtensionOpts<T>,
): TableColumn<T>[] {
  const base = eventAdminColumns as TableColumn<T>[];
  const omit = new Set(opts?.omit ?? []);
  const cols = base
    .filter((col) => !omit.has(col.key))
    .map((col) => {
      const ovr = opts?.overrides?.[col.key];
      return ovr ? { ...col, ...ovr } : col;
    });
  return opts?.extras ? [...cols, ...opts.extras] : cols;
}
