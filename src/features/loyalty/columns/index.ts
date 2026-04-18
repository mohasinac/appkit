import type { TableColumn, ColumnExtensionOpts } from "../../../contracts";
import { buildColumns } from "../../../ui/columns";
import type { LoyaltyBalance } from "../types";

/**
 * Default admin columns for loyalty balance records.
 * Use `buildLoyaltyColumns()` to customise via overrides / extras / omit.
 */
export const loyaltyAdminColumns: TableColumn<LoyaltyBalance>[] = [
  {
    key: "uid",
    header: "User ID",
    sortable: false,
  },
  {
    key: "hcCoins",
    header: "Coins",
    sortable: true,
  },
  {
    key: "coinHistory",
    header: "Last Transaction",
    sortable: false,
    render: (item) => {
      if (!item.coinHistory?.length) return "—";
      const last = item.coinHistory[item.coinHistory.length - 1];
      return last?.timestamp ?? "—";
    },
  },
];

/**
 * Factory that returns columns for the loyalty admin table.
 *
 * @example
 * const cols = buildLoyaltyColumns<MyLoyaltyBalance>({
 *   extras: [{ key: "tier", header: "Tier", render: (l) => l.tier }],
 *   omit: ["coinHistory"],
 * });
 */
export function buildLoyaltyColumns<T extends LoyaltyBalance = LoyaltyBalance>(
  opts?: ColumnExtensionOpts<T>,
): TableColumn<T>[] {
  return buildColumns(loyaltyAdminColumns as TableColumn<T>[], opts);
}
