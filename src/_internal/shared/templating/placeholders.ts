/**
 * `{{placeholder}}` interpolation — the ONE implementation.
 *
 * Promoted out of `features/faq/schemas/firestore.ts`, where it had served 63
 * FAQs since the feature shipped. Category description templates need exactly
 * the same thing, and writing a second regex for it is Root Cause #75's shape:
 * one of the two eventually learns about a case the other does not, and the
 * copy a caller reaches is the one they happened to import.
 *
 * `features/faq/schemas/firestore.ts` re-exports these under its own names, so
 * nothing in the FAQ feature changed and no FAQ call site moved.
 *
 * 🛑 NOT a template ENGINE. There are no conditionals, loops, filters or
 * nesting, and none should be added here — a category body is author-facing
 * copy with a handful of named slots, and a real engine would mean user input
 * being evaluated. `\w+` is the whole grammar, which is also why it is safe to
 * run over HTML.
 */

/** The slot syntax. One capture group: the bare name, no braces. */
const PLACEHOLDER_RE = /\{\{(\w+)\}\}/g;

/**
 * Every placeholder name in `text`, in source order, INCLUDING duplicates.
 *
 * Duplicates are kept deliberately: a caller counting unfilled slots wants to
 * know a body says `{{year}}` three times, and `usedPlaceholders` below is the
 * de-duplicated form for callers that want the set instead.
 */
export function extractPlaceholders(text: string): string[] {
  return Array.from(text.matchAll(PLACEHOLDER_RE), (m) => m[1]!);
}

/** The distinct placeholder names in `text`, in first-appearance order. */
export function usedPlaceholders(text: string): string[] {
  return Array.from(new Set(extractPlaceholders(text)));
}

/**
 * What a slot may resolve to.
 *
 * 🛑 Declared once and shared with `missingPlaceholders`, which only tests key
 * PRESENCE and so does not care about the value type at all. It was
 * `Record<string, unknown>` for exactly that reason, and
 * `audit-unknown-leakage` was right to reject it: `unknown` at a boundary is
 * how a caller ends up casting, and a cast is where this codebase's worst
 * defects live. Sharing the real type costs nothing and means the two
 * functions cannot disagree about what a value is.
 */
export type PlaceholderValues = Readonly<
  Record<string, string | number | null | undefined>
>;

export interface InterpolateResult {
  /** The text with every slot replaced. */
  text: string;
  /** Slot names that had no value — the caller reports these to the author. */
  unresolved: string[];
}

/**
 * Replace every `{{slot}}` with its value.
 *
 * 🛑 An unresolved slot becomes the EMPTY STRING, never the literal
 * `{{series}}`, and never a placeholder-ish stand-in like `[series]`. A
 * literal brace pair reaching a published product description is the single
 * most visible way this feature can fail, and it is what the `unresolved` list
 * exists to prevent: the caller surfaces "2 of 9 slots could not be filled:
 * {{year}}, {{type}}" rather than silently shipping the braces.
 *
 * A value that is present but empty/whitespace counts as UNRESOLVED. `{{brand}}`
 * resolving to `""` because the brand lookup returned nothing is exactly the
 * case an author needs told about, and treating it as resolved would hide it.
 */
export function interpolate(
  text: string,
  values: PlaceholderValues,
): InterpolateResult {
  const unresolved: string[] = [];
  const out = text.replace(PLACEHOLDER_RE, (_match, name: string) => {
    const raw = values[name];
    const value = raw == null ? "" : String(raw);
    if (value.trim() === "") {
      if (!unresolved.includes(name)) unresolved.push(name);
      return "";
    }
    return value;
  });
  return { text: out, unresolved };
}

/**
 * Which of `text`'s slots have no value in `available`.
 *
 * Separate from `interpolate` because validation runs at AUTHORING time, when
 * there is a schema to check against but no real product to fill from — the
 * admin editor wants to know a template names `{{sereis}}` before anyone
 * publishes from it.
 */
export function missingPlaceholders(
  text: string,
  available: PlaceholderValues,
): string[] {
  return usedPlaceholders(text).filter((name) => !(name in available));
}
