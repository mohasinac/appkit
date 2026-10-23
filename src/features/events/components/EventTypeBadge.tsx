/**
 * The event-type chip. Emoji plus a real label, always both.
 *
 * 🛑 THE LABEL IS NOT OPTIONAL, and that is the accessibility half of this
 * component. `EventCard` rendered the type as a bare `aria-hidden` emoji with
 * no text companion anywhere on the card, so a screen-reader user got no
 * event type at all; the detail hero rendered the raw enum. Neither surface
 * could reach the other's map. This is the shared one.
 *
 * @tag domain:events
 * @tag layer:component
 */

import React from "react";
import { Span } from "../../../ui";
import { eventTypeMeta } from "../constants/event-type-meta";

export interface EventTypeBadgeProps {
  type: string | undefined;
  /**
   * Hide the text and keep only the glyph — for a dense card corner where the
   * label is already rendered nearby.
   *
   * 🛑 Even then an `aria-label` carries the real label, so the type is never
   * lost to a screen reader. A silent emoji is not a badge.
   */
  compact?: boolean;
  className?: string;
}

export function EventTypeBadge({ type, compact = false, className = "" }: EventTypeBadgeProps) {
  const meta = eventTypeMeta(type);

  return (
    <Span
      layout="inline-flex"
      align="center"
      gap="xs"
      padding="pill-sm"
      rounded="full"
      size="xs"
      weight="semibold"
      className={`${meta.chipClass} ${className}`}
      aria-label={compact ? meta.label : undefined}
    >
      <Span aria-hidden="true">{meta.emoji}</Span>
      {!compact && meta.label}
    </Span>
  );
}
