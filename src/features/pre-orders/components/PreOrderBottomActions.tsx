"use client";

import { useBottomActions } from "../../layout/hooks/useBottomActions";
import { formatCurrency } from "../../../utils/number.formatter";
import { ACTION_ID } from "../../products/constants/action-defs";

export interface PreOrderBottomActionsProps {
  price: number | null;
  currency: string;
}

export function PreOrderBottomActions({
  price,
  currency,
}: PreOrderBottomActionsProps) {
  useBottomActions({
    actions: [
      {
        id: ACTION_ID.RESERVE_NOW,
        label: "Reserve Now",
        variant: "primary",
        onClick: () => {
          document
            .getElementById("pre-order-buy-bar")
            ?.scrollIntoView({ behavior: "smooth" });
        },
      },
    ],
    infoLabel: price !== null ? formatCurrency(price, currency) : undefined,
  });
  return null;
}
