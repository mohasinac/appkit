import type { TableColumn, ColumnExtensionOpts } from "../../../contracts";
import { buildColumns, renderBoolean } from "../../../ui/columns";
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
    render: (item) => renderBoolean(item.isActive),
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
export function buildBeforeAfterColumns<
  T extends BeforeAfterItem = BeforeAfterItem,
>(opts?: ColumnExtensionOpts<T>): TableColumn<T>[] {
  return buildColumns(beforeAfterAdminColumns as TableColumn<T>[], opts);
}
