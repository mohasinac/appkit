import React from "react";
import { eventRepository } from "../../../repositories";
import { AdSlot } from "../../homepage/components/AdSlot";
import { Container } from "../../../ui/components/Layout";
import { Div } from "../../../ui/components/Div";
import { Main, Section } from "../../../ui/components/Semantic";
import { PageHeroHeading } from "../../../ui/components/PageHeroHeading";
import type { PageHeroCopy } from "../../../ui/components/PageHeroHeading";
import { EventsIndexListing } from "./EventsIndexListing";
import { EVENT_FIELDS } from "../../../constants/field-names";
import { sieveFilter, sieveMultiEq, sieveAnd, SIEVE_OP } from "../../../utils/sieve-builder";
import { sortBy } from "../../../constants/sort";
import { safeRead } from "../../../errors/safe-read";
import { hidePublicTestData } from "../../../_internal/server/features/tester/visibility";
import { sortPinnedFirst } from "../utils/sort-pinned";
import { firstParam } from "../../../utils/search-params";
import type { SearchParamsRecord } from "../../../utils/search-params";
import { AdminComposableRegion } from "../../dashboard/components/AdminComposableRegion";
import type { DashboardCard } from "../../../_internal/shared/features/dashboard/recent-entry";

function buildEventFilters(params: SearchParamsRecord): string {
  const statusRaw = firstParam(params, "status");
  const parts: string[] = [];

  if (statusRaw) {
    const values = statusRaw.split("|").filter(Boolean);
    if (values.length === 1) parts.push(sieveFilter(EVENT_FIELDS.STATUS, SIEVE_OP.EQ, values[0]));
    // BUG FIX: pipe is invalid for ==; expand to multiple AND clauses
    else if (values.length > 1) parts.push(sieveMultiEq(EVENT_FIELDS.STATUS, values));
  }
  /*
   * 🛑 NO DEFAULT STATUS FILTER — this used to force `status == active` when
   * no `status` param was present, and that is what made the header count and
   * the grid disagree.
   *
   * `EventsIndexListing` builds its own filter from the same URL and applies
   * NO status filter by default (its `showExpired` toggle widens the set
   * rather than narrowing it). So the server returned one set and the client
   * queried another, from a single page. The visible symptom was a header
   * reading "2 RUNNING" above a grid containing ONE card.
   *
   * Both halves now derive from the same absent-means-everything rule. If a
   * default is ever wanted again it has to be added in BOTH places, in the
   * same change — or the two drift apart again and the count starts lying.
   */

  const type = firstParam(params, "type");
  if (type) {
    const values = type.split("|").filter(Boolean);
    if (values.length === 1) parts.push(sieveFilter(EVENT_FIELDS.TYPE, SIEVE_OP.EQ, values[0]));
    else if (values.length > 1) parts.push(sieveMultiEq(EVENT_FIELDS.TYPE, values));
  }

  /*
   * ── LIVE / FINISHED, applied SERVER-SIDE TOO ───────────────────────
   *
   * 🛑 This MUST mirror `EventsIndexListing`'s client-side `tab` handling.
   * The result of this query is passed to that component as `initialData`, so
   * if the two disagree the page renders one set and then may or may not
   * replace it with another.
   *
   * Measured 2026-11-09: with the tab handled only on the client, selecting
   * "Finished" highlighted the tab and still showed a contest ending in
   * February 2027 — the server had already supplied it and the client's
   * narrower query never won.
   */
  const tab = firstParam(params, "tab");
  if (tab === "live" || tab === "finished") {
    parts.push(
      sieveFilter(
        EVENT_FIELDS.ENDS_AT,
        tab === "live" ? SIEVE_OP.GTE : SIEVE_OP.LT,
        new Date().toISOString(),
      ),
    );
  }

  const dateFrom = firstParam(params, "dateFrom");
  const dateTo = firstParam(params, "dateTo");
  if (dateFrom) parts.push(sieveFilter(EVENT_FIELDS.STARTS_AT, SIEVE_OP.GTE, dateFrom));
  if (dateTo) parts.push(sieveFilter(EVENT_FIELDS.ENDS_AT, SIEVE_OP.LTE, dateTo));

  return sieveAnd(...parts);
}

