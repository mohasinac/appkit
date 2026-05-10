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
  filterByBrand?: string;
  initialItems?: ProductItem[];
}

export function FeaturedProductsSection({
  title = "Featured Products",
  description,
  viewMoreHref,
  viewMoreLabel = "View all products →",
  className = "",
  filterByBrand,
  initialItems,
}: FeaturedProductsSectionProps) {
  const { data, isLoading } = useFeaturedProducts({
    filterByBrand,
    initialData: initialItems?.length
      ? { items: initialItems, total: initialItems.length, page: 1, pageSize: initialItems.length, totalPages: 1, hasMore: false }
      : undefined,
  });
  const items = data?.items ?? [];

  return (
    <SectionCarousel
      title={title}
      description={description}
      pillLabel="Featured Products"
      headingVariant="editorial"
      viewMoreHref={viewMoreHref}
      viewMoreLabel={viewMoreLabel}
      items={items}
      isLoading={isLoading}
      skeletonCount={4}
      gap={16}
      keyExtractor={(product) => product.id}
      renderItem={(product: ProductItem) => (
        <InteractiveProductCard
          product={product}
          href={String(ROUTES.PUBLIC.PRODUCT_DETAIL(product.slug ?? product.id ?? ""))}
        />
      )}
      className={className}
    />
  );
}
