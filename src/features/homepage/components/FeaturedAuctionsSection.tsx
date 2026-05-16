"use client";
import React from "react";
import { THEME_CONSTANTS } from "../../../tokens";
import { SectionCarousel } from "./SectionCarousel";
import { useFeaturedAuctions } from "../hooks/useFeaturedAuctions";
import { MarketplaceAuctionCard } from "../../auctions/components/MarketplaceAuctionCard";
import type { ProductItem } from "../../products/types";

export interface FeaturedAuctionsSectionProps {
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

export function FeaturedAuctionsSection({
  title = "Live Auctions",
  description,
  viewMoreHref,
  viewMoreLabel = "View all auctions →",
  className = "",
  filterByBrand,
  initialItems,
  rows = 1,
  autoScroll = false,
  scrollInterval = 5000,
}: FeaturedAuctionsSectionProps) {
  const { data: items = [], isLoading } = useFeaturedAuctions({ filterByBrand, initialData: initialItems });

  return (
    <SectionCarousel
      title={title}
      description={description}
      pillLabel="Live Auctions"
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
        <MarketplaceAuctionCard product={product} />
      )}
      className={className}
    />
  );
}
