import React from "react";
import { Div, Pagination, Row, Stack, Text } from "../../../ui";
import type { LayoutSlots } from "../../../contracts";
import type { EventItem } from "../types";
import { EventCard } from "./EventCard";

const __P = {
  p4: "p-4",
} as const;

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
      <Div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Div
            key={i}
            className="animate-pulse overflow-hidden" surface="subtle" rounded="xl" border="default"
          >
            <Div className="aspect-video" surface="subtle" />
            <Stack className={`${__P.p4}`} gap="sm">
              <Div className="h-4 w-16" surface="subtle" rounded="default" />
              <Div className="h-5 w-full" surface="subtle" rounded="default" />
              <Div className="h-4 w-3/4" surface="subtle" rounded="default" />
            </Stack>
          </Div>
        ))}
      </Div>
    );
  }

  if (events.length === 0) {
    if (slots?.renderEmptyState) {
      return <>{slots.renderEmptyState() as React.ReactNode}</>;
    }
    return (
      <Text className="py-12" color="muted" size="sm" align="center">
        {emptyLabel}
      </Text>
    );
  }

  return (
    <Stack gap="xl">
      {slots?.renderHeader
        ? (slots.renderHeader({ total }) as React.ReactNode)
        : null}
      <Div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
      </Div>
      {slots?.renderFooter ? (
        (slots.renderFooter({
          page: currentPage,
          totalPages,
        }) as React.ReactNode)
      ) : totalPages > 1 && onPageChange ? (
        <Row justify="center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </Row>
      ) : null}
    </Stack>
  );
}
