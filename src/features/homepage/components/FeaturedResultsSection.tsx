import { Div, Heading, HorizontalScroller, Row, Section, Span, Text } from "../../../ui";
import { BeforeAfterCard } from "./BeforeAfterCard";
import { CAROUSEL_PER_VIEW } from "../constants/carousel-per-view";

// --- Types -------------------------------------------------------------------

/** Minimal result item used by the featured results section. */
export interface FeaturedResultItem {
  id?: string;
  beforeImage: string;
  afterImage: string;
  caption?: string;
  sortOrder?: number;
}

export interface FeaturedResultsSectionProps {
  title: string;
  subtitle?: string;
  pillLabel?: string;
  ornamentLabel?: string;
  items: FeaturedResultItem[];
  className?: string;
}

// --- Sectmon -----------------------------------------------------------------

export function FeaturedResultsSection({
  title,
  subtitle,
  pillLabel,
  ornamentLabel = "✶",
  items,
  className = "",
}: FeaturedResultsSectionProps) {
  const pillCls =
    "inline-flex items-center gap-2 rounded-full border border-primary-500/30 bg-primary-500/10 px-5 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-primary-700 backdrop-blur-sm dark:text-primary-400";

  if (!items.length) return null;

  return (
    <Section className={className} paddingY="y-5xl" paddingX="x-md">
      <Div className="mb-12 text-center">
        {pillLabel && (
          <Span className={pillCls}>
            <Span
              className="inline-block h-1.5 w-1.5 bg-primary-500" rounded="full"
              aria-hidden="true"
            />
            {pillLabel}
          </Span>
        )}

        <Heading
          level={2}
          className="mt-3 font-display" color="primary" size="4xl"
        >
          {title}
        </Heading>

        <Row align="center" justify="center" gap="sm" color="faint"
          className="mt-3"
          aria-hidden="true"
        >
          <Span className="h-px w-6 bg-current" />
          <Span size="xs">{ornamentLabel}</Span>
          <Span className="h-px w-6 bg-current" />
        </Row>

        {subtitle && (
          <Text className="mx-auto mt-4 max-w-md" color="muted" size="sm">
            {subtitle}
          </Text>
        )}
      </Div>

      <Div className="mx-auto max-w-7xl">
        <HorizontalScroller
          items={items}
          renderItem={(item: FeaturedResultItem, i: number) => (
            <Div className="w-full sm:w-auto">
              <BeforeAfterCard
                key={item.id ?? `result-${i}`}
                item={{
                  id: item.id ?? `result-${i}`,
                  beforeImage: item.beforeImage,
                  afterImage: item.afterImage,
                  caption: item.caption ?? "",
                  sortOrder: item.sortOrder ?? i,
                }}
              />
            </Div>
          )}
          keyExtractor={(item, i) => item.id ?? `result-${i}`}
          perView={CAROUSEL_PER_VIEW.cards}
          gap={24}
          minItemWidth={260}
          snapToItems
          showArrows
          showFadeEdges
          loop
        />
      </Div>
    </Section>
  );
}
