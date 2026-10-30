"use client";
import React from "react";

import { SectionCarousel } from "./SectionCarousel";
import { useFeaturedCollectorDrops } from "../hooks/useFeaturedCollectorDrops";
import { MarketplaceCollectorDropCard } from "../../collector-drops/components/MarketplaceCollectorDropCard";
import type { ProductItem } from "../../products/types";
import { CAROUSEL_PER_VIEW } from "../constants/carousel-per-view";
import { SECTION_TITLE, VIEW_MORE_LABEL } from "../constants/section-copy";

export interface FeaturedCollectorDropsSectionProps {
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

export function FeaturedCollectorDropsSection({
  title = SECTION_TITLE.collectorDrops,
  description,
  viewMoreHref,
  viewMoreLabel = VIEW_MORE_LABEL.collectorDrops,
  className = "",
  filterByBrand,
  initialItems,
  rows = 1,
  maxItems,
  autoScroll = false,
  scrollInterval = 5000,
  loop = true,
}: FeaturedCollectorDropsSectionProps) {
  const { data: fetched = [], isLoading } = useFeaturedCollectorDrops({ filterByBrand, initialData: initialItems });
  const items = maxItems && maxItems > 0 ? fetched.slice(0, maxItems) : fetched;

  return (
    <SectionCarousel
      title={title}
      description={description}
      pillLabel={SECTION_TITLE.collectorDrops}
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
        <MarketplaceCollectorDropCard product={product} />
      )}
      className={className}
    />
  );
}
