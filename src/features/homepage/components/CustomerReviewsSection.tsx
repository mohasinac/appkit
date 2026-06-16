import React from "react";
import { THEME_CONSTANTS } from "../../../tokens";
import { CAROUSEL_PER_VIEW } from "../constants/carousel-per-view";
import {
  Div,
  Heading,
  HorizontalScroller,
  Section,
  Text,
  TextLink,
} from "../../../ui";

const __P = {
  p8: "p-8",
} as const;

const __O = {
  hidden: "overflow-hidden",
} as const;

// --- Types -------------------------------------------------------------------

export interface CustomerReviewsSectionProps<T = unknown> {
  title: string;
  subtitle?: string;
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  viewMoreHref?: string;
  viewMoreLabel?: string;
  isLoading?: boolean;
  keyExtractor?: (item: T) => string;
  className?: string;
}

// --- Section -----------------------------------------------------------------

export function CustomerReviewsSection<T = unknown>({
  title,
  subtitle,
  items,
  renderItem,
  viewMoreHref,
  viewMoreLabel = "See all reviews",
  isLoading = false,
  keyExtractor,
  className = "",
}: CustomerReviewsSectionProps<T>) {
  const { themed, skeleton } = THEME_CONSTANTS;

  if (isLoading) {
    return (
      <Section className={`${__P.p8} ${themed.bgPrimary} ${className}`}>
        <Div className="w-full max-w-7xl mx-auto">
          <Div className={`h-8 ${skeleton.base} mb-8 max-w-xs mx-auto`} />
          <Div className={`flex gap-6 ${__O.hidden}`}>
            {[...Array(3)].map((_, i) => (
              <Div
                key={i}
                className={`${skeleton.card} h-[clamp(180px,26vh,260px)] min-w-[clamp(150px,18vw,260px)] max-w-[clamp(240px,36vw,380px)] flex-none`}
              />
            ))}
          </Div>
        </Div>
      </Section>
    );
  }

  if (items.length === 0) return null;

  return (
    <Section className={`${themed.bgPrimary} ${className}`} padding="y-3xl">
      <Div className="w-full max-w-7xl mx-auto md:px-8" padding="x-md">
        {/* Section Header */}
        <Div className="text-center mb-10">
          <Heading
            level={2}
            className={`md:text-4xl ${themed.textPrimary} mb-3`} size="3xl" weight="bold"
          >
            {title}
          </Heading>
          {subtitle && (
            <Text className={`${themed.textSecondary}`} size="base">
              {subtitle}
            </Text>
          )}
        </Div>

        {/* Scrollable reviews */}
        <HorizontalScroller
          items={items}
          renderItem={(item) => renderItem(item)}
          perView={CAROUSEL_PER_VIEW.reviews}
          gap={24}
          autoScroll
          autoScrollInterval={4500}
          pauseOnHover
          snapToItems
          showArrows
          keyExtractor={keyExtractor}
          loop
        />

        {/* See all link */}
        {viewMoreHref && (
          <Div className="text-center mt-8">
            <TextLink
              href={viewMoreHref}
              className="text-primary hover:text-primary/80" size="sm" weight="medium"
            >
              {viewMoreLabel}
            </TextLink>
          </Div>
        )}
      </Div>
    </Section>
  );
}
