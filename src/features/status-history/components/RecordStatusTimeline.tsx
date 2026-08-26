"use client";
import { StatusTimeline, type TimelineStep } from "./StatusTimeline";
import type { StatusChangeEntry } from "../../../_internal/shared/history/types";

/**
 * The timeline for an entity with no fixed phase vocabulary.
 *
 * ## Why this exists rather than seven more wrappers
 *
 * `OrderStatusTimeline` and `OfferPhaseTimeline` each supply a KNOWN sequence
 * of phases — placed → paid → shipped → delivered, made → countered →
 * accepted → paid — and render the steps a record has not reached yet as
 * upcoming. That shape earns a dedicated wrapper because the vocabulary is
 * part of the product.
 *
 * Support tickets, payouts, stores, scammer profiles, bids, shipments,
 * catalogue items and ads have no such sequence: a store goes active →
 * suspended → active, a bid goes active → outbid → active → won, a payout
 * retries. There is nothing to pre-render. So the timeline is simply the
 * entries that happened, in order — and writing that eight times would be
 * eight chances for the actor label, the em-dash rule or the negative tone to
 * drift, which is the bug-fix multiplier the Duplication Framework names.
 *
 * ## Never fabricate a step
 *
 * A record written before its entity adopted history has no `statusHistory`
 * at all. That renders `emptyLabel`, NOT a step derived from `updatedAt` —
 * "last write of any kind" is not an event, and a made-up date makes the
 * record lie. Same rule the offer timeline follows for `expired`.
 */

/**
 * Statuses that render in the error tone.
 *
 * Deliberately a shared set rather than a per-entity prop: these words mean
 * the same thing on every entity that uses them, and a per-entity list is one
 * more thing to keep aligned. A value not listed renders neutral, which is
 * the safe direction — a real transition shown in the wrong tone is a smaller
 * defect than a normal one shown as a failure.
 */
const NEGATIVE_STATUSES = new Set([
  "cancelled",
  "canceled",
  "rejected",
  "failed",
  "forfeited",
  "suspended",
  "removed",
  "declined",
  "expired",
  "lost",
]);

/** Ended, but not a failure — the record simply moved on. */
const MUTED_STATUSES = new Set(["outbid", "closed", "superseded", "archived"]);

function humanise(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "yes" : "no";
  const s = String(value);
  return s.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

/**
 * One entry → one step.
 *
 * `status` is the headline when it changed; otherwise the step is named after
 * the fields that did move, so an entry recording only "ETA moved" still
 * reads as a real event rather than a blank row.
 */
function toStep(entry: StatusChangeEntry, index: number): TimelineStep {
  const statusChange = entry.changes["status"] ?? entry.changes["listingStatus"];
  const to = statusChange?.to;
  const label = statusChange
    ? humanise(to)
    : Object.keys(entry.changes).map(humanise).join(", ") || "Updated";

  const toKey = typeof to === "string" ? to.toLowerCase() : "";
  return {
    key: `${entry.at instanceof Date ? entry.at.toISOString() : String(entry.at)}-${index}`,
    label,
    date: entry.at instanceof Date ? entry.at.toISOString() : String(entry.at),
    negative: NEGATIVE_STATUSES.has(toKey),
    muted: MUTED_STATUSES.has(toKey),
    actorRole: entry.actorRole,
    reason: entry.reason,
    note: entry.note,
  };
}

export interface RecordStatusTimelineProps {
  /** The record's `statusHistory`. Absent or empty renders `emptyLabel`. */
  entries?: StatusChangeEntry[];
  /** The record's `statusHistoryTruncated` — "earlier history trimmed". */
  truncatedCount?: number;
  title?: string;
  emptyLabel?: string;
  className?: string;
}

export function RecordStatusTimeline({
  entries,
  truncatedCount,
  title = "History",
  emptyLabel = "No recorded history yet",
  className,
}: RecordStatusTimelineProps) {
  const steps = (entries ?? []).map(toStep);
  return (
    <StatusTimeline
      title={title}
      steps={steps}
      truncatedCount={truncatedCount}
      emptyLabel={emptyLabel}
      className={className}
    />
  );
}

export default RecordStatusTimeline;
