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
  } catch {
    draws = [];
  }

  return (
    <Section className="py-10">
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

          {draws.length === 0 ? (
            <Stack
              align="center"
              gap="sm"
              className="border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-slate-700" rounded="2xl"
            >
              <Text size="sm" color="muted">
                No active prize draws — new draws are announced regularly.
              </Text>
              <Link
                href={String(ROUTES.PUBLIC.AUCTIONS)}
                className="text-sm font-medium text-primary hover:underline"
              >
                Browse live auctions →
              </Link>
            </Stack>
          ) : (
            <Div className="fluid-grid-card gap-3">
              {draws.map((draw) => (
                <InteractiveProductCard
                  key={draw.id}
                  product={draw as unknown as Parameters<typeof InteractiveProductCard>[0]["product"]}
                  href={String(ROUTES.PUBLIC.PRODUCT_DETAIL(draw.slug ?? draw.id ?? ""))}
                />
              ))}
            </Div>
          )}
        </Stack>
      </Container>
    </Section>
  );
}
