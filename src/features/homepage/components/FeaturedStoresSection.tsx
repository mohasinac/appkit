"use client";
import React from "react";
import { THEME_CONSTANTS } from "../../../tokens";
import { SectionCarousel } from "./SectionCarousel";
import { useFeaturedStores } from "../hooks/useFeaturedStores";
import { InteractiveStoreCard } from "../../stores/components/InteractiveStoreCard";
import { ROUTES } from "../../../next";
import type { StoreListItem } from "../../stores/types";

export interface FeaturedStoresSectionProps {
  title?: string;
  description?: string;
  viewMoreHref?: string;
  viewMoreLabel?: string;
  limit?: number;
  className?: string;
}

export function FeaturedStoresSection({
  title = "Featured Stores",
  description,
  viewMoreHref,
  viewMoreLabel = "View all stores →",
  limit = 8,
  className = "",
}: FeaturedStoresSectionProps) {
  const { data: items = [], isLoading } = useFeaturedStores(limit);

  return (
    <SectionCarousel
      title={title}
      description={description}
      viewMoreHref={viewMoreHref}
      viewMoreLabel={viewMoreLabel}
      items={items}
      isLoading={isLoading}
      skeletonCount={4}
      perView={THEME_CONSTANTS.carousel.perView.cards}
      gap={16}
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
