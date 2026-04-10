"use client";

import React from "react";
import { Div, Heading } from "@mohasinac/ui";

export interface BecomeSellerViewProps {
  labels?: { title?: string; ctaButton?: string };
  renderHero?: () => React.ReactNode;
  renderBenefits?: () => React.ReactNode;
  renderForm?: (isLoading: boolean) => React.ReactNode;
  renderCTA?: (onStart: () => void) => React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function BecomeSellerView({
  labels = {},
  renderHero,
  renderBenefits,
  renderForm,
  renderCTA,
  isLoading = false,
  className = "",
}: BecomeSellerViewProps) {
  return (
    <Div className={className}>
      {renderHero?.()}
      {labels.title && (
        <Heading level={1} className="text-2xl font-bold mb-6">{labels.title}</Heading>
      )}
      {renderBenefits?.()}
      {renderForm?.(isLoading)}
      {renderCTA?.(() => {})}
    </Div>
  );
}
