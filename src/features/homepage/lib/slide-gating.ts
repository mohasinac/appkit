/**
 * Carousel gating — strip slides and cards that advertise a CLOSED surface.
 *
 * 🛑 "closed surface", not "disabled listing type". This read the listing-type
 * flags alone until 2026-10-27, and the two axes it could not see were the two
 * doing visible damage: a type auto-hidden for being empty (`/art`, `/spares`
 * — both answering a real 404 while the homepage linked to them), and a closed
 * browse section (`/categories`, linked 34 times from the live homepage).
 * `isClosedHref` owns all three axes now; see its docstring.
 *
 * ## The gap this closes
 *
 * `MarketplaceHomepageView` already drops whole SECTIONS whose type maps to a
 * disabled listing type (`HOMEPAGE_SECTION_LISTING_TYPE`). That gate is keyed
 * on `SectionType`, so it can only see sections that ARE a listing type — the
 * auctions rail, the pre-orders rail.
 *
 * A carousel is one section of type `carousel` whatever it contains, and what
 * it contains is free-text authored content. With `auction: false` live, the
 * hero still shipped a "Live auctions — place a bid before the timer runs out"
 * card and a full-screen "Win it at your price" slide, both linking to
 * `/auctions`, which renders nothing. The section gate could not see either:
 * the only thing identifying them is where they point.
 *
 * ## Deliberately link-based, not keyword-based
 *
 * Nothing here reads the copy. "Win it at your price" names no type, and a
 * word search would be both incomplete (it misses that slide) and
 * over-eager (it would eat the authenticity slide for saying "bid" in passing).
 * A destination is checkable; prose is not.
 *
 * ## What survives
 *
 * A slide keeps its authored `zone` values when a card is removed. Re-packing
 * the survivors is NOT done here: the zone grid is a fixed `repeat(3, 1fr)`,
 * so there is no arrangement of two cards that fills it, and silently moving
 * an admin's card is a worse surprise than the gap. The seeded hero therefore
 * replaces its auction card with a real enabled type rather than relying on
 * this filter to tidy up after it — this is the safety net for content an
 * admin authors later, where the gap is a visible prompt to go and fix it.
 */

import {
  isClosedHref,
  type ClosedSurfaceContext,
} from "../../../_internal/shared/listing-types/route-gating";
import type { CarouselSlide } from "../types/index";

/**
 * Every destination a card offers. A card with no buttons is still clickable
 * through nothing — it has no link of its own — so it is never gated.
 */
function cardHrefs(card: CarouselSlide["cards"][number]): string[] {
  return (card.buttons ?? []).map((b) => b.href).filter(Boolean);
}

/**
 * A card is dropped when it HAS destinations and every one of them is
 * disabled.
 *
 * 🛑 "every", not "any", and the empty case matters: `[].every()` is `true`,
 * so a card with no buttons at all would be dropped by the predicate alone.
 * That is why the length check is separate rather than folded in — an
 * image-only card advertises no type and must survive.
 */
function isCardDisabled(
  card: CarouselSlide["cards"][number],
  ctx: ClosedSurfaceContext,
): boolean {
  const hrefs = cardHrefs(card);
  if (hrefs.length === 0) return false;
  return hrefs.every((href) => isClosedHref(href, ctx));
}

/**
 * A slide is dropped when the thing it is ABOUT is disabled — its overlay CTA
 * or its own whole-slide link.
 *
 * Both are checked because they are set independently: the seeded auction
 * slide carries `overlay.button.link` AND `link.url`, while a slide can
 * legitimately have only one.
 */
function isSlideDisabled(slide: CarouselSlide, ctx: ClosedSurfaceContext): boolean {
  if (isClosedHref(slide.overlay?.button?.link, ctx)) return true;
  if (isClosedHref(slide.link?.url, ctx)) return true;
  return false;
}

/**
 * Filter a slide list against the surfaces this site currently has open.
 *
 * Returns a new array; input is not mutated. Fails OPEN — with no settings
 * document `isClosedHref` classifies nothing and nothing is removed, which is
 * the right failure for a read that errored (Root Cause #72: an unknown must
 * never be read as "zero").
 */
export function gateCarouselSlides<T extends CarouselSlide>(
  slides: readonly T[],
  ctx: ClosedSurfaceContext,
): T[] {
  const kept: T[] = [];
  for (const slide of slides) {
    if (isSlideDisabled(slide, ctx)) continue;

    const cards = (slide.cards ?? []).filter((card) => !isCardDisabled(card, ctx));
    const hadCards = (slide.cards ?? []).length > 0;

    // A cards-slide that lost ALL its cards renders as a bare background with
    // no copy and no call to action — the exact "renders blank" failure the
    // carousel seed file's own header warns about. Drop it rather than ship an
    // empty frame the visitor can swipe to.
    if (hadCards && cards.length === 0 && !slide.overlay) continue;

    kept.push(cards.length === (slide.cards ?? []).length ? slide : { ...slide, cards });
  }
  return kept;
}
