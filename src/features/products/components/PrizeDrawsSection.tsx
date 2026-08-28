// Import from the DEFINING module, never `@mohasinac/appkit/client` — that entry
// is `"use client"`, so in this async Server Component `sortBy` would resolve to
// a client-reference proxy and calling it throws during the server render
// (Root Cause #18). That is exactly what took `section-prize-draws` down.
import { sortBy } from "../../../constants/sort";
import { Container, Div, Grid, Heading, Section, Stack, Text } from "../../../ui";
import { ROUTES } from "../../../next";
import type { PrizeDrawsSectionConfig } from "../../homepage/schemas/firestore";
import { listPublicProducts } from "../../../_internal/server/features/products/list-public";
import { AVAILABILITY_VALUES, PRODUCT_FIELDS } from "../../../constants/field-names";
import type { ProductDocument } from "../schemas";
import { InteractiveProductCard } from "./InteractiveProductCard";

export interface PrizeDrawsSectionProps {
  config: PrizeDrawsSectionConfig;
}

/**
 * Renders a prize-draws strip on the homepage.
 *
 * Until 2026-08-24 this read `config.title` / `config.subtitle` and ignored
 * every other field it was given — `revealStatus`, `maxItems`, `storeId`,
 * `showCountdown` and `showEntriesRemaining` were all inert, with the count
 * hardcoded to 8. `revealStatus` mattering most: the seeded value is `"all"`,
 * which is why a closed, already-revealed draw sat on the homepage advertising
 * entries nobody could buy.
 */
export async function PrizeDrawsSection({
  config,
}: PrizeDrawsSectionProps) {
  const title = config.title ?? "Prize Draws";
  const subtitle =
    config.subtitle ?? "Enter for a chance to win rare collectibles";

  const revealStatus = config.revealStatus ?? "open";
  const showAll = revealStatus === "all";

  const result = await listPublicProducts({
    listingTypes: [PRODUCT_FIELDS.LISTING_TYPE_VALUES.PRIZE_DRAW],
    storeId: config.storeId,
    // "all" means the admin deliberately wants closed draws too — an archive
    // strip — so neither the status filter nor the availability scope applies.
    prizeRevealStatus: showAll ? undefined : revealStatus,
    availability: showAll ? AVAILABILITY_VALUES.ALL : AVAILABILITY_VALUES.AVAILABLE,
    sorts: sortBy(PRODUCT_FIELDS.CREATED_AT, "DESC"),
    page: 1,
    pageSize: config.maxItems ?? 8,
  });

  const draws = (result?.items ?? []) as unknown as ProductDocument[];
  if (draws.length === 0) return null;

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
            {draws.map((draw) => (
              <InteractiveProductCard
                key={draw.id}
                product={draw as unknown as Parameters<typeof InteractiveProductCard>[0]["product"]}
                href={String(ROUTES.PUBLIC.PRODUCT_DETAIL(draw.slug ?? draw.id ?? ""))}
              />
            ))}
          </Grid>
        </Stack>
      </Container>
    </Section>
  );
}
