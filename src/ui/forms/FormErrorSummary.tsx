"use client";
import { useContext } from "react";
import { FormShellContext } from "./FormShell";
import { Span } from "../components/Typography";

export interface FormErrorSummaryProps {
  /** Hide the whole block when there are currently no errors. Default true. */
  hideWhenEmpty?: boolean;
  className?: string;
  /** Heading shown above the error list. */
  title?: string;
}

/**
 * Shared, live validation-error summary — supplements (does not replace) the
 * per-field inline errors `FieldInput`/`FieldSelect`/`FormField` already
 * render. Reads `FormShellContext` directly (no required props), so it's
 * placed once beside a form's Submit/Save button and reflects every current
 * error immediately as fields change — not gated by `touched`, unlike the
 * inline per-field errors.
 *
 * For multi-step forms whose step engine populates
 * `FormShellContextValue.fieldToStepIndex`, each entry names its owning step
 * and is clickable to jump there. Falls back to a flat list when no step
 * context exists (single-step `<Form>` usage).
 *
 * Uses the `.appkit-formshell__error-summary` class family already defined
 * in `FormShell.style.css` for this exact purpose.
 */
export function FormErrorSummary({
  hideWhenEmpty = true,
  className,
  title = "Please fix the following:",
}: FormErrorSummaryProps) {
  const ctx = useContext(FormShellContext);
  if (!ctx) return null;

  const entries = Object.entries(ctx.errors);
  if (entries.length === 0 && hideWhenEmpty) return null;
  if (entries.length === 0) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={["appkit-formshell__error-summary", className].filter(Boolean).join(" ")}
    >
      <div className="appkit-formshell__error-summary__title">{title}</div>
      <ul className="appkit-formshell__error-summary__list">
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
    </div>
  );
}

export default FormErrorSummary;
