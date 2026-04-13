"use client";

import React from "react";
import { THEME_CONSTANTS } from "../../../tokens";
import { Grid, Heading, Section, Text } from "../../../ui";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SiteFeatureItem {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export interface SiteFeaturesSectionProps {
  title: string;
  subtitle?: string;
  features: SiteFeatureItem[];
  className?: string;
}

// ─── Section ─────────────────────────────────────────────────────────────────

export function SiteFeaturesSection({
  title,
  subtitle,
  features,
  className = "",
}: SiteFeaturesSectionProps) {
  const { themed } = THEME_CONSTANTS;

  return (
    <Section className={`p-8 ${themed.bgSecondary} ${className}`}>
      <div className="w-full">
        {/* Section Header */}
        <div className="text-center mb-12">
          <Heading
            level={2}
            className={`text-3xl md:text-4xl font-bold ${themed.textPrimary} mb-3`}
          >
            {title}
          </Heading>
          {subtitle && (
            <Text
              className={`text-base ${themed.textSecondary} max-w-2xl mx-auto`}
            >
              {subtitle}
            </Text>
          )}
        </div>

        {/* Features Grid */}
        <Grid
          gap="lg"
          className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-8"
        >
          {features.map((feature) => (
            <div
              key={feature.id}
              className="p-6 text-center hover:shadow-lg transition-all group rounded-2xl bg-white dark:bg-slate-900 border border-zinc-100 dark:border-slate-800"
            >
              {/* Icon */}
              <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>

              {/* Title */}
              <Heading
                level={3}
                className={`text-base font-bold ${themed.textPrimary} mb-2`}
              >
                {feature.title}
              </Heading>

              {/* Description */}
              <Text className={`text-base ${themed.textSecondary}`}>
                {feature.description}
              </Text>
            </div>
          ))}
        </Grid>
      </div>
    </Section>
  );
}
