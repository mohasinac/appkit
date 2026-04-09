"use client";

import { Li, Nav, Ol } from "./Semantic";
import { Span } from "./Typography";
import { classNames } from "../style.helper";

export interface StepperNavStep {
  number: number;
  label: string;
}

export interface StepperNavProps {
  steps: StepperNavStep[];
  currentStep: number;
  className?: string;
}

export function StepperNav({ steps, currentStep, className }: StepperNavProps) {
  return (
    <Nav aria-label="Steps" className={classNames("mb-8", className)}>
      <Ol className="flex items-center gap-0">
        {steps.map((step, i) => {
          const isComplete = step.number < currentStep;
          const isActive = step.number === currentStep;
          const isLast = i === steps.length - 1;

          return (
            <Li key={step.number} className="flex flex-1 items-center">
              <div className="flex flex-shrink-0 items-center gap-2">
                <div
                  className={classNames(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                    isComplete
                      ? "border-primary bg-primary text-white"
                      : isActive
                        ? "border-primary bg-transparent text-primary"
                        : "border-zinc-300 text-zinc-500 dark:border-slate-700 dark:text-zinc-400",
                  )}
                >
                  {isComplete ? (
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    step.number
                  )}
                </div>
                <Span
                  className={classNames(
                    "hidden text-sm font-medium sm:block",
                    isActive
                      ? "text-primary"
                      : isComplete
                        ? "text-zinc-900 dark:text-zinc-100"
                        : "text-zinc-500 dark:text-zinc-400",
                  )}
                >
                  {step.label}
                </Span>
              </div>

              {!isLast && (
                <div
                  className={classNames(
                    "mx-3 h-0.5 flex-1 transition-colors",
                    isComplete
                      ? "bg-primary"
                      : "bg-zinc-200 dark:bg-slate-700",
                  )}
                />
              )}
            </Li>
          );
        })}
      </Ol>
    </Nav>
  );
}
