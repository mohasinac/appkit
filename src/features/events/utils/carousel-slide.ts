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
 * intent into a slide. The seed derives `carouselSlidesSeedData` through it;
 * `scripts/push-editorial-content.mjs` pushes what the seed produced. Neither
 * hand-writes a slide, so there is no second copy to drift from.
 */

import type {
  CarouselSlideDocument,
  CarouselCard,
  CarouselBackground,
} from "../../homepage/schemas/firestore";
import { MAX_ACTIVE_SLIDES } from "../../homepage/schemas/firestore";
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

function toCard(card: EventCarouselCard, eventHref: string, dim: number): CarouselCard {
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
): Partial<CarouselSlideDocument> | null {
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

  const base = {
    id: `slide-${event.id}`,
    title: event.title,
    order: cfg.order ?? 99,
    active: cfg.active === true,
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
            id: `slide-${event.id}-cta`,
            text: cfg.buttonText,
            link: opts.eventHref,
            variant: "primary" as const,
            openInNewTab: false,
          }
        : undefined,
    },
  };
}

/**
 * Build every event-owned slide, newest-ordered, and refuse an over-full rail.
 *
 * 🛑 `MAX_ACTIVE_SLIDES` is a real ceiling, not advice — `HeroCarousel` renders
 * the first five and a sixth active slide is authored, stored, and never seen
 * by anyone. Failing here is what makes that visible at seed time rather than
 * as a silently missing promotion.
 */
export function buildSlidesFromEvents(
  events: readonly EventDocument[],
  resolveHref: (event: EventDocument) => string,
  createdBy: string,
): Partial<CarouselSlideDocument>[] {
  const slides = events
    .map((e) => buildSlideFromEvent(e, { eventHref: resolveHref(e), createdBy }))
    .filter((s): s is Partial<CarouselSlideDocument> => s !== null)
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

  const activeCount = slides.filter((s) => s.active).length;
  if (activeCount > MAX_ACTIVE_SLIDES) {
    throw new Error(
      `${activeCount} active event slides but MAX_ACTIVE_SLIDES is ${MAX_ACTIVE_SLIDES}. ` +
        `The extras would never render. Deactivate one, or fold several deals into ` +
        `a single cards slide — that is what the 6 zones are for.`,
    );
  }

  return slides;
}
