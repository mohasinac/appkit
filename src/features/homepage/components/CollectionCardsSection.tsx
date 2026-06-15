import Link from "next/link";
import {
  Container,
  Heading,
  Row,
  Section,
  Stack,
  Text,
} from "../../../ui";
import type {
  CollectionCardsSectionConfig,
  CollectionCardsEntry,
} from "../schemas/firestore";

export interface CollectionCardsSectionProps {
  config: CollectionCardsSectionConfig;
}

const DEFAULT_ITEMS_PER_ROW = 4 as const;
const DEFAULT_MAX_ITEMS = 12 as const;

function entryLabel(entry: CollectionCardsEntry): string {
  if (entry.label) return entry.label;
  switch (entry.type) {
    case "products": return "Products";
    case "auctions": return "Auctions";
    case "pre-orders": return "Pre-orders";
    case "stores": return "Stores";
    case "events": return "Events";
    case "blog-posts": return "Blog";
    case "reviews": return "Reviews";
    case "brands": return "Brands";
    case "categories": return "Categories";
  }
}

/**
 * Renders a single homepage strip that mixes multiple resource types (products,
 * stores, blog, etc.) — driven entirely from config.
 *
 * Each entry's data fetch wires into the existing per-resource repositories.
 * Until the data wiring lands the section renders the configured collection
 * tabs + a placeholder, exercising the schema/admin plumbing end-to-end.
 */
export async function CollectionCardsSection({
  config,
}: CollectionCardsSectionProps) {
  const title = config.title ?? "Featured Collections";
  const subtitle = config.subtitle;
  const collections = Array.isArray(config.collections) ? config.collections : [];
  const itemsPerRow = config.itemsPerRow ?? DEFAULT_ITEMS_PER_ROW;
  const maxItems = config.maxItems ?? DEFAULT_MAX_ITEMS;
  const showTabs = config.showCollectionTabs ?? false;
  const cta = config.cta;

  if (collections.length === 0) {
    return null;
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

          {showTabs ? (
            <Row gap="sm" wrap>
              {collections.slice(0, 3).map((entry, idx) => (
                <Text
                  key={`${entry.type}-${idx}`}
                  className="rounded-full border border-zinc-300 px-3 py-1 dark:border-slate-600" color="muted" size="xs" weight="medium"
                >
                  {entryLabel(entry)}
                </Text>
              ))}
            </Row>
          ) : null}

          <Stack
            align="center"
            gap="sm"
            className="border-dashed px-6 text-center" border="strong" padding="y-3xl" rounded="2xl"
          >
            <Text size="sm" color="muted">
              Mixed collection rendering ({collections.length}/3 collection
              {collections.length === 1 ? "" : "s"}, up to {maxItems} items,
              {" "}{itemsPerRow} per row) — data wiring lands with the bundle/raffle
              work.
            </Text>
            {cta ? (
              <Link
                href={cta.href}
                className="text-sm font-medium text-primary hover:underline"
              >
                {cta.label} →
              </Link>
            ) : null}
          </Stack>
        </Stack>
      </Container>
    </Section>
  );
}
