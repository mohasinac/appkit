"use client";

import { ListingBottomActions } from "../../products/components/ListingBottomActions";

export interface PreOrderBottomActionsProps {
  price: number | null;
  currency: string;
}

export function PreOrderBottomActions({
  price,
  currency,
}: PreOrderBottomActionsProps) {
  return (
    <ListingBottomActions
      listingType="preorder"
      anchorId="pre-order-buy-bar"
      price={price}
      currency={currency}
    />
  );
}