export interface EventsListPageViewProps {
  /**
   * Base path event detail pages live under on THIS host. Forwarded to the
   * listing and on to every card. See `EventCard.hrefPrefix`.
   *
   * 🛑 A STRING, and it must stay one. This is a SERVER component that
   * forwards the prop into `"use client"` children, so anything
   * non-serializable here is an error row in the RSC flight payload: the
   * server still returns 200 with complete HTML and the BROWSER dies at
   * hydration with React #441, above every `<Suspense>` boundary. Its
   * predecessor was `buildHref?: (slugOrId: string) => string` and it took two
   * content hosts down for a week. See `joinHrefPrefix`.
   */
  hrefPrefix?: string;
  searchParams?: SearchParamsRecord;
  /** Admin-curated page-region cards (Phase 12). Omit for no extra content. */
  pageRegionCards?: DashboardCard[];
  /**
   * Hero copy. Defaults are deliberately VERTICAL-NEUTRAL: appkit ships the
   * mechanism and a default template, and the consumer overrides it — so a
   * default must never name a brand, a product line or a country. Pass your
   * own, or an empty string to drop a line entirely.
   */
  heroCopy?: PageHeroCopy;
}

/** Vertical-neutral default hero copy — see `heroCopy`. */
const EVENTS_HERO_DEFAULTS = {
  pill: "Events & offers",
  title: "Events",
  description: "Everything running right now, and what is opening next.",
} as const;

export async function EventsListPageView({ searchParams = {}, pageRegionCards = [], hrefPrefix, heroCopy = {} }: EventsListPageViewProps) {
  const sort = firstParam(searchParams, "sort") || sortBy(EVENT_FIELDS.STARTS_AT, "ASC");
  const page = Number(firstParam(searchParams, "page")) || 1;
  const pageSize = Number(firstParam(searchParams, "pageSize")) || 24;
  const filters = buildEventFilters(searchParams);
  /*
   * 🛑 AN INEQUALITY FILTER MUST LEAD THE SORT. Firestore refuses a query
   * whose first `orderBy` is not the inequality field, and the refusal is a
   * FAILED_PRECONDITION at runtime — which `safeRead` degrades to an empty
   * list. The page then renders "No events found" with no error anywhere.
   *
   * Measured 2026-11-09: the Live tab showed "No events found" while the All
   * tab showed the contest, which runs to February 2027. The filter was
   * correct; the SORT made the query invalid.
   *
   * So a tab overrides the sort. It is also the better order on its own terms:
   * Live = ending soonest first, Finished = most recently ended first.
   */
  const tabForSort = firstParam(searchParams, "tab");
  const sortForTab =
    tabForSort === "live"
      ? sortBy(EVENT_FIELDS.ENDS_AT, "ASC")
      : tabForSort === "finished"
        ? sortBy(EVENT_FIELDS.ENDS_AT, "DESC")
        : undefined;

  const [result, facetCounts] = await Promise.all([
    safeRead(() => eventRepository.list({ filters, sorts: sortForTab ?? sort, page, pageSize }), {
      route: "/events",
      key: "events.list",
      fallback: null,
    }),
    // Facet counts are deliberately NOT narrowed by the shopper's own type or
    // status selection: a count that shrank to zero as you ticked boxes would
    // hide the very facet you'd need to untick. They answer "does this kind of
    // event exist at all", which is the question that decides visibility.
    safeRead(() => eventRepository.facetCountsForTypesAndStatuses(), {
      route: "/events",
      key: "events.facetCounts",
      fallback: {} as Record<string, number | undefined>,
    }),
  ]);

  /*
   * Sandbox events are seeded as ordinary public rows so testers exercise the
   * real browse path; they must not reach anyone else's first paint. The client
   * refetch threads the real viewer, so a signed-in tester still sees them.
   */
  const publicResult = result
    ? { ...result, items: sortPinnedFirst(hidePublicTestData(result.items)) }
    : result;

  return (
    <Main>
      <Section padding="y-2xl">
        <Container size="xl">
          {/*
            * Was a bare one-word <Heading> — no description, no count, no
            * rule. The editorial treatment already existed but was inlined
            * inside SectionCarousel and gated on headingVariant, so the two
            * pages it was designed for could not reach it.
            */}
          <PageHeroHeading
            className="mb-8"
            pill={heroCopy.pill ?? EVENTS_HERO_DEFAULTS.pill}
            title={heroCopy.title ?? EVENTS_HERO_DEFAULTS.title}
            description={heroCopy.description ?? EVENTS_HERO_DEFAULTS.description}
            meta={publicResult?.total ? `${publicResult.total} running` : undefined}
          />
          <AdSlot id="listing-sidebar-top" className="mb-6" />
          <EventsIndexListing initialData={publicResult} facetCounts={facetCounts} hrefPrefix={hrefPrefix} />
          <AdSlot id="listing-sidebar-bottom" className="mt-8" />
          <Div className="mt-8">
            <AdminComposableRegion pageId="events" initialCards={pageRegionCards} />
          </Div>
        </Container>
      </Section>
    </Main>
  );
}
