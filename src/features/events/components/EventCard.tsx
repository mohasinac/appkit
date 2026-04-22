import { Article, Button, Div, Heading, RichText, Span, Text } from "../../../ui";
import { normalizeRichTextHtml } from "../../../utils/string.formatter";
import type { EventItem, EventType } from "../types";
import { EVENT_FIELDS } from "../schemas";
import { EventStatusBadge } from "./EventStatusBadge";

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
    viewResults?: string;
    entries?: string;
  };
  onParticipate?: (event: EventItem) => void;
  className?: string;
}

export function EventCard({
  event,
  labels = {},
  onParticipate,
  className = "",
}: EventCardProps) {
  const now = new Date();
  const endsAt = new Date(event.endsAt);
  const msLeft = endsAt.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));

  return (
    <Article
      className={`flex flex-col h-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-sm hover:shadow-md transition-shadow ${className}`}
    >
      {event.coverImageUrl && (
        <Div className="aspect-video overflow-hidden">
          <Div
            role="img"
            aria-label={event.title}
            className="h-full w-full bg-cover bg-center"
            style={{ backgroundImage: `url(${event.coverImageUrl})` }}
          />
        </Div>
      )}
      <Div className="p-4 flex-1 flex flex-col">
        <Div className="flex items-start justify-between gap-2 mb-2">
          <Span className="text-lg" aria-hidden="true">
            {TYPE_ICONS[event.type]}
          </Span>
          <EventStatusBadge status={event.status} />
        </Div>
        <Heading
          level={3}
          className="font-semibold text-gray-900 dark:text-zinc-100 text-base leading-snug mb-1"
        >
          {event.title}
        </Heading>
        <RichText
          html={normalizeRichTextHtml(event.description ?? "")}
          proseClass="prose prose-sm max-w-none dark:prose-invert prose-p:my-0"
          className="text-sm text-gray-500 dark:text-zinc-400 line-clamp-2 mb-3"
        />

        <Div className="flex items-center justify-between text-xs text-gray-400 dark:text-zinc-500 mb-3">
          {event.status === EVENT_FIELDS.STATUS_VALUES.ACTIVE &&
            daysLeft > 0 && <Span>{daysLeft}d remaining</Span>}
          <Span>
            {event.stats.totalEntries} {labels.entries ?? "entries"}
          </Span>
        </Div>

        {event.status === EVENT_FIELDS.STATUS_VALUES.ACTIVE &&
          onParticipate && (
            <Button
              type="button"
              onClick={() => onParticipate(event)}
              className="w-full rounded-lg bg-orange-500 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
            >
              {labels.participate ?? "Participate"}
            </Button>
          )}
      </Div>
    </Article>
  );
}
