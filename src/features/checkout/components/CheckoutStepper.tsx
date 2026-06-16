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
            <Row gap="2.5">
              <Span color="inverse" 
                className={`flex h-6 w-6 items-center justify-center ${ isDone ? "bg-success " : isActive ? "bg-neutral-900 " : "bg-neutral-200 dark:bg-slate-700 text-neutral-500 dark:text-zinc-400" }`} rounded="full" size="xs" weight="semibold"
              >
                {isDone ? "✓" : idx + 1}
              </Span>
              <Span
                className={`${isActive ? "text-neutral-900 dark:text-zinc-100" : isDone ? "text-neutral-500 dark:text-zinc-400" : "text-zinc-400 dark:text-zinc-400"}`} size="sm" weight="medium"
              >
                {step.label}
              </Span>
            </Row>
            {idx < steps.length - 1 && (
              <Span className="h-px flex-1 bg-neutral-200" />
            )}
          </React.Fragment>
        );
      })}
    </Nav>
  );
}
