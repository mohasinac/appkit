import type { TableColumn, ColumnExtensionOpts } from "../../../contracts";
import { buildColumns } from "../../../ui/columns";
import type { CollectorDropItem, BidRecord } from "../types";

// --- Collector Drop columns ----------------------------------------------------------

/**
 * Default admin column definitions for a collector drop table.
 *
 * @example
 * const columns = buildCollectorDropColumns<MyCollectorDrop>({
 *   extras: [{ key: "reservePrice", header: "Reserve", render: (a) => a.reservePrice ?? "—" }],
 * });
 */
export const collectorDropAdminColumns: TableColumn<CollectorDropItem>[] = [
  { key: "title", header: "Title", sortable: true },
  {
    key: "startingBid",
    header: "Starting Bid",
    sortable: true,
    render: (a) => `${a.currency} ${a.startingBid.toLocaleString()}`,
  },
  {
    key: "currentBid",
    header: "Current Bid",
    sortable: true,
    render: (a) =>
      a.currentBid != null
        ? `${a.currency} ${a.currentBid.toLocaleString()}`
        : "No bids",
  },
  {
    key: "bidCount",
    header: "Bids",
    sortable: true,
    render: (a) => a.bidCount.toLocaleString(),
  },
  { key: "status", header: "Status", sortable: true },
  {
    key: "featured",
    header: "Featured",
    render: (a) => (a.featured ? "Yes" : "No"),
  },
  { key: "collectorDropEndDate", header: "Ends At", sortable: true },
  { key: "createdAt", header: "Created", sortable: true },
];

export function buildCollectorDropColumns<T extends CollectorDropItem = CollectorDropItem>(
  opts?: ColumnExtensionOpts<T>,
): TableColumn<T>[] {
  return buildColumns(collectorDropAdminColumns as TableColumn<T>[], opts);
}

// --- Bid columns --------------------------------------------------------------

export const bidAdminColumns: TableColumn<BidRecord>[] = [
  { key: "bidderDisplayName", header: "Bidder" },
  {
    key: "amount",
    header: "Amount",
    sortable: true,
    render: (b) => `${b.currency} ${b.amount.toLocaleString()}`,
  },
  {
    key: "isWinning",
    header: "Winning",
    render: (b) => (b.isWinning ? "Yes" : "—"),
  },
  { key: "placedAt", header: "Placed At", sortable: true },
];

export function buildBidColumns<T extends BidRecord = BidRecord>(
  opts?: ColumnExtensionOpts<T>,
): TableColumn<T>[] {
  return buildColumns(bidAdminColumns as TableColumn<T>[], opts);
}
