/**
 * `searchTxt` — one normalized, partial-match search field per entity.
 *
 * ## Why an array and not a string
 *
 * Firestore has no LIKE/substring operator. A string field supports `==` and a
 * range, and a range on a string is a **prefix anchored at the start of the whole
 * value** — so `"pokemon charizard psa 9"` would match a search for `"pok"` and
 * never for `"charizard"`. A single text column cannot do partial match here.
 *
 * An array of normalized *edge n-grams* can, in one `array-contains` clause:
 *
 *   "Pokémon Charizard PSA 9"
 *     → normalize → "pokemon charizard psa 9"
 *     → ["po","pok",…,"pokemon","ch","cha","char","chari",…,"charizard","ps","psa"]
 *
 * A query for "chari" is then a single equality-shaped clause against one index.
 * No OR-group, no query-time case folding, no per-sort composite index.
 *
 * ## Deliberate limits
 *
 * - **Word-prefix, not mid-word.** "ariza" will not match "charizard". True
 *   mid-word needs trigrams, which multiply index entries several-fold for a
 *   case users rarely type.
 * - **One `array-contains` per Firestore query**, so a multi-word search uses the
 *   most selective term as the clause and AND-refines the rest server-side.
 * - **Never put PII in here.** These are readable fragments of the source text —
 *   a `searchTxt` for a person's name IS that name, re-encoded. Encrypted fields
 *   stay searchable only through their HMAC blind index (exact match).
 */

/** Longest prefix emitted. Nobody types more than this before results narrow. */
const MAX_PREFIX_LENGTH = 12;
/** Shortest prefix emitted. 1 keeps single-character searches working. */
const MIN_PREFIX_LENGTH = 1;
/**
 * Ceiling on tokens per document. Firestore allows 40k index entries per doc and
 * each array element costs one per index containing the field, so a long body
 * left unbounded is a real limit to hit.
 */
const MAX_TOKENS = 600;
/** Words longer than this contribute whole-word only — no prefix expansion. */
const LONG_WORD_LIMIT = 24;

export interface SearchTxtOptions {
  /**
   * Emit prefixes for these sources. Use for short, high-signal text (title,
   * tags, category). Long body text should stay whole-word or it dominates the
   * token budget.
   */
  prefix?: boolean;
  maxPrefixLength?: number;
  maxTokens?: number;
}

type Source = string | string[] | undefined | null;

/**
 * Lowercase, strip accents, collapse everything non-alphanumeric to spaces.
 *
 * Accent folding is what makes "Pokemon" find "Pokémon" — a plain lowercase
 * would leave those as different tokens.
 */
export function normalizeSearchText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function words(sources: Source[]): string[] {
  const text = sources
    .flat()
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .join(" ");
  const normalized = normalizeSearchText(text);
  return normalized ? normalized.split(" ").filter(Boolean) : [];
}

/**
 * Build the stored token array.
 *
 * @param sources any mix of strings and string arrays; nullish entries ignored
 */
export function buildSearchTxt(
  sources: Source[],
  options: SearchTxtOptions = {},
): string[] {
  const {
    prefix = true,
    maxPrefixLength = MAX_PREFIX_LENGTH,
    maxTokens = MAX_TOKENS,
  } = options;

  const tokens = new Set<string>();

  for (const word of words(sources)) {
    tokens.add(word);
    if (!prefix || word.length > LONG_WORD_LIMIT) continue;

    // Inclusive: maxPrefixLength=5 must emit the 5-character prefix. When the
    // bound equals the word length the last slice is the whole word, which the
    // Set already holds.
    const upper = Math.min(word.length, maxPrefixLength);
    for (let n = MIN_PREFIX_LENGTH; n <= upper; n++) {
      tokens.add(word.slice(0, n));
    }
    if (tokens.size >= maxTokens) break;
  }

  return Array.from(tokens).slice(0, maxTokens);
}

/**
 * Tokenize a user's query into candidate clause values, most selective first.
 *
 * Longest term first because only one may become the `array-contains` clause —
 * the longest is the cheapest proxy for "narrows the result set most" without
 * keeping per-term cardinality statistics.
 *
 * Uses the SAME normalizer as the write side; if the two ever diverge, a query
 * silently stops matching what was indexed.
 */
export function parseSearchTxtQuery(query: string): string[] {
  const normalized = normalizeSearchText(query ?? "");
  if (!normalized) return [];
  return Array.from(new Set(normalized.split(" ").filter(Boolean)))
    .sort((a, b) => b.length - a.length)
    .slice(0, 10);
}

/**
 * Does a document's stored tokens satisfy every term? Used for the AND-refine
 * pass after the single `array-contains` clause has narrowed the candidates.
 */
export function matchesAllSearchTerms(
  searchTxt: readonly string[] | undefined,
  terms: readonly string[],
): boolean {
  if (terms.length === 0) return true;
  if (!searchTxt || searchTxt.length === 0) return false;
  const set = new Set(searchTxt);
  return terms.every((t) => set.has(t));
}
