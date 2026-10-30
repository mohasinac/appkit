import { normalizeError } from "../../../errors/normalize";
import { serverLogger } from "../../../monitoring/server-logger";
// Import from the DEFINING modules, never `@mohasinac/appkit/client` — that
// entry is `"use client"`, so in this async Server Component these would resolve
// to client-reference proxies and calling them throws during the server render
// (Root Cause #18). The `try/catch` below swallowed that throw, which is why
// this section silently rendered nothing instead of failing loudly.
import { sieveFilter, sieveAnd, SIEVE_OP } from "../../../utils/sieve-builder";
import { sortBy } from "../../../constants/sort";
import { Container, Grid, Stack } from "../../../ui/components/Layout";
import { Heading, Text } from "../../../ui/components/Typography";
import { Section } from "../../../ui/components/Semantic";
import type { EventRafflesSectionConfig } from "../../homepage/schemas/firestore";
import { eventRepository } from "../repository/events.repository";
import { EventCard } from "./EventCard";
import type { EventItem } from "../types";
import { hidePublicTestData } from "../../../_internal/server/features/tester/visibility";
import { EVENT_FIELDS } from "../../../constants/field-names";

export interface EventGiveawaysSectionProps {
  config: EventRafflesSectionConfig;
}

/*
 * `config.raffleType`'s two concrete values happen to equal the two
 * `EventType` members this strip spans. Sourced from `EVENT_FIELDS.TYPE_VALUES`
 * rather than written as literals so a rename of either type is a compile
 * error here instead of a clause that matches nothing.
 */
const EVENT_TYPE_GIVEAWAY = EVENT_FIELDS.TYPE_VALUES.GIVEAWAY;
const EVENT_TYPE_BONUS_SPIN = EVENT_FIELDS.TYPE_VALUES.BONUS_SPIN;

/**
 * Renders a live-raffle/spin-wheel strip on the homepage.
 *
 * ## It was showing the wrong events, and nothing could tell
 *
 * The filter was `hasRaffle == "true"` — and **`hasRaffle` is not in
 * `EventRepository.SIEVE_FIELDS`**. `sieve.ts` sets `throwExceptions: false`,
 * so an unallowlisted field does not raise: `findField` returns undefined and
 * the clause is **silently discarded** (Root Cause #62, EMITTED_BUT_UNFILTERABLE).
 *
 * So this did not return zero rows and it did not disappear. It ran
 * `status == active` sorted `-startsAt` and rendered **the six most
 * recently-started active events of ANY type** — sales, polls, feedback forms —
 * under a heading reading "Live Raffles & Spin Wheels". Every card was a real,
 * live event, which is exactly why it never looked broken.
 *
 * ## Why `type`, and why one query
 *
 * `config.raffleType` is already `"giveaway" | "bonus-spin" | "all"` — the
 * config has always spoken the `type` vocabulary and already answers "both
 * belong here", so the title is truthful and `type` is the honest field to
 * match.
 *
 * 🛑 So despite its NAME, `config.raffleType` holds `EventType` values, NOT
 * `RaffleType` values — which is why it was renamed on 2026-10-31 while
 * `EventDocument.raffleType` (the real `RaffleType` field) was not. The field
 * name here stays: it is persisted inside a `homepageSections` config blob.
 * `type` IS in `SIEVE_FIELDS` and is indexed `(type, status, startsAt DESC)`,
 * so this needs no new composite index.
 *
 * 🛑 The `"all"` case is a PIPE-joined value, not `sieveMultiEq`. Sieve parses
 * `type==a|b` as one OR-group, and the Firebase adapter upgrades a same-field
 * OR-group of equalities into a single Firestore `in` query. `sieveMultiEq`
 * comma-joins instead, and a comma is an AND:
 * `type==giveaway,type==bonus-spin` is two equalities on one field, which no
 * document can satisfy (Root Cause #59).
 *
 * Accepted limitation, deliberately: `hasRaffle` is an optional bolt-on that
 * *could* sit on a `sale` event, and such an event would not appear here. No
 * seeded event is shaped that way — all three `hasRaffle: true` rows are
 * already `type: "giveaway"` — and a sale with a side giveaway belongs in the sale
 * strip. If that changes, the fix is a second clause, not a wider title.
 */
export async function EventGiveawaysSection({
  config,
}: EventGiveawaysSectionProps) {
  const title = config.title ?? "Live Raffles & Spin Wheels";
  const subtitle =
    config.subtitle ?? "Participate in community events and win prizes";
  // `maxItems` was declared in the config, set by the seed, and ignored here in
  // favour of a hardcoded 6 (`audit-homepage-config-coverage` passed only
  // because the component *mentions* `config`).
  const limit = config.maxItems && config.maxItems > 0 ? config.maxItems : 6;
  const raffleType = config.raffleType ?? "all";
  const typeClause =
    raffleType === "all"
      ? sieveFilter(
          EVENT_FIELDS.TYPE,
          SIEVE_OP.EQ,
          `${EVENT_TYPE_GIVEAWAY}|${EVENT_TYPE_BONUS_SPIN}`,
        )
      : sieveFilter(EVENT_FIELDS.TYPE, SIEVE_OP.EQ, raffleType);

  let events: EventItem[] = [];
  try {
    const result = await eventRepository.list({
      filters: sieveAnd(
        typeClause,
        sieveFilter(
          EVENT_FIELDS.STATUS,
          SIEVE_OP.EQ,
          EVENT_FIELDS.STATUS_VALUES.ACTIVE,
        ),
      ),
      sorts: sortBy("startsAt", "DESC"),
      pageSize: limit,
    });
    events = hidePublicTestData(result.items ?? []) as unknown as EventItem[];
  } catch (_err) {
    void normalizeError(_err);
    // Loud on purpose: a swallowed failure here is indistinguishable from "no
    // active raffles", which is how this section stayed invisible in production
    // without anyone noticing (Root Cause #59).
    serverLogger.error("EventGiveawaysSection query failed", {
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
