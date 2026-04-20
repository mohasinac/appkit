import type { TableColumn, ColumnExtensionOpts } from "../../../contracts";
import {
  buildColumns,
  renderBoolean,
  renderNullable,
  renderCurrencyCompact,
  renderRating,
} from "../../../ui/columns";
import type { SellerStore, PayoutRecord } from "../types";

// --- Seller store columns -----------------------------------------------------

/**
 * Default admin column definitions for the seller/store admin table.
 *
 * @example
 * const columns = buildSellerColumns<MySeller>({
 *   extras: [{ key: "tier", header: "Tier", render: (s) => s.tier ?? "standard" }],
 * });
 */
export const sellerAdminColumns: TableColumn<SellerStore>[] = [
  { key: "storeName", header: "Store Name", sortable: true },
  { key: "ownerId", header: "Owner ID" },
  { key: "storeCategory", header: "Category", sortable: true },
  { key: "status", header: "Status", sortable: true },
  {
    key: "isPublic",
    header: "Public",
    render: (s) => renderBoolean(s.isPublic),
  },
  {
    key: "totalProducts",
    header: "Products",
    sortable: true,
    render: (s) =>
      renderNullable(s.stats?.totalProducts, (v) => v.toLocaleString()),
  },
  {
    key: "itemsSold",
    header: "Sold",
    sortable: true,
    render: (s) =>
      renderNullable(s.stats?.itemsSold, (v) => v.toLocaleString()),
  },
  {
    key: "averageRating",
    header: "Rating",
    sortable: true,
    render: (s) =>
      renderRating(s.stats?.averageRating, null, { showCount: false }),
  },
  { key: "createdAt", header: "Created", sortable: true },
];

export function buildSellerColumns<T extends SellerStore = SellerStore>(
  opts?: ColumnExtensionOpts<T>,
): TableColumn<T>[] {
  return buildColumns(sellerAdminColumns as TableColumn<T>[], opts);
}

// --- Payout columns -----------------------------------------------------------

/**
 * Default admin column definitions for the payout table.
 *
 * @example
 * const columns = buildPayoutColumns<MyPayout>({
 *   extras: [{ key: "gstAmount", header: "GST", render: (p) => p.gstAmount ?? "—" }],
 * });
 */
export const payoutAdminColumns: TableColumn<PayoutRecord>[] = [
  { key: "sellerName", header: "Seller", sortable: true },
  {
    key: "amount",
    header: "Amount",
    sortable: true,
    render: (p) => renderCurrencyCompact(p.amount, p.currency),
  },
  {
    key: "platformFee",
    header: "Platform Fee",
    render: (p) => renderCurrencyCompact(p.platformFee, p.currency),
  },
  { key: "status", header: "Status", sortable: true },
  { key: "paymentMethod", header: "Method" },
  { key: "requestedAt", header: "Requested", sortable: true },
  { key: "processedAt", header: "Processed", sortable: true },
];

export function buildPayoutColumns<T extends PayoutRecord = PayoutRecord>(
  opts?: ColumnExtensionOpts<T>,
): TableColumn<T>[] {
  return buildColumns(payoutAdminColumns as TableColumn<T>[], opts);
}
