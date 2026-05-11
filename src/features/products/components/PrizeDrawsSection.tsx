import Link from "next/link";
import {
  Container,
  Heading,
  Section,
  Stack,
  Text,
} from "../../../ui";
import { ROUTES } from "../../../next";
import type { PrizeDrawsSectionConfig } from "../../homepage/schemas/firestore";

export interface PrizeDrawsSectionProps {
  config: PrizeDrawsSectionConfig;
}

/**
 * Renders a prize-draws strip on the homepage.
 *
 * Reads products with `listingType="prize-draw"` and `prizeRevealStatus` in the
 * configured set. Those fields are added later in the prize-draw block; for now
 * the component renders an empty state and the section ships disabled in seed.
 */
export async function PrizeDrawsSection({
  config,
}: PrizeDrawsSectionProps) {
  const title = config.title ?? "Prize Draws";
  const subtitle =
    config.subtitle ?? "Enter for a chance to win rare collectibles";

  const draws: never[] = [];

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

          {draws.length === 0 ? (
            <Stack
              align="center"
              gap="sm"
              className="rounded-2xl border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-slate-700"
            >
              <Text className="text-sm text-zinc-500 dark:text-zinc-400">
                No active prize draws — new draws are announced regularly.
              </Text>
              <Link
                href={String(ROUTES.PUBLIC.AUCTIONS)}
                className="text-sm font-medium text-primary hover:underline"
              >
                Browse live auctions →
              </Link>
            </Stack>
          ) : null}
        </Stack>
      </Container>
    </Section>
  );
}
