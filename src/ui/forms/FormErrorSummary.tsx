"use client";
import { useContext } from "react";
import { FormShellContext } from "./FormShell";
import { FormErrorList } from "./FormErrorList";

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
 * 🛑 It IS gated on `ctx.submitAttempted`, and must stay that way. The
 * summary speaks about fields the user has not reached yet, so before a
 * submit it reads as a list of accusations rather than of mistakes — and
 * ~20 views run `validate(draft)` in a mount effect, so an untouched empty
 * draft fails every `.min(1)` on first paint. Gate the DISPLAY only: the
 * live validation underneath is what keeps this list shrinking as the user
 * fixes things after a failed submit, which is the whole point of it.
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

  // Nothing to say until they've tried. See the header.
  if (!ctx.submitAttempted) return null;

  const entries = Object.entries(ctx.errors);
  // `hideWhenEmpty` is the only reason an empty list would render at all —
  // as an empty titled block confirming there is nothing to fix.
  if (entries.length === 0 && hideWhenEmpty) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={["appkit-formshell__error-summary", className].filter(Boolean).join(" ")}
    >
      <div className="appkit-formshell__error-summary__title">{title}</div>
      <FormErrorList />
    </div>
  );
}

export default FormErrorSummary;
