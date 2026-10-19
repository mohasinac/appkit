/*
 * WHY: An admin needs to find a person by name without anything on the
 *      server being able to read that name, and without the index itself
 *      becoming the leak.
 * WHAT: `*TokensIndex` — a whole-word HMAC token array, and the ONE
 *       normaliser both sides must use.
 *
 * ## 🛑 WHOLE WORDS ONLY, 3 characters minimum. This is the security
 *    boundary, not a tuning preference.
 *
 * The edge-n-gram expansion that makes `searchTxt` good is exactly what
 * would make a blind index leak. An attacker with read access cannot
 * compute HMACs without the key — but they can COUNT them. A 1-character
 * prefix has 36 possible hashes and a 2-character one roughly 1,300, so the
 * most frequent hash in the column is `a`, the second is `e`, and the
 * distribution unpicks from there by ordinary frequency analysis. Whole
 * tokens keep the space uninteresting, and "type a full first or last name"
 * is what admin people-search actually needs.
 *
 * So: never call `buildSearchTxt` to build one of these, never add a prefix
 * loop, and never derive one field from the other. `audit-blind-index-tokens`
 * R1 blocks all three.
 *
 * ## 🛑 `hmacBlindIndex` does NOT normalise — it hashes the raw string
 *
 * `Mohasin` and `mohasin` therefore produce different digests. Both sides
 * must run the same normaliser BEFORE hashing, and if they ever diverge a
 * backfill does not fix it: you must first discover the divergence, and the
 * symptom is "search returns nothing", which reads as "no such user".
 *
 * That is why `buildTokensIndex` and `tokensIndexQueryValue` live in one
 * file and share `normaliseToken` — the write side and the query side
 * cannot be edited independently.
 *
 * ## Why this is a DIFFERENT field from `searchTxt`, not an extension
 *
 * Different properties, deliberately: hashed not plaintext, whole-word not
 * prefix-expanded, admin-only not public. `searchTxt` still never carries
 * PII, and that rule is untouched. Keeping them visibly distinct is what
 * stops someone "simplifying" one into the other.
 *
 * @tag domain:security
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:server
 * @tag consumers:UserRepository,PayoutRepository,AddressesRepository,backfill-blind-index
 * @tag sideEffects:none
 */

import { hmacBlindIndex } from "./pii-encrypt";

/**
 * The shortest token worth indexing.
 *
 * 🛑 Three, matching the frequency argument in the header. Two-character
 * tokens are both uninformative as a search ("find everyone with 'li' in
 * their name") and the regime where counting starts to work.
 */
export const BLIND_INDEX_MIN_TOKEN = 3;

/** Tokens per field. A bound, so one pathological value cannot bloat a document. */
export const BLIND_INDEX_MAX_TOKENS = 24;

/**
 * The ONE normaliser for this path.
 *
 * Deliberately NOT `normalizeSearchText`: that one exists to make the
 * public write path and the Firestore token query agree, and it is tuned
 * for product titles. Reusing it here would couple two schemes that must be
 * able to change independently — and a change made for search reasons would
 * silently invalidate every stored digest.
 *
 * Lower-case, strip diacritics, drop everything that is not a letter or a
 * digit. An email is split on its punctuation too, so `mohsin0502@gmail.com`
 * yields `mohsin0502`, `gmail`, `com` — the local part being the useful one.
 */
function normaliseToken(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Split a value into whole, normalised, long-enough words. */
export function tokensOf(value: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of value.split(/[\s.@_\-+/\\,;:()[\]]+/)) {
    const t = normaliseToken(part);
    if (t.length < BLIND_INDEX_MIN_TOKEN) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= BLIND_INDEX_MAX_TOKENS) break;
  }
  return out;
}

/**
 * Build a `*TokensIndex` from one or more plaintext values.
 *
 * Returns `[]` rather than undefined for an empty input, so the field is
 * always present and `array-contains` behaves predictably. An ABSENT array
 * field and an empty one are the same to `array-contains`, but they are not
 * the same to a human reading the document and wondering whether the
 * backfill ran.
 */
export function buildTokensIndex(...values: readonly (string | null | undefined)[]): string[] {
  const tokens = new Set<string>();
  for (const v of values) {
    if (!v) continue;
    for (const t of tokensOf(v)) tokens.add(t);
  }
  return [...tokens].slice(0, BLIND_INDEX_MAX_TOKENS).map((t) => hmacBlindIndex(t));
}

/**
 * The digest to pass to `array-contains` for one search term.
 *
 * Returns null when the term is too short to have been indexed — the caller
 * must then return NOTHING rather than fall back to an unfiltered query.
 * A two-character admin search that quietly listed every user would be the
 * `plan.empty` bug (a query that normalises away matching everything) on
 * the one surface where the result set is people.
 */
export function tokensIndexQueryValue(term: string): string | null {
  const t = normaliseToken(term);
  if (t.length < BLIND_INDEX_MIN_TOKEN) return null;
  return hmacBlindIndex(t);
}

/**
 * Which key version wrote a given index.
 *
 * 🛑 Rotating `PII_HMAC_KEY` invalidates every digest written before it, and
 * the failure is silent: searches simply stop matching, which reads as "no
 * such user" rather than as a broken index. Recording the version means a
 * backfill can tell what it still has to rewrite instead of rewriting
 * everything, and a mismatch is detectable rather than invisible.
 */
export const BLIND_INDEX_KEY_VERSION_FIELD = "blindIndexKeyVersion";

/**
 * The version every NEW write stamps. Bump by hand when `PII_HMAC_KEY`
 * rotates — never computed, because a value derived from the key itself
 * would be constant across every rotation and the whole point is to tell
 * two rotations apart.
 *
 * Read from `PII_HMAC_KEY_VERSION` so the repository write path (which runs
 * inside the Next.js/Functions runtime) and `backfill-blind-index.mjs`
 * (which runs as a standalone script before `appkit/dist` is necessarily
 * current) agree without importing from each other.
 */
export const CURRENT_BLIND_INDEX_KEY_VERSION = Number(
  (typeof process !== "undefined" ? process.env?.PII_HMAC_KEY_VERSION : undefined) ?? "1",
);
