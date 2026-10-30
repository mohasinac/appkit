"use client";

import { Span } from "../../../ui/components/Typography";
import { useCanSeePrices } from "../../../react/hooks/useCanSeePrices";
import { formatCurrency } from "../../../utils/number.formatter";
import { useLiveCollectorDropBid } from "../hooks/useLiveCollectorDropBid";
import {
  resolveMinBidIncrement,
  type BidIncrementTier,
} from "../../../_internal/shared/features/collector-drops/config";

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
 * `/collector-drop-bids/{id}` SSE channel `LiveBidPrice` uses. The effective
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
  const live = useLiveCollectorDropBid(productId, currentBid, bidCount, { enabled: !isEnded });
  const increment = resolveMinBidIncrement(live.currentBid, tiers, minBidIncrementOverride);
  const { canSeePrices } = useCanSeePrices();

  // The increment is derived from the current bid, so it discloses the bid's
  // magnitude. This is a SECONDARY hint next to the gated bid itself, so it
  // hides outright — "min increment Sign in to see price" reads as broken copy,
  // and the prompt is already on the bid one line up.
  if (!canSeePrices) return null;

  return (
    <Span size={size} color="muted">
      min increment {formatCurrency(increment, currency)}
    </Span>
  );
}
