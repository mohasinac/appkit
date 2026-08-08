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
          gap="section"
          className="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4"
        >
          {items.map((indicator, index) => (
            <Div
              key={index}
              padding="md"
              rounded="2xl"
              border="subtle"
              shadow="hover-md"
              className="text-center bg-[var(--appkit-color-surface)]"
            >
              <Div className="text-[2.25rem] md:text-[3rem] mb-2 md:mb-3">
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
            </Div>
          ))}
        </Grid>
      </Div>
    </Section>
  );
}
