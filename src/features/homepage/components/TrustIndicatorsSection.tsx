import React from "react";
import { THEMED_TEXT_PRIMARY, THEMED_TEXT_SECONDARY } from "../../../_internal/shared/styles/themed";
import { Div, Grid, Heading, Section, Text } from "../../../ui";

const __P = {
  p6: "p-6",
} as const;

// --- Types -------------------------------------------------------------------

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

// --- Section -----------------------------------------------------------------

export function TrustIndicatorsSection({
  items,
  className = "",
}: TrustIndicatorsSectionProps) {
const themed = { textPrimary: THEMED_TEXT_PRIMARY, textSecondary: THEMED_TEXT_SECONDARY };
return (
    <Section className={`${__P.p6} ${className}`} surface="subtle">
      <Div className="w-full">
        <Grid
          gap="md"
          className="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 md:gap-8"
        >
          {items.map((indicator, index) => (
            <div
              key={index}
              className="text-center p-4 rounded-2xl bg-white dark:bg-slate-900 border border-zinc-100 dark:border-slate-800 hover:shadow-md transition-shadow"
            >
              <Div className="text-4xl md:text-5xl mb-2 md:mb-3">
                {indicator.icon}
              </Div>
              <Heading
                level={3}
                className={`${themed.textPrimary} mb-1 md:mb-2`} size="sm" weight="semibold"
              >
                {indicator.title}
              </Heading>
              <Text className={`${themed.textSecondary}`} size="xs">
                {indicator.description}
              </Text>
            </div>
          ))}
        </Grid>
      </Div>
    </Section>
  );
}
