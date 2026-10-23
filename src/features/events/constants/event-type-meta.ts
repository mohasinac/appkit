/**
 * The ONE description of what an event type looks like and is called.
 *
 * ## Why this file exists
 *
 * The type had two unrelated visual languages and no shared label:
 *
 *  - The DETAIL HERO printed the raw enum under a CSS `capitalize`, so
 *    `spin_wheel` rendered as the literal text **"Spin_wheel"** — the
 *    underscore was never humanised anywhere.
 *  - The CARD used a private `TYPE_ICONS` emoji map inside a `"use client"`
 *    component, unexported and therefore unreachable from the hero.
 *  - The COLOURS lived in a third place (`_constants.ts`), where `offer` and
 *    `survey` shared one class string and `feedback` and `raffle` shared
 *    another — so four of the eight types were not visually distinguishable.
 *  - Both emoji were `aria-hidden` with NO text companion, so a screen-reader
 *    user got no event type from a card at all.
 *
 * 🛑 `Record<EventType, …>` is the point. A ninth event type is a COMPILE
 * ERROR here rather than a silently missing badge — the failure mode Root
 * Cause #61 describes, where ten hand-written enumerations of one union
 * drifted and nine of them never learned about the new member.
 *
 * @tag domain:events
 * @tag layer:constants
 */

import type { EventType } from "../types";

export interface EventTypeMeta {
  /** Human label. Title case, never the raw enum. */
  label: string;
  /** Decorative glyph. ALWAYS paired with `label` for a screen reader. */
  emoji: string;
  /**
   * The chip pairing. 🛑 `bg-{status}-surface` with `text-{status}` — both
   * invert together with the theme, which is what keeps them readable in
   * light and dark. Never pair either with a literal `text-white`: that is
   * invisible in exactly one theme (Root Cause #67).
   */
  chipClass: string;
  /** One line explaining what this kind of event is, for the hero subhead. */
  blurb: string;
}

export const EVENT_TYPE_META: Record<EventType, EventTypeMeta> = {
  sale: {
    label: "Sale",
    emoji: "🏷️",
    chipClass: "bg-success-surface text-success",
    blurb: "Reduced prices for a limited window.",
  },
  offer: {
    label: "Offer",
    emoji: "🎁",
    chipClass: "bg-primary-surface text-primary",
    blurb: "A code to use at checkout.",
  },
  poll: {
    label: "Poll",
    emoji: "📊",
    chipClass: "bg-info-surface text-info",
    blurb: "Vote — the result decides what we do next.",
  },
  survey: {
    label: "Survey",
    emoji: "📝",
    // Was identical to `offer`. Distinct now: a survey asks, an offer gives.
    chipClass: "bg-secondary-surface text-secondary",
    blurb: "A few questions, and your answers shape the answer.",
  },
  feedback: {
    label: "Feedback",
    emoji: "💬",
    chipClass: "bg-warning-surface text-warning",
    blurb: "Tell us what is working and what is not.",
  },
  raffle: {
    label: "Raffle",
    emoji: "🎟️",
    // Was identical to `feedback`. A prize draw is not a comment box.
    chipClass: "bg-accent-surface text-accent",
    blurb: "Free to enter. One entry, one winner.",
  },
  spin_wheel: {
    // 🛑 THE BUG THIS FILE IS NAMED FOR. `capitalize` on the raw enum
    // produced "Spin_wheel" on every spin event's hero.
    label: "Spin the Wheel",
    emoji: "🎡",
    chipClass: "bg-error-surface text-error",
    blurb: "One spin, one prize, straight to your wallet.",
  },
  lottery: {
    label: "Lottery",
    emoji: "🎰",
    chipClass: "bg-info-surface text-info",
    blurb: "Pick a numbered slot and claim its prize.",
  },
};

/**
 * Safe lookup for a value that arrived as a plain string — an API response, a
 * URL parameter, a document written before a type existed.
 *
 * Falls back to a NEUTRAL chip with the raw value humanised, rather than to
 * one of the real types: mislabelling a raffle as an offer is worse than
 * admitting we do not recognise it.
 */
export function eventTypeMeta(type: string | undefined): EventTypeMeta {
  const known = type ? EVENT_TYPE_META[type as EventType] : undefined;
  if (known) return known;
  return {
    label: humaniseEventType(type),
    emoji: "📅",
    chipClass: "bg-surface text-muted",
    blurb: "",
  };
}

/** `spin_wheel` -> `Spin Wheel`. The thing CSS `capitalize` cannot do. */
export function humaniseEventType(type: string | undefined): string {
  if (!type) return "Event";
  return type
    .split(/[_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
