"use client";

import { ListingBottomActions } from "./ListingBottomActions";

export interface ClearanceBottomActionsProps {
  pricePerEntry: number;
  currency: string;
  closed: boolean;
}

export function ClearanceBottomActions({
  pricePerEntry,
  currency,
  closed,
}: ClearanceBottomActionsProps) {
  return (
    <ListingBottomActions
      listingType="clearance"
      anchorId="prize-draw-buy-bar"
      price={pricePerEntry}
      currency={currency}
      unavailable={closed}
      infoSuffix="per entry"
    />
  );
}
