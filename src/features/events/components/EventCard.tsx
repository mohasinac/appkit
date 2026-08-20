"use client";

import Link from "next/link";
import { BaseListingCard, Button, Div, Heading, RichText, Row, Span, Stack, TextLink } from "../../../ui";
import { MediaImage } from "../../media/MediaImage";
import { normalizeRichTextHtml } from "../../../utils/string.formatter";
import type { EventItem, EventType } from "../types";
import { EVENT_FIELDS } from "../schemas";
import { EventStatusBadge } from "./EventStatusBadge";
import { ROUTES } from "../../../next";
import { useLongPress } from "../../../react/hooks/useLongPress";

const __P = {
  p4: "p-[var(--appkit-space-4)]",
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
  lottery: "🎰",
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
    <Stack as="article" border="default"
      rounded="xl" shadow="hover-md" gap="none"
      className={`group relative h-full overflow-hidden bg-[var(--appkit-color-surface)] ${isSelected ? "border-primary outline outline-2 outline-primary" : " "} ${className}`}
      onMouseDown={onSelect && !isSelected ? longPress.onMouseDown : undefined}
      onMouseUp={onSelect && !isSelected ? longPress.onMouseUp : undefined}
      onMouseLeave={onSelect && !isSelected ? longPress.onMouseLeave : undefined}
      onTouchStart={onSelect && !isSelected ? longPress.onTouchStart : undefined}
      onTouchEnd={onSelect && !isSelected ? longPress.onTouchEnd : undefined}
      onTouchCancel={onSelect && !isSelected ? longPress.onTouchCancel : undefined}
    >
      {onSelect && (
        <BaseListingCard.Checkbox
          selected={isSelected}
          onSelect={(e) => { e.preventDefault(); onSelect(event.id, !isSelected); }}
          label={isSelected ? "Deselect event" : "Select event"}
          position="top-2 left-2"
          className={selectable || isSelected ? "opacity-100" : "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity"}
        />
      )}
      <Link href={detailHref} className="block flex-shrink-0">
        {event.coverImageUrl || event.coverImage?.url ? (
          <Div className={`relative aspect-video ${__O.hidden}`}>
            <MediaImage
              src={event.coverImageUrl || event.coverImage?.url || ""}
              alt={safeTitle}
              size="card"
              className="transition-transform duration-300 group-hover:scale-105"
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
            className="text-[var(--appkit-color-text)] leading-snug mb-1 group-hover:text-primary transition-colors" size="base" weight="semibold"
          >
            {safeTitle}
          </Heading>
        </Link>
        <RichText
          html={normalizeRichTextHtml(event.description ?? "")}
          proseClass="prose prose-sm max-w-none dark:prose-invert prose-p:my-0"
          className="mb-3 line-clamp-3 text-[length:var(--appkit-text-sm)] text-[var(--appkit-color-text-muted)]"
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
            className="w-full bg-primary py-[var(--appkit-space-2)] text-[length:var(--appkit-text-sm)] font-medium text-white transition-colors hover:bg-primary-600"
          >
            {labels.participate ?? "Participate"}
          </Button>
        ) : (
          <TextLink rounded="lg" paddingX="sm" paddingY="xs"
            href={detailHref}
            layout="inline-flex" align="center" justify="center" gap="xs"
            className="w-full border border-[var(--appkit-color-border)] transition-colors hover:bg-[var(--appkit-color-bg)]" color="primary" size="sm" weight="medium"
          >
            {labels.viewDetails ?? "View details"} →
          </TextLink>
        )}
      </Stack>
    </Stack>
  );
}
