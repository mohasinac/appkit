"use client";
import { useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { JsonValue } from "@mohasinac/appkit/client";
import type { ZodTypeAny } from "zod";
import { Check } from "lucide-react";
import { Button } from "../../ui/components/Button";
import { classNames } from "../../ui/style.helper";
import { Div, Nav, Row, Span, Stack, Text, useToast } from "../../ui";
import { normalizeError } from "../../errors/normalize";
import { FormSchemaContext } from "./FormShell";

export interface StepDef<T extends object = Record<string, JsonValue>> {
  label: string;
  render: (props: { values: T; onChange: (partial: Partial<T>) => void; errors: Record<string, string> }) => ReactNode;
  /** Returns an error message string if invalid, or null/undefined if valid. */
  validate?: (values: T) => string | null | undefined;
  /**
   * Schema field names this step owns — drives error→step attribution
   * (surfaced to the caller via `onValidationChange`'s `fieldToStepIndex`,
   * consumed by `<FormErrorSummary>`).
   */
  fields?: string[];
  /**
   * Per-step Zod schema. Runs live (on every value change, not just on
   * Next/Publish) via `onValidationChange`. Falls back to the whole-form
   * `schema` prop, then to a schema inherited from an ancestor `FormShell`
   * via `FormSchemaContext`, when omitted.
   */
  schema?: ZodTypeAny;
}

export interface StepFormProps<T extends object = Record<string, JsonValue>> {
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
  /**
   * Whole-form Zod schema, used by any step that doesn't declare its own
   * `StepDef.schema`. Falls back to an ancestor `FormShell`'s schema (via
   * `FormSchemaContext`) when omitted here too.
   */
  schema?: ZodTypeAny;
  /**
   * Fired whenever live validation recomputes — the current field-name→
   * message map plus a field-name→step-index map derived from `steps[].fields`.
   * The caller (which owns the single `FormShellContext.Provider` for the
   * surrounding form) composes these into its own context value so
   * `<FormErrorSummary>` and per-field inline errors both work, instead of
   * `StepForm` mounting a second, potentially-shadowing provider itself.
   */
  onValidationChange?: (
    fieldErrors: Record<string, string>,
    fieldToStepIndex: Record<string, number>,
  ) => void;
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
    <Row paddingX="x-5" className="border-t border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)]" padding="y-sm" align="center" justify="between" gap="sm">
      <>
        {!isFirst && onPrev && (
          <Button variant="outline" size="sm" onClick={onPrev} disabled={disabled || isLoading}>
            ← Back
          </Button>
        )}
      </>
      <Row align="center" gap="3">
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
      </Row>
    </Row>
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
    <Nav aria-label="Form steps" layout="flex" gap="none" className="mb-6 overflow-x-auto">
      {steps.map((step, i) => {
        const isDone = i < currentStep;
        const isActive = i === currentStep;
        const hasError = stepErrors?.[i] === true;
        return (
          <Row key={i} className="flex-shrink-0" align="center" gap="none">
            <Button
              variant="ghost"
              type="button"
              onClick={() => onStepClick?.(i)}
              gap="sm"
              rounded="lg"
              paddingX="sm"
              paddingY="xs"
              textSize="sm"
              className={classNames(
                "cursor-pointer",
                isActive
                  ? "font-semibold text-[var(--appkit-color-primary)]"
                  : isDone
                    ? "text-[var(--appkit-color-text-muted)] hover:text-[var(--appkit-color-text)]"
                    : "text-[var(--appkit-color-text-faint)] hover:text-[var(--appkit-color-text-muted)]",
              )}
            >
              <Span className="relative flex-shrink-0">
                {hasError && (
                  <Span
                    className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[var(--appkit-color-error)] z-10" rounded="full"
                    aria-label="This step has errors"
                  />
                )}
              <Span
                className={classNames(
                  "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[length:var(--appkit-text-xs)] font-bold border-2",
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
              </Span>
              </Span>
              <Span className="hidden sm:inline">{step.label}</Span>
            </Button>
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
          </Row>
        );
      })}
    </Nav>
  );
}

export function StepForm<T extends object = Record<string, JsonValue>>({
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
  schema,
  onValidationChange,
}: StepFormProps<T>) {
  const { showToast } = useToast();
  const inheritedSchema = useContext(FormSchemaContext);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [stepError, setStepError] = useState<string | null>(null);

  const fieldToStepIndex = useMemo(() => {
    const map: Record<string, number> = {};
    steps.forEach((step, i) => {
      step.fields?.forEach((field) => { map[field] = i; });
    });
    return map;
  }, [steps]);

  const runValidation = useCallback((nextValues: T) => {
    const activeSchema = steps[currentStep]?.schema ?? schema ?? inheritedSchema;
    if (!activeSchema) return;
    // audit-unvalidated-safeparse-ok: bulk-replaces fieldErrors from the full
    // parse result (clears fields that just became valid); applyZodIssues'
    // incremental setFieldError-per-issue can't do that.
    const parsed = activeSchema.safeParse(nextValues);
    if (parsed.success) {
      setFieldErrors({});
      onValidationChange?.({}, fieldToStepIndex);
      return;
    }
    const next: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      if (!issue.path || issue.path.length === 0) continue;
      next[issue.path.map(String).join(".")] = issue.message;
    }
    setFieldErrors(next);
    onValidationChange?.(next, fieldToStepIndex);
  }, [steps, currentStep, schema, inheritedSchema, fieldToStepIndex, onValidationChange]);

  // Re-run validation whenever the active step or schema changes, so
  // switching steps (or arriving with pre-filled values) shows accurate
  // live errors immediately rather than only after the next keystroke.
  useEffect(() => {
    runValidation(values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, steps[currentStep]?.schema, schema, inheritedSchema]);

  const handleFieldChange = useCallback((partial: Partial<T>) => {
    const merged = { ...values, ...partial };
    onChange(partial);
    runValidation(merged);
  }, [values, onChange, runValidation]);

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
    <Stack>
      <StepIndicator
        steps={steps}
        currentStep={currentStep}
        stepErrors={stepErrors}
        onStepClick={(i) => { if (i !== currentStep) { setStepError(null); onStepChange(i); } }}
      />

      <Div className="flex-1">
        {currentStepDef?.render({ values, onChange: handleFieldChange, errors: fieldErrors })}
      </Div>

      {!hideActions && stepError && (
        <Text className="mt-3 text-[var(--appkit-color-error)]" size="sm">{stepError}</Text>
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
    </Stack>
  );
}
