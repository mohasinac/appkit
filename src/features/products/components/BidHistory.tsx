import React from "react";
import { Span, Text } from "../../../ui";
import { formatCurrency } from "../../../utils/number.formatter";

export interface BidHistoryEntry {
  id: string;
  bidderId: string;
  bidderName?: string;
  amount: number;
  placedAt: string;
}

export interface BidHistoryProps {
  isLoading?: boolean;
  isEmpty?: boolean;
  /** Render the full list — caller owns layout */
  renderList?: () => React.ReactNode;
  /** Render a single bid row */
  renderBid?: (bid: BidHistoryEntry, index: number) => React.ReactNode;
  bids?: BidHistoryEntry[];
  renderEmpty?: () => React.ReactNode;
  renderSkeleton?: () => React.ReactNode;
  currency?: string;
  labels?: {
    title?: string;
    noHistory?: string;
    bidder?: string;
    amount?: string;
    time?: string;
  };
  className?: string;
}

function formatBidDate(raw: string): string {
  if (!raw) return "";
  try {
    return new Date(raw).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return raw;
  }
}

export function BidHistory({
  isLoading = false,
  isEmpty = false,
  renderList,
  renderBid,
  bids = [],
  renderEmpty,
  renderSkeleton,
  currency,
  labels = {},
  className = "",
}: BidHistoryProps) {
  if (isLoading) {
    if (renderSkeleton) return <>{renderSkeleton()}</>;
    return (
      <div className="animate-pulse space-y-2" data-section="bidhistory-div-419">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-neutral-100" />
        ))}
      </div>
    );
  }

  if (isEmpty) {
    if (renderEmpty) return <>{renderEmpty()}</>;
    return (
      <Text variant="secondary" size="sm" className="py-4">
        {labels.noHistory ?? "No bids yet."}
      </Text>
    );
  }

  if (renderList) return <div className={className} data-section="bidhistory-div-420">{renderList()}</div>;

  return (
    <div className={className} data-section="bidhistory-div-421">
      {labels.title && (
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {labels.title}
        </h3>
      )}
      <div className="space-y-2">
        {bids.map((bid, i) =>
          renderBid ? (
            <React.Fragment key={bid.id}>{renderBid(bid, i)}</React.Fragment>
          ) : (
            <div
              key={bid.id}
              className="flex items-center justify-between rounded-lg border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 text-sm"
             data-section="bidhistory-div-422">
              <Span className="font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-[40%]">
                {bid.bidderName ?? bid.bidderId}
              </Span>
              <Span className="font-bold text-primary-600 dark:text-primary-400">
                {currency ? formatCurrency(bid.amount, currency) : bid.amount.toLocaleString()}
              </Span>
              <Span className="text-xs text-zinc-400 dark:text-zinc-500">
                {formatBidDate(bid.placedAt)}
              </Span>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
