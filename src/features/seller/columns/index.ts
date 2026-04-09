import type { TableColumn, ColumnExtensionOpts } from "@mohasinac/contracts";
import type { SellerStore, PayoutRecord } from "../types";

// ─── Seller store columns ─────────────────────────────────────────────────────

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
    render: (s) => (s.isPublic ? "Yes" : "No"),
  },
  {
    key: "totalProducts",
    header: "Products",
    sortable: true,
    render: (s) => s.stats?.totalProducts?.toLocaleString() ?? "—",
  },
  {
    key: "itemsSold",
    header: "Sold",
    sortable: true,
    render: (s) => s.stats?.itemsSold?.toLocaleString() ?? "—",
  },
  {
    key: "averageRating",
    header: "Rating",
    sortable: true,
    render: (s) =>
      s.stats?.averageRating != null
        ? s.stats.averageRating.toFixed(1)
        : "—",
  },
  { key: "createdAt", header: "Created", sortable: true },
];

export function buildSellerColumns<T extends SellerStore = SellerStore>(
  opts?: ColumnExtensionOpts<T>,
): TableColumn<T>[] {
  const base = sellerAdminColumns as TableColumn<T>[];
  const omit = new Set(opts?.omit ?? []);
  const cols = base
    .filter((col) => !omit.has(col.key))
    .map((col) => {
      const ovr = opts?.overrides?.[col.key];
      return ovr ? { ...col, ...ovr } : col;
    });
  return opts?.extras ? [...cols, ...opts.extras] : cols;
}

// ─── Payout columns ───────────────────────────────────────────────────────────

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
    render: (p) => `${p.currency} ${p.amount.toLocaleString()}`,
  },
  {
    key: "platformFee",
    header: "Platform Fee",
    render: (p) => `${p.currency} ${p.platformFee.toLocaleString()}`,
  },
  { key: "status", header: "Status", sortable: true },
  { key: "paymentMethod", header: "Method" },
  { key: "requestedAt", header: "Requested", sortable: true },
  { key: "processedAt", header: "Processed", sortable: true },
];

export function buildPayoutColumns<T extends PayoutRecord = PayoutRecord>(
  opts?: ColumnExtensionOpts<T>,
): TableColumn<T>[] {
  const base = payoutAdminColumns as TableColumn<T>[];
  const omit = new Set(opts?.omit ?? []);
  const cols = base
    .filter((col) => !omit.has(col.key))
    .map((col) => {
      const ovr = opts?.overrides?.[col.key];
      return ovr ? { ...col, ...ovr } : col;
    });
  return opts?.extras ? [...cols, ...opts.extras] : cols;
}
