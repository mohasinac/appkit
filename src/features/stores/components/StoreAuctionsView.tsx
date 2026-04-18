import React from "react";
import { StackedViewShell } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import type { StoreAuctionItem } from "../types";

export interface StoreAuctionsViewProps extends Omit<
  StackedViewShellProps,
  "sections"
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
    <StackedViewShell
      {...rest}
      title={labels.title}
      className={`py-4 ${rest.className ?? ""}`}
      sections={[renderAuctions(items, isLoading), renderPagination?.(total)]}
    />
  );
}
