"use client";

/**
 * Keep an in-progress form across a page unload — a sign-in round trip, a
 * reload, a tab closed by accident.
 *
 * ## The problem, in the owner's words (2026-11-10)
 *
 * > *"when i am on checkout or on a participation submission page i need to get
 * > back to it if i had to login in between — all of my data should be back to
 * > the same step. Can use localstorage for that or update the session cookie
 * > itself if need be."*
 *
 * `?next=` returns the visitor to the right URL. It does not return their
 * TYPING: sign-in happens on another origin, so the tab is unloaded, every
 * `useState` in the form is gone, and the page they come back to is blank. The
 * two halves are one feature and only one of them existed.
 *
 * ## 🛑 WHY `localStorage` AND NOT THE SESSION COOKIE
 *
 * The owner offered both. The cookie half must not be built, and the reasons
 * are not stylistic:
 *
 *   - **A cookie is sent on EVERY request to the domain.** Draft content would
 *     ride on every page load, every image, every API call — into access logs,
 *     proxies and any CDN in front of them. A half-written contest entry is
 *     user content; a request log is not where it belongs.
 *   - **~4KB total, for the whole domain.** One four-item media draft plus a
 *     survey answer can exceed that, and the failure mode of an oversized
 *     `Set-Cookie` is the cookie being dropped — including, potentially, the
 *     session beside it.
 *   - **`__session` is a security credential whose shape the AUTH app owns.**
 *     Writing user content into it means a form can break sign-in, and that is
 *     a money-path risk taken for a convenience feature.
 *
 * `localStorage` is per-origin, which sounds like a problem and is in fact the
 * right property: the visitor leaves for `auth.<domain>` and comes BACK to the
 * origin they started on, so the draft only ever has to survive **in place**
 * while they are away. Nothing is shared cross-origin and nothing needs to be.
 *
 * ## 🛑 WHAT IS NOT PERSISTED, stated rather than implied
 *
 * **No file bytes, ever.** The quota is ~5MB per origin and one contest entry
 * may carry four media items; a single phone photo exceeds the whole budget. So
 * a caller persists the uploaded media *references* — the `/media/<id>` URLs
 * `finalize` already returned — never a `File`, a `Blob` or a `data:` URI.
 *
 * The honest consequence: **an upload that already completed survives; one that
 * was still in flight does not.** A draft restored mid-upload comes back with
 * the items that finished and without the one that did not, and the participant
 * re-picks that file. That is a real gap, not a hidden one — and `maxBytes`
 * below is the structural guard: a caller who accidentally puts bytes in the
 * draft blows the cap and the write is refused rather than throwing
 * `QuotaExceededError` somewhere else entirely.
 *
 * ## 🛑 CONFIG, NOT A LIST OF FORM NAMES
 *
 * Nothing here knows which forms want drafts. The caller supplies the `key` and
 * may switch the whole mechanism off with `enabled`, so "this form keeps
 * drafts" is a property of the form, decided where the form is declared. A
 * hardcoded allowlist of form ids inside appkit would be the type-driven shape
 * CLAUDE.md's governing principle forbids, one layer up.
 *
 * ## 🛑 NO TIMERS, and that is deliberate
 *
 * Writes are synchronous on change. The obvious alternative is a debounce, and
 * a debounce needs a flush on `pagehide` or the last keystrokes before a
 * cross-origin navigation — exactly the ones a sign-in handoff loses — are
 * dropped. A `setItem` of a few KB costs microseconds; a timer in a form
 * costs a flush path that has to be right, and this project has already paid
 * for a stray interval once (the session-activity tick, a Vercel overage).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { StorageManager } from "../../core/StorageManager";
import { normalizeError } from "../../errors/normalize";

/**
 * All drafts live under one prefix, so `StorageManager.clear()` on this
 * instance can only ever remove drafts — never a theme preference or a cart.
 */
const DRAFT_PREFIX = "appkit:draft:";

const draftStore = StorageManager.getInstance(DRAFT_PREFIX);

/**
 * How long a draft stays restorable. 24 hours.
 *
 * A draft from last week is not help, it is a surprise: the visitor has
 * forgotten writing it, and an event may have closed in the meantime. Expiry is
 * checked on READ rather than swept on a timer, so a tab that is never opened
 * again costs nothing.
 */
