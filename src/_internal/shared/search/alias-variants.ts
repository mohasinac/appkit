/**
 * Mechanical misspelling variants, folded into `searchTxt` at WRITE time.
 *
 * ## 🛑 The measurement this exists for
 *
 * `buildSearchTxt` stores edge n-grams — per word, every prefix from 1 to 12
 * characters. That gives prefix matching, accent folding and case
 * insensitivity, and it gives **nothing** for a misspelling that diverges
 * mid-word. Measured directly against the built helper:
 *
 *     tokens for "Dragoon G":  dragoon d dr dra drag drago dragoo g
 *     query "dragoon g"  -> match
 *     query "drago"      -> match        (a prefix)
 *     query "dragon g"   -> NO MATCH     ← the reported case
 *
 * "dragon" is not a prefix of "dragoon": they agree for five characters and
 * then diverge, `dragon` vs `dragoo`. No amount of n-gram depth fixes that,
 * because the two strings are not in a prefix relation at all.
 *
 * ## Why generated rather than authored
 *
 * `CategoryDocument.aliases` already exists and is already indexed, so one
 * answer is to hand-write "Dragon G" onto the Dragoon G leaf. That does not
 * scale to 216 model leaves, and worse, it only ever covers the misspellings
 * someone thought of. These rules are derived from a MEASURED corpus: §3.7 of
 * the plan crawled a counterfeit seller whose 1,277 titles systematically
 * misspell canonical names as trademark evasion — `Pegasis`, `Scythee`,
 * `Jupitar`, `Fireblase`, `Orian`, `Cosmec` — and the insight there is that **a
 * counterfeiter's evasion spellings are the same strings a real buyer
 * mistypes**. Each rule below is one of those patterns generalised.
 *
 * ## Zero query cost, bounded write cost
 *
 * Variants are more tokens in an array that is already `array-contains`
 * indexed, so matching them costs nothing at read time. The cost is write-side
 * and it is CAPPED, because `buildSearchTxt` truncates at 600 tokens
 * **silently** — an unbudgeted generator would push real words off the end of a
 * long title and make the exact-spelling search worse while improving the
 * misspelled one.
 */

/** Hard ceiling on variants per source word. See the 600-token note above. */
const MAX_VARIANTS_PER_WORD = 4;

/** Words shorter than this are too ambiguous to vary usefully. */
const MIN_WORD_LENGTH = 4;

/**
 * Letter-pair swaps applied to the END of a word, where the crawl's
 * misspellings cluster. Each pair is bidirectional.
 *
 * 🛑 Anchored at the end on purpose. `us`→`is` mid-word would turn "burst"
 * into "birst"-shaped noise; at the end it turns "pegasus" into "pegasis",
 * which is a spelling 1,277 real listings use.
 */
const SUFFIX_SWAPS: ReadonlyArray<readonly [string, string]> = [
  ["us", "is"], // Pegasus  -> Pegasis   (measured, bladekingbeys)
  ["us", "as"], // Pegasus  -> Pegasas
  ["er", "ar"], // Jupiter  -> Jupitar   (measured)
  ["ze", "se"], // Fireblaze-> Fireblase (measured)
  ["ic", "ec"], // Cosmic   -> Cosmec    (measured)
  ["on", "an"], // Orion    -> Orian     (measured)
  ["el", "al"], // Draciel  -> Dracial
];

/**
 * Collapse a doubled letter to a single one, and vice versa for the few
 * letters people genuinely double by mistake.
 *
 * 🛑 This is the rule that answers the reported case: `dragoon` -> `dragon`.
 * It is also the highest-value rule, because a doubled vowel is the single
 * most common thing a buyer drops.
 */
function doubledLetterVariants(word: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < word.length - 1; i++) {
    if (word[i] === word[i + 1]) {
      // dragoon -> dragon
      out.push(word.slice(0, i) + word.slice(i + 1));
    }
  }
  return out;
}

function suffixSwapVariants(word: string): string[] {
  const out: string[] = [];
  for (const [a, b] of SUFFIX_SWAPS) {
    if (word.endsWith(a)) out.push(word.slice(0, -a.length) + b);
    if (word.endsWith(b)) out.push(word.slice(0, -b.length) + a);
  }
  return out;
}

/**
 * Misspelling variants for ONE already-normalised lowercase word.
 *
 * Returns `[]` for anything too short to vary. Never includes the input.
 */
export function aliasVariantsForWord(word: string): string[] {
  const w = word.trim().toLowerCase();
  if (w.length < MIN_WORD_LENGTH) return [];
  const seen = new Set<string>();
  for (const v of [...doubledLetterVariants(w), ...suffixSwapVariants(w)]) {
    /*
     * 🛑 A variant identical to the input is dropped, and so is one that is a
     * PREFIX of it — `buildSearchTxt` already stores every prefix, so emitting
     * one would spend part of the 600-token budget on a token that is already
     * there. (This is not hypothetical: a word ending in a doubled final
     * letter, e.g. "scythee", collapses to "scythe", which is a prefix.)
     */
    if (v === w || w.startsWith(v)) continue;
    if (v.length < MIN_WORD_LENGTH) continue;
    seen.add(v);
    if (seen.size >= MAX_VARIANTS_PER_WORD) break;
  }
  return [...seen];
}

/**
 * Misspelling variants for a whole NAME — the shape a caller actually has.
 *
 * 🛑 Returns extra WORDS, not extra phrases. `buildSearchTxt` tokenises per
 * word and `parseSearchTxtQuery` AND-refines per word, so "dragon g" succeeds
 * the moment `dragon` and `g` are both present as tokens — the two do not have
 * to appear as an adjacent pair, and emitting phrase variants would multiply
 * the token count for nothing. (This is the same property that made C4's bin
 * search work and that I got wrong there first: the composite is destroyed by
 * normalisation, and what carries the query is per-word AND.)
 */
export function aliasVariantsForName(name: string): string[] {
  const words = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const out = new Set<string>();
  for (const w of words) for (const v of aliasVariantsForWord(w)) out.add(v);
  return [...out];
}
