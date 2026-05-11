import Link from "next/link";
import {
  Container,
  Heading,
  Section,
  Stack,
  Text,
} from "../../../ui";
import { ROUTES } from "../../../next";
import type { EventRafflesSectionConfig } from "../../homepage/schemas/firestore";

export interface EventRafflesSectionProps {
  config: EventRafflesSectionConfig;
}

/**
 * Renders a live-raffle/spin-wheel strip on the homepage.
 *
 * Reads events with `hasRaffle=true` and status in {"active","upcoming"}. The
 * `hasRaffle` flag is added later with the raffle feature; for now the
 * component renders an empty state and the section ships disabled in seed.
 */
export async function EventRafflesSection({
  config,
}: EventRafflesSectionProps) {
  const title = config.title ?? "Live Raffles & Spin Wheels";
  const subtitle =
    config.subtitle ?? "Participate in community events and win prizes";

  const events: never[] = [];

  return (
    <Section className="py-10">
      <Container size="xl">
        <Stack gap="md">
          <Stack gap="xs">
            <Heading
              level={2}
              className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50"
            >
              {title}
            </Heading>
            {subtitle ? (
              <Text className="text-sm text-zinc-500 dark:text-zinc-400">
                {subtitle}
              </Text>
            ) : null}
          </Stack>

          {events.length === 0 ? (
            <Stack
              align="center"
              gap="sm"
              className="rounded-2xl border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-slate-700"
            >
              <Text className="text-sm text-zinc-500 dark:text-zinc-400">
                No upcoming raffles — keep an eye on the events page.
              </Text>
              <Link
                href={String(ROUTES.PUBLIC.EVENTS)}
                className="text-sm font-medium text-primary hover:underline"
              >
                Browse all events →
              </Link>
            </Stack>
          ) : null}
        </Stack>
      </Container>
    </Section>
  );
}
