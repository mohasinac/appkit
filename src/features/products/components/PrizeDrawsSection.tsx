import { normalizeError } from "../../../errors/normalize";
import { sieveFilter, sieveAnd, SIEVE_OP } from "@mohasinac/appkit";
import { sortBy } from "@mohasinac/appkit";
import {
  Container,
  Div,
  Heading,
  Section,
  Stack,
  Text,
} from "../../../ui";
import { ROUTES } from "../../../next";
import type { PrizeDrawsSectionConfig } from "../../homepage/schemas/firestore";
import { productRepository } from "../repository/products.repository";
import type { ProductDocument } from "../schemas";
import { InteractiveProductCard } from "./InteractiveProductCard";

export interface PrizeDrawsSectionProps {
  config: PrizeDrawsSectionConfig;
}

/**
 * Renders a prize-draws strip on the homepage.
 * W1-38 (2026-05-23): fetches active prize-draw listings from productRepository.
 */
export async function PrizeDrawsSection({
  config,
}: PrizeDrawsSectionProps) {
  const title = config.title ?? "Prize Draws";
  const subtitle =
    config.subtitle ?? "Enter for a chance to win rare collectibles";

  const limit = 8;

  let draws: ProductDocument[] = [];
  try {
    const result = await productRepository.list({
      filters: sieveAnd(sieveFilter("listingType", SIEVE_OP.EQ, "prize-draw"), sieveFilter("status", SIEVE_OP.EQ, "published")),
      sorts: sortBy("createdAt", "DESC"),
      pageSize: limit,
    });
    draws = (result.items ?? []) as ProductDocument[];
  } catch (_err) {
    void normalizeError(_err);
    draws = [];
  }

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

          <Div gap="3" className="fluid-grid-card">
            {draws.map((draw) => (
              <InteractiveProductCard
                key={draw.id}
                product={draw as unknown as Parameters<typeof InteractiveProductCard>[0]["product"]}
                href={String(ROUTES.PUBLIC.PRODUCT_DETAIL(draw.slug ?? draw.id ?? ""))}
              />
            ))}
          </Div>
        </Stack>
      </Container>
    </Section>
  );
}
