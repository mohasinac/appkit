/**
 * The ONE description of what an event type looks like and is called.
 *
 * ## Why this file exists
 *
 * The type had two unrelated visual languages and no shared label:
 *
 *  - The DETAIL HERO printed the raw enum under a CSS `capitalize`, so the
 *    then-`spin_wheel` type rendered as the literal text **"Spin_wheel"** —
 *    the underscore was never humanised anywhere. (That value is `bonus-spin`
 *    since 2026-10-31; `humaniseEventType` splits on `_` and `-` alike, so
 *    the hyphen is no safer than the underscore was and the `label` below is
 *    still the only thing that should ever render.)
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

import { normalizeEventType, type EventType } from "../types";

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
  giveaway: {
    label: "Giveaway",
    emoji: "🎟️",
    // Was identical to `feedback`. A giveaway is not a comment box.
    chipClass: "bg-accent-surface text-accent",
    blurb: "Free to enter. One entry, one winner.",
  },
  "bonus-spin": {
    // 🛑 THE BUG THIS FILE IS NAMED FOR. `capitalize` on the raw enum
    // produced "Spin_wheel" on every spin event's hero. The value is
    // hyphenated now, which `humaniseEventType` splits on either way — the
    // label here is still what renders, and still must not be the raw enum.
    label: "Bonus Spin",
    emoji: "🎡",
    chipClass: "bg-error-surface text-error",
    blurb: "One spin, one prize, straight to your wallet.",
  },
  "random-draw": {
    label: "Random Draw",
    emoji: "🎰",
    // 🛑 Carried over UNCHANGED from `lottery`, and it is still identical to
    // `poll` — the very defect this file's header records for offer/survey
    // and feedback/raffle, one pair it never fixed.
    //
    // Deliberately not "fixed" here: only `success`/`warning`/`error`/`info`
    // (+`primary`) have a real `-surface` sub-key in configs/tailwind.cjs, and
    // all five are already taken by the other types. A made-up
    // `bg-cobalt-surface` generates NO class at all and the chip would render
    // with no colour — silently, which is worse than a duplicate (Root Cause
    // #67). Giving this type its own colour needs a new token, not a rename.
    //
    // (Same latent problem, also pre-existing: `survey`'s
    // `bg-secondary-surface` and `giveaway`'s `bg-accent-surface` have no
    // `-surface` sub-key either.)
    chipClass: "bg-info-surface text-info",
    blurb: "Pick a numbered slot and claim its prize.",
  },
};

/**
 * Safe lookup for a value that arrived as a plain string — an API response, a
 * URL parameter, a document written before a type existed.
 *
 * Falls back to a NEUTRAL chip with the raw value humanised, rather than to
 * one of the real types: mislabelling a giveaway as an offer is worse than
 * admitting we do not recognise it.
 *
 * 🛑 Resolves through `normalizeEventType`, so a document still holding
 * `raffle` / `spin_wheel` / `lottery` renders its real chip rather than the
 * neutral fallback. Without that, every pre-migration event on the site would
 * silently drop to a grey "Raffle" pill — present, plausible, and wrong.
 */
export function eventTypeMeta(type: string | undefined): EventTypeMeta {
  const canonical = normalizeEventType(type);
  const known = canonical ? EVENT_TYPE_META[canonical] : undefined;
  if (known) return known;
  return {
    label: humaniseEventType(type),
    emoji: "📅",
    chipClass: "bg-surface text-muted",
    blurb: "",
  };
}

/** `bonus-spin` -> `Bonus Spin`. The thing CSS `capitalize` cannot do. */
export function humaniseEventType(type: string | undefined): string {
  if (!type) return "Event";
  return type
    .split(/[_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
