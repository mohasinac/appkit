"use client";
import React from "react";
import { ROUTES } from "../../../next/routing/route-map";
import { joinHrefPrefix } from "../../../next/routing/section-routes";
import { TextLink } from "../../../ui/components/TextLink";
import { SectionCarousel } from "../../homepage/components/SectionCarousel";
import { MediaImage } from "../../../ui/components/MediaImage";
import { Div } from "../../../ui/components/Div";
import { Heading } from "../../../ui/components/Typography";
import { Stack } from "../../../ui/components/Layout";
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
  /** See `EventCard.hrefPrefix`. Omit to resolve via the section registry. */
  hrefPrefix?: string;
  items: RelatedEventItem[];
  title?: string;
}

export function RelatedEventsCarousel({
  hrefPrefix, items,
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
        <TextLink
          variant="bare"
          /* Unresolved on purpose — `TextLink` runs it through the section
             registry, which is the one place that knows who owns `/events`. */
          href={
            hrefPrefix === undefined
              ? String(ROUTES.PUBLIC.EVENT_DETAIL(item.slug || item.id))
              : joinHrefPrefix(hrefPrefix, item.slug || item.id)
          }
          className="block h-full"
        >
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
        </TextLink>
      )}
    />
  );
}
