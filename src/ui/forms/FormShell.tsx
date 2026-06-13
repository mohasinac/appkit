"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ZodType } from "zod";
import { Button } from "../components/Button";
import { Heading, Span, Text } from "../components/Typography";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FormShellStep {
  id: string;
  label: string;
  /** Field names required in this step — drives publish gate + error badge */
  requiredFields?: string[];
  content: React.ReactNode;
}

export interface FormShellContextValue {
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  setFieldError: (name: string, error: string | null) => void;
  setFieldTouched: (name: string) => void;
  clearFieldError: (name: string) => void;
  steps: FormShellStep[];
  currentStep: number;
  goToStep: (n: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  isPublishReady: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
  stepErrorCounts: number[];
}

export interface FormShellProps {
  steps: FormShellStep[];
  /** Called on debounced auto-save and "Save Draft" click */
  onSaveDraft?: (
    values: Record<string, unknown>
  ) => Promise<{ id?: string } | void>;
  /** Called on Publish / Save */
  onPublish: (values: Record<string, unknown>) => Promise<void>;
  /** Current form values — caller owns state */
  values: Record<string, unknown>;
  /** Zod schema for auto-validation on publish. Errors are mapped to field names. */
  schema?: ZodType;
  /** When true + schema provided, validate on every value change (not just publish). */
  validateOnChange?: boolean;
  /** Whether any values differ from the persisted state */
  isDirty?: boolean;
  draftId?: string;
  autoSaveDelayMs?: number;
  publishLabel?: string;
  saveDraftLabel?: string;
  title?: string;
  className?: string;
  /** If true, show steps as vertical accordion on mobile instead of wizard tabs */
  mobileAccordion?: boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────

export const FormShellContext = createContext<FormShellContextValue | null>(null);

export function useFormShell(): FormShellContextValue {
  const ctx = useContext(FormShellContext);
  if (!ctx) throw new Error("useFormShell must be used inside <FormShell>");
  return ctx;
}

// ─── useFormShellState ────────────────────────────────────────────────────────
// Lightweight hook for forms that manage their own layout (admin editors, user
// settings, address book).  Returns the context value + imperative helpers so
// the component can validate required fields before calling the API.
//
// Usage:
//   const { shellCtx, setFieldError, clearErrors } = useFormShellState();
//   // wrap JSX in <FormShellContext.Provider value={shellCtx}>
//   // call setFieldError("name", "Required") in submit handler to show inline err

export interface UseFormShellStateResult {
  shellCtx: FormShellContextValue;
  setFieldError: (name: string, error: string | null) => void;
  clearErrors: () => void;
  hasErrors: boolean;
}

/**
 * `applyZodIssues` — pipe every issue from a Zod safeParse failure into the
 * FormShellContext error map. Use after `schema.safeParse(values)` returns
 * `success: false` to surface inline errors on `<FieldInput>` etc.
 */
export function applyZodIssues(
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>,
  setFieldError: (name: string, error: string | null) => void,
): void {
  for (const issue of issues) {
    const key = issue.path[0];
    if (key == null) continue;
    setFieldError(String(key), issue.message);
  }
}

export function useFormShellState(): UseFormShellStateResult {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setFieldError = useCallback((name: string, error: string | null) => {
    setErrors((prev) => {
      if (!error) { const n = { ...prev }; delete n[name]; return n; }
      if (prev[name] === error) return prev;
      return { ...prev, [name]: error };
    });
  }, []);

  const clearErrors = useCallback(() => setErrors({}), []);

  const shellCtx = useMemo<FormShellContextValue>(() => ({
    errors,
    touched: Object.fromEntries(Object.keys(errors).map((k) => [k, true])),
    setFieldError,
    setFieldTouched: () => {},
    clearFieldError: (name) => setFieldError(name, null),
    steps: [],
    currentStep: 0,
    goToStep: () => {},
    nextStep: () => {},
    prevStep: () => {},
    isPublishReady: Object.keys(errors).length === 0,
    isDirty: false,
    isSubmitting: false,
    stepErrorCounts: [],
  }), [errors, setFieldError]);

  return { shellCtx, setFieldError, clearErrors, hasErrors: Object.keys(errors).length > 0 };
}

// ─── StepIndicator ───────────────────────────────────────────────────────────

interface StepIndicatorProps {
  steps: FormShellStep[];
  currentStep: number;
  stepErrorCounts: number[];
  onGoTo: (n: number) => void;
}

function StepIndicator({
  steps,
  currentStep,
  stepErrorCounts,
  onGoTo,
}: StepIndicatorProps) {
  return (
    <nav
      className="appkit-formshell__step-indicator"
      aria-label="Form steps"
    >
      {steps.map((step, i) => {
        const isActive = i === currentStep;
        const hasErrors = stepErrorCounts[i] > 0;
        return (
          <button
            key={step.id}
            type="button"
            className={[
              "appkit-formshell__step-btn",
              isActive ? "appkit-formshell__step-btn--active" : "",
              hasErrors ? "appkit-formshell__step-btn--error" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => onGoTo(i)}
            aria-current={isActive ? "step" : undefined}
            aria-label={`${step.label}${hasErrors ? ` (${stepErrorCounts[i]} error${stepErrorCounts[i] !== 1 ? "s" : ""})` : ""}`}
          >
            <span className="appkit-formshell__step-dot">
              {hasErrors && (
                <span
                  className="appkit-formshell__step-error-badge"
                  aria-hidden="true"
                />
              )}
              <span className="appkit-formshell__step-num">{i + 1}</span>
            </span>
            <span className="appkit-formshell__step-label">{step.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// ─── ErrorSummary ─────────────────────────────────────────────────────────────

interface ErrorSummaryProps {
  errors: Record<string, string>;
  visible: boolean;
}

function ErrorSummary({ errors, visible }: ErrorSummaryProps) {
  const entries = Object.entries(errors).filter(([, v]) => v);
  if (!visible || entries.length === 0) return null;
  return (
    <div
      className="appkit-formshell__error-summary"
      role="alert"
      aria-live="assertive"
    >
      <Text size="sm" variant="error" className="appkit-formshell__error-summary__title">
        Please fix {entries.length} error{entries.length !== 1 ? "s" : ""} before publishing.
      </Text>
      <ul className="appkit-formshell__error-summary__list">
        {entries.map(([field, msg]) => (
          <li key={field}>
            <Text size="sm" variant="error">
              <Span weight="bold">{field}</Span>: {msg}
            </Text>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── FormShellProvider ────────────────────────────────────────────────────────
// Headless context provider — supplies FormShellContext to forms that have
// their own layout (seller multi-step shells, admin card editors, user settings).
// Use <FormShell> for forms that also want the built-in header/body/footer UI.

export interface FormShellProviderProps {
  children: ReactNode;
  /** Called on debounced auto-save when isDirty changes */
  onSaveDraft?: (values: Record<string, unknown>) => Promise<void>;
  /** Whether any values differ from the persisted state — triggers auto-save */
  isDirty?: boolean;
  autoSaveDelayMs?: number;
  /** Current form values — passed into onSaveDraft on auto-save */
  values?: Record<string, unknown>;
}

export function FormShellProvider({
  children,
  onSaveDraft,
  isDirty = false,
  autoSaveDelayMs = 2000,
  values = {},
}: FormShellProviderProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  useEffect(() => {
    if (!onSaveDraft || !isDirty) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      onSaveDraft(valuesRef.current).catch(() => {/* silent auto-save */});
    }, autoSaveDelayMs);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [values, isDirty, onSaveDraft, autoSaveDelayMs]);

  const setFieldError = useCallback((name: string, error: string | null) => {
    setErrors((prev) => {
      if (!error) { const next = { ...prev }; delete next[name]; return next; }
      if (prev[name] === error) return prev;
      return { ...prev, [name]: error };
    });
  }, []);

  const clearFieldError = useCallback((name: string) => {
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev }; delete next[name]; return next;
    });
  }, []);

  const setFieldTouched = useCallback((name: string) => {
    setTouched((prev) => (prev[name] ? prev : { ...prev, [name]: true }));
  }, []);

  const ctx = useMemo<FormShellContextValue>(() => ({
    errors,
    touched,
    setFieldError,
    setFieldTouched,
    clearFieldError,
    steps: [],
    currentStep: 0,
    goToStep: () => {},
    nextStep: () => {},
    prevStep: () => {},
    isPublishReady: true,
    isDirty,
    isSubmitting: false,
    stepErrorCounts: [],
  }), [errors, touched, setFieldError, setFieldTouched, clearFieldError, isDirty]);

  return <FormShellContext.Provider value={ctx}>{children}</FormShellContext.Provider>;
}

// ─── Schema validation helper ────────────────────────────────────────────────

function validateSchema(
  schema: ZodType,
  values: Record<string, unknown>,
  setFieldError: (name: string, error: string | null) => void,
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>,
): boolean {
  const result = schema.safeParse(values);
  if (result.success) {
    setErrors({});
    return true;
  }
  const newErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join(".");
    if (path && !newErrors[path]) {
      newErrors[path] = issue.message;
    }
  }
  setErrors(newErrors);
  return false;
}

// ─── FormShell ────────────────────────────────────────────────────────────────

export function FormShell({
  steps,
  onSaveDraft,
  onPublish,
  values,
  schema,
  validateOnChange = false,
  isDirty = false,
  autoSaveDelayMs = 2000,
  publishLabel = "Publish",
  saveDraftLabel = "Save Draft",
  title,
  className = "",
  mobileAccordion = true,
}: FormShellProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showErrorSummary, setShowErrorSummary] = useState(false);

  // Auto-save
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  useEffect(() => {
    if (!onSaveDraft || !isDirty) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      onSaveDraft(valuesRef.current).catch(() => {/* silent auto-save failure */});
    }, autoSaveDelayMs);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [values, isDirty, onSaveDraft, autoSaveDelayMs]);

  // Per-step error counts
  const stepErrorCounts = useMemo(() => {
    return steps.map((step) => {
      const fields = step.requiredFields ?? [];
      return fields.filter((f) => errors[f]).length;
    });
  }, [steps, errors]);

  // Publish gate: all required fields across all steps must be valid
  const isPublishReady = useMemo(() => {
    return steps.every((step) =>
      (step.requiredFields ?? []).every((f) => !errors[f])
    );
  }, [steps, errors]);

  const setFieldError = useCallback(
    (name: string, error: string | null) => {
      setErrors((prev) => {
        if (!error) {
          const next = { ...prev };
          delete next[name];
          return next;
        }
        if (prev[name] === error) return prev;
        return { ...prev, [name]: error };
      });
    },
    []
  );

  const clearFieldError = useCallback((name: string) => {
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const setFieldTouched = useCallback((name: string) => {
    setTouched((prev) => (prev[name] ? prev : { ...prev, [name]: true }));
  }, []);

  const goToStep = useCallback(
    (n: number) => {
      if (n >= 0 && n < steps.length) setCurrentStep(n);
    },
    [steps.length]
  );

  const nextStep = useCallback(
    () => setCurrentStep((s) => Math.min(s + 1, steps.length - 1)),
    [steps.length]
  );
  const prevStep = useCallback(
    () => setCurrentStep((s) => Math.max(s - 1, 0)),
    []
  );

  const handleSaveDraft = useCallback(async () => {
    if (!onSaveDraft) return;
    setIsSubmitting(true);
    try {
      await onSaveDraft(values);
    } finally {
      setIsSubmitting(false);
    }
  }, [onSaveDraft, values]);

  // Schema-driven live validation on value changes
  useEffect(() => {
    if (!schema || !validateOnChange) return;
    validateSchema(schema, values, setFieldError, setErrors);
  }, [schema, validateOnChange, values, setFieldError]);

  const handlePublish = useCallback(async () => {
    setShowErrorSummary(true);
    if (schema) {
      const valid = validateSchema(schema, values, setFieldError, setErrors);
      if (!valid) return;
    }
    if (!isPublishReady) return;
    setIsSubmitting(true);
    try {
      await onPublish(values);
    } finally {
      setIsSubmitting(false);
    }
  }, [isPublishReady, onPublish, values, schema, setFieldError]);

  const ctx = useMemo<FormShellContextValue>(
    () => ({
      errors,
      touched,
      setFieldError,
      setFieldTouched,
      clearFieldError,
      steps,
      currentStep,
      goToStep,
      nextStep,
      prevStep,
      isPublishReady,
      isDirty,
      isSubmitting,
      stepErrorCounts,
    }),
    [
      errors,
      touched,
      setFieldError,
      setFieldTouched,
      clearFieldError,
      steps,
      currentStep,
      goToStep,
      nextStep,
      prevStep,
      isPublishReady,
      isDirty,
      isSubmitting,
      stepErrorCounts,
    ]
  );

  const isMultiStep = steps.length > 1;

  return (
    <FormShellContext.Provider value={ctx}>
      <div
        className={[
          "appkit-formshell",
          mobileAccordion ? "appkit-formshell--accordion-mobile" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {/* Header */}
        {(title || isMultiStep) && (
          <div className="appkit-formshell__header">
            {title && (
              <Heading level={2} className="appkit-formshell__title">{title}</Heading>
            )}
            {isMultiStep && (
              <StepIndicator
                steps={steps}
                currentStep={currentStep}
                stepErrorCounts={stepErrorCounts}
                onGoTo={goToStep}
              />
            )}
          </div>
        )}

        {/* Error summary (visible after first publish attempt) */}
        <ErrorSummary errors={errors} visible={showErrorSummary} />

        {/* Step content */}
        <div className="appkit-formshell__body">
          {isMultiStep ? (
            mobileAccordion ? (
              // Mobile: vertical accordion; Desktop: show only current step
              <div className="appkit-formshell__steps">
                {steps.map((step, i) => {
                  const isActive = i === currentStep;
                  const hasErrors = stepErrorCounts[i] > 0;
                  return (
                    <div
                      key={step.id}
                      className={[
                        "appkit-formshell__step",
                        isActive ? "appkit-formshell__step--active" : "",
                        hasErrors ? "appkit-formshell__step--error" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {/* Mobile accordion header */}
                      <button
                        type="button"
                        className="appkit-formshell__step-accordion-btn"
                        onClick={() => goToStep(i)}
                        aria-expanded={isActive}
                      >
                        <span className="appkit-formshell__step-accordion-label">
                          {i + 1}. {step.label}
                        </span>
                        {hasErrors && (
                          <span className="appkit-formshell__step-error-badge appkit-formshell__step-error-badge--inline">
                            {stepErrorCounts[i]}
                          </span>
                        )}
                      </button>
                      {/* Content (always visible desktop; accordion on mobile) */}
                      <div
                        className="appkit-formshell__step-content"
                        hidden={!isActive}
                        aria-hidden={!isActive}
                      >
                        {step.content}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Non-accordion: show only the active step
              <div className="appkit-formshell__step-content">
                {steps[currentStep]?.content}
              </div>
            )
          ) : (
            // Single step: render content directly
            <div className="appkit-formshell__step-content">
              {steps[0]?.content}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="appkit-formshell__footer">
          {/* Multi-step navigation */}
          {isMultiStep && (
            <div className="appkit-formshell__step-nav">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={prevStep}
                disabled={currentStep === 0 || isSubmitting}
              >
                Previous
              </Button>
              {currentStep < steps.length - 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={nextStep}
                  disabled={isSubmitting}
                >
                  Next
                </Button>
              )}
            </div>
          )}

          {/* Primary actions */}
          <div className="appkit-formshell__actions">
            {onSaveDraft && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSaveDraft}
                isLoading={isSubmitting}
                disabled={isSubmitting}
              >
                {saveDraftLabel}
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={handlePublish}
              isLoading={isSubmitting}
              disabled={isSubmitting || (showErrorSummary && !isPublishReady)}
            >
              {publishLabel}
            </Button>
          </div>
        </div>
      </div>
    </FormShellContext.Provider>
  );
}
