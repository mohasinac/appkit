"use client";

import React from "react";
import { Div, Heading } from "@mohasinac/ui";

export interface CheckoutSuccessViewProps {
  labels?: { title?: string; continueButton?: string };
  renderHero?: () => React.ReactNode;
  renderOrderCard?: () => React.ReactNode;
  renderActions?: (onContinue: () => void) => React.ReactNode;
  className?: string;
}

export function CheckoutSuccessView({
  labels = {},
  renderHero,
  renderOrderCard,
  renderActions,
  className = "",
}: CheckoutSuccessViewProps) {
  return (
    <Div className={className}>
      {renderHero?.()}
      {labels.title && (
        <Heading level={1} className="text-2xl font-bold mb-4">{labels.title}</Heading>
      )}
      {renderOrderCard?.()}
      {renderActions?.(() => {})}
    </Div>
  );
}
