"use client";

import Link from "next/link";
import { BaseListingCard } from "../../../ui/components/BaseListingCard";
import { Button } from "../../../ui/components/Button";
import { Div } from "../../../ui/components/Div";
import { Heading, Span } from "../../../ui/components/Typography";
import { RichText } from "../../../ui/rich-text/RichText";
import { Row, Stack } from "../../../ui/components/Layout";
import { TextLink } from "../../../ui/components/TextLink";
import { MediaImage } from "../../media/MediaImage";
import { normalizeRichTextHtml } from "../../../utils/string.formatter";
import type { EventItem } from "../types";
import { EVENT_FIELDS } from "../schemas";
import { EventStatusBadge } from "./EventStatusBadge";
import { EventTypeBadge } from "./EventTypeBadge";
import { eventTypeMeta } from "../constants/event-type-meta";
import { ROUTES } from "../../../next/routing/route-map";
import { useLongPress } from "../../../react/hooks/useLongPress";
import { RecordOwnerQuickActions } from "../../admin/components/RecordOwnerQuickActions";

const __P = {
  p4: "p-[var(--appkit-space-4)]",
} as const;

const __O = {
  hidden: "overflow-hidden",
} as const;


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
  /**
   * Owner-only pencil / clone / bin, for an admin or whoever owns this record.
   * Pass `<OwnerQuickActions>`; it renders nothing for anyone else.
   *
   * 🛑 Rendered OUTSIDE this card's own `<Link>`/`<TextLink>`, as a sibling.
   * A `<button>` inside an `<a>` is invalid HTML that browsers resolve by
   * closing the anchor early, which breaks the CARD's navigation rather than
   * just the button's — `stopPropagation` stops a click but cannot fix a parse.
   */
  renderOwnerActions?: () => React.ReactNode;
}

export function EventCard({
  event,
  labels = {},
  onParticipate,
  className = "",
  selectable = false,
  isSelected = false,
  onSelect,
  renderOwnerActions,
}: EventCardProps) {
  const longPress = useLongPress(() => onSelect?.(event.id, !isSelected));
  const safeTitle = event.title?.trim() || "Untitled event";
  const now = new Date();
  const endsAt = new Date(event.endsAt);
  const msLeft = endsAt.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));

  const detailHref = String(ROUTES.PUBLIC.EVENT_DETAIL(event.slug ?? event.id));

  const card = (
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
              {eventTypeMeta(event.type).emoji}
            </Span>
          </Row>
        )}
      </Link>
      <Stack className={`flex-1 ${__P.p4}`}>
        {/*
          * 🛑 A LABELLED type chip, not a bare emoji. This row used to render
          * `<Span aria-hidden>{TYPE_ICONS[type]}</Span>` with no text
          * companion anywhere on the card, so a screen-reader user got no
          * event type at all — and the private TYPE_ICONS map was unreachable
          * from the detail hero, which printed the raw enum instead
          * ("Spin_wheel"). Both now resolve to EVENT_TYPE_META.
          */}
        <Row className="mb-2" align="start" justify="between" gap="sm">
          <EventTypeBadge type={event.type} />
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

        {/*
          * 🛑 LIKES, NOT ENTRIES. This row read `stats.totalEntries` as
          * "N entries" on every event type. Nobody "enters" a cashback code,
          * so on an `offer` or a `sale` — which is most of the corpus — it was
          * structurally 0 and the label meant nothing. A like works on every
          * type. Entries are still shown where they are real: participate,
          * leaderboard, and every admin surface.
          *
          * `likeCount` is OPTIONAL, so `?? 0` is required — every event
          * written before the field exists has no value for it.
          */}
        <Row color="muted" textSize="xs" className="mb-3 mt-auto" align="center" justify="between">
          {event.status === EVENT_FIELDS.STATUS_VALUES.ACTIVE &&
            daysLeft > 0 && <Span>⏱ {daysLeft}d remaining</Span>}
          <Span>
            ♥ {event.stats.likeCount ?? 0}{" "}
            {(event.stats.likeCount ?? 0) === 1 ? "like" : "likes"}
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

  /*
   * 🛑 Default, not opt-in. Nothing in either repo ever passed
   * `renderOwnerActions`, so this toolbar was unreachable on every grid that
   * mounts this card (Root Cause #8 — a slot shell rendered with zero render
   * props). A card is resource-specific by construction, so it names its own
   * resource rather than being threaded one; the prop stays as an override.
   */
  const ownerActions = renderOwnerActions
    ? renderOwnerActions()
    : event.id
      ? (
          <RecordOwnerQuickActions resource="EVENT" recordId={String(event.id)} recordLabel={event.title} placement="card" />
        )
      : null;

  if (!ownerActions) return card;
  /*
   * Sibling of the card, never a child — see the prop's docstring. `z-20`
   * beats this card's own overlays, which all sit at `z-10`.
   */
  return (
    <Div className="relative h-full">
      {card}
      <Div className="absolute right-2 top-2 z-20">{ownerActions}</Div>
    </Div>
  );
}
