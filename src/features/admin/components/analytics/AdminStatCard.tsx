import React from "react";
import { Div, Text, Heading } from "../../../../ui";

const BRAND_FROM = "var(--appkit-color-primary-700, #1343de)";
const BRAND_MID  = "var(--appkit-color-cobalt, #3570fc)";
const BRAND_TO   = "var(--appkit-color-secondary-400, #84e122)";

const GRADIENTS: Record<string, string> = {
  brand:  `linear-gradient(135deg, ${BRAND_FROM} 0%, ${BRAND_MID} 55%, ${BRAND_TO} 100%)`,
  blue:   `linear-gradient(135deg, ${BRAND_FROM} 0%, ${BRAND_MID} 100%)`,
  green:  `linear-gradient(135deg, ${BRAND_MID} 0%, ${BRAND_TO} 100%)`,
  amber:  "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)",
  rose:   "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)",
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
      className={`relative rounded-xl border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] overflow-hidden shadow-sm hover:shadow-md transition-shadow ${className}`}
    >
      {/* 3-px gradient top accent */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ background: resolvedGradient }}
        aria-hidden="true"
      />

      <Div className="px-5 pb-5 pt-6 flex items-start justify-between gap-3">
        <Div className="min-w-0 flex-1">
          <Text className="text-[11px] font-semibold uppercase tracking-widest text-[var(--appkit-color-text-muted)]">
            {label}
          </Text>
          <Heading
            level={3}
            className="mt-2 text-2xl font-bold tabular-nums leading-none text-[var(--appkit-color-text)]"
          >
            {value}
          </Heading>
          {sub && (
            <Text className="mt-1.5 text-xs text-[var(--appkit-color-text-muted)]">{sub}</Text>
          )}
        </Div>

        {icon && (
          <Div
            className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xl"
            style={{ background: resolvedGradient }}
          >
            {icon}
          </Div>
        )}
      </Div>
    </Div>
  );
}
