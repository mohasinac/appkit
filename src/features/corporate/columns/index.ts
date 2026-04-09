import type { TableColumn, ColumnExtensionOpts } from "@mohasinac/contracts";
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
export function buildCorporateColumns<T extends CorporateInquiry = CorporateInquiry>(
  opts?: ColumnExtensionOpts<T>
): TableColumn<T>[] {
  let base = corporateAdminColumns as unknown as TableColumn<T>[];

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
