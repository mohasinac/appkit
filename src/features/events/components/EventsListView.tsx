import React from "react";
import { Div, Pagination, Row, Text } from "../../../ui";
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
            className="animate-pulse overflow-hidden dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800" rounded="xl" border="default"
          >
            <Div className="aspect-video bg-zinc-200 dark:bg-zinc-700" />
            <Div className={`space-y-2 ${__P.p4}`}>
              <Div className="h-4 w-16 rounded bg-zinc-200 dark:bg-zinc-700" />
              <Div className="h-5 w-full rounded bg-zinc-200 dark:bg-zinc-700" />
              <Div className="h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-700" />
            </Div>
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
      <Text className="py-12 text-zinc-500 dark:text-zinc-400" size="sm" align="center">
        {emptyLabel}
      </Text>
    );
  }

  return (
    <Div className="space-y-8">
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
    </Div>
  );
}
