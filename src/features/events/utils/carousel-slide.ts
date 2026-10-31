/**
 * Turn an event's own `carouselConfig` into a hero-carousel slide.
 *
 * WHY THIS EXISTS: the homepage slide advertising an event and the event page
 * it links to were authored in two different places — a `carouselSlides`
 * document and an `events` document — with nothing tying them together. They
 * drifted. The live Diwali slide read "Diwali: 10% cashback on every order"
 * while its event page had been rebranded to "Diwali to New Year: Four Offers,
 * Three Months", and neither edit knew about the other.
 *
 * So the event owns its promo, and this is the only function that renders that
 * intent into a slide.
 *
 * 🛑 NOTHING PERSISTS THE RESULT (2026-10-31). A first attempt materialized
 * this output into a standalone `carouselSlides` Firestore document at
 * seed/push time — the owner reverted that entirely on 2026-10-27 after it
 * shipped a 6-card slide linking into a closed `/events` section. The
 * `carouselSlides` collection, its schema and its admin authoring UI are gone;
 * `getHeroCarouselSlides()` (`_internal/server/features/events/data.ts`) is
 * the one caller, and it calls this live on every homepage request instead of
 * writing the output anywhere.
 */

import type { CarouselSlideCard, CarouselBackground, CarouselSlide } from "../../homepage/types/index";
import type { EventDocument, EventCarouselCard } from "../schemas/firestore";

/** Matches the seeded slides; a slower rail is unreadable, a faster one is a blur. */
const DEFAULT_AUTOPLAY_MS = 6000;
const DEFAULT_DIM = 0.55;

/** Zones are a 2-row x 3-column grid, so six is the ceiling. */
const MAX_CARDS_PER_SLIDE = 6;

/**
 * `/media/<shortId>`, never `seedExtMedia()` and never a raw upstream URL.
 *
 * Root Cause #104: persisting `/api/media/ext?url=<third party>` makes every
 * render a Node lambda plus an upstream fetch plus a sharp re-encode. ~400 of
 * those contributed 52.52 GB of Fast Origin Transfer against a 10 GB allowance
 * and suspended the project.
 */
function mediaUrl(slug: string): string {
  return `/media/${slug}`;
}

function background(slug: string | undefined, dim: number): CarouselBackground | undefined {
  if (!slug) return undefined;
  return {
    type: "image",
    url: mediaUrl(slug),
    dimOverlay: { enabled: true, opacity: dim },
  };
}

/**
 * The background slug, preferring an explicitly-named hero crop.
 *
 * 🛑 Falling back to the event's `coverImage` is correct but lossy: a cover is
 * fetched at `banner` (1200x600) while a hero background wants `hero`
 * (1920x860), so the fallback upscales across a full-bleed slide. That is
 * exactly what the live Diwali slide did. Name a hero slug when the slide
 * matters; the fallback is there so a slide is never blank.
 */
