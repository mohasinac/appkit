"use client";

import Link from "next/link";
import { Article, BaseListingCard, Button, Div, Heading, RichText, Row, Span, Stack, TextLink } from "../../../ui";
import { LAYOUT } from "../../../tokens";
import { normalizeRichTextHtml } from "../../../utils/string.formatter";
import type { EventItem, EventType } from "../types";
import { EVENT_FIELDS } from "../schemas";
import { EventStatusBadge } from "./EventStatusBadge";
import { ROUTES } from "../../../next";
import { useLongPress } from "../../../react/hooks/useLongPress";

const __P = {
  p4: "p-4",
} as const;

const __O = {
  hidden: "overflow-hidden",
} as const;

const TYPE_ICONS: Record<EventType, string> = {
  sale: "🏷️",
  offer: "🎁",
  poll: "📊",
  survey: "📝",
  feedback: "💬",
  raffle: "🎟️",
  spin_wheel: "🎡",
};

interface EventCardProps {
  event: EventItem;
  labels?: {
    participate?: string;
    viewDetails?: string;
    viewResults?: string;
    entries?: string;
  };
  onParticipate?: (event: EventItem) => void;
  className?: string;
  selectable?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
}

export function EventCard({
  event,
  labels = {},
  onParticipate,
  className = "",
  selectable = false,
  isSelected = false,
  onSelect,
}: EventCardProps) {
  const longPress = useLongPress(() => onSelect?.(event.id, !isSelected));
  const safeTitle = event.title?.trim() || "Untitled event";
  const now = new Date();
  const endsAt = new Date(event.endsAt);
  const msLeft = endsAt.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));

  const detailHref = String(ROUTES.PUBLIC.EVENT_DETAIL(event.slug ?? event.id));

  return (
    <Article border="default" 
      className={`group relative flex h-full ${LAYOUT.cardHeight.event} flex-col overflow-hidden rounded-xl bg-white shadow-sm transition-shadow hover:shadow-md dark:bg-slate-900 ${isSelected ? "border-primary outline outline-2 outline-primary" : " "} ${className}`}
      onMouseDown={onSelect && !isSelected ? longPress.onMouseDown : undefined}
      onMouseUp={onSelect && !isSelected ? longPress.onMouseUp : undefined}
      onMouseLeave={onSelect && !isSelected ? longPress.onMouseLeave : undefined}
      onTouchStart={onSelect && !isSelected ? longPress.onTouchStart : undefined}
      onTouchEnd={onSelect && !isSelected ? longPress.onTouchEnd : undefined}
    >
      {onSelect && (
        <BaseListingCard.Checkbox
          selected={isSelected}
          onSelect={(e) => { e.preventDefault(); onSelect(event.id, !isSelected); }}
          label={isSelected ? "Deselect event" : "Select event"}
          position="top-2 left-2"
          className={selectable || isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100 transition-opacity"}
        />
      )}
      <Link href={detailHref} className="block flex-shrink-0">
        {event.coverImageUrl ? (
          <Div className={`aspect-video ${__O.hidden}`}>
            <Div
              role="img"
              aria-label={safeTitle}
              className="h-full w-full bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
              // audit-inline-style-ok: dynamic image URL
              style={{ backgroundImage: `url(${event.coverImageUrl})` }}
            />
          </Div>
        ) : (
          <Row surface="muted" className="aspect-video" align="center" justify="center">
            <Span className="opacity-40" size="5xl" aria-hidden="true">
              {TYPE_ICONS[event.type]}
            </Span>
          </Row>
        )}
      </Link>
      <Stack className={`flex-1 ${__P.p4}`}>
        <Row className="mb-2" align="start" justify="between" gap="sm">
          <Span size="lg" aria-hidden="true">
            {TYPE_ICONS[event.type]}
          </Span>
          <EventStatusBadge status={event.status} />
        </Row>
        <Link href={detailHref} className="block">
          <Heading
            level={3}
            className="text-gray-900 leading-snug mb-1 group-hover:text-primary transition-colors" size="base" weight="semibold"
          >
            {safeTitle}
          </Heading>
        </Link>
        <RichText
          html={normalizeRichTextHtml(event.description ?? "")}
          proseClass="prose prose-sm max-w-none dark:prose-invert prose-p:my-0"
          className="mb-3 line-clamp-3 text-sm text-zinc-600 dark:text-zinc-400"
        />

        <Row color="muted" textSize="xs" className="mb-3 mt-auto" align="center" justify="between">
          {event.status === EVENT_FIELDS.STATUS_VALUES.ACTIVE &&
            daysLeft > 0 && <Span>⏱ {daysLeft}d remaining</Span>}
          <Span>
            👥 {event.stats.totalEntries} {labels.entries ?? "entries"}
          </Span>
        </Row>

        {event.status === EVENT_FIELDS.STATUS_VALUES.ACTIVE && onParticipate ? (
          <Button rounded="lg" 
            type="button"
            onClick={() => onParticipate(event)}
            className="w-full bg-primary py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
          >
            {labels.participate ?? "Participate"}
          </Button>
        ) : (
          <TextLink rounded="lg" 
            href={detailHref}
            className="inline-flex w-full items-center justify-center gap-1.5 border border-zinc-300 px-3 py-2 transition-colors hover:bg-zinc-100 dark:border-slate-600 dark:hover:bg-slate-800" color="primary" size="sm" weight="medium"
          >
            {labels.viewDetails ?? "View details"} →
          </TextLink>
        )}
      </Stack>
    </Article>
  );
}
