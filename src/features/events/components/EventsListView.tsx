import React from "react";
import { Button, Text } from "@mohasinac/ui";
import type { LayoutSlots } from "@mohasinac/contracts";
import type { EventItem } from "../types";
import { EventCard } from "./EventCard";

interface EventsListViewProps<T extends EventItem = EventItem> {
  events: T[];
  isLoading?: boolean;
  totalPages?: number;
  currentPage?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  onParticipate?: (event: T) => void;
  emptyLabel?: string;
  /** Render-prop slot overrides — pass via `FeatureExtension.slots`. */
  slots?: LayoutSlots<T>;
}

export function EventsListView<T extends EventItem = EventItem>({
  events,
  isLoading,
  totalPages = 1,
  currentPage = 1,
  total = 0,
  onPageChange,
  onParticipate,
  emptyLabel = "No events found",
  slots,
}: EventsListViewProps<T>) {
  if (isLoading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100"
          >
            <div className="aspect-video bg-neutral-200" />
            <div className="space-y-2 p-4">
              <div className="h-4 w-16 rounded bg-neutral-200" />
              <div className="h-5 w-full rounded bg-neutral-200" />
              <div className="h-4 w-3/4 rounded bg-neutral-200" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    if (slots?.renderEmptyState) {
      return <>{slots.renderEmptyState() as React.ReactNode}</>;
    }
    return (
      <Text className="py-12 text-center text-sm text-neutral-500">
        {emptyLabel}
      </Text>
    );
  }

  return (
    <div className="space-y-8">
      {slots?.renderHeader
        ? (slots.renderHeader({ total }) as React.ReactNode)
        : null}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event, i) =>
          slots?.renderCard ? (
            <React.Fragment key={event.id}>
              {slots.renderCard(event, i) as React.ReactNode}
            </React.Fragment>
          ) : (
            <EventCard
              key={event.id}
              event={event as EventItem}
              onParticipate={
                onParticipate ? (e) => onParticipate(e as T) : undefined
              }
            />
          ),
        )}
      </div>
      {slots?.renderFooter ? (
        (slots.renderFooter({
          page: currentPage,
          totalPages,
        }) as React.ReactNode)
      ) : totalPages > 1 && onPageChange ? (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Button
              key={p}
              onClick={() => onPageChange(p)}
              className={`h-9 w-9 rounded-lg text-sm font-medium transition ${p === currentPage ? "bg-neutral-900 text-white" : "border border-neutral-200 text-neutral-600 hover:bg-neutral-100"}`}
            >
              {p}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
