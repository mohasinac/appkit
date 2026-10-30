"use client";

import { ListingBottomActions } from "./ListingBottomActions";

export interface RandomLotsBottomActionsProps {
  pricePerEntry: number;
  currency: string;
  closed: boolean;
}

export function RandomLotsBottomActions({
  pricePerEntry,
  currency,
  closed,
}: RandomLotsBottomActionsProps) {
  return (
    <ListingBottomActions
      listingType="random-lots"
      anchorId="prize-draw-buy-bar"
      price={pricePerEntry}
      currency={currency}
      unavailable={closed}
      infoSuffix="per entry"
    />
  );
}
