/**
 * Guest-state storage access.
 *
 * The guest cart, guest wishlist and guest history each carried a byte-identical private
 * copy of this before 2026-10-24. All three are `"use client"` modules that are nonetheless
 * imported into module graphs the server renders, which is why the `typeof window` guard is
 * the entire point: reading `window.localStorage` during SSR throws, and the three features
 * that need it are the three a signed-out visitor touches on first paint.
 *
 * Returns `null` rather than throwing or returning a stub — a caller must decide what "no
 * storage" means for it, and a silent no-op stub would make a failed write indistinguishable
 * from a successful one (Root Cause #59).
 */
export function getDefaultStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

/**
 * Read a JSON value out of storage, degrading to `fallback` rather than throwing.
 *
 * 🛑 Four things can go wrong here and all four are ordinary rather than
 * exceptional: the key is absent; the value is not JSON; the value is JSON of a
 * shape a previous release wrote; or `localStorage` throws on ACCESS, which some
 * privacy modes do rather than merely refusing to write. A caller reaching for
 * `JSON.parse(localStorage.getItem(k))` handles none of them, and the failure
 * surfaces as a blank screen.
 *
 * `validate` is where a caller rejects a stale shape. It runs inside the `try`,
 * so a validator that throws counts as "not valid" instead of taking the page
 * down with it.
 */
export function readStoredJson<T>(
  key: string,
  fallback: T,
  validate?: (value: unknown) => value is T,
): T {
  try {
    const storage = getDefaultStorage();
    if (!storage) return fallback;
    const raw = storage.getItem(key);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (validate) return validate(parsed) ? parsed : fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

/**
 * Write a JSON value, reporting whether it stuck.
 *
 * Returns `false` on a full quota or a storage that refuses writes. 🛑 It
 * deliberately does not throw — losing a persisted preference is rarely worth
 * interrupting what someone was doing — but it does not return `void` either,
 * because silently pretending a write succeeded is how "my settings keep
 * resetting" bugs begin. Same reasoning as the `null` above.
 */
export function writeStoredJson(key: string, value: unknown): boolean {
  try {
    const storage = getDefaultStorage();
    if (!storage) return false;
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
