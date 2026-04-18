import type { TableColumn, ColumnExtensionOpts } from "../../../contracts";
import { buildColumns } from "../../../ui/columns";
import type { UserProfile } from "../types";

/**
 * Default admin columns for user accounts.
 * Use `buildAccountColumns()` to customise via overrides / extras / omit.
 */
export const accountAdminColumns: TableColumn<UserProfile>[] = [
  {
    key: "displayName",
    header: "Name",
    sortable: true,
  },
  {
    key: "email",
    header: "Email",
    sortable: true,
  },
  {
    key: "phone",
    header: "Phone",
    sortable: false,
  },
  {
    key: "createdAt",
    header: "Joined",
    sortable: true,
  },
];

/**
 * Factory that returns columns for the accounts admin table.
 *
 * @example
 * const cols = buildAccountColumns<MyUser>({
 *   extras: [{ key: "tier", header: "Tier", render: (u) => u.tier }],
 *   omit: ["phone"],
 * });
 */
export function buildAccountColumns<T extends UserProfile = UserProfile>(
  opts?: ColumnExtensionOpts<T>,
): TableColumn<T>[] {
  return buildColumns(accountAdminColumns as TableColumn<T>[], opts);
}
