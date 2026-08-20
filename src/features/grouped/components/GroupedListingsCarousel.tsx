"use client";
import React from "react";
import { pluginFor } from "../../../_internal/shared/listing-types/_registry";
import { SectionCarousel } from "../../homepage/components/SectionCarousel";
import { ProductCard } from "../../products/components/ProductGrid";
import { toProductItem } from "../../../_internal/server/features/products/data";
import type { ProductItem } from "../../products/types";
import type { GroupedListingWithItems } from "../../../_internal/server/features/grouped/data";
import { CAROUSEL_PER_VIEW } from "../../homepage/constants/carousel-per-view";
import { Stack } from "../../../ui";
import type { FirestoreDocument } from "@mohasinac/appkit";

const GROUP_THEME_TITLE: Record<GroupedListingWithItems["groupTheme"], string> = {
  related: "Other listings you might like",
  character: "Same character",
  lineage: "Same lineage",
  set: "From the same set",
  generic: "You might also like",
};

export interface GroupedListingsCarouselProps {
  groups: GroupedListingWithItems[];
}

/**
 * Public renderer for the admin/seller-authored groupedListings "theme
 * scroller" collection — one carousel per group the current product
 * belongs to. Previously fully built (schema, repository, CRUD UI) with
 * zero public consumers; this is the first place it renders on a
 * storefront page.
 */
export function GroupedListingsCarousel({ groups }: GroupedListingsCarouselProps) {
  const visibleGroups = groups.filter((g) => g.items.length > 0);
  if (visibleGroups.length === 0) return null;

  return (
    <Stack gap="xl">
      {visibleGroups.map((group) => {
        const items: ProductItem[] = group.items.map((p) => toProductItem(p as unknown as FirestoreDocument));
        return (
          <SectionCarousel
            key={group.id}
            title={group.title || GROUP_THEME_TITLE[group.groupTheme]}
            pillLabel="Grouped Listings"
            headingVariant="editorial"
            items={items}
            isLoading={false}
            perView={CAROUSEL_PER_VIEW.standard}
            keyExtractor={(item: ProductItem) => item.id}
            renderItem={(item: ProductItem) => (
              <ProductCard
                product={item}
                href={item.slug || item.id ? pluginFor(item.listingType ?? "standard").detailRoute(item.slug || item.id) : undefined}
              />
            )}
          />
        );
      })}
    </Stack>
  );
}
