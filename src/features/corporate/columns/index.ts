import type { TableColumn, ColumnExtensionOpts } from "../../../contracts";
import { buildColumns } from "../../../ui/columns";
import type { CorporateInquiry } from "../types";

/**
 * Default admin columns for corporate inquiries.
 * Use `buildCorporateColumns()` to customise via overrides / extras / omit.
 */
export const corporateAdminColumns: TableColumn<CorporateInquiry>[] = [
  {
    key: "companyName",
    header: "Company",
    sortable: true,
  },
  {
    key: "contactPerson",
    header: "Contact",
    sortable: false,
  },
  {
    key: "email",
    header: "Email",
    sortable: false,
  },
  {
    key: "units",
    header: "Units",
    sortable: true,
  },
  {
    key: "totalBudget",
    header: "Budget",
    sortable: true,
  },
  {
    key: "status",
    header: "Status",
    sortable: false,
  },
  {
    key: "createdAt",
    header: "Submitted",
    sortable: true,
  },
];

/**
 * Factory that returns columns for the corporate inquiries admin table.
 *
 * @example
 * const cols = buildCorporateColumns<MyCorporateInquiry>({
 *   extras: [{ key: "internalNotes", header: "Notes", render: (c) => c.internalNotes }],
 *   omit: ["units"],
 * });
 */
export function buildCorporateColumns<
  T extends CorporateInquiry = CorporateInquiry,
>(opts?: ColumnExtensionOpts<T>): TableColumn<T>[] {
  return buildColumns(corporateAdminColumns as TableColumn<T>[], opts);
}
