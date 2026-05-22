"use client";

import { useBottomActions } from "../../layout/hooks/useBottomActions";
import { formatCurrency } from "../../../utils/number.formatter";
import { ACTION_ID } from "../constants/action-defs";

export interface PrizeDrawBottomActionsProps {
  pricePerEntry: number;
  currency: string;
  closed: boolean;
}

export function PrizeDrawBottomActions({
  pricePerEntry,
  currency,
  closed,
}: PrizeDrawBottomActionsProps) {
  useBottomActions(
    closed
      ? {}
      : {
          actions: [
            {
              id: ACTION_ID.BUY_NOW,
              label: "Buy Now",
              variant: "primary",
              onClick: () => {
                document
                  .getElementById("prize-draw-buy-bar")
                  ?.scrollIntoView({ behavior: "smooth" });
              },
            },
          ],
          infoLabel: `${formatCurrency(pricePerEntry, currency)} per entry`,
        },
  );
  return null;
}
