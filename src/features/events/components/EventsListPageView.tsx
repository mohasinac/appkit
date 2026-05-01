import React from "react";
import { eventRepository } from "../../../repositories";
import { AdSlot } from "../../homepage/components/AdSlot";
import { Container, Heading, Main, Section } from "../../../ui";
import { EventsIndexListing } from "./EventsIndexListing";

export async function EventsListPageView() {
  const result = await eventRepository
    .list({
      filters: "status==published",
      sorts: "startsAt",
      page: 1,
      pageSize: 24,
    })
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
