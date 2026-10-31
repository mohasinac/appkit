import { cache } from "react";
import { eventRepository } from "../../../../repositories";
import { EVENT_FIELDS } from "../../../../constants/field-names";
import { sieveFilter, SIEVE_OP } from "../../../../utils/sieve-builder";
import { sortBy } from "../../../../constants/sort";
import { hidePublicTestData } from "../tester/visibility";
import { buildSlideFromEvent } from "../../../../features/events/utils/carousel-slide";
import { MAX_ACTIVE_SLIDES } from "../../../../features/homepage/constants/carousel";
import { ROUTES } from "../../../../next/routing/route-map";
import { normalizeError } from "../../../../errors/normalize";
import { serverLogger } from "../../../../monitoring/server-logger";
import type { EventDocument } from "../../../../features/events/schemas";
import type { CarouselSlide } from "../../../../features/homepage/types/index";

export const getEventForDetail = cache(
  async (id: string) => {
    return eventRepository.findById(id);
  },
);

/**
 * Live source of the homepage hero carousel. One slide per event with
 * `showOnCarousel: true` — nothing is persisted, this is recomputed on every
 * call. Replaces the standalone `carouselSlides` Firestore collection
 * entirely (deleted 2026-10-31, see CLAUDE.md "Homepage Hero Carousel").
 *
 * Only a bounded `status == active` scan plus an in-memory filter —
 * `showOnCarousel` is deliberately NOT a Sieve clause. It is not in
 * `EventRepository.SIEVE_FIELDS`, and `sieve.ts` drops an unallowlisted field
 * silently rather than throwing (Root Cause #62) — the same trap
 * `EventGiveawaysSection` hit with `hasRaffle`. Filtering a field that is
 * already in memory is simpler than widening the allowlist for one caller.
 */
export const getHeroCarouselSlides = cache(async (): Promise<CarouselSlide[]> => {
  try {
    const result = await eventRepository.list({
      filters: sieveFilter(
        EVENT_FIELDS.STATUS,
        SIEVE_OP.EQ,
        EVENT_FIELDS.STATUS_VALUES.ACTIVE,
      ),
      sorts: sortBy("startsAt", "DESC"),
      pageSize: 50,
    });
    const activeEvents = hidePublicTestData(
      result.items ?? [],
    ) as unknown as EventDocument[];

    return activeEvents
      .filter((event) => event.showOnCarousel === true && !!event.carouselConfig)
      .map((event) =>
        buildSlideFromEvent(event, {
          eventHref: String(ROUTES.PUBLIC.EVENT_DETAIL(event.slug ?? event.id)),
          createdBy: "system",
        }),
      )
      .filter((slide): slide is CarouselSlide => slide !== null)
      .sort((a, b) => a.order - b.order)
      .slice(0, MAX_ACTIVE_SLIDES);
  } catch (error) {
    void normalizeError(error);
    // Loud on purpose — a swallowed failure here is indistinguishable from
    // "no events are promoted", which is how a bug in this query would stay
    // invisible in production (Root Cause #59).
    serverLogger.error("getHeroCarouselSlides query failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
});
