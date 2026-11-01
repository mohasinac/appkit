/*
 * WHY: `CommandPalette`'s ⌘K search was plain substring on `label` +
 *      `groupTitle` only — genuinely behind the sidebar's own "Search
 *      navigation…" box, which already reads label+description+keywords via
 *      `matchesNavQuery`. Typing "maintenance" in ⌘K found nothing, because
 *      the toggle lives inside "Site Settings" and neither the label nor the
 *      group title says "maintenance".
 * WHAT: One thin, group-aware wrapper around `matchesNavQuery` — flattens
 *       groups, scores, sorts — shared by the ⌘K palette and the new
 *       dashboard-landing quick-jump search (Phase 9, overhaul brief), so
 *       both surfaces rank identically instead of carrying two drifting
 *       copies of "what counts as a good match."
 *
 * ## The group-title fallback is additive, not a replacement
 *
 * Before this wrapper existed, typing "maintenance" in ⌘K matched every item
 * *in* the Maintenance group, even ones with no "maintenance" in their own
 * label/description/keywords — because the old matcher checked
 * `groupTitle.includes(q)` directly. Swapping straight to `matchesNavQuery`
 * alone would regress that: an item scores via `matchesNavQuery` first, and
 * only when that is `0` does a group-title substring match fall back to a
 * low constant score — below every real `matchesNavQuery` tier, including
 * `description` — so a genuine label/keyword/description hit always outranks
 * a "this item merely lives in a matching group" hit.
 *
 * EXPORTS: rankNavSearchResults, type NavSearchGroupedItem
 *
 * @tag domain:layout
 * @tag layer:client
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:CommandPalette,DashboardQuickJump
 * @tag sideEffects:none
 */

import { matchesNavQuery, type NavSearchable } from "../../_internal/shared/features/layout/matchesNavQuery";

/** Score a group-title substring match falls back to when nothing else hits. Below every `matchesNavQuery` tier (lowest is `description: 10`). */
const GROUP_TITLE_FALLBACK_SCORE = 5;

export type NavSearchGroupedItem = NavSearchable & { groupTitle: string };

/**
 * Ranks `items` against `query`, flattened across their groups.
 *
 * Returns `items` unchanged, in their original order, when `query` is blank
 * — callers rely on this to show the full set before the user has typed
 * anything, without a separate "no query" branch of their own.
 */
export function rankNavSearchResults<T extends NavSearchGroupedItem>(items: T[], query: string): T[] {
  const q = query.trim();
  if (!q) return items;

  const qLower = q.toLowerCase();
  const scored = items
    .map((item) => {
      const navScore = matchesNavQuery(item, q);
      const score = navScore > 0 ? navScore : item.groupTitle.toLowerCase().includes(qLower) ? GROUP_TITLE_FALLBACK_SCORE : 0;
      return { item, score };
    })
    .filter((entry) => entry.score > 0);

  // Array.prototype.sort is stable (ES2019+) — equal scores keep their original relative order.
  return scored.sort((a, b) => b.score - a.score).map((entry) => entry.item);
}
