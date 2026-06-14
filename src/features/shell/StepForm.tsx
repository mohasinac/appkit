"use client";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { Button } from "../../ui/components/Button";
import { classNames } from "../../ui/style.helper";
import { Div, Span, Text, useToast } from "../../ui";

import { normalizeError } from "../../errors/normalize";
export interface StepDef<T extends object = Record<string, unknown>> {
  label: string;
  render: (props: { values: T; onChange: (partial: Partial<T>) => void; errors: Record<string, string> }) => ReactNode;
  /** Returns an error message string if invalid, or null/undefined if valid. */
  validate?: (values: T) => string | null | undefined;
}

export interface StepFormProps<T extends object = Record<string, unknown>> {
  steps: StepDef<T>[];
  values: T;
  onChange: (partial: Partial<T>) => void;
  onComplete: () => void | Promise<void>;
  completeLabel?: string;
  isLoading?: boolean;
  /** localStorage key to persist current step (optional). */
  formId?: string;
  /** Current step index (0-based). Controlled from outside. */
  currentStep: number;
  onStepChange: (step: number) => void;
  /** Suppress the built-in action bar. Use FormShell's renderBottomBar instead. */
  hideActions?: boolean;
  /** Per-step error flags — when true, step button shows a red error badge */
  stepErrors?: boolean[];
}

export interface StepFormActionsProps {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrev?: () => void;
  completeLabel?: string;
  isLoading?: boolean;
  disabled?: boolean;
}

/** Standalone step nav bar — use as `renderBottomBar` in FormShell. */
export function StepFormActions({
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  completeLabel = "Publish Now",
  isLoading = false,
  disabled = false,
}: StepFormActionsProps) {
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;
  const nextStepLabel = `Next →`;

  return (
    <Div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)]">
      <>
        {!isFirst && onPrev && (
          <Button variant="outline" size="sm" onClick={onPrev} disabled={disabled || isLoading}>
            ← Back
          </Button>
        )}
      </>
      <Div className="flex items-center gap-3">
        <Span size="xs" color="muted">
          {currentStep + 1} / {totalSteps}
        </Span>
        <Button
          variant="primary"
          size="sm"
          onClick={onNext}
          disabled={disabled || isLoading}
          isLoading={isLoading && isLast}
        >
          {isLast ? completeLabel : nextStepLabel}
        </Button>
      </Div>
    </Div>
  );
}

/** Step indicator bar shown above step content. */
export function StepIndicator({
  steps,
  currentStep,
  onStepClick,
  stepErrors,
}: {
  steps: { label: string }[];
  currentStep: number;
  onStepClick?: (index: number) => void;
  /** True for each step that has a validation error — renders a red dot badge */
  stepErrors?: boolean[];
}) {
  return (
    <nav aria-label="Form steps" className="flex items-center gap-0 mb-6 overflow-x-auto">
      {steps.map((step, i) => {
        const isDone = i < currentStep;
        const isActive = i === currentStep;
        const hasError = stepErrors?.[i] === true;
        return (
          <Div key={i} className="flex items-center gap-0 flex-shrink-0">
            <button
              type="button"
              disabled={!isDone && !isActive}
              onClick={() => isDone && onStepClick?.(i)}
              className={classNames(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                isActive
                  ? "font-semibold text-[var(--appkit-color-primary)]"
                  : isDone
                    ? "text-[var(--appkit-color-text-muted)] cursor-pointer hover:text-[var(--appkit-color-text)]"
                    : "text-[var(--appkit-color-text-faint)] cursor-default",
              )}
            >
              <span className="relative flex-shrink-0">
                {hasError && (
                  <span
                    className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--appkit-color-error)] z-10"
                    aria-label="This step has errors"
                  />
                )}
              <span
                className={classNames(
                  "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2",
                  hasError
                    ? "border-[var(--appkit-color-error)] bg-[var(--appkit-color-error)] text-white"
                    : isActive
                      ? "border-[var(--appkit-color-primary)] bg-[var(--appkit-color-primary)] text-white"
                      : isDone
                        ? "border-[var(--appkit-color-primary)] bg-[var(--appkit-color-primary)] text-white"
                        : "border-[var(--appkit-color-border)] text-[var(--appkit-color-text-faint)]",
                )}
              >
                {isDone && !hasError ? <Check className="w-3 h-3" /> : hasError ? "!" : i + 1}
              </span>
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </button>
            {i < steps.length - 1 && (
              <Div
                className={classNames(
                  "w-6 h-px flex-shrink-0 mx-1",
                  i < currentStep
                    ? "bg-[var(--appkit-color-primary)]"
                    : "bg-[var(--appkit-color-border)]",
                )}
              />
            )}
          </Div>
        );
      })}
    </nav>
  );
}

export function StepForm<T extends object = Record<string, unknown>>({
  steps,
  values,
  onChange,
  onComplete,
  completeLabel = "Publish Now",
  isLoading = false,
  formId,
  currentStep,
  onStepChange,
  hideActions = false,
  stepErrors,
}: StepFormProps<T>) {
  const { showToast } = useToast();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [stepError, setStepError] = useState<string | null>(null);

  // Persist step to localStorage if formId provided
  useEffect(() => {
    if (formId) localStorage.setItem(`stepform:${formId}`, String(currentStep));
  }, [formId, currentStep]);

  // Restore step from localStorage on mount
  useEffect(() => {
    if (!formId) return;
    const saved = localStorage.getItem(`stepform:${formId}`);
    if (saved !== null) {
      const n = Number(saved);
      if (!isNaN(n) && n >= 0 && n < steps.length) onStepChange(n);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId]);

  const goNext = useCallback(async () => {
    const step = steps[currentStep];
    if (step?.validate) {
      const err = step.validate(values);
      if (err) { setStepError(err); return; }
    }
    setStepError(null);
    if (currentStep < steps.length - 1) {
      onStepChange(currentStep + 1);
    } else {
      try {
        await onComplete();
      } catch (err) {
        void normalizeError(err);
        showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
      }
    }
  }, [currentStep, steps, values, onComplete, onStepChange, showToast]);

  const goPrev = useCallback(() => {
    if (currentStep > 0) {
      setStepError(null);
      onStepChange(currentStep - 1);
    }
  }, [currentStep, onStepChange]);

  const currentStepDef = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  return (
    <Div className="flex flex-col">
      <StepIndicator
        steps={steps}
        currentStep={currentStep}
        stepErrors={stepErrors}
        onStepClick={(i) => { if (i < currentStep) { setStepError(null); onStepChange(i); } }}
      />

      <Div className="flex-1">
        {currentStepDef?.render({ values, onChange, errors: fieldErrors })}
      </Div>

      {!hideActions && stepError && (
        <Text className="mt-3 text-sm text-[var(--appkit-color-error)]">{stepError}</Text>
      )}

      {!hideActions && (
        <StepFormActions
          currentStep={currentStep}
          totalSteps={steps.length}
          onNext={() => void goNext()}
          onPrev={currentStep > 0 ? goPrev : undefined}
          completeLabel={completeLabel}
          isLoading={isLoading && isLast}
          disabled={isLoading}
        />
      )}
    </Div>
  );
}
