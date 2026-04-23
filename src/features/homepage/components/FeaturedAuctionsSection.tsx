"use client";
import React from "react";
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
}

export function FeaturedAuctionsSection({
  title = "Live Auctions",
  description,
  viewMoreHref,
  viewMoreLabel = "View all auctions →",
  className = "",
}: FeaturedAuctionsSectionProps) {
  const { data: items = [], isLoading } = useFeaturedAuctions();

  return (
    <SectionCarousel
      title={title}
      description={description}
      viewMoreHref={viewMoreHref}
      viewMoreLabel={viewMoreLabel}
      items={items}
      isLoading={isLoading}
      skeletonCount={4}
      perView={{ base: 2, sm: 3, md: 4, lg: 4, xl: 5 }}
      gap={16}
      keyExtractor={(product: ProductItem) => product.id}
      renderItem={(product: ProductItem) => (
        <MarketplaceAuctionCard product={product} />
      )}
      className={className}
    />
  );
}
