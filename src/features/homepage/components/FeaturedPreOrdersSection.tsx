"use client";
import React from "react";
import { THEME_CONSTANTS } from "../../../tokens";
import { SectionCarousel } from "./SectionCarousel";
import { useFeaturedPreOrders } from "../hooks/useFeaturedPreOrders";
import { MarketplacePreorderCard } from "../../pre-orders/components/MarketplacePreorderCard";
import type { ProductItem } from "../../products/types";

export interface FeaturedPreOrdersSectionProps {
  title?: string;
  description?: string;
  viewMoreHref?: string;
  viewMoreLabel?: string;
  className?: string;
  filterByBrand?: string;
  initialItems?: ProductItem[];
  rows?: number;
  autoScroll?: boolean;
  scrollInterval?: number;
}

export function FeaturedPreOrdersSection({
  title = "Reserve Before It Ships",
  description,
  viewMoreHref,
  viewMoreLabel = "View all pre-orders →",
  className = "",
  filterByBrand,
  initialItems,
  rows = 1,
  autoScroll = false,
  scrollInterval = 5000,
}: FeaturedPreOrdersSectionProps) {
  const { data: items = [], isLoading } = useFeaturedPreOrders({ filterByBrand, initialData: initialItems });

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
      perView={THEME_CONSTANTS.carousel.perView.standard}
      gap={16}
      rows={Math.min(Math.max(rows, 1), 4)}
      autoScroll={autoScroll}
      autoScrollInterval={scrollInterval}
      keyExtractor={(product: ProductItem) => product.id}
      renderItem={(product: ProductItem) => (
        <MarketplacePreorderCard product={product} />
      )}
      className={className}
    />
  );
}
