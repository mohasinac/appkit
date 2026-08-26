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
 * A navigable form segment — a wizard step historically, a `<SectionForm>`
 * section today. `FormShellContextValue.steps` carries these purely so
 * `<FormErrorSummary>` can name the segment that owns an error and offer a
 * jump link.
 *
 * `content` is optional because the common producer (`useSectionFormNav`)
 * builds descriptors from section metadata alone — it has an id and a label
 * to render in the summary, and no node to hand over. Requiring a node here
 * is what previously forced both context producers to give up and populate
 * `steps: []`, which silently disabled the jump link everywhere.
 */
export interface FormShellStep {
  id: string;
  label: string;
  /** Field names required in this step — drives publish gate + error badge */
  requiredFields?: string[];
  content?: React.ReactNode;
}

/**
 * Navigation wiring for a form split into steps or collapsible sections.
 *
 * Supplying this is what makes `<FormErrorSummary>`'s "jump to section" link
 * work: it needs `sections` to name the owning segment and `onGoToSection` to
 * actually move there. Omit it for single-segment forms — the summary then
 * renders a flat list, which is correct for them.
 */
export interface FormShellNav {
  sections?: FormShellStep[];
  onGoToSection?: (index: number) => void;
  /** Maps a (dotted) error key to the index of the section that owns it. */
  fieldToSectionIndex?: Record<string, number>;
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
  /*
   * 🛑 Has the user tried to submit yet?
   *
   * `<FormErrorSummary>` renders nothing until this is true. Without it, every
   * form in the app greeted the user with a list of its own requirements as
   * errors: the summary is deliberately NOT `touched`-gated (unlike the
   * per-field inline errors), and ~20 views run `validate(draft)` in an effect
   * on mount — so an untouched empty draft was parsed immediately and every
   * `.min(1)` failed on first paint.
   *
   * Gate the DISPLAY, not the computation. The live validation stays: it is
   * what keeps the summary and the submit state current as the user fixes
   * things after a failed submit, which is the whole reason the summary exists.
   *
   * Per-field inline errors keep their own `touched` gate — a field the user
   * visited and left empty SHOULD say so. It is the summary that must wait,
   * because it speaks about fields they have not reached yet.
   */
  submitAttempted: boolean;
  /**
   * How many times. `submitAttempted` is `submitAttemptCount > 0` — DERIVED
   * at the one place each producer builds this object, never stored twice.
   *
   * The count exists because a boolean cannot express "this is a NEW
   * attempt". The mobile error sheet force-opens on a bumped counter, so
   * pressing Save a second time re-opens a sheet the user had collapsed,
   * while an ordinary re-render does not.
   */
  submitAttemptCount: number;
  /** Call from a submit handler, before validating. */
  markSubmitAttempted: () => void;
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
  /** True once the user has actually tried to submit. Gates <FormErrorSummary>. */
  submitAttempted: boolean;
  /** See FormShellContextValue.submitAttemptCount. */
  submitAttemptCount: number;
  /**
   * Record a submit attempt. `<Form>` / `<SectionForm>` / `<QuickFormDrawer>`
   * call this for you; call it directly only when your submit control is a
   * `type="button"` with an `onClick`, so no native submit event fires.
   */
  markSubmitAttempted: () => void;
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
 * `useFormShellState(schema?, nav?)` — caller-owned form state with optional
 * Zod validation. When a schema is supplied, `validate(values)` runs it and
 * pipes issues into the FormShellContext error map. `audit-form-schema`
 * requires every callsite to pass a schema.
 *
 * Pass `nav` when the form is split into sections (see `useSectionFormNav`)
 * so `<FormErrorSummary>` can name the owning section and jump to it. Omit it
 * for single-segment forms; the summary renders a flat list, which is right
 * for them.
 */
export function useFormShellState<TSchema extends import("zod").ZodTypeAny = import("zod").ZodTypeAny>(
  schema?: TSchema,
  nav?: FormShellNav,
): UseFormShellStateResult {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitAttemptCount, setSubmitAttemptCount] = useState(0);
  const markSubmitAttempted = useCallback(() => setSubmitAttemptCount((n) => n + 1), []);
  const submitAttempted = submitAttemptCount > 0;

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
      /*
       * 🛑 validate() does NOT mark the submit attempt, and must not.
       *
       * ELEVEN views call `validate(draft)` from a MOUNT EFFECT to keep the
       * summary and the submit-button state live as the user types — which
       * is the behaviour worth having. Marking here would fire on first
       * paint in exactly those views and defeat the gate entirely.
       *
       * The attempt is marked where an attempt actually happens: <Form>'s
       * native submit handler, <SectionForm>'s submit button, and
       * QuickFormDrawer's. A caller whose submit is an onClick on a
       * type="button" calls markSubmitAttempted() itself.
       */
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

