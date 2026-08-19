"use client";
import React from "react";
import Link from "next/link";
import { ROUTES } from "../../../next";
import { SectionCarousel } from "../../homepage/components/SectionCarousel";
import { MediaImage } from "../../media/MediaImage";
import { Div, Heading, Stack } from "../../../ui";
import type { MediaField } from "../../media/types";
import { CAROUSEL_PER_VIEW } from "../../homepage/constants/carousel-per-view";

export interface RelatedEventItem {
  id: string;
  slug?: string;
  title: string;
  coverImage?: MediaField | null;
  coverImageUrl?: string;
}

interface RelatedEventsCarouselProps {
  items: RelatedEventItem[];
  title?: string;
}

export function RelatedEventsCarousel({
  items,
  title = "Related Events",
}: RelatedEventsCarouselProps) {
  if (items.length === 0) return null;

  return (
    <SectionCarousel
      title={title}
      pillLabel="Related Events"
      headingVariant="editorial"
      items={items}
      isLoading={false}
      perView={CAROUSEL_PER_VIEW.standard}
      keyExtractor={(item: RelatedEventItem) => item.id}
      renderItem={(item: RelatedEventItem) => (
        <Link href={String(ROUTES.PUBLIC.EVENT_DETAIL(item.slug || item.id))} className="block h-full">
          <Stack className="h-full" surface="default" rounded="xl" border="default" overflow="hidden">
            <Div surface="muted" overflow="hidden" className="relative aspect-[4/3] w-full flex-shrink-0">
              {(item.coverImage?.url || item.coverImageUrl) && (
                <MediaImage src={(item.coverImage?.url || item.coverImageUrl)!} alt={item.title} size="card" />
              )}
            </Div>
            <Heading level={3} className="p-[var(--appkit-space-3)]" truncate={2} size="sm" weight="semibold">
              {item.title}
            </Heading>
          </Stack>
        </Link>
      )}
    />
  );
}
