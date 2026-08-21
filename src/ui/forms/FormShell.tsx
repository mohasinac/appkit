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
import type { FormValues } from "../../schemas/types";

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * A step descriptor. The step-wizard *rendering* this once drove
 * (`<FormShell steps={…}>`) was deleted 2026-08-09 as dead code — the real
 * wizard chrome is `features/shell/FormShell.tsx` + `StepForm.tsx`. This type
 * survives because `FormShellContextValue.steps` still carries the shape for
 * any context consumer that reads it (FormShellProvider/useFormShellState
 * both populate it as `[]` since neither is step-aware).
 */
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
  /**
   * Maps an error key (same key shape `errors` uses) to the index into
   * `steps` that owns it. Populated only by step-aware producers (the
   * `features/shell` wizard chrome/step engine) — undefined for single-step
   * forms (`<Form>`, `useFormShellState` with no steps). `<FormErrorSummary>`
   * treats undefined as "no step context" and renders a flat list.
   */
  fieldToStepIndex?: Record<string, number>;
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
  /**
   * Run the Zod schema (if one was passed to `useFormShellState`) against the
   * supplied values, write inline errors via `setFieldError`, and return the
   * parsed value on success or null on failure.
   */
  validate: <T = unknown>(values: unknown) => T | null;
}

/**
 * `applyZodIssues` — pipe every issue from a Zod safeParse failure into the
 * FormShellContext error map. Use after `schema.safeParse(values)` returns
 * `success: false` to surface inline errors on `<FieldInput>` etc.
 *
 * Keys are the full dotted/indexed path (`"video.duration"`, `"images.2"`),
 * not just the top-level segment — a plain `issue.path[0]` key would collapse
 * every nested issue under one object onto the same map entry, silently
 * dropping all but the last. Top-level-only fields (the common case) are
 * unaffected: a single-segment path joins to the same string as before.
 *
 * Root-level `.refine()` issues (empty `path: []`, no owning field) are still
 * skipped — there is no field to attach them to, and no schema in this
 * codebase currently relies on one being surfaced this way.
 */
export function applyZodIssues(
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>,
  setFieldError: (name: string, error: string | null) => void,
): void {
  for (const issue of issues) {
    if (!issue.path || issue.path.length === 0) continue;
    const key = issue.path.map(String).join(".");
    setFieldError(key, issue.message);
  }
}

/**
 * `useFormShellState(schema?)` — caller-owned form state with optional Zod
 * validation. When a schema is supplied, `validate(values)` runs it and pipes
 * issues into the FormShellContext error map. `audit-form-schema` requires
 * every callsite to pass a schema.
 */
export function useFormShellState<TSchema extends import("zod").ZodTypeAny = import("zod").ZodTypeAny>(
  schema?: TSchema,
): UseFormShellStateResult {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setFieldError = useCallback((name: string, error: string | null) => {
    setErrors((prev) => {
      if (!error) { const n = { ...prev }; delete n[name]; return n; }
      if (prev[name] === error) return prev;
      return { ...prev, [name]: error };
    });
  }, []);

  const clearErrors = useCallback(() => setErrors({}), []);

  const validate = useCallback(
    <T = unknown,>(values: unknown): T | null => {
      if (!schema) return values as T;
      const parsed = schema.safeParse(values);
      if (parsed.success) {
        setErrors({});
        return parsed.data as T;
      }
      applyZodIssues(parsed.error.issues, setFieldError);
      return null;
    },
    [schema, setFieldError],
  );

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

  return { shellCtx, setFieldError, clearErrors, hasErrors: Object.keys(errors).length > 0, validate };
}

// ─── FormShellProvider ────────────────────────────────────────────────────────
// Headless context provider — supplies FormShellContext to forms that have
// their own layout (seller multi-step shells, admin card editors, user settings).
// Field primitives (FieldInput/FieldSelect/etc.) read this context via
// `useFormShell()` to wire aria-invalid + inline errors automatically.

export interface FormShellProviderProps {
  children: ReactNode;
  /** Called on debounced auto-save when isDirty changes */
  onSaveDraft?: (values: FormValues) => Promise<void>;
  /** Whether any values differ from the persisted state — triggers auto-save */
  isDirty?: boolean;
  autoSaveDelayMs?: number;
  /** Current form values — passed into onSaveDraft on auto-save */
  values?: FormValues;
  /**
   * Optional Zod schema — when supplied, the provider runs `.safeParse(values)`
   * live (every time `values` changes, not just on submit) and populates its
   * own `errors` map from the issues, so `<FieldInput>`/`<FormField>`/
   * `<FormErrorSummary>` descendants get real validation without the parent
   * component having to reach into the provider's internal state itself.
   */
  schema?: import("zod").ZodTypeAny;
  /**
   * Maps an error key to the index of the step that owns it — forwarded
   * as-is into the context value for `<FormErrorSummary>` to consume. The
   * provider itself has no concept of "steps"; the caller (typically a
   * step-wizard shell) computes this from its own step definitions.
   */
  fieldToStepIndex?: Record<string, number>;
  /** Wired into `FormShellContextValue.goToStep` when the caller has real step navigation to drive (e.g. a step-wizard's `setCurrentStep`). */
  onGoToStep?: (n: number) => void;
}

export function FormShellProvider({
  children,
  onSaveDraft,
  isDirty = false,
  autoSaveDelayMs = 2000,
  values = {},
  schema,
  fieldToStepIndex,
  onGoToStep,
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

  useEffect(() => {
    if (!schema) return;
    // audit-unvalidated-safeparse-ok: bulk-replaces the whole errors map from
    // the full parse result (so a field that just became valid is cleared),
    // which applyZodIssues (incremental setFieldError-per-issue) can't do.
    const parsed = schema.safeParse(values);
    if (parsed.success) { setErrors({}); return; }
    const next: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      if (!issue.path || issue.path.length === 0) continue;
      next[issue.path.map(String).join(".")] = issue.message;
    }
    setErrors(next);
  }, [schema, values]);

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
    goToStep: onGoToStep ?? (() => {}),
    nextStep: () => {},
    prevStep: () => {},
    isPublishReady: Object.keys(errors).length === 0,
    isDirty,
    isSubmitting: false,
    stepErrorCounts: [],
    fieldToStepIndex,
  }), [errors, touched, setFieldError, setFieldTouched, clearFieldError, isDirty, onGoToStep, fieldToStepIndex]);

  return <FormShellContext.Provider value={ctx}>{children}</FormShellContext.Provider>;
}

