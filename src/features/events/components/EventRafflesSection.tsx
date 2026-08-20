import { normalizeError } from "../../../errors/normalize";
import { sieveFilter, sieveAnd, SIEVE_OP } from "@mohasinac/appkit/client";
import { sortBy } from "@mohasinac/appkit/client";
import {
  Container,
  Div,
  Heading,
  Section,
  Stack,
  Text,
} from "../../../ui";
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
  } catch (_err) {
    void normalizeError(_err);
    events = [];
  }

  if (events.length === 0) return null;

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

          <Div gap="3" className="fluid-grid-card">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </Div>
        </Stack>
      </Container>
    </Section>
  );
}
