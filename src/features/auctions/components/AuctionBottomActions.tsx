"use client";

import { useBottomActions } from "../../layout/hooks/useBottomActions";
import { formatCurrency } from "../../../utils/number.formatter";
import { ACTION_ID, ACTION_META } from "../../products/constants/action-defs";

export interface AuctionBottomActionsProps {
  currentBid: number;
  currency: string;
  bidCount: number;
  isEnded: boolean;
}

export function AuctionBottomActions({
  currentBid,
  currency,
  bidCount,
  isEnded,
}: AuctionBottomActionsProps) {
  const placeBidMeta = ACTION_META[ACTION_ID.PLACE_BID];
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
          infoLabel: `${formatCurrency(currentBid, currency)} · ${bidCount} bid${bidCount !== 1 ? "s" : ""}`,
        },
  );
  return null;
}
