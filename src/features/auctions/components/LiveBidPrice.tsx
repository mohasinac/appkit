"use client";

import { Row, Span } from "../../../ui";
import { formatCurrency } from "../../../utils/number.formatter";
import { useLiveAuctionBid } from "../hooks/useLiveAuctionBid";

export interface LiveBidPriceProps {
  productId: string;
  currentBid: number;
  bidCount: number;
  currency: string;
  isEnded: boolean;
  /** Matches the appkit `<Span size>` scale — pick to match the call site. */
  priceSize?: "base" | "lg" | "xl" | "2xl";
  badgeSize?: "xs" | "sm";
}

/**
 * LiveBidPrice — the current-bid + bid-count pill, kept live via the
 * `/auction-bids/{id}` SSE channel. Replaces 3 near-identical static
 * SSR-only displays on the auction detail page (info panel, desktop and
 * mobile compact bid-summary cards) so every viewer watching the page sees
 * a new bid the instant it's placed, not just after their own bid or a
 * page reload.
 */
export function LiveBidPrice({
  productId,
  currentBid,
  bidCount,
  currency,
  isEnded,
  priceSize = "xl",
  badgeSize = "xs",
}: LiveBidPriceProps) {
  const live = useLiveAuctionBid(productId, currentBid, bidCount, { enabled: !isEnded });

  return (
    <Row align="center" gap="sm" wrap>
      <Span weight="bold" className="text-primary-600 dark:text-primary-400" size={priceSize}>
        {formatCurrency(live.currentBid, currency)}
      </Span>
      <Span size={badgeSize} weight="medium" rounded="full" padding="pill-md" surface="subtle" color="muted">
        {live.bidCount} {live.bidCount === 1 ? "bid" : "bids"}
      </Span>
    </Row>
  );
}
