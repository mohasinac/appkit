"use client";

import { useBottomActions } from "../../layout/hooks/useBottomActions";
import { formatCurrency } from "../../../utils/number.formatter";
import { ACTION_ID, ACTION_META } from "../../products/constants/action-defs";
import { useCountdown, type CountdownRemaining } from "../../../react";

export interface AuctionBottomActionsProps {
  currentBid: number;
  currency: string;
  bidCount: number;
  isEnded: boolean;
  auctionEndDate: Date | null;
}

function formatCountdownLabel(
  remaining: CountdownRemaining | null,
): string | undefined {
  if (!remaining) return undefined;
  const { days, hours, minutes, seconds } = remaining;
  if (days > 0) return `Ends in ${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `Ends in ${hours}h ${minutes}m ${seconds}s`;
  return `Ends in ${minutes}m ${seconds}s`;
}

export function AuctionBottomActions({
  currentBid,
  currency,
  bidCount,
  isEnded,
  auctionEndDate,
}: AuctionBottomActionsProps) {
  const placeBidMeta = ACTION_META[ACTION_ID.PLACE_BID];
  const remaining = useCountdown(auctionEndDate ?? undefined);
  useBottomActions(
    isEnded
      ? {}
      : {
          actions: [
            {
              ...placeBidMeta,
              onClick: () => {
                document
                  .getElementById("auction-bid-form")
                  ?.scrollIntoView({ behavior: "smooth" });
              },
            },
          ],
          secondaryLabel: formatCountdownLabel(remaining),
          infoLabel: `${formatCurrency(currentBid, currency)} · ${bidCount} bid${bidCount !== 1 ? "s" : ""}`,
          desktop: "after-scroll" as const,
        },
  );
  return null;
}
