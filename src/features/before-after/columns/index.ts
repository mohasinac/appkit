import type { TableColumn, ColumnExtensionOpts } from "../../../contracts";
import type { BeforeAfterItem } from "../types";

/**
 * Default admin columns for before-after items.
 * Use `buildBeforeAfterColumns()` to customise via overrides / extras / omit.
 */
export const beforeAfterAdminColumns: TableColumn<BeforeAfterItem>[] = [
  {
    key: "title",
    header: "Title",
    sortable: true,
  },
  {
    key: "concern",
    header: "Concern",
    sortable: false,
  },
  {
    key: "durationWeeks",
    header: "Duration (wks)",
    sortable: true,
  },
  {
    key: "isActive",
    header: "Active",
    sortable: false,
    render: (item) => (item.isActive ? "Yes" : "No"),
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
 * Factory that returns columns for the before-after admin table.
 *
 * @example
 * const cols = buildBeforeAfterColumns<MyBeforeAfterItem>({
 *   extras: [{ key: "doctorName", header: "Doctor", render: (b) => b.doctorName }],
 *   omit: ["sortOrder"],
 * });
 */
export function buildBeforeAfterColumns<T extends BeforeAfterItem = BeforeAfterItem>(
  opts?: ColumnExtensionOpts<T>
): TableColumn<T>[] {
  let base = beforeAfterAdminColumns as unknown as TableColumn<T>[];

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
