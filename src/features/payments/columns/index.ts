import type { TableColumn, ColumnExtensionOpts } from "../../../contracts";
import type { PaymentRecord } from "../types";

/**
 * Default admin columns for payment records.
 * Use `buildPaymentColumns()` to customise via overrides / extras / omit.
 */
export const paymentAdminColumns: TableColumn<PaymentRecord>[] = [
  {
    key: "orderId",
    header: "Order ID",
    sortable: false,
  },
  {
    key: "gateway",
    header: "Gateway",
    sortable: false,
  },
  {
    key: "amount",
    header: "Amount",
    sortable: true,
    render: (item) => `${item.currency ?? "INR"} ${item.amount}`,
  },
  {
    key: "status",
    header: "Status",
    sortable: false,
  },
  {
    key: "createdAt",
    header: "Date",
    sortable: true,
  },
];

/**
 * Factory that returns columns for the payments admin table.
 *
 * @example
 * const cols = buildPaymentColumns<MyPaymentRecord>({
 *   extras: [{ key: "bankReference", header: "Bank Ref", render: (p) => p.bankReference }],
 *   omit: ["gateway"],
 * });
 */
export function buildPaymentColumns<T extends PaymentRecord = PaymentRecord>(
  opts?: ColumnExtensionOpts<T>
): TableColumn<T>[] {
  let base = paymentAdminColumns as unknown as TableColumn<T>[];

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
