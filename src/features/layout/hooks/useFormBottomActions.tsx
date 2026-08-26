"use client";
import { useContext, useMemo } from "react";
import { FormShellContext, type FormShellContextValue } from "../../../ui/forms/FormShell";
import { FormErrorList } from "../../../ui/forms/FormErrorList";
import { useIsInsideOverlay } from "../../../ui/components/overlay-context";
import { useBottomActions } from "./useBottomActions";
import type { BottomAction } from "../BottomActionsContext";

export interface UseFormBottomActionsOptions {
  /** Runs when the pinned primary button is pressed. */
  onSubmit: () => void | Promise<void>;
  /** Omit to render no Cancel button — a settings page with nowhere to go back to. */
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  disabled?: boolean;
  /** Set false to leave the bar to someone else on this route. */
  enabled?: boolean;
  /**
   * Read the form state from here instead of the ambient context. `<Form>`
   * needs it: the hook runs in `Form`'s body, which is ABOVE the provider
   * `Form` itself renders, so the ambient lookup would find the parent's
   * context or none at all.
   */
  /**
   * Destructive action for this record, mirrored from `SectionForm`. Pushed
   * to the FRONT of the bar so it is furthest from where the thumb rests on
   * the primary action.
   */
  destructiveAction?: { label: string; onClick: () => void; disabled?: boolean };
  ctx?: FormShellContextValue;
}

/**
 * Pin a form's Save/Cancel row to the bottom of a phone screen, and turn its
 * validation errors into a pull-up sheet above it.
 *
 * ## Nothing here is new chrome
 *
 * This is `useBottomActions` with a form-shaped payload. The cart's bottom bar
 * — "Total ₹777 · Details ⌃" over a pinned CTA — is 100% that primitive's
 * output already, so the sheet mechanics, the collapse rule
 * (`grid-rows-[1fr] ↔ [0fr]`, background on the innermost div),
 * click-outside-to-close, the `ResizeObserver` that publishes
 * `--bottom-chrome-height`, and all three bottom-edge offsets come for free.
 * Re-deriving any of that would be a second, worse copy.
 *
 * ## Three details that will bite anyone editing this
 *
 * 1. **The label must encode the count.** `useBottomActions` re-publishes
 *    `infoPanel` only when `hasInfoPanel`, `infoLabel` or `secondaryLabel`
 *    change — a ReactNode is a fresh object every render and cannot be a
 *    dependency without looping. "Fix 6 issues" → "Fix 5 issues" is
 *    therefore what pushes the updated list through. A generic label like
 *    "Errors" would freeze the sheet's contents at whatever they were the
 *    first time it opened.
 *
 * 2. **The panel is rendered outside the form's provider.** `BottomActions`
 *    lives in the layout shell, so the detached node cannot reach
 *    `FormShellContext` by itself — hence `<FormErrorList ctx={ctx}>` with
 *    the context passed explicitly.
 *
 * 3. **Suppressed inside a Modal or SideDrawer.** An overlay owns its own
 *    footer, and a viewport-fixed bar would render *behind* the backdrop,
 *    below the dialog it belongs to. `useIsInsideOverlay()` is how the
 *    overlay tells us, because neither portal leaves a detectable trace in
 *    the DOM at the form's position.
 */
export function useFormBottomActions({
  onSubmit,
  onCancel,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  isLoading = false,
  disabled = false,
  enabled = true,
  destructiveAction,
  ctx: ctxProp,
}: UseFormBottomActionsOptions) {
  const ambient = useContext(FormShellContext);
  const ctx = ctxProp ?? ambient;
  const insideOverlay = useIsInsideOverlay();
  const active = enabled && !insideOverlay && ctx != null;

  const errorCount = ctx ? Object.keys(ctx.errors).length : 0;
  const showErrors = !!ctx?.submitAttempted && errorCount > 0;

  const actions = useMemo<BottomAction[]>(() => {
    if (!active) return [];
    const list: BottomAction[] = [];
    /*
     * Destructive FIRST, so it is furthest from the thumb's resting position
     * on the primary action. It never grows, so Save keeps the width.
     */
    if (destructiveAction) {
      list.push({
        id: "form-destructive",
        label: destructiveAction.label,
        variant: "danger",
        grow: false,
        onClick: destructiveAction.onClick,
        disabled: destructiveAction.disabled || isLoading,
      });
    }
    if (onCancel) {
      list.push({
        id: "form-cancel",
        label: cancelLabel,
        variant: "outline",
        grow: false,
        onClick: onCancel,
        disabled: isLoading,
      });
    }
    list.push({
      id: "form-submit",
      label: submitLabel,
      variant: "primary",
      grow: true,
      loading: isLoading,
      disabled: disabled || isLoading,
      onClick: () => void onSubmit(),
    });
    return list;
  }, [active, onCancel, cancelLabel, submitLabel, isLoading, disabled, onSubmit, destructiveAction]);

  useBottomActions({
    actions,
    // Encodes the count on purpose — see (1) in the header.
    infoLabel: showErrors
      ? `Fix ${errorCount} ${errorCount === 1 ? "issue" : "issues"}`
      : undefined,
    infoPanel: showErrors && ctx ? <FormErrorList ctx={ctx} /> : undefined,
    // Bumped by every submit attempt, so a second failed Save re-opens a
    // sheet the user collapsed — while an ordinary re-render does not.
    infoOpenSignal: showErrors ? ctx?.submitAttemptCount : undefined,
    // No claim at all when inactive — see UseBottomActionsOptions.enabled.
    enabled: active,
  });
}

export default useFormBottomActions;
