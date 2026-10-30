import React from "react";
import { SlottedListingView } from "../../../ui/components/SlottedListingView";
import type { SlottedListingViewProps } from "../../../ui/components/SlottedListingView";
import type { StoreCollectorDropItem } from "../types";

export interface StoreCollectorDropsViewProps extends Omit<
  SlottedListingViewProps,
  "renderTable"
> {
  storeSlug: string;
  labels?: {
    title?: string;
    emptyTitle?: string;
    emptyDescription?: string;
  };
  renderCollectorDrops: (
    items: StoreCollectorDropItem[],
    isLoading: boolean,
  ) => React.ReactNode;
  renderPagination?: (total: number) => React.ReactNode;
  items?: StoreCollectorDropItem[];
  total?: number;
  isLoading?: boolean;
}

export function StoreCollectorDropsView({
  labels = {},
  renderCollectorDrops,
  renderPagination,
  items = [],
  total = 0,
  isLoading = false,
  ...rest
}: StoreCollectorDropsViewProps) {
  return (
    <SlottedListingView
      portal="public"
      {...rest}
      title={labels.title}
      className={`py-[var(--appkit-space-4)] ${rest.className ?? ""}`}
      renderTable={() => renderCollectorDrops(items, isLoading)}
      renderPagination={() => renderPagination?.(total) ?? null}
      total={total}
      isLoading={isLoading}
    />
  );
}
