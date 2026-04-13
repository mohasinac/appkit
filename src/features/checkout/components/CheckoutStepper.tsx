import React from "react";
import type { CheckoutStep } from "../types";
import { Div, Nav, Span } from "../../../ui";

interface CheckoutStepperProps {
  steps: { id: CheckoutStep; label: string }[];
  current: CheckoutStep;
}

export function CheckoutStepper({ steps, current }: CheckoutStepperProps) {
  const currentIdx = steps.findIndex((s) => s.id === current);
  return (
    <Nav aria-label="Checkout steps" className="flex items-center gap-2">
      {steps.map((step, idx) => {
        const isDone = idx < currentIdx;
        const isActive = step.id === current;
        return (
          <React.Fragment key={step.id}>
            <Div className="flex items-center gap-1.5">
              <Span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  isDone
                    ? "bg-green-500 text-white"
                    : isActive
                      ? "bg-neutral-900 text-white"
                      : "bg-neutral-200 text-neutral-500"
                }`}
              >
                {isDone ? "✓" : idx + 1}
              </Span>
              <Span
                className={`text-sm font-medium ${isActive ? "text-neutral-900" : isDone ? "text-neutral-500" : "text-neutral-400"}`}
              >
                {step.label}
              </Span>
            </Div>
            {idx < steps.length - 1 && (
              <Span className="h-px flex-1 bg-neutral-200" />
            )}
          </React.Fragment>
        );
      })}
    </Nav>
  );
}
