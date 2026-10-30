"use client"
import { useRealtimeBids } from "./useRealtimeBids";

export interface UseLiveCollectorDropBidResult {
  currentBid: number;
  bidCount: number;
  /** True once the SSE channel has delivered at least one live update. */
  isLive: boolean;
}

/**
 * useLiveCollectorDropBid
 *
 * Layers the SSE-driven `useRealtimeBids` channel on top of the collector drop
 * detail page's SSR-rendered `currentBid`/`bidCount` (server props, frozen
 * at request time / the page's ISR window). Falls back to those SSR values
 * until the live channel connects and pushes its first update — this is
 * what lets any viewer watching a collector drop see a new bid the instant
 * another user places it, mirroring how the cart/wishlist badges layer a
 * live delta on top of the last known server count.
 */
export function useLiveCollectorDropBid(
  productId: string,
  ssrCurrentBid: number,
  ssrBidCount: number,
  opts?: { enabled?: boolean },
): UseLiveCollectorDropBidResult {
  const enabled = opts?.enabled !== false;
  const live = useRealtimeBids(enabled ? productId : null);
  const isLive = live.connected && live.currentBid !== null;
  return {
    currentBid: isLive ? live.currentBid! : ssrCurrentBid,
    bidCount: isLive && live.bidCount !== null ? live.bidCount : ssrBidCount,
    isLive,
  };
}
