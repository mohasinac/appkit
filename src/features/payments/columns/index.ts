import type { TableColumn, ColumnExtensionOpts } from "../../../contracts";
import { buildColumns, renderCurrencyCompact } from "../../../ui/columns";
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
    render: (item) => renderCurrencyCompact(item.amount, item.currency),
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
  opts?: ColumnExtensionOpts<T>,
): TableColumn<T>[] {
  return buildColumns(paymentAdminColumns as TableColumn<T>[], opts);
}
