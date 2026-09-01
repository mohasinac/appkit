import { normalizeError } from "../../../errors/normalize";
import { serverLogger } from "../../../monitoring/server-logger";
// Import from the DEFINING modules, never `@mohasinac/appkit/client` — that
// entry is `"use client"`, so in this async Server Component these would resolve
// to client-reference proxies and calling them throws during the server render
// (Root Cause #18). The `try/catch` below swallowed that throw, which is why
// this section silently rendered nothing instead of failing loudly.
import { sieveFilter, sieveAnd, SIEVE_OP } from "../../../utils/sieve-builder";
import { sortBy } from "../../../constants/sort";
import { Container, Div, Grid, Heading, Section, Stack, Text } from "../../../ui";
import type { EventRafflesSectionConfig } from "../../homepage/schemas/firestore";
import { eventRepository } from "../repository/events.repository";
import { EventCard } from "./EventCard";
import type { EventItem } from "../types";
import { hidePublicTestData } from "../../../_internal/server/features/tester/visibility";

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
    events = hidePublicTestData(result.items ?? []) as unknown as EventItem[];
  } catch (_err) {
    void normalizeError(_err);
    // Loud on purpose: a swallowed failure here is indistinguishable from "no
    // active raffles", which is how this section stayed invisible in production
    // without anyone noticing (Root Cause #59).
    serverLogger.error("EventRafflesSection query failed", {
      error: _err instanceof Error ? _err.message : String(_err),
    });
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

          <Grid cols="cardsWide" gap="3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </Grid>
        </Stack>
      </Container>
    </Section>
  );
}
