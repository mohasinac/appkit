"use client";
import { SectionCarousel } from "./SectionCarousel";
import { useFeaturedProducts } from "../hooks/useFeaturedProducts";
import { InteractiveProductCard } from "../../products/components/InteractiveProductCard";
import { pluginFor } from "../../../_internal/shared/listing-types/_registry";

import type { ProductItem } from "../../products/types";
import { CAROUSEL_PER_VIEW } from "../constants/carousel-per-view";
import { SECTION_TITLE, VIEW_MORE_LABEL } from "../constants/section-copy";

export interface FeaturedProductsSectionProps {
  title?: string;
  description?: string;
  viewMoreHref?: string;
  viewMoreLabel?: string;
  className?: string;
  filterByBrand?: string;
  initialItems?: ProductItem[];
  rows?: number;
  /** Cap the rendered cards. Was declared but never destructured — so every
   *  `maxItems` an admin configured was silently ignored. */
  maxItems?: number;
  autoScroll?: boolean;
  scrollInterval?: number;
  loop?: boolean;
}

export function FeaturedProductsSection({
  title = SECTION_TITLE.products,
  description,
  viewMoreHref,
  viewMoreLabel = VIEW_MORE_LABEL.products,
  className = "",
  filterByBrand,
  initialItems,
  rows = 1,
  maxItems,
  autoScroll = false,
  scrollInterval = 5000,
  loop = true,
}: FeaturedProductsSectionProps) {
  const { data, isLoading } = useFeaturedProducts({
    filterByBrand,
    initialData: initialItems?.length
      ? { items: initialItems, total: initialItems.length, page: 1, pageSize: initialItems.length, totalPages: 1, hasMore: false }
      : undefined,
  });
  const fetched = data?.items ?? [];
  const items = maxItems && maxItems > 0 ? fetched.slice(0, maxItems) : fetched;

  return (
    <SectionCarousel
      title={title}
      description={description}
      pillLabel={SECTION_TITLE.products}
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
        <InteractiveProductCard
          product={product}
          href={pluginFor(product.listingType ?? "standard").detailRoute(product.slug ?? product.id ?? "")}
        />
      )}
      className={className}
    />
  );
}
