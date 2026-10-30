import Link from "next/link";
import { Container, Grid, Row, Stack } from "../../../ui/components/Layout";
import { Div } from "../../../ui/components/Div";
import { Heading, Span, Text } from "../../../ui/components/Typography";
import { Section } from "../../../ui/components/Semantic";
import { MediaImage } from "../../media/MediaImage";
import { ROUTES } from "../../../next/routing/route-map";
import type {
  CollectionCardsSectionConfig,
  CollectionCardsEntry,
} from "../schemas/firestore";
import type { CategoryItem } from "../../categories/types";
import type { StoreListItem } from "../../stores/types";

export interface CollectionCardsSectionProps {
  config: CollectionCardsSectionConfig;
  /**
   * Pre-fetched items for the entry types that are actually wired — see the
   * module docstring below for which ones and why those three specifically.
   */
  sectionData?: {
    categories?: CategoryItem[];
    brands?: CategoryItem[];
    stores?: StoreListItem[];
  };
}

const DEFAULT_ITEMS_PER_ROW = 4 as const;
const DEFAULT_MAX_ITEMS = 12 as const;

function entryLabel(entry: CollectionCardsEntry): string {
  if (entry.label) return entry.label;
  switch (entry.type) {
    case "products": return "Products";
    case "collector-drops": return "Collector Drops";
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
 * Renders a single homepage strip that mixes multiple resource types
 * (products, stores, blog, etc.), driven entirely from config.
 *
 * 🛑 `categories` / `brands` / `stores` entries render REAL data as of
 * 2026-10-19 — reusing `sectionData` that `MarketplaceHomepageView` already
 * fetches for the dedicated `categories`/`brands`/`stores` sections, so this
 * costs zero extra round-trips (Rule #6). Those three were chosen first
 * because they are the PERMANENT axes: populated independently of the
 * product catalogue's size, so a `collection-cards` section built from them
 * can never go empty the way a `"products"`/`"collector-drops"` entry could.
 *
 * Every other entry type (`products`, `collector drops`, `pre-orders`, `events`,
 * `blog-posts`, `reviews`) still renders the honest placeholder — a real
 * "not wired yet" state is correct here, not a bug to paper over with
 * fabricated data, and the earlier revision's "data wiring lands with the
 * bundle/raffle work" message survives per-entry rather than as a blanket
 * claim about the whole section.
 */
export async function CollectionCardsSection({
  config,
  sectionData,
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

  const wiredEntries = collections.filter(
    (e) => e.type === "categories" || e.type === "brands" || e.type === "stores",
  );
  const unwiredEntries = collections.filter(
    (e) => e.type !== "categories" && e.type !== "brands" && e.type !== "stores",
  );

  return (
    <Section padding="y-2xl">
      <Container size="xl">
        <Stack gap="md">
          <Stack gap="xs">
            <Heading level={2} size="2xl" weight="semibold" color="primary">
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
                <Span
                  key={`${entry.type}-${idx}`}
                  border="default" padding="x-sm" className="py-[0.25rem]" rounded="full" color="muted" size="xs" weight="medium"
                >
                  {entryLabel(entry)}
                </Span>
              ))}
            </Row>
          ) : null}

          {wiredEntries.map((entry, idx) => {
            const rows: Array<{ slug: string; name: string; image?: string }> =
              entry.type === "categories"
                ? (sectionData?.categories ?? [])
                    .slice(0, entry.limit ?? maxItems)
                    .map((c) => ({ slug: c.slug, name: c.name, image: c.display?.coverImage }))
                : entry.type === "brands"
                  ? (sectionData?.brands ?? [])
                      .slice(0, entry.limit ?? maxItems)
                      .map((b) => ({ slug: b.slug, name: b.name, image: b.display?.coverImage }))
                  : (sectionData?.stores ?? [])
                      .slice(0, entry.limit ?? maxItems)
                      .map((s) => ({ slug: s.storeSlug, name: s.storeName, image: s.storeLogoURL }));

            if (rows.length === 0) return null;

            const hrefFor = (slug: string) =>
              entry.type === "categories"
                ? String(ROUTES.PUBLIC.CATEGORY_DETAIL(slug))
                : entry.type === "brands"
                  ? String(ROUTES.PUBLIC.BRAND_DETAIL(slug))
                  : String(ROUTES.PUBLIC.STORE_DETAIL(slug));

            return (
              <Stack key={`${entry.type}-${idx}`} gap="sm">
                <Text size="sm" weight="semibold" color="muted">
                  {entryLabel(entry)}
                </Text>
                {/*
                 * `cols="categoryCards"` — THE canonical 130px-floor card
                 * ladder (audit-card-grid-cols.mjs is strict-zero on
                 * hand-written `grid-cols-N` ladders; see CLAUDE.md § "The
                 * bottom edge is three tiers" sibling rule for card grids).
                 * `config.itemsPerRow` stays honoured in the unwired
                 * placeholder text below rather than driving a second,
                 * competing ladder here.
                 */}
                <Grid cols="categoryCards" gap="md">
                  {rows.map((row) => (
                    <Link
                      key={row.slug}
                      href={hrefFor(row.slug)}
                      className="group rounded-xl border border-[var(--appkit-color-border)] transition-all hover:border-primary-300 hover:shadow-sm dark:hover:border-primary-600"
                    >
                      {/*
                       * The Stack's `align` is the CROSS axis of a flex column —
                       * it centres the thumbnail and the label BOX horizontally
                       * without touching `text-align`, so the label's own copy
                       * stays left-aligned per the site convention. The centring
                       * utility audit-content-alignment forbids is deliberately
                       * absent; do not reintroduce it to tidy the caption.
                       */}
                      <Stack align="center" gap="xs" padding="sm">
                        <Div className="h-16 w-16" rounded="lg" overflow="hidden">
                          <MediaImage src={row.image} alt={row.name} size="thumbnail" />
                        </Div>
                        <Text size="xs" weight="medium" className="line-clamp-2">
                          {row.name}
                        </Text>
                      </Stack>
                    </Link>
                  ))}
                </Grid>
              </Stack>
            );
          })}

          {unwiredEntries.length > 0 && (
            <Stack
              align="start"
              gap="sm"
              className="border-dashed text-left" border="strong" paddingY="y-3xl" paddingX="x-lg" rounded="2xl"
            >
              <Text size="sm" color="muted">
                {unwiredEntries.map(entryLabel).join(", ")} — up to {maxItems}{" "}
                items, {itemsPerRow} per row when wired — data wiring lands
                with the bundle/raffle work.
              </Text>
            </Stack>
          )}

          {cta ? (
            <Link
              href={cta.href}
              className="text-[length:var(--appkit-text-sm)] font-medium text-primary hover:underline"
            >
              {cta.label} →
            </Link>
          ) : null}
        </Stack>
      </Container>
    </Section>
  );
}
