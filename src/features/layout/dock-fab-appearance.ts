/**
 * dock-fab-appearance — what the floating dock’s RESTING button looks like.
 *
 * Its own module, with no React import and no dependency on anything, for one
 * reason: so the decision can be EXECUTED by a test. This project’s rule is
 * that a resolver is verified by running it and reading its answer, never by
 * confirming a caller exists — three unwired resolvers were found exactly that
 * way, one of them on the money path.
 */

import type { BottomAction } from "../../ui/chrome/BottomActionsContext";

/**
 * What the resting FAB should LOOK like — exported so it can be executed by a
 * test rather than inferred from JSX.
 *
 * 🛑 A DISCLOSURE CONTROL MUST NOT IMPERSONATE THE STATE OF THE ACTION IT
 * NAMES. The FAB's `onClick` only opens the panel; it never dispatches. So it
 * must NOT take `disabled` from the primary action — that would strand every
 * OTHER action behind a dead toggle, which is worse than the defect it fixes.
 * Instead it stops BORROWING the CTA appearance it cannot honour.
 *
 * Measured on the shop checkout 2026-11-13: step 1 registers a single
 * "Continue" with `disabled: !selectedAddress`, so the panel rendered it
 * correctly disabled while the FAB rendered the same label in the same
 * `primary` variant, fully live. Pressing it opened the panel and did nothing
 * else — a control that looks like the buy-path CTA, is not, and explains
 * nothing. This project has the class on record: *a correct validator behind a
 * misleading control is indistinguishable, from the user's side, from a WRONG
 * one.*
 *
 * ⚠ `loading` counts as unavailable for the same reason: a live-looking FAB
 * labelled "Verifying…" claims a spinner this button never runs.
 */
export function resolveDockFabAppearance(input: {
  primaryAction: BottomAction | undefined;
  isBulkMode: boolean;
  bulkSelectedCount?: number | undefined;
  infoLabel?: string | undefined;
}): {
  label: string;
  ariaLabel: string;
  variant: NonNullable<BottomAction["variant"]>;
  borrowedAction: BottomAction | undefined;
} {
  const { primaryAction, isBulkMode, bulkSelectedCount, infoLabel } = input;

  if (isBulkMode) {
    return {
      label: "Bulk actions",
      ariaLabel: `${bulkSelectedCount ?? 0} selected — bulk actions`,
      variant: "primary",
      borrowedAction: undefined,
    };
  }

  const unavailable = Boolean(primaryAction?.disabled || primaryAction?.loading);
  const borrowedAction = unavailable ? undefined : primaryAction;

  return {
    label: borrowedAction?.label ?? "Actions",
    ariaLabel: borrowedAction?.label ?? infoLabel ?? "Page actions",
    /* Neutral, not primary — the whole point is that it stops reading as the CTA. */
    variant: unavailable ? "secondary" : (borrowedAction?.variant ?? "primary"),
    borrowedAction,
  };
}
