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
      filters: "listingType==prize-draw,status==published",
      sorts: "-createdAt",
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
          ) : (
            <div className="fluid-grid-card gap-3">
              {draws.map((draw) => (
                <InteractiveProductCard
                  key={draw.id}
                  product={draw as unknown as Parameters<typeof InteractiveProductCard>[0]["product"]}
                  href={String(ROUTES.PUBLIC.PRODUCT_DETAIL(draw.slug ?? draw.id ?? ""))}
                />
              ))}
            </div>
          )}
        </Stack>
      </Container>
    </Section>
  );
}
