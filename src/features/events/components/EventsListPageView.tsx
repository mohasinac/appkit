import React from "react";
import { eventRepository } from "../../../repositories";
import { AdSlot } from "../../homepage/components/AdSlot";
import { Container, Heading, Main, Section } from "../../../ui";
import { EventsIndexListing } from "./EventsIndexListing";
import { EVENT_FIELDS } from "../../../constants/field-names";
import { sieveFilter, sieveMultiEq, sieveAnd, SIEVE_OP } from "../../../utils/sieve-builder";
import { sortBy } from "../../../constants/sort";

type SearchParams = Record<string, string | string[]>;

function sp(params: SearchParams, key: string): string {
  const v = params[key];
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

function buildEventFilters(params: SearchParams): string {
  const statusRaw = sp(params, "status");
  const parts: string[] = [];

  if (statusRaw) {
    const values = statusRaw.split("|").filter(Boolean);
    if (values.length === 1) parts.push(sieveFilter(EVENT_FIELDS.STATUS, SIEVE_OP.EQ, values[0]));
    // BUG FIX: pipe is invalid for ==; expand to multiple AND clauses
    else if (values.length > 1) parts.push(sieveMultiEq(EVENT_FIELDS.STATUS, values));
  } else {
    parts.push(sieveFilter(EVENT_FIELDS.STATUS, SIEVE_OP.EQ, EVENT_FIELDS.STATUS_VALUES.ACTIVE));
  }

  const type = sp(params, "type");
  if (type) {
    const values = type.split("|").filter(Boolean);
    if (values.length === 1) parts.push(sieveFilter(EVENT_FIELDS.TYPE, SIEVE_OP.EQ, values[0]));
    else if (values.length > 1) parts.push(sieveMultiEq(EVENT_FIELDS.TYPE, values));
  }

  const dateFrom = sp(params, "dateFrom");
  const dateTo = sp(params, "dateTo");
  if (dateFrom) parts.push(sieveFilter(EVENT_FIELDS.STARTS_AT, SIEVE_OP.GTE, dateFrom));
  if (dateTo) parts.push(sieveFilter(EVENT_FIELDS.ENDS_AT, SIEVE_OP.LTE, dateTo));

  return sieveAnd(...parts);
}

export interface EventsListPageViewProps {
  searchParams?: SearchParams;
}

export async function EventsListPageView({ searchParams = {} }: EventsListPageViewProps) {
  const sort = sp(searchParams, "sort") || sortBy(EVENT_FIELDS.STARTS_AT, "ASC");
  const page = Number(sp(searchParams, "page")) || 1;
  const pageSize = Number(sp(searchParams, "pageSize")) || 24;
  const filters = buildEventFilters(searchParams);

  const result = await eventRepository
    .list({ filters, sorts: sort, page, pageSize })
    .catch(() => null);

  return (
    <Main>
      <Section className="py-10">
        <Container size="xl">
          <Heading level={1} className="mb-8 text-3xl text-zinc-900 dark:text-zinc-50" weight="semibold">
            Events
          </Heading>
          <AdSlot id="listing-sidebar-top" className="mb-6" />
          <EventsIndexListing initialData={result} />
          <AdSlot id="listing-sidebar-bottom" className="mt-8" />
        </Container>
      </Section>
    </Main>
  );
}
