"use client";

import { Span } from "../../../ui";
import { useIsAuctionEnded } from "../hooks/useIsAuctionEnded";

export interface AuctionLiveStatusBadgeProps {
  /** The auction's end timestamp — the only thing that decides this. */
  auctionEndDate: Date | string | null;
  /** The server's answer, used as the initial value so SSR and hydration agree. */
  initialIsEnded: boolean;
}

/**
 * Active / Ended, decided on the client.
 *
 * The server-rendered version of this badge sat directly above a countdown that
 * already flipped itself to "Ended" — so a cached auction page could render
 * `Ends in Ended` beside a green **Active** pill. The countdown was right and the
 * badge was stale, in the same `<Stack>`.
 *
 * Extracted to a client component rather than passing a derived prop down,
 * because `AuctionDetailPageView` is a Server Component and cannot hold the
 * timer. Colours follow the status-pair rule (Root Cause #67): a theme-relative
 * surface with its matching theme-relative ink, never a literal `text-white`.
 */
export function AuctionLiveStatusBadge({
  auctionEndDate,
  initialIsEnded,
}: AuctionLiveStatusBadgeProps) {
  const isEnded = useIsAuctionEnded(auctionEndDate, initialIsEnded);
  return isEnded ? (
    <Span
      color="error"
      surface="danger-surface"
      size="xs"
      weight="medium"
      className="inline-block"
      padding="pill-sm"
      rounded="full"
    >
      Ended
    </Span>
  ) : (
    <Span
      color="success"
      surface="success-surface"
      size="xs"
      weight="medium"
      className="inline-block"
      padding="pill-sm"
      rounded="full"
    >
      Active
    </Span>
  );
}
