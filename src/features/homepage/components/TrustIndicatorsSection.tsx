"use client";

import React from "react";
import { THEME_CONSTANTS } from "../../../tokens";
import { Grid, Heading, Section, Text } from "../../../ui";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TrustIndicatorItem {
  key?: string;
  icon: string;
  title: string;
  description: string;
}

export interface TrustIndicatorsSectionProps {
  items: TrustIndicatorItem[];
  className?: string;
}

// ─── Section ─────────────────────────────────────────────────────────────────

export function TrustIndicatorsSection({
  items,
  className = "",
}: TrustIndicatorsSectionProps) {
  const { themed } = THEME_CONSTANTS;

  return (
    <Section className={`p-6 ${themed.bgSecondary} ${className}`}>
      <div className="w-full">
        <Grid
          gap="md"
          className="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 md:gap-8"
        >
          {items.map((indicator, index) => (
            <div
              key={index}
              className="text-center p-4 rounded-2xl bg-white dark:bg-slate-900 border border-zinc-100 dark:border-slate-800 hover:shadow-md transition-shadow"
            >
              <div className="text-4xl md:text-5xl mb-2 md:mb-3">
                {indicator.icon}
              </div>
              <Heading
                level={3}
                className={`text-sm font-semibold ${themed.textPrimary} mb-1 md:mb-2`}
              >
                {indicator.title}
              </Heading>
              <Text className={`text-xs ${themed.textSecondary}`}>
                {indicator.description}
              </Text>
            </div>
          ))}
        </Grid>
      </div>
    </Section>
  );
}
