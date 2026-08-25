/*
 * WHY: "How does a scammer status look and read" had FOUR hand-written answers
 *      and they had already diverged in a way that shipped a real defect:
 *
 *        · `AdminScammersView.STATUS_BADGE`   — Record<string, string>
 *        · `AdminScammerEditorView.STATUS_COLOR` — Record<string, string>
 *        · `AdminScammerEditorView.STATUS_OPTIONS` — a literal label list
 *        · `ADMIN_SCAMMER_STATUS_TABS`        — the filter chips
 *
 *      Both colour maps carried the SAME broken `removed` entry:
 *
 *          "bg-[…surface] text-[…muted] bg-[…surface-elevated] text-[…muted]"
 *
 *      — two backgrounds and two inks on one element. Tailwind emits all four
 *      and the winner is decided by stylesheet order, not by position in the
 *      class string, so which background actually painted was not what either
 *      map said. One bug, two copies: the Duplication Framework's bug-fix
 *      multiplier, which is what makes this a consolidate rather than a
 *      third copy.
 *
 * WHAT: One display module beside the union it describes.
 *
 * ## Everything here is keyed `Record<ScammerStatus, …>`
 *
 * Not `Record<string, …>`. A status added to the union without a label or a
 * badge is then a COMPILE error rather than a row that silently renders with
 * the fallback styling of a status it is not — which is precisely how the
 * loose maps hid the broken `removed` entry.
 *
 * EXPORTS:
 *   SCAMMER_STATUS_LABEL, SCAMMER_STATUS_BADGE, SCAMMER_STATUS_OPTIONS,
 *   toScammerStatus
 *
 * @tag domain:scams
 * @tag layer:constants
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:AdminScammersView,AdminScammerEditorView
 * @tag sideEffects:none
 */

import { ScammerStatusValues, type ScammerStatus } from "../schemas/firestore";

/** Human-readable label. Replaces two `.replace(/_/g, " ")` call sites, which
 *  rendered "pending review" — mechanically correct, and not a written label. */
export const SCAMMER_STATUS_LABEL: Record<ScammerStatus, string> = {
  pending_review: "Pending review",
  verified: "Verified",
  rejected: "Rejected",
  removed: "Removed",
};

/**
 * Inline-chip styling. Every entry is a `bg-{status}-surface` + `text-{status}`
 * pair per Recurrent Root Cause #67 — the two tokens invert together with the
 * theme, which a literal `text-white` would not.
 *
 * `removed` is the neutral case: it has no status colour because it is not a
 * status outcome, it is a withdrawal. ONE background, ONE ink.
 */
export const SCAMMER_STATUS_BADGE: Record<ScammerStatus, string> = {
  pending_review: "bg-warning-surface text-warning",
  verified: "bg-success-surface text-success",
  rejected: "bg-error-surface text-error",
  removed: "bg-[var(--appkit-color-surface-elevated)] text-[var(--appkit-color-text-muted)]",
};

/** Dropdown options, derived from the union so one cannot go missing. */
export const SCAMMER_STATUS_OPTIONS = Object.values(ScammerStatusValues).map(
  (value) => ({ value, label: SCAMMER_STATUS_LABEL[value] }),
);

/**
 * Narrow an unknown API value to a real status.
 *
 * The list view used `toStringValue(item.status, "pending_review")`, which
 * produces a `string` — so an unrecognised value flowed on as if it were a
 * status and every consumer fell back to the pending styling. This maps
 * anything unrecognised to `pending_review` explicitly, and the return type
 * says so.
 */
export function toScammerStatus(value: unknown): ScammerStatus {
  return (Object.values(ScammerStatusValues) as string[]).includes(value as string)
    ? (value as ScammerStatus)
    : ScammerStatusValues.PENDING_REVIEW;
}
