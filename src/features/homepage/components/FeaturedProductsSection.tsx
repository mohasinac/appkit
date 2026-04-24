"use client";
import React from "react";
import { SectionCarousel } from "./SectionCarousel";
import { useFeaturedProducts } from "../hooks/useFeaturedProducts";
import { InteractiveProductCard } from "../../products/components/InteractiveProductCard";
import { ROUTES } from "../../../next";
import type { ProductItem } from "../../products/types";

export interface FeaturedProductsSectionProps {
  title?: string;
  description?: string;
  viewMoreHref?: string;
  viewMoreLabel?: string;
  className?: string;
}

export function FeaturedProductsSection({
  title = "Featured Products",
  description,
  viewMoreHref,
  viewMoreLabel = "View all products →",
  className = "",
}: FeaturedProductsSectionProps) {
  const { data, isLoading } = useFeaturedProducts();
  const items = data?.items ?? [];

  return (
    <SectionCarousel
      title={title}
      description={description}
      viewMoreHref={viewMoreHref}
      viewMoreLabel={viewMoreLabel}
      items={items}
      isLoading={isLoading}
      skeletonCount={4}
      perView={1} // 1 slide at a time
      gap={16}
      rows={2} // 2 rows per slide
      keyExtractor={(product) => product.id}
      renderItem={(product: ProductItem) => (
        <InteractiveProductCard
          product={product}
          href={ROUTES.PUBLIC.PRODUCT_DETAIL(product.slug ?? product.id)}
        />
      )}
      className={className}
    />
  );
}
