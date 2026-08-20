"use client";

import { Span } from "../../../ui";
import { formatCurrency } from "../../../utils/number.formatter";
import { useLiveAuctionBid } from "../hooks/useLiveAuctionBid";
import {
  resolveMinBidIncrement,
  type BidIncrementTier,
} from "../../../_internal/shared/features/auctions/config";

export interface LiveMinIncrementProps {
  productId: string;
  currentBid: number;
  bidCount: number;
  currency: string;
  isEnded: boolean;
  tiers: BidIncrementTier[];
  minBidIncrementOverride?: number;
  size?: "xs" | "sm";
}

/**
 * LiveMinIncrement — the "min increment ₹X" text, kept live via the same
 * `/auction-bids/{id}` SSE channel `LiveBidPrice` uses. The effective
 * increment depends on the current bid amount (tiered), so it must keep
 * resolving against the live current bid, not just the SSR snapshot.
 */
export function LiveMinIncrement({
  productId,
  currentBid,
  bidCount,
  currency,
  isEnded,
  tiers,
  minBidIncrementOverride,
  size = "xs",
}: LiveMinIncrementProps) {
  const live = useLiveAuctionBid(productId, currentBid, bidCount, { enabled: !isEnded });
  const increment = resolveMinBidIncrement(live.currentBid, tiers, minBidIncrementOverride);

  return (
    <Span size={size} color="muted">
      min increment {formatCurrency(increment, currency)}
    </Span>
  );
}
