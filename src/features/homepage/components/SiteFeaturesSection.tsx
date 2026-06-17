import React from "react";
import { THEMED_TEXT_PRIMARY, THEMED_TEXT_SECONDARY } from "../../../_internal/shared/styles/themed";
import { Div, Grid, Heading, Section, Text } from "../../../ui";

const __P = {
  p8: "p-8",
} as const;

// --- Types -------------------------------------------------------------------

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

// --- Section -----------------------------------------------------------------

export function SiteFeaturesSection({
  title,
  subtitle,
  features,
  className = "",
}: SiteFeaturesSectionProps) {
const themed = { textPrimary: THEMED_TEXT_PRIMARY, textSecondary: THEMED_TEXT_SECONDARY };
return (
    <Section className={`${__P.p8} ${className}`} surface="subtle">
      <Div className="w-full">
        {/* Section Header */}
        <Div className="text-center mb-12">
          <Heading
            level={2}
            className={`${themed.textPrimary} mb-3`} size="3xl" mdSize="4xl" weight="bold"
          >
            {title}
          </Heading>
          {subtitle && (
            <Text
              className={`${themed.textSecondary} max-w-2xl mx-auto`} size="base"
            >
              {subtitle}
            </Text>
          )}
        </Div>

        {/* Features Grid */}
        {/* audit-variant-ok: features grid — base gap=lg + md:gap-8 responsive bump */}
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
              {/* audit-variant-ok: feature icon — text-6xl + group-hover:scale-110 transition */}
              <Div className="text-6xl mb-4 group-hover:scale-110 transition-transform">
                {feature.icon}
              </Div>

              {/* Title */}
              <Heading
                level={3}
                className={`${themed.textPrimary} mb-2`} size="base" weight="bold"
              >
                {feature.title}
              </Heading>

              {/* Description */}
              <Text className={`${themed.textSecondary}`} size="base">
                {feature.description}
              </Text>
            </div>
          ))}
        </Grid>
      </Div>
    </Section>
  );
}
