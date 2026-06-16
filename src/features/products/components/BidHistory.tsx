import React from "react";
import { Div, Heading, Span, Stack, Text } from "../../../ui";
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
      <Stack className="animate-pulse" gap="sm">
        {Array.from({ length: 3 }).map((_, i) => (
          <Div key={i} className="h-10" surface="subtle" rounded="lg" />
        ))}
      </Stack>
    );
  }

  if (isEmpty) {
    if (renderEmpty) return <>{renderEmpty()}</>;
    return (
      <Text paddingY="md" variant="secondary" size="sm">
        {labels.noHistory ?? "No bids yet."}
      </Text>
    );
  }

  if (renderList) return <Div className={className}>{renderList()}</Div>;

  return (
    <Div className={className}>
      {labels.title && (
        <Heading level={3} className="mb-3 tracking-wide" color="muted" size="sm" weight="semibold" transform="uppercase">
          {labels.title}
        </Heading>
      )}
      <Stack gap="sm">
        {bids.map((bid, i) =>
          renderBid ? (
            <React.Fragment key={bid.id}>{renderBid(bid, i)}</React.Fragment>
          ) : (
            <div
              key={bid.id}
              className="flex items-center justify-between rounded-lg border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 text-sm"
             data-section="bidhistory-div-422">
              <Span weight="bold" className="text-primary-600 dark:text-primary-400">
                {currency ? formatCurrency(bid.amount, currency) : bid.amount.toLocaleString()}
              </Span>
              <Span size="xs" color="muted">
                {formatBidDate(bid.placedAt)}
              </Span>
            </div>
          ),
        )}
      </Stack>
    </Div>
  );
}
