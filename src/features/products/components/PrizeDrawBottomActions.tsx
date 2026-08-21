"use client";

import { ListingBottomActions } from "./ListingBottomActions";

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
  return (
    <ListingBottomActions
      listingType="prize-draw"
      anchorId="prize-draw-buy-bar"
      price={pricePerEntry}
      currency={currency}
      unavailable={closed}
      infoSuffix="per entry"
    />
  );
}
