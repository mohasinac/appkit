import type { TableColumn, ColumnExtensionOpts } from "../../../contracts";
import type { AuctionItem, BidRecord } from "../types";

// ─── Auction columns ──────────────────────────────────────────────────────────

/**
 * Default admin column definitions for an auction table.
 *
 * @example
 * const columns = buildAuctionColumns<MyAuction>({
 *   extras: [{ key: "reservePrice", header: "Reserve", render: (a) => a.reservePrice ?? "—" }],
 * });
 */
export const auctionAdminColumns: TableColumn<AuctionItem>[] = [
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
  { key: "auctionEndDate", header: "Ends At", sortable: true },
  { key: "createdAt", header: "Created", sortable: true },
];

export function buildAuctionColumns<T extends AuctionItem = AuctionItem>(
  opts?: ColumnExtensionOpts<T>,
): TableColumn<T>[] {
  const base = auctionAdminColumns as TableColumn<T>[];
  const omit = new Set(opts?.omit ?? []);
  const cols = base
    .filter((col) => !omit.has(col.key))
    .map((col) => {
      const ovr = opts?.overrides?.[col.key];
      return ovr ? { ...col, ...ovr } : col;
    });
  return opts?.extras ? [...cols, ...opts.extras] : cols;
}

// ─── Bid columns ──────────────────────────────────────────────────────────────

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
  const base = bidAdminColumns as TableColumn<T>[];
  const omit = new Set(opts?.omit ?? []);
  const cols = base
    .filter((col) => !omit.has(col.key))
    .map((col) => {
      const ovr = opts?.overrides?.[col.key];
      return ovr ? { ...col, ...ovr } : col;
    });
  return opts?.extras ? [...cols, ...opts.extras] : cols;
}
