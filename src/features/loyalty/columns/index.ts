import type { TableColumn, ColumnExtensionOpts } from "@mohasinac/contracts";
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
  opts?: ColumnExtensionOpts<T>
): TableColumn<T>[] {
  let base = loyaltyAdminColumns as unknown as TableColumn<T>[];

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