function resolveBackgroundSlug(event: EventDocument): string | undefined {
  const cfg = event.carouselConfig;
  if (cfg?.backgroundMediaSlug) return cfg.backgroundMediaSlug;

  const coverUrl = event.coverImage?.url ?? event.coverImageUrl;
  if (!coverUrl) return undefined;

  // Already a `/media/<slug>` URL — recover the slug so we re-wrap it once.
  const match = /^\/media\/([^/?#]+)$/.exec(coverUrl);
  return match ? match[1] : undefined;
}

function toCard(card: EventCarouselCard, eventHref: string, dim: number): CarouselSlideCard {
  return {
    id: `card-zone-${card.zone}`,
    zone: card.zone,
    background: background(card.mediaSlug, card.dimOpacity ?? dim) ?? {
      type: "color",
      color: "var(--appkit-color-primary)",
    },
    content: {
      eyebrow: card.eyebrow,
      title: card.title,
      description: card.description,
    },
    buttons: card.buttonText
      ? [
          {
            id: `card-zone-${card.zone}-cta`,
            text: card.buttonText,
            href: card.href ?? eventHref,
            variant: "primary" as const,
          },
        ]
      : [],
    hover: { effect: "scale" as const },
  };
}

export interface BuildSlideOptions {
  /** The event's public detail path, e.g. `/events/festive-cashback-10`. */
  eventHref: string;
  /** Who the generated document records as its author. */
  createdBy: string;
}

/**
 * `null` when the event carries no `carouselConfig` — most events do not want
 * a slide, and that is the normal case rather than an error.
 *
 * @throws when the config is internally impossible (more cards than zones).
 *         Refusing loudly is deliberate: `HeroCarousel` silently `.slice(0, 6)`s,
 *         so a seventh card would vanish with nothing to indicate it had been
 *         authored at all.
 */
/**
 * Is this event published to the hero rail?
 *
 * 🛑 `showOnCarousel` is the owner; `carouselConfig.active` is a READ-ONLY
 * legacy fallback for documents written before the flag existed. The `??` is
 * load-bearing and is not the same as `||`: a deliberate `showOnCarousel:
 * false` on an event whose old `carouselConfig.active` is still `true` must
 * mean OFF, and `||` would quietly resolve it back to on — turning an explicit
 * unpublish into a no-op.
 *
 * See the deprecation note on `EventCarouselBase.active` for when the fallback
 * can be deleted.
 */
function isPublishedToCarousel(event: EventDocument): boolean {
  return (event.showOnCarousel ?? event.carouselConfig?.active) === true;
}

export function buildSlideFromEvent(
  event: EventDocument,
  opts: BuildSlideOptions,
): CarouselSlide | null {
  const cfg = event.carouselConfig;
  /*
   * Both halves are required: the flag says "publish it", the config says
   * "publish WHAT". Without a config there is no authored artwork, and a slide
   * synthesised from the event's bare title is a grey rectangle on the first
   * screen of the site.
   */
  if (!cfg) return null;

  const dim = cfg.dimOpacity ?? DEFAULT_DIM;
  const bg = background(resolveBackgroundSlug(event), dim);

  // Nothing persists this slide, so there is no competing document-id
  // namespace to disambiguate — the slide's id IS the event's id.
  const base = {
    id: event.id,
    title: event.title,
    order: cfg.order ?? 99,
    /*
     * 🛑 `isPublishedToCarousel`, NOT `cfg.active` — and this line is the whole
     * point of the `showOnCarousel` flag.
     *
     * It read `cfg.active === true`, which meant the new top-level flag was
     * written to Firestore, round-tripped through the Zod schema and the admin
     * form, and READ BY NOTHING. Setting it did exactly nothing; clearing it
     * did exactly nothing. The helper that reads it sat directly above this
     * function, defined and never called.
     *
     * Caught by eslint's no-unused-vars on the helper — which is the reason
     * that rule is an `error` here and not a warning. A computed-then-discarded
     * value gives no other signal, and three user-facing defects in this
     * codebase have surfaced the same way.
     */
    active: isPublishedToCarousel(event),
    background: bg,
    settings: { autoplayDelayMs: DEFAULT_AUTOPLAY_MS, height: "medium" as const },
    createdBy: opts.createdBy,
  };

  if (cfg.placement === "cards") {
    if (cfg.cards.length > MAX_CARDS_PER_SLIDE) {
      throw new Error(
        `Event ${event.id}: ${cfg.cards.length} carousel cards, max is ${MAX_CARDS_PER_SLIDE} ` +
          `(zones are a 2x3 grid). HeroCarousel slices to 6, so the extras would vanish silently.`,
      );
    }
    const seenZones = new Set<number>();
    for (const c of cfg.cards) {
      if (seenZones.has(c.zone)) {
        throw new Error(
          `Event ${event.id}: two carousel cards both claim zone ${c.zone}. ` +
            `They would render stacked on the same grid cell.`,
        );
      }
      seenZones.add(c.zone);
    }

    return {
      ...base,
      // 🛑 Empty overlay, not omitted. The two are sibling POSITION_FILL
      // elements; a merge-write that leaves a previous overlay in place would
      // paint it over the cards.
      overlay: undefined,
      cards: cfg.cards.map((c) => toCard(c, opts.eventHref, dim)),
    };
  }

  return {
    ...base,
    cards: [],
    overlay: {
      enabled: true,
      subtitle: cfg.eyebrow,
      title: cfg.title,
      description: cfg.description,
      button: cfg.buttonText
        ? {
            id: `${event.id}-cta`,
            text: cfg.buttonText,
            link: opts.eventHref,
            variant: "primary" as const,
            openInNewTab: false,
          }
        : undefined,
    },
  };
}

/*
 * There is deliberately no batch "build every event-owned slide" helper here
 * any more. The one that used to live here THREW past `MAX_ACTIVE_SLIDES` —
 * correct for a seed-time build guard, wrong for a live request path: an
 * admin toggling a 6th event's `showOnCarousel` on would 500 the homepage for
 * every visitor until someone noticed and toggled it back off.
 * `getHeroCarouselSlides()` (`_internal/server/features/events/data.ts`) maps
 * each event through `buildSlideFromEvent` individually and caps the result
 * with a plain `.slice(0, MAX_ACTIVE_SLIDES)` — no throw.
 */
