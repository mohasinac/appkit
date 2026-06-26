import React from "react";
import { Div, Heading, Row, Text } from "../../../../ui";
import { DynamicBgDiv } from "../../../../ui/components/DynamicBgDiv";
const BRAND_FROM = "var(--appkit-color-primary-700)";
const BRAND_MID  = "var(--appkit-color-cobalt)";
const BRAND_TO   = "var(--appkit-color-secondary-400)";

const GRADIENTS: Record<string, string> = {
  brand:  `linear-gradient(135deg, ${BRAND_FROM} 0%, ${BRAND_MID} 55%, ${BRAND_TO} 100%)`,
  blue:   `linear-gradient(135deg, ${BRAND_FROM} 0%, ${BRAND_MID} 100%)`,
  green:  `linear-gradient(135deg, ${BRAND_MID} 0%, ${BRAND_TO} 100%)`,
  amber:  "var(--appkit-gradient-warning-stat)",
  rose:   "var(--appkit-gradient-danger-stat)",
};

export interface AdminStatCardProps {
  label: string;
  value: string;
  sub?: string;
  /** Emoji or ReactNode icon */
  icon?: React.ReactNode | string;
  /** Named preset or raw CSS gradient string */
  gradient?: keyof typeof GRADIENTS | string;
  className?: string;
}

export function AdminStatCard({
  label,
  value,
  sub,
  icon,
  gradient = "brand",
  className = "",
}: AdminStatCardProps) {
  const resolvedGradient = GRADIENTS[gradient as keyof typeof GRADIENTS] ?? gradient;

  return (
    <Div
      className={`relative border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] overflow-hidden ${className}`} rounded="xl" shadow="sm-hover-md"
    >
      {/* 3-px gradient top accent */}
      <DynamicBgDiv
        background={resolvedGradient}
        className="absolute top-0 left-0 right-0 h-[3px]"
        aria-hidden="true"
      />

      <Row paddingX="x-5" paddingY="b-md-lg" padding="t-lg" align="start" justify="between" gap="3">
        <Div className="min-w-0 flex-1">
          <Text className="text-[11px] tracking-widest text-[var(--appkit-color-text-muted)]" weight="semibold" transform="uppercase">
            {label}
          </Text>
          <Heading
            level={3}
            className="mt-2 tabular-nums leading-none text-[var(--appkit-color-text)]" size="2xl" weight="bold"
          >
            {value}
          </Heading>
          {sub && (
            <Text className="mt-1.5 text-[var(--appkit-color-text-muted)]" size="xs">{sub}</Text>
          )}
        </Div>

        {icon && (
          <DynamicBgDiv
            background={resolvedGradient}
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg text-xl"
          >
            {icon}
          </DynamicBgDiv>
        )}
      </Row>
    </Div>
  );
}
