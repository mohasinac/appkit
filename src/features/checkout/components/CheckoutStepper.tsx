import React from "react";
import type { CheckoutStep } from "../types";
import { Div, Nav, Row, Span } from "../../../ui";
import { THEME_CONSTANTS } from "../../../tokens";

interface CheckoutStepperProps {
  steps: { id: CheckoutStep; label: string }[];
  current: CheckoutStep;
}

export function CheckoutStepper({ steps, current }: CheckoutStepperProps) {
  const currentIdx = steps.findIndex((s) => s.id === current);
  return (
    <Nav aria-label="Checkout steps" className={`flex items-center ${THEME_CONSTANTS.spacing.gap.xs}`}>
      {steps.map((step, idx) => {
        const isDone = idx < currentIdx;
        const isActive = step.id === current;
        return (
          <React.Fragment key={step.id}>
            <Row className={THEME_CONSTANTS.spacing.gap["2.5"]}>
              <Span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  isDone
                    ? "bg-green-500 text-white"
                    : isActive
                      ? "bg-neutral-900 text-white"
                      : "bg-neutral-200 dark:bg-slate-700 text-neutral-500 dark:text-zinc-400"
                }`}
              >
                {isDone ? "✓" : idx + 1}
              </Span>
              <Span
                className={`text-sm font-medium ${isActive ? "text-neutral-900 dark:text-zinc-100" : isDone ? "text-neutral-500 dark:text-zinc-400" : "text-neutral-400 dark:text-zinc-500"}`}
              >
                {step.label}
              </Span>
            </Row>
            {idx < steps.length - 1 && (
              <Span className="h-px flex-1 bg-neutral-200 dark:bg-slate-700" />
            )}
          </React.Fragment>
        );
      })}
    </Nav>
  );
}
