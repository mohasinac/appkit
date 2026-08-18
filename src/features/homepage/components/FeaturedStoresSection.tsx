"use client";
import React from "react";

import { SectionCarousel } from "./SectionCarousel";
import { useFeaturedStores } from "../hooks/useFeaturedStores";
import { InteractiveStoreCard } from "../../stores/components/InteractiveStoreCard";
import { ROUTES } from "../../../next";
import type { StoreListItem } from "../../stores/types";
import { CAROUSEL_PER_VIEW } from "../constants/carousel-per-view";

export interface FeaturedStoresSectionProps {
  title?: string;
  description?: string;
  viewMoreHref?: string;
  viewMoreLabel?: string;
  limit?: number;
  className?: string;
  initialItems?: StoreListItem[];
  autoScroll?: boolean;
  scrollInterval?: number;
  loop?: boolean;
}

export function FeaturedStoresSection({
  title = "Featured Stores",
  description,
  viewMoreHref,
  viewMoreLabel = "View all stores →",
  limit = 8,
  className = "",
  initialItems,
  autoScroll = false,
  scrollInterval = 5000,
  loop = true,
}: FeaturedStoresSectionProps) {
  const { data: items = [], isLoading } = useFeaturedStores(limit, { initialData: initialItems });

  return (
    <SectionCarousel
      title={title}
      description={description}
      pillLabel="Top Stores"
      headingVariant="editorial"
      viewMoreHref={viewMoreHref}
      viewMoreLabel={viewMoreLabel}
      items={items}
      isLoading={isLoading}
      skeletonCount={4}
      perView={CAROUSEL_PER_VIEW.standard}
      gap={16}
      autoScroll={autoScroll}
      autoScrollInterval={scrollInterval}
      loop={loop}
      keyExtractor={(store: StoreListItem) => store.id}
      renderItem={(store: StoreListItem) => (
        <InteractiveStoreCard
          store={store}
          href={ROUTES.PUBLIC.STORE_DETAIL(store.storeSlug)}
        />
      )}
      className={className}
    />
  );
}
