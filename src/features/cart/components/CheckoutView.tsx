"use client"
import React from "react";
import { Div, Heading, Stack } from "../../../ui";
import { AdSlot } from "../../homepage/components/AdSlot";

export interface CheckoutViewProps {
  labels?: { title?: string };
  renderStep: (
    activeStep: number,
    setStep: React.Dispatch<React.SetStateAction<number>>,
  ) => React.ReactNode;
  renderStepIndicator?: (
    activeStep: number,
    totalSteps: number,
    setStep: React.Dispatch<React.SetStateAction<number>>,
  ) => React.ReactNode;
  renderOrderSummary?: () => React.ReactNode;
  totalSteps?: number;
  initialStep?: number;
  activeStep?: number;
  onStepChange?: (step: number) => void;
  className?: string;
}

export function CheckoutView({
  labels = {},
  renderStep,
  renderStepIndicator,
  renderOrderSummary,
  totalSteps = 3,
  initialStep = 0,
  activeStep,
  onStepChange,
  className = "",
}: CheckoutViewProps) {
  const [internalStep, setInternalStep] = React.useState(initialStep);
  const step = activeStep ?? internalStep;
  const setStep = React.useCallback<
    React.Dispatch<React.SetStateAction<number>>
  >(
    (value) => {
      const nextStep =
        typeof value === "function"
          ? (value as (prevState: number) => number)(step)
          : value;
      if (activeStep === undefined) {
        setInternalStep(nextStep);
      }
      onStepChange?.(nextStep);
    },
    [activeStep, onStepChange, step],
  );

  return (
    <Div className={className}>
      {labels.title && (
        <Heading level={1} className="mb-6" size="2xl" weight="bold">
          {labels.title}
        </Heading>
      )}
      {renderStepIndicator?.(step, totalSteps, setStep)}
      <Stack direction="lg-row" className="lg:gap-[2rem]" gap="lg">
        <Div className="flex-1">
          {renderStep(step, setStep)}
          <AdSlot id="checkout-upsell" className="mt-6" />
        </Div>
        {renderOrderSummary && (
          <Div className="w-full lg:w-80">{renderOrderSummary()}</Div>
        )}
      </Stack>
    </Div>
  );
}
