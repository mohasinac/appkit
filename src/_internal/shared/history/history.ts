/**
 * Tracked-field diffing and capped append for entity status history.
 *
 * These are deliberately plain functions rather than a `BaseRepository`
 * override: the repository method that owns a transition already knows the
 * actor and the trigger, and a generic hook would have to guess both. The
 * repository calls `buildHistoryEntry` + `appendHistoryEntry` inside its own
 * write primitive — which is the point, since that is what keeps the 32
 * call sites above it unchanged.
 */

import { normalizeError } from "../../../errors/normalize";
import type { FirestoreDocument, FirestoreValue } from "../../../schemas/types";
import {
  STATUS_HISTORY_MAX,
  type AppendHistoryResult,
  type FieldChange,
  type HistoryActor,
  type StatusChangeEntry,
} from "./types";

/**
 * Structural equality for field values.
 *
 * Tracked fields are not all scalars, so identity comparison would flag an
 * unchanged object as changed on every write. Dates compare by instant,
 * because Firestore hands back a fresh object on every read — without this,
 * re-saving a document with no edits would append a history entry.
 */
function isSameValue(a: FirestoreValue, b: FirestoreValue): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a == null && b == null;

  const aDate = toDateOrNull(a);
  const bDate = toDateOrNull(b);
  if (aDate && bDate) return aDate.getTime() === bDate.getTime();
  if (aDate || bDate) return false;

  if (typeof a !== "object" || typeof b !== "object") return false;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch (err) {
    void normalizeError(err);
    // Circular or non-serialisable — treat as changed rather than throwing
    // inside a write path.
    return false;
  }
}

/** Firestore Timestamps expose `toDate()`; plain Dates are used directly. */
function toDateOrNull(v: FirestoreValue): Date | null {
  if (v instanceof Date) return v;
  if (typeof v === "object" && v !== null && typeof (v as unknown as { toDate?: () => Date }).toDate === "function") {
    try {
      return (v as unknown as { toDate: () => Date }).toDate();
    } catch (err) {
      void normalizeError(err);
      // A Timestamp-like object whose toDate() threw is not a usable date;
      // the caller treats null as "not a date" and falls through to structural
      // comparison, so there is nothing to report.
      return null;
    }
  }
  return null;
}

/** Read a possibly-dotted path (`emiInstallments.0.status`) off an object. */
function readPath(source: FirestoreDocument | undefined, path: string): FirestoreValue {
  if (!source) return undefined;
  if (!path.includes(".")) return source[path];
  let cursor: FirestoreValue = source;
  for (const segment of path.split(".")) {
    if (cursor == null || typeof cursor !== "object") return undefined;
    cursor = (cursor as FirestoreDocument)[segment];
  }
  return cursor;
}

/**
 * Diff only the fields an entity declares as tracked.
 *
 * The tracked list is explicit per entity, never "every field": a whole-
 * document diff would record the `updatedAt` bump on every single write and
 * exhaust the 50-entry cap within days, burying the transitions anyone
 * actually wants to read.
 *
 * A field absent from `patch` is untouched — this diffs the patch against
 * the current document, not two full documents.
 */
export function diffTrackedFields(
  current: FirestoreDocument | undefined,
  patch: FirestoreDocument,
  tracked: readonly string[],
): Record<string, FieldChange> {
  const changes: Record<string, FieldChange> = {};
  for (const field of tracked) {
    if (!(field in patch) && !field.includes(".")) continue;
    const to = readPath(patch, field);
    if (to === undefined) continue;
    const from = readPath(current, field);
    if (isSameValue(from, to)) continue;
    changes[field] = { from: from ?? null, to };
  }
  return changes;
}

export interface BuildHistoryEntryInput {
  actor: HistoryActor;
  trigger: string;
  changes: Record<string, FieldChange>;
  reason?: string;
  note?: string;
  /** Injectable for deterministic tests and seed fixtures. */
  now?: Date;
}

export function buildHistoryEntry(input: BuildHistoryEntryInput): StatusChangeEntry {
  const entry: StatusChangeEntry = {
    at: input.now ?? new Date(),
    actorRole: input.actor.role,
    changes: input.changes,
    trigger: input.trigger,
  };
  if (input.actor.uid) entry.actorUid = input.actor.uid;
  if (input.reason) entry.reason = input.reason;
  if (input.note) entry.note = input.note;
  return entry;
}

/**
 * Append with a FIFO cap. Returns the new array plus the running count of
 * entries dropped over the document's lifetime, so the caller can persist it
 * and the UI can be honest about what it is not showing.
 */
export function appendHistoryEntry(
  existing: readonly StatusChangeEntry[] | undefined,
  entry: StatusChangeEntry,
  previousTruncatedCount = 0,
  cap: number = STATUS_HISTORY_MAX,
): AppendHistoryResult {
  const next = [...(existing ?? []), entry];
  if (next.length <= cap) {
    return { history: next, truncatedCount: previousTruncatedCount };
  }
  const overflow = next.length - cap;
  return {
    history: next.slice(overflow),
    truncatedCount: previousTruncatedCount + overflow,
  };
}

/**
 * The whole flow in one call: diff, and return the patch additions needed to
 * record it. Returns `null` when no tracked field changed — the caller then
 * writes its patch unchanged, so an untracked update never grows the array.
 */
export function withHistory<TPatch extends FirestoreDocument>(
  current: FirestoreDocument | undefined,
  patch: TPatch,
  opts: {
    tracked: readonly string[];
    actor: HistoryActor;
    trigger: string;
    reason?: string;
    note?: string;
    /**
     * Changes the field diff cannot express, merged over the diffed ones.
     *
     * Needed for append-to-array events: a refund posted to `refunds[]`
     * shows up in a raw diff as "an array of 1 became an array of 2", which
     * is true and useless. The caller instead contributes
     * `{ refund: { from: null, to: { amount, type, reason } } }` — the thing
     * a reader actually wants on the timeline.
     */
    extraChanges?: Record<string, FieldChange>;
    historyField?: string;
    truncatedField?: string;
    now?: Date;
    cap?: number;
  },
): (TPatch & FirestoreDocument) | null {
  const changes = { ...diffTrackedFields(current, patch, opts.tracked), ...opts.extraChanges };
  if (Object.keys(changes).length === 0) return null;

  const historyField = opts.historyField ?? "statusHistory";
  const truncatedField = opts.truncatedField ?? "statusHistoryTruncated";

  const entry = buildHistoryEntry({
    actor: opts.actor,
    trigger: opts.trigger,
    changes,
    reason: opts.reason,
    note: opts.note,
    now: opts.now,
  });

  const { history, truncatedCount } = appendHistoryEntry(
    (readPath(current, historyField) as StatusChangeEntry[] | undefined) ?? [],
    entry,
    (readPath(current, truncatedField) as number | undefined) ?? 0,
    opts.cap,
  );

  return {
    ...patch,
    [historyField]: history,
    ...(truncatedCount > 0 ? { [truncatedField]: truncatedCount } : {}),
  };
}
