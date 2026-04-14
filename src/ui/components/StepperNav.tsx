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
    <Nav
      aria-label="Steps"
      className={classNames("appkit-stepper-nav", className)}
    >
      <Ol className="appkit-stepper-nav__list">
        {steps.map((step, i) => {
          const isComplete = step.number < currentStep;
          const isActive = step.number === currentStep;
          const isLast = i === steps.length - 1;

          return (
            <Li key={step.number} className="appkit-stepper-nav__item">
              <div className="appkit-stepper-nav__step">
                <div
                  className={classNames(
                    "appkit-stepper-nav__bubble",
                    isComplete
                      ? "appkit-stepper-nav__bubble--complete"
                      : isActive
                        ? "appkit-stepper-nav__bubble--active"
                        : "appkit-stepper-nav__bubble--pending",
                  )}
                >
                  {isComplete ? (
                    <svg
                      className="appkit-stepper-nav__check"
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
                    "appkit-stepper-nav__label",
                    isActive
                      ? "appkit-stepper-nav__label--active"
                      : isComplete
                        ? "appkit-stepper-nav__label--complete"
                        : "appkit-stepper-nav__label--pending",
                  )}
                >
                  {step.label}
                </Span>
              </div>

              {!isLast && (
                <div
                  className={classNames(
                    "appkit-stepper-nav__connector",
                    isComplete
                      ? "appkit-stepper-nav__connector--complete"
                      : "appkit-stepper-nav__connector--pending",
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
