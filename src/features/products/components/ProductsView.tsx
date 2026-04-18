import React from "react";
import { SlottedListingView } from "../../../ui";
import type { SlottedListingViewProps } from "../../../ui";

export interface ProductsViewProps extends Omit<
  SlottedListingViewProps,
  "renderTable"
> {
  renderGrid: (isLoading: boolean) => React.ReactNode;
}

export function ProductsView({ renderGrid, ...props }: ProductsViewProps) {
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
