"use client";
import React from "react";

import { SectionCarousel } from "./SectionCarousel";
import { useFeaturedPreOrders } from "../hooks/useFeaturedPreOrders";
import { MarketplacePreorderCard } from "../../pre-orders/components/MarketplacePreorderCard";
import type { ProductItem } from "../../products/types";
import { CAROUSEL_PER_VIEW } from "../constants/carousel-per-view";
import { SECTION_TITLE, VIEW_MORE_LABEL } from "../constants/section-copy";

export interface FeaturedPreOrdersSectionProps {
  title?: string;
  description?: string;
  viewMoreHref?: string;
  viewMoreLabel?: string;
  className?: string;
  filterByBrand?: string;
  initialItems?: ProductItem[];
  rows?: number;
  /** Cap the rendered cards, mirroring FeaturedProductsSection. */
  maxItems?: number;
  autoScroll?: boolean;
  scrollInterval?: number;
  loop?: boolean;
}

export function FeaturedPreOrdersSection({
  title = SECTION_TITLE.preOrders,
  description,
  viewMoreHref,
  viewMoreLabel = VIEW_MORE_LABEL.preOrders,
  className = "",
  filterByBrand,
  initialItems,
  rows = 1,
  maxItems,
  autoScroll = false,
  scrollInterval = 5000,
  loop = true,
}: FeaturedPreOrdersSectionProps) {
  const { data: fetched = [], isLoading } = useFeaturedPreOrders({ filterByBrand, initialData: initialItems });
  const items = maxItems && maxItems > 0 ? fetched.slice(0, maxItems) : fetched;

  return (
    <SectionCarousel
      title={title}
      description={description}
      pillLabel="Pre-Order Incoming"
      headingVariant="editorial"
      viewMoreHref={viewMoreHref}
      viewMoreLabel={viewMoreLabel}
      items={items}
      isLoading={isLoading}
      skeletonCount={4}
      perView={CAROUSEL_PER_VIEW.standard}
      gap={16}
      rows={Math.min(Math.max(rows, 1), 4)}
      autoScroll={autoScroll}
      autoScrollInterval={scrollInterval}
      loop={loop}
      keyExtractor={(product: ProductItem) => product.id}
      renderItem={(product: ProductItem) => (
        <MarketplacePreorderCard product={product} />
      )}
      className={className}
    />
  );
}
