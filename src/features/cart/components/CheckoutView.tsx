import React from "react";
import { Div, Heading } from "../../../ui";

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
        <Heading level={1} className="text-2xl font-bold mb-6">
          {labels.title}
        </Heading>
      )}
      {renderStepIndicator?.(step, totalSteps, setStep)}
      <Div className="flex gap-8">
        <Div className="flex-1">{renderStep(step, setStep)}</Div>
        {renderOrderSummary && (
          <Div className="w-80">{renderOrderSummary()}</Div>
        )}
      </Div>
    </Div>
  );
}
