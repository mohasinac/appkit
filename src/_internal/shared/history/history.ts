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

/**
 * Remove PII-named keys from a `changes` map, at any depth.
 *
 * Two passes are needed because PII can arrive two ways: as a tracked field
 * that happens to be PII (`buyerEmail` in `changes`), or nested inside a
 * value a caller contributed via `extraChanges` (a refund's `reason`, an
 * offer note object). `encryptPiiFields` catches neither — it only ever
 * looks at top-level string properties of the document itself.
 *
 * Scrubbed rather than redacted-in-place: an entry that silently omits a
 * field is honest, whereas one containing `"[redacted]"` invites a reader to
 * assume the real value is recoverable somewhere.
 */
function scrubPii(
  changes: Record<string, FieldChange>,
  piiFields: readonly string[] | undefined,
): Record<string, FieldChange> {
  if (!piiFields?.length) return changes;
  const pii = new Set(piiFields);

  const stripNested = (v: FirestoreValue): FirestoreValue => {
    if (v == null || typeof v !== "object") return v;
    if (v instanceof Date) return v;
    if (Array.isArray(v)) return v.map(stripNested);
    const out: Record<string, FirestoreValue> = {};
    for (const [k, val] of Object.entries(v as Record<string, FirestoreValue>)) {
      if (pii.has(k)) continue;
      out[k] = stripNested(val);
    }
    return out;
  };

  const result: Record<string, FieldChange> = {};
  for (const [field, change] of Object.entries(changes)) {
    if (pii.has(field)) continue; // the tracked field itself is PII
    result[field] = { from: stripNested(change.from), to: stripNested(change.to) };
  }
  return result;
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
    /**
     * This entity's PII field names — pass the same list the repository hands
     * to `encryptPiiFields` (`ORDER_PII_FIELDS`, `OFFER_PII_FIELDS`, …).
     *
     * 🛑 Not optional in spirit. `encryptPiiFields` is a FLAT top-level loop:
     * it reads `doc[field]`, skips anything that is not a string, and never
     * descends into arrays or nested objects. `statusHistory` is an array of
     * objects, so a PII value that reaches `changes` is written to Firestore
     * **in plaintext** and `mapDoc`'s decrypt never touches it on the way
     * back out — a leak with no error and no visible symptom.
     *
     * Scrubbing here rather than at each call site is deliberate: a
     * convention that says "don't put PII in history" is one forgetful
     * adopter away from that leak, and 9 more entities adopt this primitive.
     *
     * SCOPE: this scrubs `changes` structurally, at any depth — a key whose
     * NAME is PII is dropped. It cannot scrub `note`, which is free text the
     * user themselves authored (a seller's counter-offer note). The rule
     * there is a call-site one: pass the author's own text, never an identity
     * field lifted off the document.
     */
    piiFields?: readonly string[];
    historyField?: string;
    truncatedField?: string;
    now?: Date;
    cap?: number;
  },
): (TPatch & FirestoreDocument) | null {
  const changes = scrubPii(
    { ...diffTrackedFields(current, patch, opts.tracked), ...opts.extraChanges },
    opts.piiFields,
  );
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
