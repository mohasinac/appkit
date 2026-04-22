import React from "react";
import { SlottedListingView } from "../../../ui";
import type { SlottedListingViewProps } from "../../../ui";
import type { StoreAuctionItem } from "../types";

export interface StoreAuctionsViewProps extends Omit<
  SlottedListingViewProps,
  "renderTable"
> {
  storeSlug: string;
  labels?: {
    title?: string;
    emptyTitle?: string;
    emptyDescription?: string;
  };
  renderAuctions: (
    items: StoreAuctionItem[],
    isLoading: boolean,
  ) => React.ReactNode;
  renderPagination?: (total: number) => React.ReactNode;
  items?: StoreAuctionItem[];
  total?: number;
  isLoading?: boolean;
}

export function StoreAuctionsView({
  labels = {},
  renderAuctions,
  renderPagination,
  items = [],
  total = 0,
  isLoading = false,
  ...rest
}: StoreAuctionsViewProps) {
  return (
    <SlottedListingView
      portal="public"
      {...rest}
      title={labels.title}
      className={`py-4 ${rest.className ?? ""}`}
      renderTable={() => renderAuctions(items, isLoading)}
      renderPagination={() => renderPagination?.(total) ?? null}
      total={total}
      isLoading={isLoading}
    />
  );
}
