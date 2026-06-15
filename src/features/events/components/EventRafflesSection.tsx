import { sieveFilter, sieveAnd, SIEVE_OP } from "@mohasinac/appkit";
import { sortBy } from "@mohasinac/appkit";
import Link from "next/link";
import {
  Container,
  Div,
  Heading,
  Section,
  Stack,
  Text,
} from "../../../ui";
import { ROUTES } from "../../../next";
import type { EventRafflesSectionConfig } from "../../homepage/schemas/firestore";
import { eventRepository } from "../repository/events.repository";
import { EventCard } from "./EventCard";
import type { EventItem } from "../types";

export interface EventRafflesSectionProps {
  config: EventRafflesSectionConfig;
}

/**
 * Renders a live-raffle/spin-wheel strip on the homepage.
 * W1-38 (2026-05-23): fetches events with hasRaffle=true and renders the EventCard grid.
 */
export async function EventRafflesSection({
  config,
}: EventRafflesSectionProps) {
  const title = config.title ?? "Live Raffles & Spin Wheels";
  const subtitle =
    config.subtitle ?? "Participate in community events and win prizes";
  const limit = 6;

  let events: EventItem[] = [];
  try {
    const result = await eventRepository.list({
      filters: sieveAnd(sieveFilter("hasRaffle", SIEVE_OP.EQ, "true"), sieveFilter("status", SIEVE_OP.EQ, "active")),
      sorts: sortBy("startsAt", "DESC"),
      pageSize: limit,
    });
    events = (result.items ?? []) as unknown as EventItem[];
  } catch {
    events = [];
  }

  return (
    <Section padding="y-2xl">
      <Container size="xl">
        <Stack gap="md">
          <Stack gap="xs">
            <Heading
              level={2} size="2xl" weight="semibold" color="primary">
              {title}
            </Heading>
            {subtitle ? (
              <Text size="sm" color="muted">
                {subtitle}
              </Text>
            ) : null}
          </Stack>

          {events.length === 0 ? (
            <Stack
              align="center"
              gap="sm"
              className="border-dashed px-6 text-center" border="strong" padding="y-3xl" rounded="2xl"
            >
              <Text size="sm" color="muted">
                No upcoming raffles — keep an eye on the events page.
              </Text>
              <Link
                href={String(ROUTES.PUBLIC.EVENTS)}
                className="text-sm font-medium text-primary hover:underline"
              >
                Browse all events →
              </Link>
            </Stack>
          ) : (
            <Div className="fluid-grid-card gap-3">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </Div>
          )}
        </Stack>
      </Container>
    </Section>
  );
}
