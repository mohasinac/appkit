import Link from "next/link";
import { Article, BaseListingCard, Button, Div, Heading, RichText, Span, TextLink } from "../../../ui";
import { THEME_CONSTANTS, LAYOUT } from "../../../tokens";
import { normalizeRichTextHtml } from "../../../utils/string.formatter";
import type { EventItem, EventType } from "../types";
import { EVENT_FIELDS } from "../schemas";
import { EventStatusBadge } from "./EventStatusBadge";
import { ROUTES } from "../../../next";
import { useLongPress } from "../../../react/hooks/useLongPress";

const TYPE_ICONS: Record<EventType, string> = {
  sale: "🏷️",
  offer: "🎁",
  poll: "📊",
  survey: "📝",
  feedback: "💬",
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
    <Article
      className={`group relative flex h-full ${LAYOUT.cardHeight.event} flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md dark:bg-slate-900 ${isSelected ? "border-primary outline outline-2 outline-primary" : "border-zinc-200 dark:border-slate-700"} ${className}`}
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
          <Div className="aspect-video overflow-hidden">
            <Div
              role="img"
              aria-label={safeTitle}
              className="h-full w-full bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
              style={{ backgroundImage: `url(${event.coverImageUrl})` }}
            />
          </Div>
        ) : (
          <Div className="aspect-video bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center">
            <span className="text-5xl opacity-40" aria-hidden="true">
              {TYPE_ICONS[event.type]}
            </span>
          </Div>
        )}
      </Link>
      <Div className="flex flex-1 flex-col p-4">
        <Div className="flex items-start justify-between gap-2 mb-2">
          <Span className="text-lg" aria-hidden="true">
            {TYPE_ICONS[event.type]}
          </Span>
          <EventStatusBadge status={event.status} />
        </Div>
        <Link href={detailHref} className="block">
          <Heading
            level={3}
            className="font-semibold text-gray-900 dark:text-zinc-100 text-base leading-snug mb-1 group-hover:text-primary transition-colors"
          >
            {safeTitle}
          </Heading>
        </Link>
        <RichText
          html={normalizeRichTextHtml(event.description ?? "")}
          proseClass="prose prose-sm max-w-none dark:prose-invert prose-p:my-0"
          className={`mb-3 ${THEME_CONSTANTS.utilities.textClamp3} text-sm text-zinc-600 dark:text-zinc-400`}
        />

        <Div className="mb-3 mt-auto flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-500">
          {event.status === EVENT_FIELDS.STATUS_VALUES.ACTIVE &&
            daysLeft > 0 && <Span>⏱ {daysLeft}d remaining</Span>}
          <Span>
            👥 {event.stats.totalEntries} {labels.entries ?? "entries"}
          </Span>
        </Div>

        {event.status === EVENT_FIELDS.STATUS_VALUES.ACTIVE && onParticipate ? (
          <Button
            type="button"
            onClick={() => onParticipate(event)}
            className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
          >
            {labels.participate ?? "Participate"}
          </Button>
        ) : (
          <TextLink
            href={detailHref}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-slate-600 dark:text-zinc-200 dark:hover:bg-slate-800"
          >
            {labels.viewDetails ?? "View details"} →
          </TextLink>
        )}
      </Div>
    </Article>
  );
}
