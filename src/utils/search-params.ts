/**
 * URL search-param readers for route handlers.
 *
 * These were hand-copied into 27 route files before 2026-10-24 — `numParam` into 18
 * (16 byte-identical) and `param` into 9 (all 9 identical). They are here so there is one
 * definition, per the Duplication Decision Framework's "≥3 copies" and "same prop surface"
 * triggers; `audit-duplicate-helpers` keeps it that way.
 *
 * Import this module directly (Root Cause #18) — these are deliberately NOT re-exported
 * from `appkit/src/index.ts`, which is already 10k lines and is what the cold build parses.
 */

/** Read a raw search param. `null` when absent — never `""` for a missing key. */
export function param(url: URL, key: string): string | null {
  return url.searchParams.get(key);
}

/**
 * Read a numeric search param, falling back when absent or unparseable.
 *
 * 🛑 Uses `Number`, not `parseInt`, so `"12abc"` is rejected to the fallback rather than
 * silently read as 12. That is the behaviour all 16 identical copies had, and a page size
 * of 12 derived from a typo'd param is worse than the default.
 */
export function numParam(url: URL, key: string, fallback: number): number {
  const v = url.searchParams.get(key);
  const n = v !== null ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Read an integer search param where "absent" and "zero" must stay distinguishable.
 *
 * Separate from `numParam` on purpose: a caller that needs to know whether the param was
 * supplied at all cannot get that from a fallback. `parseInt` here is also deliberate —
 * this one is for tier/depth values where a trailing fragment is tolerable.
 */
/**
 * Next's `searchParams` prop shape — a repeated query key arrives as an array.
 *
 * Six index page views declared this identically before 2026-10-24.
 */
export type SearchParamsRecord = Record<string, string | string[]>;

/**
 * Read one value out of Next's `searchParams`, taking the first of a repeated key.
 *
 * 🛑 Returns `""` for absent, NOT `null` — unlike `param` above, which reads a `URL`. The
 * asymmetry is deliberate and matches what all six copies did: these feed filter builders
 * that treat empty string as "no filter", and a `null` there would print as "null" in a
 * Sieve clause and match nothing (Root Cause #62's shape).
 */
export function firstParam(params: SearchParamsRecord, key: string): string {
  const v = params[key];
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

export function intParamOrNull(url: URL, key: string): number | null {
  const v = url.searchParams.get(key);
  if (v === null) return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}
