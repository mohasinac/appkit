import type { ReactNode } from "react";

/**
 * PendingValue — renders a value, or a VISIBLY incomplete marker when it is
 * not yet decided.
 *
 * ## Why a marker and not a blank
 *
 * This exists for the statutory disclosure fields in `appkit.config.js` →
 * `business`: support email, grievance officer, cancellation window, refund
 * timeline. Each is `null` until someone decides it, and each appears on a
 * page whose entire purpose is to publish it.
 *
 * Rendering `null` as an empty string makes an undisclosed legal obligation
 * look like a design choice — the row is there, the label is there, and the
 * value is simply missing in a way nobody notices. This renders
 * `[to be confirmed]` in a warning chip instead, so the gap is obvious to
 * whoever opens the page.
 *
 * 🛑 The alternative that must NOT be taken is inventing a plausible default.
 * A made-up support phone number or a guessed return window on a published
 * policy page is worse than an obviously missing one: it is wrong, it looks
 * authoritative, and a customer may rely on it.
 *
 * ## Pairing
 *
 * `bg-warning-surface` with `text-warning` — the inline-chip pairing from
 * CLAUDE.md Root Cause #67. Both tokens invert together with the theme, so
 * this stays readable in light and dark. Never `text-white` against a
 * `-surface` background; that is invisible in exactly one theme.
 */
export interface PendingValueProps {
  /** The resolved value. `null` / `undefined` / `""` all render the marker. */
  value?: string | null;
  /**
   * What is missing, e.g. "Support email".
   *
   * Used for the accessible label so a screen reader hears
   * "Support email: to be confirmed" rather than a bare "to be confirmed"
   * detached from the row it belongs to.
   */
  label: string;
  /** Rendered instead of the raw value when present — e.g. a `mailto:` link. */
  children?: ReactNode;
}

export function PendingValue({ value, label, children }: PendingValueProps) {
  if (value) {
    return <>{children ?? value}</>;
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium bg-warning-surface text-warning"
      // The visible text is the same for every field, so the accessible name
      // has to carry which one. Without this a page with six pending fields
      // announces "to be confirmed" six times with nothing to distinguish them.
      aria-label={`${label}: to be confirmed`}
    >
      [to be confirmed]
    </span>
  );
}
