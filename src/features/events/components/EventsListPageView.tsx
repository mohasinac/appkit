import React from "react";
import { eventRepository } from "../../../repositories";
import { AdSlot } from "../../homepage/components/AdSlot";
import { Container, Main, Section, PageHeroHeading } from "../../../ui";
import { EventsIndexListing } from "./EventsIndexListing";
import { EVENT_FIELDS } from "../../../constants/field-names";
import { sieveFilter, sieveMultiEq, sieveAnd, SIEVE_OP } from "../../../utils/sieve-builder";
import { sortBy } from "../../../constants/sort";
import { safeRead } from "../../../errors/safe-read";
import { hidePublicTestData } from "../../../_internal/server/features/tester/visibility";
import { sortPinnedFirst } from "../utils/sort-pinned";
import { firstParam } from "../../../utils/search-params";
import type { SearchParamsRecord } from "../../../utils/search-params";

function buildEventFilters(params: SearchParamsRecord): string {
  const statusRaw = firstParam(params, "status");
  const parts: string[] = [];

  if (statusRaw) {
    const values = statusRaw.split("|").filter(Boolean);
    if (values.length === 1) parts.push(sieveFilter(EVENT_FIELDS.STATUS, SIEVE_OP.EQ, values[0]));
    // BUG FIX: pipe is invalid for ==; expand to multiple AND clauses
    else if (values.length > 1) parts.push(sieveMultiEq(EVENT_FIELDS.STATUS, values));
  } else {
    parts.push(sieveFilter(EVENT_FIELDS.STATUS, SIEVE_OP.EQ, EVENT_FIELDS.STATUS_VALUES.ACTIVE));
  }

  const type = firstParam(params, "type");
  if (type) {
    const values = type.split("|").filter(Boolean);
    if (values.length === 1) parts.push(sieveFilter(EVENT_FIELDS.TYPE, SIEVE_OP.EQ, values[0]));
    else if (values.length > 1) parts.push(sieveMultiEq(EVENT_FIELDS.TYPE, values));
  }

  const dateFrom = firstParam(params, "dateFrom");
  const dateTo = firstParam(params, "dateTo");
  if (dateFrom) parts.push(sieveFilter(EVENT_FIELDS.STARTS_AT, SIEVE_OP.GTE, dateFrom));
  if (dateTo) parts.push(sieveFilter(EVENT_FIELDS.ENDS_AT, SIEVE_OP.LTE, dateTo));

  return sieveAnd(...parts);
}

export interface EventsListPageViewProps {
  searchParams?: SearchParamsRecord;
}

export async function EventsListPageView({ searchParams = {} }: EventsListPageViewProps) {
  const sort = firstParam(searchParams, "sort") || sortBy(EVENT_FIELDS.STARTS_AT, "ASC");
  const page = Number(firstParam(searchParams, "page")) || 1;
  const pageSize = Number(firstParam(searchParams, "pageSize")) || 24;
  const filters = buildEventFilters(searchParams);

  const [result, facetCounts] = await Promise.all([
    safeRead(() => eventRepository.list({ filters, sorts: sort, page, pageSize }), {
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
            pill="Events & Offers"
            title="Events"
            description="Sales, spin wheels, raffles and polls — everything running right now, and what is opening next."
            meta={publicResult?.total ? `${publicResult.total} running` : undefined}
          />
          <AdSlot id="listing-sidebar-top" className="mb-6" />
          <EventsIndexListing initialData={publicResult} facetCounts={facetCounts} />
          <AdSlot id="listing-sidebar-bottom" className="mt-8" />
        </Container>
      </Section>
    </Main>
  );
}
