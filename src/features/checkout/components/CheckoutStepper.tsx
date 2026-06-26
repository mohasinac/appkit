import React from "react";
import type { CheckoutStep } from "../types";
import { Div, Nav, Row, Span } from "../../../ui";

interface CheckoutStepperProps {
  steps: { id: CheckoutStep; label: string }[];
  current: CheckoutStep;
}

export function CheckoutStepper({ steps, current }: CheckoutStepperProps) {
  const currentIdx = steps.findIndex((s) => s.id === current);
  return (
    <Nav aria-label="Checkout steps" layout="flex" gap="xs">
      {steps.map((step, idx) => {
        const isDone = idx < currentIdx;
        const isActive = step.id === current;
        return (
          <React.Fragment key={step.id}>
            <Row gap="2.5">
              <Span layout="flex" color="inverse"
                className={`h-6 w-6 justify-[center] ${ isDone ? "bg-success " : isActive ? "bg-neutral-900 " : "bg-neutral-200 dark:bg-[var(--appkit-color-surface-elevated)] text-neutral-500 dark:text-[var(--appkit-color-text-faint)]" }`} rounded="full" size="xs" weight="semibold"
              >
                {isDone ? "✓" : idx + 1}
              </Span>
              <Span
                className={`${isActive ? "text-neutral-900 dark:text-[var(--appkit-color-text)]" : isDone ? "text-neutral-500 dark:text-[var(--appkit-color-text-faint)]" : "text-[var(--appkit-color-text-faint)]"}`} size="sm" weight="medium"
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
