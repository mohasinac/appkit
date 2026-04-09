import type { TableColumn, ColumnExtensionOpts } from "@mohasinac/contracts";
import type { CouponItem } from "../types";

/**
 * Default admin column definitions for a coupons/promotions table.
 *
 * @example
 * const columns = buildCouponColumns<MyCoupon>({
 *   extras: [{ key: "campaignId", header: "Campaign", render: (c) => c.campaignId ?? "—" }],
 * });
 */
export const couponAdminColumns: TableColumn<CouponItem>[] = [
  { key: "code", header: "Code", sortable: true },
  { key: "name", header: "Name", sortable: true },
  { key: "type", header: "Type", sortable: true },
  { key: "scope", header: "Scope" },
  {
    key: "discountValue",
    header: "Discount",
    render: (c) =>
      c.type === "percentage"
        ? `${c.discountValue}%`
        : c.discountValue.toLocaleString(),
  },
  {
    key: "usageCount",
    header: "Used",
    sortable: true,
    render: (c) =>
      c.maxUsageCount != null
        ? `${c.usageCount} / ${c.maxUsageCount}`
        : c.usageCount.toLocaleString(),
  },
  {
    key: "isActive",
    header: "Active",
    render: (c) => (c.isActive ? "Yes" : "No"),
  },
  {
    key: "isPublic",
    header: "Public",
    render: (c) => (c.isPublic ? "Yes" : "No"),
  },
  { key: "expiresAt", header: "Expires", sortable: true },
  { key: "createdAt", header: "Created", sortable: true },
];

export function buildCouponColumns<T extends CouponItem = CouponItem>(
  opts?: ColumnExtensionOpts<T>,
): TableColumn<T>[] {
  const base = couponAdminColumns as TableColumn<T>[];
  const omit = new Set(opts?.omit ?? []);
  const cols = base
    .filter((col) => !omit.has(col.key))
    .map((col) => {
      const ovr = opts?.overrides?.[col.key];
      return ovr ? { ...col, ...ovr } : col;
    });
  return opts?.extras ? [...cols, ...opts.extras] : cols;
}
