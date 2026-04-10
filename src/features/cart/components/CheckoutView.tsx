"use client";

import React from "react";
import { Div, Heading } from "@mohasinac/ui";

export interface CheckoutViewProps {
  labels?: { title?: string };
  renderStep: (activeStep: number) => React.ReactNode;
  renderStepIndicator?: (activeStep: number, totalSteps: number) => React.ReactNode;
  renderOrderSummary?: () => React.ReactNode;
  totalSteps?: number;
  initialStep?: number;
  className?: string;
}

export function CheckoutView({
  labels = {},
  renderStep,
  renderStepIndicator,
  renderOrderSummary,
  totalSteps = 3,
  initialStep = 0,
  className = "",
}: CheckoutViewProps) {
  const [step, setStep] = React.useState(initialStep);
  return (
    <Div className={className}>
      {labels.title && (
        <Heading level={1} className="text-2xl font-bold mb-6">{labels.title}</Heading>
      )}
      {renderStepIndicator?.(step, totalSteps)}
      <Div className="flex gap-8">
        <Div className="flex-1">{renderStep(step)}</Div>
        {renderOrderSummary && <Div className="w-80">{renderOrderSummary()}</Div>}
      </Div>
    </Div>
  );
}