  const navSections = nav?.sections;
  const navGoTo = nav?.onGoToSection;
  const navFieldMap = nav?.fieldToSectionIndex;

  const shellCtx = useMemo<FormShellContextValue>(() => ({
    errors,
    touched: Object.fromEntries(Object.keys(errors).map((k) => [k, true])),
    setFieldError,
    setFieldTouched: () => {},
    clearFieldError: (name) => setFieldError(name, null),
    // Real sections when the caller supplied nav — this is what makes
    // <FormErrorSummary>'s jump link resolve a label instead of `undefined`.
    steps: navSections ?? [],
    currentStep: 0,
    goToStep: navGoTo ?? (() => {}),
    nextStep: () => {},
    prevStep: () => {},
    isPublishReady: Object.keys(errors).length === 0,
    isDirty: false,
    isSubmitting: false,
    stepErrorCounts: [],
    fieldToStepIndex: navFieldMap,
    submitAttempted,
    submitAttemptCount,
    markSubmitAttempted,
  }), [errors, setFieldError, navSections, navGoTo, navFieldMap, submitAttempted, submitAttemptCount, markSubmitAttempted]);

  return {
    shellCtx,
    setFieldError,
    clearErrors,
    hasErrors: Object.keys(errors).length > 0,
    validate,
    submitAttempted,
    submitAttemptCount,
    markSubmitAttempted,
  };
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
  /**
   * The navigable segments this form is split into, in order. Without these
   * `<FormErrorSummary>` can call `goToStep(i)` but has no label to render for
   * segment `i`, so it silently falls back to a flat list — which is why this
   * used to be hardcoded `[]`. Supply alongside `fieldToStepIndex`.
   */
  sections?: FormShellStep[];
  /*
   * Force `submitAttempted` on from outside. The provider owns its own flag
   * and exposes `markSubmitAttempted()` on the context, which is enough for a
   * submit button rendered inside it — but a shell that already tracks the
   * attempt itself (SellerProductShell, whose Publish button lives in a
   * `renderBottomBar` slot) can hand it in instead. OR-ed, never overriding.
   */
  submitAttempted?: boolean;
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
  sections,
  submitAttempted: submitAttemptedProp = false,
}: FormShellProviderProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [ownAttemptCount, setOwnAttemptCount] = useState(0);
  const markSubmitAttempted = useCallback(() => setOwnAttemptCount((n) => n + 1), []);
  const submitAttemptCount = ownAttemptCount + (submitAttemptedProp ? 1 : 0);
  const submitAttempted = submitAttemptCount > 0;

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
    steps: sections ?? [],
    currentStep: 0,
    goToStep: onGoToStep ?? (() => {}),
    nextStep: () => {},
    prevStep: () => {},
    isPublishReady: Object.keys(errors).length === 0,
    isDirty,
    isSubmitting: false,
    stepErrorCounts: [],
    fieldToStepIndex,
    submitAttempted,
    submitAttemptCount,
    markSubmitAttempted,
  }), [errors, touched, setFieldError, setFieldTouched, clearFieldError, isDirty, onGoToStep, fieldToStepIndex, sections, submitAttempted, submitAttemptCount, markSubmitAttempted]);

  return <FormShellContext.Provider value={ctx}>{children}</FormShellContext.Provider>;
}

