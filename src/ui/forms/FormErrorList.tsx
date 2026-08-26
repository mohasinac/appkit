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
export function FormErrorList({ ctx: ctxProp, className }: FormErrorListProps) {
  const ambient = useContext(FormShellContext);
  const ctx = ctxProp ?? ambient;
  if (!ctx) return null;

  const entries = Object.entries(ctx.errors);
  if (entries.length === 0) return null;

  return (
    <ul className={["appkit-formshell__error-summary__list", className].filter(Boolean).join(" ")}>
      {entries.map(([key, message]) => {
        const stepIndex = ctx.fieldToStepIndex?.[key];
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
