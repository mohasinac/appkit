import type { TableColumn, ColumnExtensionOpts } from "@mohasinac/contracts";
import type { ConsultationBooking } from "../types";

/**
 * Default admin columns for consultation bookings.
 * Use `buildConsultationColumns()` to customise via overrides / extras / omit.
 */
export const consultationAdminColumns: TableColumn<ConsultationBooking>[] = [
  {
    key: "name",
    header: "Name",
    sortable: true,
  },
  {
    key: "email",
    header: "Email",
    sortable: false,
  },
  {
    key: "phone",
    header: "Phone",
    sortable: false,
  },
  {
    key: "status",
    header: "Status",
    sortable: false,
  },
  {
    key: "mode",
    header: "Mode",
    sortable: false,
  },
  {
    key: "preferredDate",
    header: "Preferred Date",
    sortable: true,
  },
  {
    key: "createdAt",
    header: "Submitted",
    sortable: true,
  },
];

/**
 * Factory that returns columns for the consultation bookings admin table.
 *
 * @example
 * const cols = buildConsultationColumns<MyBooking>({
 *   extras: [{ key: "consultantId", header: "Consultant", render: (b) => b.consultantId }],
 *   omit: ["mode"],
 * });
 */
export function buildConsultationColumns<T extends ConsultationBooking = ConsultationBooking>(
  opts?: ColumnExtensionOpts<T>
): TableColumn<T>[] {
  let base = consultationAdminColumns as unknown as TableColumn<T>[];

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
