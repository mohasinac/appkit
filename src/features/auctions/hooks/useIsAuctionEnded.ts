"use client";

import { useEffect, useState } from "react";

/**
 * Has this auction ended, decided on the CLIENT from its end timestamp.
 *
 * ## Why this exists
 *
 * `AuctionDetailPageView` computed `const isEnded = endDate < new Date()` on the
 * SERVER and froze the answer into eleven places — the status badge, the Buy-Now
 * chip, the SSE `enabled` flag, the Place-Bid button, the mobile bid card and
 * the bottom action bar. That is correct only for as long as the rendered HTML
 * is fresh.
 *
 * The page is cached. At `revalidate = 30` the window was small enough to hide
 * the problem; it is not small enough to be *correct*, and raising the TTL (so
 * that 95 auction pages stop regenerating up to 2,880 times a day each, which is
 * what produced 3.1M ISR writes) makes it plainly visible: a page cached while
 * the auction was live renders a green **Active** badge and an enabled "Place a
 * bid" button on a lot that closed hours ago.
 *
 * The timestamp needed to know better was already being passed down — it was
 * used for display only.
 *
 * ## What this does NOT change
 *
 * Server-side enforcement is independent and already correct: `placeBid` and
 * `buyNowAuction` both re-read the product and reject on `endDate < now`, and
 * `assertAuctionActive()` is a third copy. A stale page could never actually
 * place a bid — the defect was always a misleading affordance, never a bad
 * write. That is what makes this safe to adopt incrementally: every component
 * converted is an improvement, and an unconverted one is no worse than today.
 *
 * ## Behaviour
 *
 * - Starts from `initial` (the server's answer) so the first paint is unchanged
 *   and hydration does not mismatch.
 * - Re-checks on mount, which is where a cached page corrects itself.
 * - Schedules ONE timer for the exact moment of expiry rather than ticking every
 *   second — a bid button does not need per-second resolution, and an interval
 *   on every auction card would be a needless wakeup. Long waits are clamped to
 *   the setTimeout 32-bit ceiling and re-armed.
 */
export function useIsAuctionEnded(
  auctionEndDate: Date | string | null | undefined,
  initial = false,
): boolean {
  const endMs = toMs(auctionEndDate);
  const [ended, setEnded] = useState(initial);

  useEffect(() => {
    if (endMs === null) {
      // No end date — the server's answer is the only one available.
      setEnded(initial);
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;

    const evaluate = () => {
      const remaining = endMs - Date.now();
      if (remaining <= 0) {
        setEnded(true);
        return;
      }
      setEnded(false);
      // setTimeout overflows past ~24.8 days and fires immediately; re-arm.
      timer = setTimeout(evaluate, Math.min(remaining, 2_147_483_000));
    };

    evaluate();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [endMs, initial]);

  return ended;
}

function toMs(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}
