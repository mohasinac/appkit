import React from "react";
import { Span, Text } from "@mohasinac/ui";

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
  labels?: {
    title?: string;
    noHistory?: string;
    bidder?: string;
    amount?: string;
    time?: string;
  };
  className?: string;
}

export function BidHistory({
  isLoading = false,
  isEmpty = false,
  renderList,
  renderBid,
  bids = [],
  renderEmpty,
  renderSkeleton,
  labels = {},
  className = "",
}: BidHistoryProps) {
  if (isLoading) {
    if (renderSkeleton) return <>{renderSkeleton()}</>;
    return (
      <div className="animate-pulse space-y-2">
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

  if (renderList) return <div className={className}>{renderList()}</div>;

  return (
    <div className={`space-y-2 ${className}`}>
      {bids.map((bid, i) =>
        renderBid ? (
          <React.Fragment key={bid.id}>{renderBid(bid, i)}</React.Fragment>
        ) : (
          <div
            key={bid.id}
            className="flex items-center justify-between p-3 rounded-lg border text-sm"
          >
            <Span>{bid.bidderName ?? bid.bidderId}</Span>
            <Span className="font-medium">{bid.amount}</Span>
            <Span className="text-neutral-500">{bid.placedAt}</Span>
          </div>
        ),
      )}
    </div>
  );
}
