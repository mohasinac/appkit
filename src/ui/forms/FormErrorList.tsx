"use client";
import { useContext } from "react";
import { FormShellContext, type FormShellContextValue } from "./FormShell";
import { Span } from "../components/Typography";

export interface FormErrorListProps {
  /**
   * Read errors from this context value instead of the ambient one. The
   * mobile bottom sheet needs it: `useFormBottomActions` builds the panel as
   * a detached ReactNode that is rendered by `BottomActions`, high up in the
   * layout tree and therefore OUTSIDE the form's own provider.
   */
  ctx?: FormShellContextValue;
  className?: string;
}

/**
 * The `<ul>` of current validation errors, with a jump link per entry when
 * the form declares sections.
 *
 * WHY it is its own file: two surfaces render this exact list — the inline
 * `<FormErrorSummary>` beside the submit button on desktop, and the mobile
 * "Fix N issues" sheet in the bottom-chrome tier. Writing it twice would mean
 * a jump-link fix, an empty-state fix or a wording fix landing in one and not
 * the other, which is the bug-fix multiplier the Duplication Framework calls
 * out. There are exactly two consumers and they are the same list, so this is
 * a consolidation, not speculative abstraction.
 *
 * Renders nothing when there are no errors. It does NOT gate on
 * `submitAttempted` — that is the *summary's* decision, not the list's, and
 * the sheet needs to keep rendering while open.
 */
/*
 * 🛑 The two sides of this lookup use DIFFERENT key shapes, so an exact match
 * silently loses every nested error.
 *
 * `errors` is keyed by the full dotted Zod path — `applyZodIssues` does
 * `issue.path.map(String).join(".")`, giving `"address.line1"`. But
 * `fieldToStepIndex` is built by `buildFieldToSectionIndex` from
 * `SectionDef.fields`, which lists BARE field names — `"address"`. So
 * `fieldToStepIndex["address.line1"]` was always `undefined`, the entry fell
 * through to the plain `<Span>`, and the error that a section demonstrably
 * owned rendered with no jump link.
 *
 * `SectionForm` already solved this for its own badge counts
 * (`erroringSectionIds`, `errorCountFor`) with a prefix match. This is the same
 * rule, so the list and the badges can no longer disagree about which section
 * an error belongs to.
 *
 * Exact match is tried first: a field genuinely named `"address.line1"` must
 * beat a prefix match on `"address"`.
 */
function resolveStepIndex(
  ctx: FormShellContextValue,
  key: string,
): number | undefined {
  const map = ctx.fieldToStepIndex;
  if (!map) return undefined;
  const exact = map[key];
  if (exact != null) return exact;
  for (const [field, index] of Object.entries(map)) {
    if (key.startsWith(`${field}.`)) return index;
  }
  return undefined;
}

export function FormErrorList({ ctx: ctxProp, className }: FormErrorListProps) {
  const ambient = useContext(FormShellContext);
  const ctx = ctxProp ?? ambient;
  if (!ctx) return null;

  const entries = Object.entries(ctx.errors);
  if (entries.length === 0) return null;

  return (
    <ul className={["appkit-formshell__error-summary__list", className].filter(Boolean).join(" ")}>
      {entries.map(([key, message]) => {
        const stepIndex = resolveStepIndex(ctx, key);
        const stepLabel = stepIndex != null ? ctx.steps[stepIndex]?.label : undefined;
        return (
          <li key={key}>
            {stepLabel ? (
              <button
                type="button"
                className="appkit-formshell__error-summary__step-link"
                onClick={() => ctx.goToStep(stepIndex!)}
              >
                <Span weight="semibold">{stepLabel}:</Span> {message}
              </button>
            ) : (
              <Span>{message}</Span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default FormErrorList;
