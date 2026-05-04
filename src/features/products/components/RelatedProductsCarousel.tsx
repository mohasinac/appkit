"use client";
import React from "react";
import { ROUTES } from "../../../next";
import { THEME_CONSTANTS } from "../../../tokens";
import { SectionCarousel } from "../../homepage/components/SectionCarousel";
import type { ProductItem } from "../types";
import { ProductCard } from "./ProductGrid";

interface RelatedProductsCarouselProps {
  items: ProductItem[];
  title?: string;
}

export function RelatedProductsCarousel({
  items,
  title = "You might also like",
}: RelatedProductsCarouselProps) {
  if (items.length === 0) return null;

  return (
    <SectionCarousel
      title={title}
      pillLabel="Related Products"
      headingVariant="editorial"
      items={items}
      isLoading={false}
      perView={THEME_CONSTANTS.carousel.perView.standard}
      keyExtractor={(item: ProductItem) => item.id}
      renderItem={(item: ProductItem) => (
        <ProductCard
          product={item}
          href={item.slug || item.id ? String(ROUTES.PUBLIC.PRODUCT_DETAIL(item.slug || item.id)) : undefined}
        />
      )}
    />
  );
}
