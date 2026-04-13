"use client";

import React from "react";
import { THEME_CONSTANTS } from "../../../tokens";
import {
  Heading,
  HorizontalScroller,
  Section,
  Text,
  TextLink,
} from "../../../ui";

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Section ─────────────────────────────────────────────────────────────────

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
      <Section className={`p-8 ${themed.bgPrimary} ${className}`}>
        <div className="w-full max-w-7xl mx-auto">
          <div className={`h-8 ${skeleton.base} mb-8 max-w-xs mx-auto`} />
          <div className="flex gap-6 overflow-hidden">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className={`${skeleton.card} h-[clamp(180px,26vh,260px)] min-w-[clamp(150px,18vw,260px)] max-w-[clamp(240px,36vw,380px)] flex-none`}
              />
            ))}
          </div>
        </div>
      </Section>
    );
  }

  if (items.length === 0) return null;

  return (
    <Section className={`py-12 ${themed.bgPrimary} ${className}`}>
      <div className="w-full max-w-7xl mx-auto px-4 md:px-8">
        {/* Section Header */}
        <div className="text-center mb-10">
          <Heading
            level={2}
            className={`text-3xl md:text-4xl font-bold ${themed.textPrimary} mb-3`}
          >
            {title}
          </Heading>
          {subtitle && (
            <Text className={`text-base ${themed.textSecondary}`}>
              {subtitle}
            </Text>
          )}
        </div>

        {/* Scrollable reviews */}
        <HorizontalScroller
          items={items}
          renderItem={(item) => renderItem(item)}
          perView={{ base: 1, sm: 2, md: 3, lg: 3, "2xl": 4 }}
          gap={24}
          autoScroll
          autoScrollInterval={4500}
          pauseOnHover
          snapToItems
          showArrows
          keyExtractor={keyExtractor}
        />

        {/* See all link */}
        {viewMoreHref && (
          <div className="text-center mt-8">
            <TextLink
              href={viewMoreHref}
              className="text-sm font-medium text-primary hover:text-primary/80"
            >
              {viewMoreLabel}
            </TextLink>
          </div>
        )}
      </div>
    </Section>
  );
}
