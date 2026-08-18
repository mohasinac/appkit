"use client";
import React from "react";

import { SectionCarousel } from "./SectionCarousel";
import { useHomepageEvents } from "../hooks/useHomepageEvents";
import { EventCard } from "../../events/components/EventCard";
import type { EventItem } from "../../events/types";
import { CAROUSEL_PER_VIEW } from "../constants/carousel-per-view";

export interface EventsSectionProps {
  title?: string;
  description?: string;
  viewMoreHref?: string;
  viewMoreLabel?: string;
  limit?: number;
  className?: string;
  initialItems?: EventItem[];
  autoScroll?: boolean;
  scrollInterval?: number;
  loop?: boolean;
}

export function EventsSection({
  title = "Events & Offers",
  description,
  viewMoreHref,
  viewMoreLabel = "View all events →",
  limit = 6,
  className = "",
  initialItems,
  autoScroll = false,
  scrollInterval = 5000,
  loop = true,
}: EventsSectionProps) {
  const { data: items = [], isLoading } = useHomepageEvents(limit, { initialData: initialItems });

  return (
    <SectionCarousel
      title={title}
      description={description}
      pillLabel="Events & Offers"
      headingVariant="editorial"
      viewMoreHref={viewMoreHref}
      viewMoreLabel={viewMoreLabel}
      items={items}
      isLoading={isLoading}
      skeletonCount={3}
      perView={CAROUSEL_PER_VIEW.events}
      gap={16}
      autoScroll={autoScroll}
      autoScrollInterval={scrollInterval}
      loop={loop}
      keyExtractor={(event: EventItem) => event.id}
      renderItem={(event: EventItem) => (
        <EventCard event={event} />
      )}
      className={className}
    />
  );
}
