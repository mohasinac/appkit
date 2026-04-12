import React from "react";
import { THEME_CONSTANTS } from "@mohasinac/tokens";
import { Div, Grid, Heading, Section, Span, Text } from "@mohasinac/ui";
import { BeforeAfterCard } from "./BeforeAfterCard";
import type { BeforeAfterItem } from "../types";

// ─── Types ───────────────────────────────────────────────────────────────────

/** Minimal result item — maps to BeforeAfterItem but with optional fields for convenience. */
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

// ─── Section ─────────────────────────────────────────────────────────────────

export function FeaturedResultsSection({
  title,
  subtitle,
  pillLabel,
  ornamentLabel = "✶",
  items,
  className = "",
}: FeaturedResultsSectionProps) {
  const { flex } = THEME_CONSTANTS;

  const pillCls =
    "inline-flex items-center gap-2 rounded-full border border-primary-500/30 bg-primary-500/10 px-5 py-1.5 text-xs font-medium tracking-[0.2em] uppercase text-primary-700 dark:text-primary-400 backdrop-blur-sm";

  if (!items.length) return null;

  return (
    <Section className={`py-16 md:py-20 px-4 ${className}`}>
      {/* Section header */}
      <Div className="mb-12 text-center">
        {pillLabel && (
          <Span className={pillCls}>
            <Span
              className="inline-block h-1.5 w-1.5 rounded-full bg-primary-500"
              aria-hidden="true"
            />
            {pillLabel}
          </Span>
        )}

        <Heading
          level={2}
          className="font-display mt-3 text-4xl text-zinc-900 dark:text-white"
        >
          {title}
        </Heading>

        {/* Ornament */}
        <Div
          className={`mt-3 ${flex.center} gap-2 text-zinc-400 dark:text-zinc-500`}
          aria-hidden="true"
        >
          <Span className="h-px w-6 bg-current" />
          <Span className="text-xs">{ornamentLabel}</Span>
          <Span className="h-px w-6 bg-current" />
        </Div>

        {subtitle && (
          <Text className="mx-auto mt-4 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
            {subtitle}
          </Text>
        )}
      </Div>

      {/* Card grid */}
      <Grid
        gap="lg"
        className="mx-auto max-w-7xl grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4"
      >
        {items.map((item, i) => (
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
        ))}
      </Grid>
    </Section>
  );
}
