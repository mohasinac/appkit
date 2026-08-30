/*
 * WHY: The sidebar search was `item.label.toLowerCase().includes(q)` — so it
 *      could only ever find a screen by the name it already shows you. Typing
 *      "refund" found nothing, because the screen is called "Payouts"; typing
 *      "postcode" found nothing, because the field is called PIN code; typing
 *      "maintenance" found nothing, because the toggle lives inside "Site
 *      Settings". A search that only matches what is already on screen is a
 *      filter, not a search.
 * WHAT: One matcher over label + description + keywords, shared by the sidebar
 *       search and (in W7) the action index.
 *
 * ## Ranking, not just filtering
 *
 * A label hit and a keyword hit are not equally good answers. "orders" should
 * put **Orders** first and "Orders & Finance" (a guide that mentions orders)
 * second — so the matcher returns a SCORE and the caller sorts by it. Without
 * that, alphabetical order decides, and the exact match can land ninth.
 *
 * EXPORTS: matchesNavQuery, type NavSearchable
 *
 * @tag domain:layout
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:useSidebarSearch,action index
 * @tag sideEffects:none
 */

/** The fields the matcher reads. Everything is optional but `label`. */
export interface NavSearchable {
  label: string;
  description?: string;
  keywords?: string[];
}

/** Higher is a better answer. `0` means no match at all. */
const SCORE = {
  labelExact: 100,
  labelPrefix: 80,
  labelSubstring: 60,
  keywordExact: 50,
  keywordSubstring: 30,
  description: 10,
} as const;

/**
 * How well `item` answers `query`. `0` when it does not.
 *
 * The query is matched whole rather than tokenised: "prize draws" should find
 * Prize Draws, and splitting on spaces would also match anything containing
 * "draws" on its own, which for a two-word query is nearly everything.
 */
export function matchesNavQuery(item: NavSearchable, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  const label = item.label.toLowerCase();
  if (label === q) return SCORE.labelExact;
  if (label.startsWith(q)) return SCORE.labelPrefix;
  if (label.includes(q)) return SCORE.labelSubstring;

  for (const keyword of item.keywords ?? []) {
    const k = keyword.toLowerCase();
    if (k === q) return SCORE.keywordExact;
    if (k.includes(q) || q.includes(k)) return SCORE.keywordSubstring;
  }

  /*
   * The description is matched LAST and scores lowest on purpose: it is a
   * sentence, so it contains common words, and letting it outrank a keyword
   * would mean "shipping" surfaced every screen whose description happens to
   * mention shipping ahead of the one actually called Shipping.
   */
  if (item.description && item.description.toLowerCase().includes(q)) {
    return SCORE.description;
  }

  return 0;
}
