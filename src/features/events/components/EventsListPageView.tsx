import React from "react";
import { eventRepository } from "../../../repositories";
import { AdSlot } from "../../homepage/components/AdSlot";
import { Container, Heading, Main, Section } from "../../../ui";
import { EventsIndexListing } from "./EventsIndexListing";

type SearchParams = Record<string, string | string[]>;

function sp(params: SearchParams, key: string): string {
  const v = params[key];
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

function buildEventFilters(params: SearchParams): string {
  // Public page defaults to published status; allow overriding to active/ended
  const statusRaw = sp(params, "status");
  const parts: string[] = [];

  if (statusRaw) {
    const values = statusRaw.split("|").filter(Boolean);
    if (values.length === 1) parts.push(`status==${values[0]}`);
    else if (values.length > 1) parts.push(`status==${values.join("|")}`);
  } else {
    parts.push("status==published");
  }

  const type = sp(params, "type");
  if (type) {
    const values = type.split("|").filter(Boolean);
    if (values.length === 1) parts.push(`type==${values[0]}`);
    else if (values.length > 1) parts.push(`type==${values.join("|")}`);
  }

  const dateFrom = sp(params, "dateFrom");
  const dateTo = sp(params, "dateTo");
  if (dateFrom) parts.push(`startsAt>=${dateFrom}`);
  if (dateTo) parts.push(`endsAt<=${dateTo}`);

  return parts.join(",");
}

export interface EventsListPageViewProps {
  searchParams?: SearchParams;
}

export async function EventsListPageView({ searchParams = {} }: EventsListPageViewProps) {
  const sort = sp(searchParams, "sort") || "startsAt";
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
          <Heading level={1} className="mb-8 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
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
