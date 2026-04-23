"use client";
import React from "react";
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
}

export function FeaturedPreOrdersSection({
  title = "Reserve Before It Ships",
  description,
  viewMoreHref,
  viewMoreLabel = "View all pre-orders →",
  className = "",
}: FeaturedPreOrdersSectionProps) {
  const { data: items = [], isLoading } = useFeaturedPreOrders();

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
        <MarketplacePreorderCard product={product} />
      )}
      className={className}
    />
  );
}
