import type { EventEntryItem } from "../types";

/**
 * The scalar rows for one event entry.
 *
 * Extracted 2026-08-26 (W22) so `AdminEventEntriesView`'s detail modal and
 * `/admin/event-entries/[id]/view` render the same thing. The list had these
 * inline; a page that re-listed them would be a second copy, and the first
 * field added to one and not the other is the drift.
 *
 * Same shape as `buildBidDetailFields` in the auctions feature — that one also
 * takes a viewer, because a bid's bidder identity is portal-dependent. An
 * event entry has no such split: only admins and moderators reach this at all,
 * so there is no viewer parameter to add and adding one "for symmetry" would
 * imply a distinction that does not exist.
 *
 * `formResponses` is deliberately NOT a row. It is the survey/feedback
 * submission being judged — open-ended and often long — and belongs in the
 * `metadata` slot, not squeezed into a definition list.
 */
export interface EntryFieldRow {
  label: string;
  value: string;
}

export function buildEventEntryDetailFields(entry: EventEntryItem): EntryFieldRow[] {
  return [
    { label: "Entrant", value: entry.userDisplayName ?? entry.userId ?? "—" },
    { label: "Email", value: entry.userEmail ?? "—" },
    { label: "Review status", value: entry.reviewStatus },
    { label: "Points", value: entry.points != null ? String(entry.points) : "—" },
    { label: "Raffle eligible", value: entry.raffleEligible ? "Yes" : "No" },
    { label: "Poll votes", value: entry.pollVotes?.join(", ") || "—" },
    { label: "Reviewed by", value: entry.reviewedBy ?? "—" },
    { label: "Review note", value: entry.reviewNote ?? "—" },
    { label: "Entry ID", value: entry.id },
  ];
}