export const FORM_DRAFT_DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * The largest serialized draft that will be written, in bytes of JSON.
 *
 * Not a performance tuning knob — it is the guard that keeps file bytes out.
 * 128KB is far more than any field set and far less than one photo, so the two
 * cases cannot be confused. Over the cap the write is SKIPPED (and reported
 * through `normalizeError`), because the alternative is `QuotaExceededError`
 * thrown from a keystroke handler.
 */
export const FORM_DRAFT_DEFAULT_MAX_BYTES = 128 * 1024;

/** The stored envelope. Versioned so a shape change discards rather than restores. */
interface DraftEnvelope<T> {
  /** `version` as the writer declared it. */
  v: number;
  /** `Date.now()` at the moment of the write. */
  savedAt: number;
  data: T;
}

export interface UseFormDraftOptions {
  /**
   * Opt in. `false` reads nothing, writes nothing and removes nothing — so a
   * flag flipped off mid-session leaves an existing draft alone rather than
   * silently destroying it.
   */
  enabled?: boolean;
  /** Restorable window in ms. Default `FORM_DRAFT_DEFAULT_TTL_MS` (24h). */
  ttlMs?: number;
  /**
   * Bump when the draft's SHAPE changes. A stored draft written by a different
   * version is discarded, which is the only safe answer: the old shape would be
   * fed to `setState` calls that no longer expect it.
   */
  version?: number;
  /** See `FORM_DRAFT_DEFAULT_MAX_BYTES`. */
  maxBytes?: number;
}

export interface UseFormDraftResult<T> {
  /**
   * The draft read from storage, or `null` when there was none.
   *
   * `null` on the first render ALWAYS, including for a visitor who has one:
   * reading storage during render would give a different tree on the server and
   * in the browser, i.e. a hydration mismatch on the whole form. It is read in
   * a mount effect and the reference is then STABLE, so a consumer can apply it
   * from an effect keyed on this value and that effect runs exactly once.
   */
  restored: T | null;
  /** When the restored draft was written, ms epoch — for "saved at 14:02". */
  restoredAt: number | null;
  /**
   * Has the storage read happened? Gate a "we restored your draft" notice on
   * this rather than on `restored !== null`, so the notice cannot flash for a
   * visitor who has no draft.
   */
  ready: boolean;
  /**
   * Discard the stored draft.
   *
   * 🛑 Call this on a SUCCESSFUL submit. Without it the next visit restores the
   * entry that was already filed, over a fresh form — which reads as the submit
   * having failed.
   */
  clear: () => void;
}

/** `JSON.stringify` that never throws — a cyclic value is simply not persisted. */
function serialize(value: unknown): string | null {
  try {
    return JSON.stringify(value) ?? null;
  } catch (_err) {
    void normalizeError(_err);
    return null;
  }
}

/**
 * Persist `value` under `key`, and hand back whatever was there on mount.
 *
 * @param key Stable identifier for this form's draft, scoped by the caller —
 *   e.g. `` `event-entry:${eventId}` ``. It is namespaced under
 *   `appkit:draft:` internally, so it needs to be unique only among drafts.
 *
 *   ⚠ **Deliberately not keyed by user id.** The whole point is to survive an
 *   anonymous → signed-in transition, and the uid is not known on the side of
 *   that transition where the typing happened. A draft is therefore per browser
 *   PROFILE, not per account: two people sharing one logged-in browser share
 *   drafts for the same form. Accepted, and the reason is stated rather than
 *   discovered — keying by uid would make the feature not work at all.
 *
 * @param value The current form state. Must be JSON-serializable, and must
 *   contain references rather than bytes (see this file's header).
 */
