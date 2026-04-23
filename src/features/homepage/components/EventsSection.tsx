"use client";
import React from "react";
import { SectionCarousel } from "./SectionCarousel";
import { useHomepageEvents } from "../hooks/useHomepageEvents";
import { EventCard } from "../../events/components/EventCard";
import type { EventItem } from "../../events/types";

export interface EventsSectionProps {
  title?: string;
  description?: string;
  viewMoreHref?: string;
  viewMoreLabel?: string;
  limit?: number;
  className?: string;
}

export function EventsSection({
  title = "Events & Offers",
  description,
  viewMoreHref,
  viewMoreLabel = "View all events →",
  limit = 6,
  className = "",
}: EventsSectionProps) {
  const { data: items = [], isLoading } = useHomepageEvents(limit);

  return (
    <SectionCarousel
      title={title}
      description={description}
      viewMoreHref={viewMoreHref}
      viewMoreLabel={viewMoreLabel}
      items={items}
      isLoading={isLoading}
      skeletonCount={3}
      perView={{ base: 1, sm: 2, md: 3, lg: 3 }}
      gap={16}
      keyExtractor={(event: EventItem) => event.id}
      renderItem={(event: EventItem) => (
        <EventCard event={event} />
      )}
      className={className}
    />
  );
}
