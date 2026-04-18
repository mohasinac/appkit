import React from "react";
import { SlottedListingView } from "../../../ui";
import type { SlottedListingViewProps } from "../../../ui";

export interface AuctionsViewProps extends Omit<
  SlottedListingViewProps,
  "renderTable"
> {
  renderGrid: (isLoading: boolean) => React.ReactNode;
}

export function AuctionsView({ renderGrid, ...props }: AuctionsViewProps) {
  return (
    <SlottedListingView
      {...props}
      manageSearch
      manageSort
      inlineToolbar
      renderTable={() => renderGrid(props.isLoading ?? false)}
    />
  );
}