export function useFormDraft<T>(
  key: string,
  value: T,
  options: UseFormDraftOptions = {},
): UseFormDraftResult<T> {
  const {
    enabled = true,
    ttlMs = FORM_DRAFT_DEFAULT_TTL_MS,
    version = 1,
    maxBytes = FORM_DRAFT_DEFAULT_MAX_BYTES,
  } = options;

  const [restored, setRestored] = useState<T | null>(null);
  const [restoredAt, setRestoredAt] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  const serialized = useMemo(() => serialize(value), [value]);

  /*
   * ── 🛑 THE PRISTINE BASELINE, which is what removes the restore RACE ───────
   *
   * Both effects below run in the SAME commit, read first. At that moment the
   * form still holds its empty initial state — the consumer has not applied the
   * restored draft yet, it cannot have, it has not been told about it.
   *
   * So a write effect that persisted "the current value" would overwrite the
   * draft with an empty form one tick after reading it, and the symptom would
   * be a draft that restores exactly once and then never again.
   *
   * The baseline is the serialized value at mount. While the value still equals
   * it, NOTHING is written and nothing is removed — the stored draft is left
   * untouched for the consumer to pick up. The first real divergence (the
   * consumer applying the draft, or the visitor typing) is the first write.
   */
  const pristineRef = useRef<string | null>(serialized);
  const readDoneRef = useRef(false);
  const lastWrittenRef = useRef<string | null>(null);

  // ── READ ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (readDoneRef.current) return;
    readDoneRef.current = true;
    if (!enabled) {
      setReady(true);
      return;
    }
    const stored = draftStore.get<DraftEnvelope<T>>(key);
    if (
      !stored ||
      typeof stored !== "object" ||
      stored.v !== version ||
      typeof stored.savedAt !== "number" ||
      stored.data === undefined
    ) {
      /*
       * Corrupt, foreign-versioned or absent. Removed rather than left: a value
       * this build cannot read is a value it will keep failing to read, and
       * `localStorage` has no eviction of its own.
       */
      if (stored) draftStore.remove(key);
      setReady(true);
      return;
    }
    if (Date.now() - stored.savedAt > ttlMs) {
      draftStore.remove(key);
      setReady(true);
      return;
    }
    setRestored(stored.data);
    setRestoredAt(stored.savedAt);
    setReady(true);
    // See `pristineRef`: the consumer is about to apply this, and when it does
    // the value will differ from the empty form. Writing it back then is a
    // no-op in content, which is exactly what should happen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, ttlMs, version]);

  // ── WRITE ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    if (!readDoneRef.current) return;
    if (serialized === null) return;
    if (serialized === pristineRef.current) {
      /*
       * Back at the baseline. Two cases, and they must be told apart:
       *
       *   - We have never written in this session (`lastWritten === null`), so
       *     this is the pre-restore state — the consumer has not applied the
       *     stored draft yet. LEAVE IT. Removing here is the race described
       *     above, and it is the one that makes a draft restore exactly once.
       *   - We HAVE written, so the visitor has edited and then undone it back
       *     to an empty form. Remove the draft: "I cleared this" should mean
       *     the next visit starts clean, not that a resurrected draft fills it
       *     back in.
       */
      if (lastWrittenRef.current !== null) {
        draftStore.remove(key);
        lastWrittenRef.current = null;
      }
      return;
    }
    if (serialized === lastWrittenRef.current) return;
    if (serialized.length > maxBytes) {
      /*
       * Almost certainly bytes where a reference belonged. Reported rather than
       * thrown, and reported at the point the mistake was made rather than as a
       * quota failure from an unrelated keystroke three screens later.
       */
      void normalizeError(
        new Error(
          `useFormDraft: draft for "${key}" is ${serialized.length} bytes, over the ${maxBytes} limit — not persisted. Store media REFERENCES, never file bytes.`,
        ),
      );
      return;
    }
    const envelope: DraftEnvelope<unknown> = {
      v: version,
      savedAt: Date.now(),
      data: value,
    };
    // `StorageManager.set` swallows and logs a storage failure and returns
    // false. A form must not break because the browser is in private mode.
    if (draftStore.set(key, envelope)) lastWrittenRef.current = serialized;
  }, [serialized, value, key, enabled, version, maxBytes]);

  /*
   * 🛑 The baseline is NOT moved here, and that is the whole reason this works
   * on the submit path.
   *
   * A submit handler calls `clear()` beside its own `setState` resets, so one
   * render later the form holds its initial state again — which IS the baseline.
   * The write effect then sees `serialized === pristineRef` and writes nothing,
   * so the draft stays deleted.
   *
   * Re-baselining to "the value as it is now" was tried and is wrong: `clear()`
   * closes over the PRE-reset value, so the post-reset empty form differed from
   * the new baseline and the hook immediately persisted an empty draft — which
   * then "restored" on the next visit and showed a restore notice over nothing.
   */
  const clear = useCallback(() => {
    draftStore.remove(key);
    lastWrittenRef.current = null;
    setRestored(null);
    setRestoredAt(null);
  }, [key]);

  return { restored, restoredAt, ready, clear };
}
