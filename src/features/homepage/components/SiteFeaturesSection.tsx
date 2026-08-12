import React from "react";
import { THEMED_TEXT_PRIMARY, THEMED_TEXT_SECONDARY } from "../../../_internal/shared/styles/themed";
import { Div, Grid, Heading, Section, Text } from "../../../ui";

const __P = {
  p8: "p-[var(--appkit-space-8)]",
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
        <Div className="text-left mb-12">
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
        <Grid
          gap="section"
          className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {features.map((feature) => (
            <Div
              key={feature.id}
              padding="lg"
              rounded="2xl"
              border="subtle"
              shadow="hover-lg"
              className="text-left transition-all group bg-[var(--appkit-color-surface)]"
            >
              {/* Icon */}
              <Div className="text-[3.75rem] mb-4 group-hover:scale-110 transition-transform">
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
            </Div>
          ))}
        </Grid>
      </Div>
    </Section>
  );
}
