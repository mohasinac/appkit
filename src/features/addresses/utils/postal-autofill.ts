/*
 * WHY: A postal lookup must fill the city/state it knows WITHOUT overwriting
 *      what the person typed — and the obvious test for that ("is the field
 *      empty?") silently breaks every lookup after the first.
 * WHAT: `applyPostalAutofill` — merge a resolved city/state into form values,
 *       overwriting only values this helper itself wrote earlier.
 *
 * EXPORTS: applyPostalAutofill, type PostalAutofillMemo
 *
 * @tag domain:addresses
 * @tag layer:utils
 * @tag pattern:pure
 * @tag sideEffects:none
 */

interface CityState {
  city: string;
  state: string;
}

/**
 * What the last autofill wrote, so a later one can tell its own output apart
 * from a human's typing. A field is absent when the helper declined to write
 * it — which makes it the human's, and untouchable.
 */
export type PostalAutofillMemo = Partial<CityState>;

/**
 * Merge `resolved` into `prev`, returning the new values and an updated memo.
 *
 * ── 🛑 THE BUG THIS EXISTS TO FIX ─────────────────────────────────────────
 *
 * Both address forms used `prev.city.trim() ? prev.city : city` — fill only
 * an EMPTY field. That intent is right and is preserved here: correcting an
 * address someone deliberately typed is a bug they cannot report, because
 * they watch their own input vanish with no idea what did it.
 *
 * But "empty" cannot tell WHO filled the field. After the first lookup the
 * city is non-empty — written by the autofill itself — so every subsequent
 * lookup is refused. Enter 413001, get Solapur/Maharashtra; correct the PIN
 * to 500005 (Hyderabad) and the form still shows Solapur. The PIN and the
 * city now disagree, the form validates, and the parcel ships to the wrong
 * city — worse than never autofilling at all.
 *
 * ── The rule ──────────────────────────────────────────────────────────────
 *
 * A field is ours to overwrite when it is EMPTY, or when it still holds
 * exactly what we last wrote into it. The moment a human edits it, it stops
 * matching the memo and becomes untouchable again — the original guarantee,
 * now actually enforceable rather than approximated by "is it blank".
 */
export function applyPostalAutofill<T extends CityState>(
  prev: T,
  resolved: Partial<CityState>,
  memo: PostalAutofillMemo,
): { next: T; memo: PostalAutofillMemo } {
  const nextMemo: PostalAutofillMemo = {};

  const merge = (field: keyof CityState): string => {
    const current = prev[field];
    const incoming = resolved[field];
    const ours = current.trim() === "" || current === memo[field];
    if (!ours || !incoming) return current; // human's value, or nothing to say
    nextMemo[field] = incoming;
    return incoming;
  };

  return {
    next: { ...prev, city: merge("city"), state: merge("state") },
    memo: nextMemo,
  };
}
